from typing import List, Dict, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import JobApplication, User
from app.deps import get_optional_current_user
from app.schemas import CompetitionInfoResponse, CompetitionBatchResponse

router = APIRouter(prefix="/api/v1/jobs", tags=["Competition Tracking"])


def calculate_competition_info(job_id: str, db: Session, posted_at: Optional[datetime] = None) -> CompetitionInfoResponse:
    applicant_count = db.query(JobApplication).filter(JobApplication.job_id == job_id).count()

    # Low: < 5 applicants, Medium: 5-20 applicants, High: > 20 applicants
    if applicant_count < 5:
        level = "Low"
    elif applicant_count <= 20:
        level = "Medium"
    else:
        level = "High"

    # Early applicant flag if applicant count < 10 or posted recently
    now = datetime.utcnow()
    posted = posted_at or (now - timedelta(hours=12))
    hours_since_posted = max(0.5, (now - posted).total_seconds() / 3600.0)

    is_early = applicant_count < 10 or hours_since_posted <= 24.0

    # Format relative posted time
    if hours_since_posted < 1:
        posted_time_str = "Just now"
    elif hours_since_posted < 24:
        posted_time_str = f"{int(hours_since_posted)}h ago"
    else:
        days = int(hours_since_posted / 24)
        posted_time_str = f"{days}d ago"

    return CompetitionInfoResponse(
        job_id=job_id,
        applicant_count=applicant_count,
        competition_level=level,
        early_applicant=is_early,
        posted_time=posted_time_str,
    )


@router.get("/{job_id}/competition", response_model=CompetitionInfoResponse, summary="Get competition indicators for a job")
def get_job_competition(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    return calculate_competition_info(job_id, db)


@router.post("/competition-batch", response_model=CompetitionBatchResponse, summary="Batch competition lookup")
def get_batch_competition(
    job_ids: List[str],
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    results = {}
    for jid in job_ids:
        results[jid] = calculate_competition_info(jid, db)
    return CompetitionBatchResponse(competition=results)


@router.get("/competition-filter", summary="Filter jobs by competition level")
def filter_by_competition(
    level: Optional[str] = Query(None, description="Filter level: Low, Medium, High"),
    early_only: bool = Query(False, description="Filter early applicant jobs only"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    # Query distinct job_ids in applications
    job_app_counts = (
        db.query(JobApplication.job_id)
        .all()
    )
    job_ids = list(set([row.job_id for row in job_app_counts]))

    matched_jobs = []
    for jid in job_ids:
        info = calculate_competition_info(jid, db)
        if level and info.competition_level.lower() != level.lower():
            continue
        if early_only and not info.early_applicant:
            continue
        matched_jobs.append(info)

    return {"matched_jobs": matched_jobs, "total_count": len(matched_jobs)}
