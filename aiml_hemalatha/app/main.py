import uuid
from app.job_data import load_job_data

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from resume_parser import parse_resume, UnsupportedFileType
from app.job_data import get_jobs
from app.ats import calculate_ats_score
from app.recommendations import get_recommendations


app = FastAPI(
    title="Resume Service",
    version="0.1.0"
)


# In-memory store for now
RESUME_STORE = {}


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "resume-service"
    }


@app.post("/api/v1/resume/upload")
async def upload_resume(file: UploadFile = File(...)):

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
        "raw_text_preview": parsed["raw_text_preview"],
    }

    return JSONResponse(
        content={
            "resume_id": resume_id,
            "parsed_skills": parsed["parsed_skills"],
        }
    )


@app.get("/api/v1/resume/{resume_id}")
def get_resume(resume_id: str):

    resume = RESUME_STORE.get(resume_id)

    if not resume:
        raise HTTPException(
            status_code=404,
            detail="Resume not found"
        )

    return resume


# ==============================
# ATS SCORE ENDPOINT
# ==============================

@app.get("/api/v1/resume/{resume_id}/ats-score")
def get_ats_score(resume_id: str, job_id: str):

    # Check resume
    if resume_id not in RESUME_STORE:
        raise HTTPException(
            status_code=404,
            detail="Resume not found"
        )

    # Get jobs
    jobs = get_jobs()

    # Find requested job
    job = jobs[jobs["job_id"] == job_id]

    if job.empty:
        raise HTTPException(
            status_code=404,
            detail="Job not found"
        )

    # Get skills from uploaded resume
    resume_skills = RESUME_STORE[resume_id]["parsed_skills"]

    # Get required skills for job
    required_skills = job.iloc[0]["required_skills"]

    # Calculate ATS score
    result = calculate_ats_score(
        resume_skills,
        required_skills
    )

    return {
        "resume_id": resume_id,
        "job_id": job_id,
        "job_title": job.iloc[0]["Job Title"],
        "ats_score": result["score"],
        "matched_skills": result["matched_skills"],
        "missing_skills": result["missing_skills"],
        "generated_by": "heuristic-v0"
    }


# ==============================
# JOB RECOMMENDATION ENDPOINT
# ==============================

@app.get("/api/v1/recommendations")
def recommendations(user_id: str):

    # For Milestone 1, use the latest uploaded resume
    if not RESUME_STORE:
        raise HTTPException(
            status_code=404,
            detail="No resume uploaded"
        )

    resume_id = list(RESUME_STORE.keys())[-1]

    resume_skills = RESUME_STORE[resume_id]["parsed_skills"]

    recommended_jobs = get_recommendations(
        resume_skills,
        limit=10
    )

    return {
        "user_id": user_id,
        "resume_id": resume_id,
        "recommendations": recommended_jobs,
        "generated_by": "heuristic-v0"
    }
@app.get("/gateway/jobs")
def get_jobs():

    df = load_job_data()

    return {
        "status": "success",
        "total_jobs": len(df),
        "jobs": df.to_dict(orient="records")
    }
@app.get("/gateway/job-market")
def job_market():

    df = load_job_data()

    result = {
        "total_jobs": len(df)
    }

    if "Location" in df.columns:
        result["top_locations"] = (
            df["Location"]
            .value_counts()
            .head(10)
            .to_dict()
        )

    if "Job Title" in df.columns:
        result["top_job_titles"] = (
            df["Job Title"]
            .value_counts()
            .head(10)
            .to_dict()
        )

    if "Skills" in df.columns:
        skills = (
            df["Skills"]
            .dropna()
            .str.split(",")
            .explode()
            .str.strip()
            .value_counts()
            .head(15)
        )

        result["top_skills"] = skills.to_dict()

    return {
        "status": "success",
        "market_data": result
    }