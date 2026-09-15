"""
Pydantic API schemas for Swipe functionality in Job & Data Intelligence Service.
Matches SRS Section 7.2 interface contract.
"""
import uuid
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class SwipeDirectionEnum(str, Enum):
    RIGHT = "RIGHT"
    LEFT = "LEFT"


class SwipeCreateSchema(BaseModel):
    job_id: str = Field(..., description="Target job UUID string", json_schema_extra={"example": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"})
    direction: SwipeDirectionEnum = Field(..., description="Swipe direction ('RIGHT' or 'LEFT')", json_schema_extra={"example": "RIGHT"})

    model_config = {
        "json_schema_extra": {
            "example": {
                "job_id": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
                "direction": "RIGHT"
            }
        }
    }

    @field_validator("job_id")
    @classmethod
    def validate_job_id_uuid(cls, v: str) -> str:
        if not v or not isinstance(v, str):
            raise ValueError("job_id must be a non-empty string.")
        try:
            val_uuid = uuid.UUID(v.strip())
            return str(val_uuid)
        except (ValueError, TypeError, AttributeError):
            raise ValueError("Invalid job_id format. Must be a valid UUID string.")


class SwipeResponseSchema(BaseModel):
    swipe_id: str = Field(..., description="Generated swipe record UUID")


class SwipeHistoryItemSchema(BaseModel):
    job_id: str = Field(..., description="Target job UUID")
    direction: str = Field(..., description="Swipe direction ('RIGHT' or 'LEFT')")
    swiped_at: str = Field(..., description="ISO-8601 timestamp of swipe action")
