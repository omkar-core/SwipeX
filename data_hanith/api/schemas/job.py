"""
Pydantic API schemas for Job & Data Intelligence Service.
Defines response models matching SRS Section 7.2 contract.
"""
from typing import List, Optional
from pydantic import BaseModel, Field


class CompanyDetailSchema(BaseModel):
    company_id: str = Field(..., description="Internal UUID of company")
    raw_company_id: int = Field(..., description="Raw dataset company identifier")
    name: Optional[str] = Field(None, description="Company name (null if undisclosed)")
    company_type: Optional[str] = Field(None, description="Company category (null in Dataset 1)")
    aggregate_rating: Optional[float] = Field(None, description="Aggregate user rating (0.0 to 5.0)")
    reviews_count: Optional[int] = Field(None, description="Total review count")


class JobSummarySchema(BaseModel):
    job_id: str = Field(..., description="Internal UUID of job posting")
    title: str = Field(..., description="Job title")
    company: Optional[str] = Field(None, description="Company name")
    type: Optional[str] = Field(None, description="Company type (null in Dataset 1)")
    location: str = Field(..., description="Job location")
    salary_range: Optional[str] = Field(None, description="Formatted raw salary string")
    skills: List[str] = Field(default_factory=list, description="Array of skill names")
    posted_at: str = Field(..., description="Verbatim relative posting string (e.g. '6 Days Ago')")


class JobDetailSchema(BaseModel):
    job_id: str = Field(..., description="Internal UUID of job posting")
    raw_job_id: int = Field(..., description="Raw dataset job identifier")
    title: str = Field(..., description="Job title")
    job_description: str = Field(..., description="Full job description")
    company: Optional[CompanyDetailSchema] = Field(None, description="Company details")
    min_salary: Optional[float] = Field(None, description="Minimum annual salary (null if undisclosed)")
    max_salary: Optional[float] = Field(None, description="Maximum annual salary (null if undisclosed)")
    currency: str = Field(..., description="Currency code (e.g. INR/USD)")
    salary_range: Optional[str] = Field(None, description="Raw salary string")
    min_experience: Optional[float] = Field(None, description="Minimum experience in years")
    max_experience: Optional[float] = Field(None, description="Maximum experience in years")
    experience_str: Optional[str] = Field(None, description="Raw experience string")
    location: str = Field(..., description="Job location")
    work_mode: Optional[str] = Field(None, description="Work mode (REMOTE/HYBRID/ONSITE, null in Dataset 1)")
    job_type: Optional[str] = Field(None, description="Job employment type (null in Dataset 1)")
    posted_at_raw: str = Field(..., description="Verbatim raw posted string")
    posted_at_approx: Optional[str] = Field(None, description="Normalized ISO 8601 timestamp")
    skills: List[str] = Field(default_factory=list, description="Array of skill names")


class ErrorResponseSchema(BaseModel):
    detail: str = Field(..., description="Error message description")
