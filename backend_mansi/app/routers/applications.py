from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    JobApplication,
    ApplicationStatusHistory,
    ApplicationStatus,
    User,
    Role,
    NotificationType,
    NotificationChannel,
)
from app.deps import get_current_user, require_role
from app.schemas import (
    CreateApplicationRequest,
    UpdateApplicationStatusRequest,
    ApplicationResponse,
    ApplicationHistoryResponse,
)
from app.services.notification_dispatcher import dispatch_notification

router = APIRouter(prefix="/api/v1/applications", tags=["Application Tracking"])


@router.post("", response_model=ApplicationResponse, status_code=status.HTTP_201_CREATED, summary="Create job application")
async def create_application(
    payload: CreateApplicationRequest,
    current_user: User = Depends(require_role("job_seeker")),
    db: Session = Depends(get_db),
):
    # Check if application already exists
    existing = db.query(JobApplication).filter(
        JobApplication.user_id == current_user.id,
        JobApplication.job_id == payload.job_id,
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Application for this job already exists",
        )

    app = JobApplication(
        user_id=current_user.id,
        job_id=payload.job_id,
        job_title=payload.job_title or f"Job #{payload.job_id}",
        company_name=payload.company_name or "Target Company",
        status=payload.status,
        notes=payload.notes,
    )
    db.add(app)
    db.commit()
    db.refresh(app)

    # Initial history record
    history_entry = ApplicationStatusHistory(
        application_id=app.id,
        previous_status=None,
        new_status=payload.status.value,
        changed_by_user_id=current_user.id,
        notes=payload.notes or "Initial application created",
    )
    db.add(history_entry)
    db.commit()
    db.refresh(app)

    # Trigger notification
    await dispatch_notification(
        user_id=current_user.id,
        title=f"Application {payload.status.value.capitalize()}",
        message=f"Your application for {app.job_title} at {app.company_name} has been created.",
        notification_type=NotificationType.APPLICATION_STATUS,
        channel=NotificationChannel.IN_APP,
        metadata={"job_id": payload.job_id, "application_id": app.id},
        db=db,
    )

    return app


@router.get("", response_model=List[ApplicationResponse], summary="List applications")
def list_applications(
    status_filter: Optional[ApplicationStatus] = Query(None, alias="status"),
    job_id: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(JobApplication)

    if current_user.role == Role.JOB_SEEKER:
        query = query.filter(JobApplication.user_id == current_user.id)
    elif current_user.role == Role.RECRUITER:
        if job_id:
            query = query.filter(JobApplication.job_id == job_id)
        # If no job_id specified, recruiter sees all applications submitted in system
    # Admin sees all applications

    if status_filter:
        query = query.filter(JobApplication.status == status_filter)

    applications = query.order_by(JobApplication.updated_at.desc()).offset(offset).limit(limit).all()
    return applications


@router.get("/{application_id}", response_model=ApplicationResponse, summary="Get application details & timeline")
def get_application(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    # Job seeker can only view their own application
    if current_user.role == Role.JOB_SEEKER and app.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return app


@router.patch("/{application_id}/status", response_model=ApplicationResponse, summary="Update application status")
async def update_application_status(
    application_id: str,
    payload: UpdateApplicationStatusRequest,
    current_user: User = Depends(require_role("recruiter", "admin")),
    db: Session = Depends(get_db),
):
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    previous_status = app.status.value
    app.status = payload.status
    if payload.notes:
        app.notes = payload.notes

    history_entry = ApplicationStatusHistory(
        application_id=app.id,
        previous_status=previous_status,
        new_status=payload.status.value,
        changed_by_user_id=current_user.id,
        notes=payload.notes,
    )
    db.add(history_entry)
    db.commit()
    db.refresh(app)

    # Dispatch notification to candidate
    status_messages = {
        ApplicationStatus.SHORTLISTED: f"Congratulations! You've been shortlisted for {app.job_title} at {app.company_name}.",
        ApplicationStatus.INTERVIEW: f"Interview invite for {app.job_title} at {app.company_name}!",
        ApplicationStatus.REJECTED: f"Update regarding your application for {app.job_title} at {app.company_name}.",
        ApplicationStatus.APPLIED: f"Application status updated to Applied for {app.job_title}.",
        ApplicationStatus.SAVED: f"Application status updated to Saved for {app.job_title}.",
    }
    msg = status_messages.get(payload.status, f"Status updated to {payload.status.value}.")

    await dispatch_notification(
        user_id=app.user_id,
        title=f"Application Update: {payload.status.value.capitalize()}",
        message=msg,
        notification_type=NotificationType.APPLICATION_STATUS,
        channel=NotificationChannel.IN_APP,
        metadata={"application_id": app.id, "job_id": app.job_id, "new_status": payload.status.value},
        db=db,
    )

    return app


@router.delete("/{application_id}", summary="Withdraw application")
def delete_application(
    application_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    app = db.query(JobApplication).filter(JobApplication.id == application_id).first()
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    if current_user.role == Role.JOB_SEEKER and app.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(app)
    db.commit()
    return {"message": "Application withdrawn successfully"}
