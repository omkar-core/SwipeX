"""Integration validation for aiml_hemalatha fixes."""
import sys
sys.path.insert(0, "../aiml_hemalatha")

import pandas as pd
import pytest

from app.recommendations import get_recommendations
from app.ats import calculate_ats_score


def test_column_name_compatibility():
    """Verify code handles both 'Job Title' and 'job_title'."""

    test_jobs = pd.DataFrame([
        {
            "job_id": "1",
            "Job Title": "Python Developer",
            "Location": "Hyderabad",
            "required_skills": ["python", "sql"]
        }
    ])

    import app.recommendations

    original_get_jobs = app.recommendations.get_jobs
    app.recommendations.get_jobs = lambda: test_jobs

    try:
        result = get_recommendations(["python"], limit=5)
        assert len(result) > 0
        assert "title" in result[0]
        assert result[0]["title"] == "Python Developer"
        assert result[0]["location"] == "Hyderabad"
    finally:
        app.recommendations.get_jobs = original_get_jobs


def test_column_name_job_title_lower():
    """Verify code also works when column is already lowercase 'job_title'."""

    test_jobs = pd.DataFrame([
        {
            "job_id": "2",
            "job_title": "Data Engineer",
            "location": "Bangalore",
            "required_skills": ["python", "sql", "etl"]
        }
    ])

    import app.recommendations

    original_get_jobs = app.recommendations.get_jobs
    app.recommendations.get_jobs = lambda: test_jobs

    try:
        result = get_recommendations(["python"], limit=5)
        assert len(result) > 0
        assert result[0]["title"] == "Data Engineer"
        assert result[0]["location"] == "Bangalore"
    finally:
        app.recommendations.get_jobs = original_get_jobs


def test_ats_score_is_reasonable():
    """Verify ATS scoring produces logical results."""

    result = calculate_ats_score(
        ["python", "sql"],
        ["python", "sql"]
    )
    assert result["score"] == 100.0

    result = calculate_ats_score(
        ["python", "sql"],
        ["python", "sql", "java", "c++"]
    )
    assert 0 < result["score"] < 100
    assert len(result["matched_skills"]) == 2

    result = calculate_ats_score(
        ["python"],
        ["java", "c++"]
    )
    assert result["score"] == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
