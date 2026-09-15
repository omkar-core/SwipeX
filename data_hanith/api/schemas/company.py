"""
Pydantic API schemas for Company endpoints in Job & Data Intelligence Service.
Defines response models for company listings and detailed profiles.
"""
from typing import List, Optional
from pydantic import BaseModel, Field
from api.schemas.job import JobSummarySchema


class CompanySummarySchema(BaseModel):
    company_id: str = Field(..., description="Internal UUID of company")
    raw_company_id: int = Field(..., description="Raw dataset company identifier")
    name: Optional[str] = Field(None, description="Company name")
    company_type: Optional[str] = Field(None, description="Company category (null if unpopulated)")
    aggregate_rating: Optional[float] = Field(None, description="Aggregate user rating (0.0 to 5.0)")
    reviews_count: Optional[int] = Field(None, description="Total review count")
    about: Optional[str] = Field(None, description="Detailed company overview profile")
    size: Optional[str] = Field(None, description="Company size tier (e.g. '51-200')")
    industry: Optional[str] = Field(None, description="Industry classification")
    is_newly_founded: bool = Field(False, description="Startup / newly founded company flag")
    job_count: int = Field(0, description="Total number of active job postings for this company")


class CompanyDetailSchema(CompanySummarySchema):
    jobs: List[JobSummarySchema] = Field(default_factory=list, description="Active job listings associated with this company")
