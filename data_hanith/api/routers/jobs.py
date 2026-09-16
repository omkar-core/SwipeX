"""
FastAPI Router for Job Endpoints.
Implements GET /api/v1/jobs, GET /api/v1/jobs/search, and GET /api/v1/jobs/{job_id}
per SRS Section 7.2 contract. /search is registered BEFORE /{job_id} to prevent
the literal string 'search' from being captured by the UUID path parameter.
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from api.dependencies import get_db_conn, get_optional_current_user, AuthenticatedUser
from api.schemas.job import JobSummarySchema, JobDetailSchema, ErrorResponseSchema
from db.repositories.job_repository import JobRepository
from db.repositories.swipe_repository import SwipeRepository
from db.cache import get_cache_service, RedisCacheService

router = APIRouter(
    prefix="/api/v1/jobs",
    tags=["Jobs"],
    responses={
        400: {"model": ErrorResponseSchema, "description": "Invalid query parameters or UUID format"},
        404: {"model": ErrorResponseSchema, "description": "Job not found"}
    }
)


@router.get(
    "",
    response_model=List[JobSummarySchema],
    status_code=status.HTTP_200_OK,
    summary="List paginated jobs with search and filter parameters",
    description="""
Returns a paginated list of job summaries matching search criteria.

Supported Filters:
- **type**: Company type (case-insensitive exact match)
- **location**: Location name (case-insensitive partial substring match)
- **remote**: Remote work mode filter (`true` maps to work_mode='REMOTE')
- **salary_min / salary_max**: Salary range overlap filter (excludes undisclosed salary jobs)
- **skills**: Comma-separated list of skills (case-insensitive OR / match-any semantics)

Feed Exclusion:
- If authenticated as a Job Seeker, automatically excludes jobs previously swiped (RIGHT or LEFT) by the user.
- Unauthenticated requests browse all jobs without exclusion.
    """
)
def list_jobs(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Page size limit (1 to 100)"),
    type: Optional[str] = Query(None, description="Company type filter"),
    location: Optional[str] = Query(None, description="Location substring filter"),
    remote: Optional[str] = Query(None, description="Comma-separated work modes: Remote,Hybrid,On-site"),
    salary_min: Optional[float] = Query(None, ge=0, description="Minimum salary boundary"),
    salary_max: Optional[float] = Query(None, ge=0, description="Maximum salary boundary"),
    skills: Optional[str] = Query(None, description="Comma-separated skill names"),
    q: Optional[str] = Query(None, description="Keyword search: title, description, or skills"),
    optional_user: Optional[AuthenticatedUser] = Depends(get_optional_current_user),
    db_ctx=Depends(get_db_conn)
):
    conn, db_type = db_ctx

    # Validate salary range bounds
    if salary_min is not None and salary_max is not None:
        if salary_min > salary_max:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="salary_min cannot be greater than salary_max"
            )

    # Parse skills parameter
    skills_list: Optional[List[str]] = None
    if skills and skills.strip():
        skills_list = [s.strip() for s in skills.split(",") if s.strip()]

    # Parse remote/work_mode parameter (CSV of Remote,Hybrid,On-site)
    work_modes: Optional[List[str]] = None
    if remote and remote.strip():
        work_modes = [m.strip().upper().replace("-", "") for m in remote.split(",") if m.strip()]

    # Resolve optional user identity for personalized feed exclusion
    user_id: Optional[str] = None
    exclude_ids: Optional[List[str]] = None
    cache_service = get_cache_service()

    if optional_user and optional_user.role in ("Job Seeker", "job_seeker"):
        user_id = optional_user.user_id
        # 1. Try fetching user's swiped job IDs from Redis
        swiped_set = cache_service.get_swiped_job_ids(user_id)
        if swiped_set is None:
            # Fallback to PostgreSQL durable source of truth
            swipe_repo = SwipeRepository(conn, db_type)
            swiped_set = swipe_repo.get_user_swiped_job_ids(user_id)
            cache_service.set_swiped_job_ids(user_id, swiped_set)
        
        if swiped_set:
            exclude_ids = list(swiped_set)

    # 2. Check Job Feed Result Cache (only for unsearched feed)
    cache_key = None
    if not q:
        cache_key = RedisCacheService.build_feed_cache_key(
            user_id=user_id,
            page=page,
            page_size=page_size,
            company_type=type,
            location=location,
            remote=remote,
            salary_min=salary_min,
            salary_max=salary_max,
            skills=skills_list
        )
        cached_results = cache_service.get_job_feed(cache_key)
        if cached_results is not None:
            return cached_results

    # 3. Query PostgreSQL Database (Source of truth)
    repo = JobRepository(conn, db_type)
    results = repo.list_jobs(
        page=page,
        page_size=page_size,
        type_param=type,
        location_param=location,
        work_mode_param=work_modes,
        salary_min=salary_min,
        salary_max=salary_max,
        skills_param=skills_list,
        exclude_job_ids=exclude_ids,
        keyword_param=q
    )

    # 4. Cache query results in Redis (only for unsearched feed)
    if cache_key:
        cache_service.set_job_feed(cache_key, results)

    return results


@router.get(
    "/search",
    response_model=List[JobSummarySchema],
    status_code=status.HTTP_200_OK,
    summary="Keyword search across job titles, descriptions, and skills",
    description="""
Searches jobs by keyword (title/description/skills substring) plus all standard filters.
Registered BEFORE /{job_id} so the literal path segment 'search' is not
mistaken for a job UUID.

Supported Filters:
- **q**: Keyword substring match against title, job description, and skills (case-insensitive)
- **location**: Location name (case-insensitive partial substring match)
- **remote**: Comma-separated work modes: Remote,Hybrid,On-site
- **salary_min / salary_max**: Salary range overlap filter
- **skills**: Comma-separated list of skills (case-insensitive OR / match-any semantics)
    """
)
def search_jobs(
    q: Optional[str] = Query(None, description="Keyword search: title, description, or skills"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Page size limit (1 to 100)"),
    location: Optional[str] = Query(None, description="Location substring filter"),
    remote: Optional[str] = Query(None, description="Comma-separated work modes: Remote,Hybrid,On-site"),
    salary_min: Optional[float] = Query(None, ge=0, description="Minimum salary boundary"),
    salary_max: Optional[float] = Query(None, ge=0, description="Maximum salary boundary"),
    skills: Optional[str] = Query(None, description="Comma-separated skill names"),
    optional_user: Optional[AuthenticatedUser] = Depends(get_optional_current_user),
    db_ctx=Depends(get_db_conn)
):
    conn, db_type = db_ctx

    if salary_min is not None and salary_max is not None:
        if salary_min > salary_max:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="salary_min cannot be greater than salary_max"
            )

    skills_list: Optional[List[str]] = None
    if skills and skills.strip():
        skills_list = [s.strip() for s in skills.split(",") if s.strip()]

    work_modes: Optional[List[str]] = None
    if remote and remote.strip():
        work_modes = [m.strip().upper().replace("-", "") for m in remote.split(",") if m.strip()]

    user_id: Optional[str] = None
    exclude_ids: Optional[List[str]] = None
    if optional_user and optional_user.role in ("Job Seeker", "job_seeker"):
        user_id = optional_user.user_id
        cache_service = get_cache_service()
        swiped_set = cache_service.get_swiped_job_ids(user_id)
        if swiped_set is None:
            swipe_repo = SwipeRepository(conn, db_type)
            swiped_set = swipe_repo.get_user_swiped_job_ids(user_id)
            cache_service.set_swiped_job_ids(user_id, swiped_set)
        if swiped_set:
            exclude_ids = list(swiped_set)

    repo = JobRepository(conn, db_type)
    results = repo.list_jobs(
        page=page,
        page_size=page_size,
        location_param=location,
        work_mode_param=work_modes,
        salary_min=salary_min,
        salary_max=salary_max,
        skills_param=skills_list,
        exclude_job_ids=exclude_ids,
        keyword_param=q
    )
    return results


@router.get(
    "/{job_id}",
    response_model=JobDetailSchema,
    status_code=status.HTTP_200_OK,
    summary="Get detailed job posting by UUID",
    description="Returns detailed job, company, experience, and skill information for a specific job UUID."
)
def get_job_detail(
    job_id: str,
    db_ctx=Depends(get_db_conn)
):
    # Validate job_id format as UUID
    try:
        uuid_obj = uuid.UUID(job_id)
        canonical_uuid = str(uuid_obj)
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid job_id format. Must be a valid UUID string."
        )

    conn, db_type = db_ctx
    repo = JobRepository(conn, db_type)
    job_detail = repo.get_job_by_id(canonical_uuid)

    if not job_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found"
        )

    return job_detail
