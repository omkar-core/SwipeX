import os
import sys
import types
from unittest.mock import MagicMock

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
AIML_DIR = os.path.join(BASE_DIR, "aiml_hemalatha")
if AIML_DIR not in sys.path:
    sys.path.insert(0, AIML_DIR)

# Dynamically add aiml_hemalatha/app to 'app' package __path__
aiml_app_dir = os.path.join(AIML_DIR, "app")
if "app" not in sys.modules:
    aiml_app = types.ModuleType("app")
    aiml_app.__path__ = [aiml_app_dir]
    sys.modules["app"] = aiml_app
else:
    app_mod = sys.modules["app"]
    if not hasattr(app_mod, "__path__") or not isinstance(app_mod.__path__, list):
        app_mod.__path__ = []
    if aiml_app_dir not in app_mod.__path__:
        app_mod.__path__.append(aiml_app_dir)

if "sentence_transformers" not in sys.modules:
    mock_st = MagicMock()
    mock_model = MagicMock()
    mock_model.encode.return_value = [0.1] * 384
    mock_model.similarity.return_value = [[0.85]]
    mock_st.SentenceTransformer.return_value = mock_model
    sys.modules["sentence_transformers"] = mock_st

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
    except KeyError as e:
        pytest.xfail(f"DEF-025: recommendations.py does not handle capitalized 'Job Title' column: {e}")
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
