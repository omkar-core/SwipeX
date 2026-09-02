"""
FastAPI Router for Swipe Endpoints.
Implements POST /api/v1/swipes and GET /api/v1/swipes/history per SRS Section 7.2 contract.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status

from api.dependencies import get_db_conn, require_job_seeker, AuthenticatedUser
from api.schemas.swipe import SwipeCreateSchema, SwipeResponseSchema, SwipeHistoryItemSchema
from api.schemas.job import ErrorResponseSchema
from db.repositories.swipe_repository import SwipeRepository
from db.cache import get_cache_service

router = APIRouter(
    prefix="/api/v1/swipes",
    tags=["Swipes"],
    responses={
        401: {"model": ErrorResponseSchema, "description": "Unauthorized - Missing or invalid authentication credentials"},
        403: {"model": ErrorResponseSchema, "description": "Forbidden - Operation requires 'Job Seeker' role"}
    }
)


@router.post(
    "",
    response_model=SwipeResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Record a swipe action (RIGHT = apply/save, LEFT = skip)",
    description="""
Records a job swipe action for the authenticated Job Seeker.

Validation Rules:
- **Authentication**: Requires valid Bearer JWT or Gateway identity context.
- **Authorization**: User role must be 'Job Seeker'.
- **Job Verification**: Target `job_id` must exist in database (returns 404 if missing).
- **Duplicate Prevention**: Enforces UNIQUE(user_id, job_id) constraint (returns 409 Conflict if already swiped).
    """,
    responses={
        201: {"model": SwipeResponseSchema, "description": "Swipe recorded successfully"},
        400: {"model": ErrorResponseSchema, "description": "Invalid job_id or direction format"},
        404: {"model": ErrorResponseSchema, "description": "Job not found"},
        409: {"model": ErrorResponseSchema, "description": "Duplicate swipe attempt for job"}
    }
)
def record_swipe(
    payload: SwipeCreateSchema,
    current_user: AuthenticatedUser = Depends(require_job_seeker),
    db_ctx=Depends(get_db_conn)
):
    conn, db_type = db_ctx
    repo = SwipeRepository(conn, db_type)

    # 1. Verify job existence in database
    if not repo.check_job_exists(payload.job_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{payload.job_id}' not found."
        )

    # 2. Insert swipe record
    swipe_id, is_duplicate = repo.create_swipe(
        user_id=current_user.user_id,
        job_id=payload.job_id,
        direction=payload.direction.value
    )

    if is_duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"User has already swiped job '{payload.job_id}'."
        )

    # 3. Update Redis cache (Add to swiped_jobs:{user_id} set and invalidate user feed cache)
    cache_service = get_cache_service()
    cache_service.add_swiped_job_id(current_user.user_id, payload.job_id)
    cache_service.invalidate_user_feed_cache(current_user.user_id)

    return SwipeResponseSchema(swipe_id=swipe_id)


@router.get(
    "/history",
    response_model=List[SwipeHistoryItemSchema],
    status_code=status.HTTP_200_OK,
    summary="Retrieve authenticated user's swipe history",
    description="Returns all swipe records performed by the authenticated user in reverse chronological order."
)
def get_swipe_history(
    current_user: AuthenticatedUser = Depends(require_job_seeker),
    db_ctx=Depends(get_db_conn)
):
    conn, db_type = db_ctx
    repo = SwipeRepository(conn, db_type)
    history = repo.get_swipe_history(user_id=current_user.user_id)
    return history
