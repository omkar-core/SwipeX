import uuid

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from resume_parser import parse_resume, UnsupportedFileType

from app.job_data import load_job_data, get_jobs
from app.ats import calculate_ats_score
from app.recommendations import get_recommendations
from app.matching_engine import calculate_match_score
from app.swipes import add_swipe, get_user_swipes
from app.suggestions import generate_suggestions


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
        "recommendations": result,
        "generated_by": "semantic-swipe-v1"
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

        result["top_skills"] = skills.to_dict()

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


# =========================================================
# RESUME OPTIMIZATION SUGGESTIONS
# =========================================================

@app.post("/api/v1/resume/suggestions")
def resume_suggestions(
    resume_skills: list[str],
    missing_skills: list[str] = [],
    missing_keywords: list[str] = []
):

    suggestions = generate_suggestions(
        resume_skills=resume_skills,
        missing_skills=missing_skills,
        missing_keywords=missing_keywords
    )

    return {
        "resume_skills": resume_skills,
        "missing_skills": missing_skills,
        "missing_keywords": missing_keywords,
        "suggestions": suggestions,
        "generated_by": "rule-based-v1"
    }


# =========================================================
# DAY 5 - PERSONALIZED RECOMMENDATIONS
# =========================================================

@app.get("/api/v1/recommendations")
def recommendations(
    user_id: str = "USER001"
):

    user = TEST_USERS.get(user_id)

    if not user:

        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    recommendations_list = get_recommendations(
        resume_skills=user["skills"],
        user_id=user_id
    )

    return {
        "user_id": user_id,

        "total_recommendations": len(
            recommendations_list
        ),

        "recommendations":
            recommendations_list,

        "generated_by":
            "semantic-swipe-v1"
    }