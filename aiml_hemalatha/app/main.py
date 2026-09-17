import uuid

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from resume_parser import parse_resume, UnsupportedFileType
from app.job_data import load_job_data, get_jobs
from app.ats import calculate_ats_score
from app.recommendations import get_recommendations
from app.matching_engine import calculate_match_score
from app.swipes import add_swipe, get_user_swipes


app = FastAPI(
    title="AI Career Intelligence",
    version="1.0.0"
)


# =========================================================
# IN-MEMORY STORE
# =========================================================

RESUME_STORE = {}


# =========================================================
# TEST USERS
# =========================================================

TEST_USERS = {
    "USER001": {
        "user_id": "USER001",
        "skills": [
            "python",
            "sql",
            "git"
        ],
        "location": "Bangalore"
    },

    "USER002": {
        "user_id": "USER002",
        "skills": [
            "java",
            "sql",
            "git"
        ],
        "location": "Hyderabad"
    }
}


# =========================================================
# HEALTH CHECK
# =========================================================

@app.get("/health")
def health_check():

    return {
        "status": "ok",
        "service": "resume-service"
    }


# =========================================================
# RESUME UPLOAD
# =========================================================

@app.post("/api/v1/resume/upload")
async def upload_resume(
    file: UploadFile = File(...)
):

    file_bytes = await file.read()

    if not file_bytes:
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is empty"
        )

    try:

        parsed = parse_resume(
            file_bytes,
            file.filename
        )

    except UnsupportedFileType as e:

        raise HTTPException(
            status_code=415,
            detail=str(e)
        )

    except Exception as e:

        raise HTTPException(
            status_code=422,
            detail=f"Failed to parse resume: {e}"
        )

    resume_id = str(uuid.uuid4())

    RESUME_STORE[resume_id] = {
        "filename": file.filename,
        "parsed_skills": parsed["parsed_skills"],
        "raw_text_preview": parsed["raw_text_preview"]
    }

    return JSONResponse(
        content={
            "resume_id": resume_id,
            "parsed_skills": parsed["parsed_skills"]
        }
    )


# =========================================================
# GET RESUME
# =========================================================

@app.get("/api/v1/resume/{resume_id}")
def get_resume(resume_id: str):

    resume = RESUME_STORE.get(resume_id)

    if not resume:

        raise HTTPException(
            status_code=404,
            detail="Resume not found"
        )

    return resume


# =========================================================
# ATS SCORE
# =========================================================

@app.get("/api/v1/resume/{resume_id}/ats-score")
def get_ats_score(
    resume_id: str,
    job_id: str
):

    if resume_id not in RESUME_STORE:

        raise HTTPException(
            status_code=404,
            detail="Resume not found"
        )

    jobs = get_jobs()

    job = jobs[
        jobs["job_id"].astype(str)
        == str(job_id)
    ]

    if job.empty:

        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    resume_skills = RESUME_STORE[
        resume_id
    ]["parsed_skills"]

    required_skills = job.iloc[0][
        "required_skills"
    ]

    result = calculate_ats_score(
        resume_skills,
        required_skills
    )

    return {
        "resume_id": resume_id,
        "job_id": job_id,
        "job_title": str(
            job.iloc[0]["job_title"]
        ),
        "ats_score": result["score"],
        "matched_skills": result["matched_skills"],
        "missing_skills": result["missing_skills"],
        "generated_by": "heuristic-v0"
    }


# =========================================================
# RECOMMENDATIONS - GET
# =========================================================

@app.get("/api/v1/recommendations")
def recommendations(
    user_id: str = "USER001"
):

    user = TEST_USERS.get(user_id)

    if not user:

        # Real authenticated users are identified by UUIDs and are not in
        # the static TEST_USERS map. Fall back to the most recent uploaded
        # resume's skills so recommendations work for any registered user.
        if RESUME_STORE:

            latest_resume_id = list(
                RESUME_STORE.keys()
            )[-1]

            user = {
                "user_id": user_id,
                "skills": RESUME_STORE[
                    latest_resume_id
                ]["parsed_skills"],
                "location": ""
            }

        else:

            raise HTTPException(
                status_code=404,
                detail="User not found"
            )

    jobs = get_jobs()

    swipe_history = get_user_swipes(
        user_id
    )

    # Latest swipe action for every job
    swipe_map = {}

    for swipe in swipe_history:

        swipe_map[
            str(swipe["job_id"])
        ] = swipe["action"]

    recommendations_list = []

    # Process every job
    for _, job in jobs.iterrows():

        job_dict = job.to_dict()

        job_id = str(
            job_dict["job_id"]
        )

        # -----------------------------------------
        # Calculate base match score
        # -----------------------------------------

        score = calculate_match_score(
            user["skills"],
            user["location"],
            job_dict
        )

        # -----------------------------------------
        # Reason tags
        # -----------------------------------------

        reason_tags = []

        # Required skills
        required_skills = job_dict.get(
            "required_skills",
            []
        )

        if isinstance(
            required_skills,
            str
        ):

            required_skills = [
                skill.strip().lower()
                for skill in required_skills.split(",")
                if skill.strip()
            ]

        else:

            required_skills = [
                str(skill).strip().lower()
                for skill in required_skills
            ]

        user_skills = [
            str(skill).strip().lower()
            for skill in user["skills"]
        ]

        matched_skills = (
            set(user_skills)
            & set(required_skills)
        )

        # Skill reason
        if matched_skills:

            if len(matched_skills) >= 2:

                reason_tags.append(
                    "Strong skill match"
                )

            else:

                reason_tags.append(
                    "Matches your skills"
                )

        # -----------------------------------------
        # Location match
        # -----------------------------------------

        job_location = str(
            job_dict.get(
                "location",
                ""
            )
        ).strip().lower()

        user_location = str(
            user["location"]
        ).strip().lower()

        if job_location == user_location:

            reason_tags.append(
                "Location match"
            )

        # -----------------------------------------
        # Swipe history
        # -----------------------------------------

        previous_action = swipe_map.get(
            job_id
        )

        if previous_action == "like":

            score += 10

            reason_tags.append(
                "Preferred based on swipe history"
            )

        elif previous_action == "dislike":

            score -= 20

            reason_tags.append(
                "Previously disliked"
            )

        # Keep score between 0 and 100
        score = max(
            0,
            min(100, score)
        )

        # -----------------------------------------
        # Add recommendation
        # -----------------------------------------

        recommendations_list.append({

            "job_id": job_id,

            "job_title": str(
                job_dict["job_title"]
            ),

            "location": str(
                job_dict["location"]
            ),

            "match_score": round(
                score,
                2
            ),

            "reason_tags": reason_tags

        })

    # -----------------------------------------
    # Highest score first
    # -----------------------------------------

    recommendations_list.sort(
        key=lambda item: item["match_score"],
        reverse=True
    )

    return {
        "user_id": user_id,
        "recommendations": recommendations_list,
        "generated_by": "heuristic-v0"
    }


# =========================================================
# RECOMMENDATIONS - POST
# =========================================================

@app.post("/api/v1/recommendations")
def recommendations_from_resume(
    resume_skills: list[str]
):

    result = get_recommendations(
        resume_skills
    )

    return {
        "total_recommendations": len(result),
        "recommendations": result
    }


# =========================================================
# ALL JOBS
# =========================================================

@app.get("/gateway/jobs")
def gateway_jobs():

    df = load_job_data()

    return {
        "status": "success",
        "total_jobs": len(df),
        "jobs": df.to_dict(
            orient="records"
        )
    }


# =========================================================
# JOB MARKET
# =========================================================

@app.get("/gateway/job-market")
def job_market():

    df = load_job_data()

    result = {
        "total_jobs": len(df)
    }

    if "location" in df.columns:

        result["top_locations"] = (
            df["location"]
            .value_counts()
            .head(10)
            .to_dict()
        )

    if "job_title" in df.columns:

        result["top_job_titles"] = (
            df["job_title"]
            .value_counts()
            .head(10)
            .to_dict()
        )

    if "required_skills" in df.columns:

        skills = (
            df["required_skills"]
            .dropna()
            .apply(
                lambda x: x
                if isinstance(x, list)
                else str(x).split(",")
            )
            .explode()
            .astype(str)
            .str.strip()
            .str.lower()
            .value_counts()
            .head(15)
        )

        result["top_skills"] = (
            skills.to_dict()
        )

    return {
        "status": "success",
        "market_data": result
    }


# =========================================================
# SWIPE API
# =========================================================

@app.post("/api/v1/swipes")
def create_swipe(
    user_id: str,
    job_id: str,
    action: str
):

    action = str(
        action
    ).lower().strip()

    if action not in [
        "like",
        "dislike"
    ]:

        raise HTTPException(
            status_code=400,
            detail=(
                "Action must be "
                "'like' or 'dislike'"
            )
        )

    jobs = get_jobs()

    job = jobs[
        jobs["job_id"].astype(str)
        == str(job_id)
    ]

    if job.empty:

        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    swipe = add_swipe(
        user_id,
        job_id,
        action
    )

    return {
        "status": "success",
        "swipe": swipe
    }


# =========================================================
# SWIPE HISTORY
# =========================================================

@app.get("/api/v1/swipes/{user_id}")
def get_swipe_history(
    user_id: str
):

    history = get_user_swipes(
        user_id
    )

    return {
        "user_id": user_id,
        "total_swipes": len(history),
        "swipes": history
    }


# =========================================================
# MATCHING ENGINE
# =========================================================

@app.post("/api/v1/matching/{job_id}")
def match_resume_with_job(
    job_id: str,
    resume_skills: list[str]
):

    jobs = get_jobs()

    job = jobs[
        jobs["job_id"].astype(str)
        == str(job_id)
    ]

    if job.empty:

        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    selected_job = job.iloc[0]

    result = calculate_match_score(
        resume_skills,
        str(selected_job["location"]),
        {
            "required_skills":
                selected_job[
                    "required_skills"
                ],

            "location":
                selected_job[
                    "location"
                ]
        }
    )

    return {
        "job_id": str(job_id),

        "job_title": str(
            selected_job["job_title"]
        ),

        "location": str(
            selected_job["location"]
        ),

        "user_skills": resume_skills,

        "required_skills":
            selected_job[
                "required_skills"
            ],

        "match_score": result,

        "generated_by": "heuristic-v0"
    }

