from fastapi import FastAPI
from pydantic import BaseModel

from app.ats import calculate_ats_score
from app.recommendations import get_recommendations
from app.job_data import load_job_data


app = FastAPI(
    title="AI Career Intelligence Gateway",
    description="Shared Gateway for Resume, ATS and Recommendation services",
    version="1.0.0"
)


class ResumeRequest(BaseModel):

    resume_text: str
    job_description: str


@app.get("/")
def home():

    return {
        "message": "AI Career Intelligence Gateway is running"
    }


@app.get("/health")
def health():

    return {
        "status": "healthy"
    }


@app.post("/gateway/ats")
def ats_score(request: ResumeRequest):

    score = calculate_ats_score(
        request.resume_text,
        request.job_description
    )

    return {
        "ats_score": score
    }
@app.post("/gateway/recommendations")
def recommendations(request: ResumeRequest):

    try:

        result = get_recommendations(
            request.resume_text,
            request.job_description
        )

        return {
            "status": "success",
            "recommendations": result
        }

    except Exception as e:

        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }
@app.post("/gateway/analyze")
def analyze_resume(request: ResumeRequest):

    try:

        # ATS score
        ats_score = calculate_ats_score(
            request.resume_text,
            request.job_description
        )

        # Recommendations
        recommendations = get_recommendations(
            request.resume_text,
            request.job_description
        )

        # Recommendation score
        if len(recommendations) == 0:
            recommendation_score = 100
        else:
            recommendation_score = max(
                0,
                100 - (len(recommendations) * 10)
            )

        # Overall score
        overall_score = (
            ats_score + recommendation_score
        ) / 2

        return {
            "status": "success",

            "scores": {
                "ats_score": ats_score,
                "recommendation_score": recommendation_score,
                "overall_score": round(overall_score, 2)
            },

            "recommendations": recommendations
        }

    except Exception as e:

        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }
@app.get("/gateway/jobs")
def jobs():

    df = load_job_data()

    return {
        "status": "success",
        "total_jobs": len(df),
        "jobs": df.to_dict(orient="records")
    }