"""
FastAPI Router for Company Endpoints.
Implements GET /api/v1/companies and GET /api/v1/companies/{company_id}.
"""
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status

from api.dependencies import get_db_conn
from api.schemas.company import CompanySummarySchema, CompanyDetailSchema
from api.schemas.job import ErrorResponseSchema
from db.repositories.company_repository import CompanyRepository

router = APIRouter(
    prefix="/api/v1/companies",
    tags=["Companies"],
    responses={
        400: {"model": ErrorResponseSchema, "description": "Invalid query parameters or UUID format"},
        404: {"model": ErrorResponseSchema, "description": "Company not found"}
    }
)


@router.get(
    "",
    response_model=List[CompanySummarySchema],
    status_code=status.HTTP_200_OK,
    summary="List paginated company profiles with optional filters",
    description="""
Returns a paginated list of company profiles matching search criteria.

Supported Filters:
- **newly_founded**: Filter startups / newly founded companies (`true` or `false`)
- **industry**: Substring filter for industry category
- **type**: Substring filter for company category
    """
)
def list_companies(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Page size limit (1 to 100)"),
    newly_founded: Optional[bool] = Query(None, description="Filter newly founded companies/startups"),
    industry: Optional[str] = Query(None, description="Industry category substring filter"),
    type: Optional[str] = Query(None, description="Company category filter"),
    db_ctx=Depends(get_db_conn)
):
    conn, db_type = db_ctx
    repo = CompanyRepository(conn, db_type)
    return repo.list_companies(
        page=page,
        page_size=page_size,
        newly_founded=newly_founded,
        industry=industry,
        company_type=type
    )


@router.get(
    "/{company_id}",
    response_model=CompanyDetailSchema,
    status_code=status.HTTP_200_OK,
    summary="Get detailed company profile by UUID",
    description="Returns detailed company profile information and active job postings for a specific company UUID."
)
def get_company_detail(
    company_id: str,
    db_ctx=Depends(get_db_conn)
):
    # Validate company_id format as UUID
    try:
        uuid_obj = uuid.UUID(company_id)
        canonical_uuid = str(uuid_obj)
    except (ValueError, TypeError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid company_id format. Must be a valid UUID string."
        )

    conn, db_type = db_ctx
    repo = CompanyRepository(conn, db_type)
    company_detail = repo.get_company_by_id(canonical_uuid)

    if not company_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company with ID '{company_id}' not found"
        )

    return company_detail
