import pandas as pd

from app.recommendations import get_recommendations


def test_recommendations_rank_highest_match_first(monkeypatch):

    sample_jobs = pd.DataFrame([
        {
            "job_id": "1",
            "Job Title": "Python Developer",
            "Location": "Hyderabad",
            "required_skills": [
                "python",
                "sql"
            ]
        },
        {
            "job_id": "2",
            "Job Title": "Java Developer",
            "Location": "Bangalore",
            "required_skills": [
                "java",
                "spring"
            ]
        },
        {
            "job_id": "3",
            "Job Title": "Data Analyst",
            "Location": "Chennai",
            "required_skills": [
                "python",
                "sql",
                "excel"
            ]
        }
    ])

    def mock_get_jobs():
        return sample_jobs

    monkeypatch.setattr(
        "app.recommendations.get_jobs",
        mock_get_jobs
    )

    result = get_recommendations(
        ["python", "sql"],
        limit=10
    )

    # Python Developer has 100% match
    assert result[0]["job_id"] == "1"
    assert result[0]["match_score"] == 100.0

    # Results should be sorted from high to low
    assert result[0]["match_score"] >= result[1]["match_score"]
    assert result[1]["match_score"] >= result[2]["match_score"]


def test_recommendation_contains_matched_skills(monkeypatch):

    sample_jobs = pd.DataFrame([
        {
            "job_id": "1",
            "Job Title": "Python Developer",
            "required_skills": [
                "python",
                "sql",
                "git"
            ]
        }
    ])

    monkeypatch.setattr(
        "app.recommendations.get_jobs",
        lambda: sample_jobs
    )

    result = get_recommendations(
        ["python", "sql"],
        limit=10
    )

    assert result[0]["matched_skills"] == [
        "python",
        "sql"
    ]

    assert result[0]["missing_skills"] == [
        "git"
    ]

    assert result[0]["match_score"] == 86.67


def test_recommendation_limit(monkeypatch):

    sample_jobs = pd.DataFrame([
        {
            "job_id": str(i),
            "Job Title": f"Job {i}",
            "required_skills": ["python"]
        }
        for i in range(20)
    ])

    monkeypatch.setattr(
        "app.recommendations.get_jobs",
        lambda: sample_jobs
    )

    result = get_recommendations(
        ["python"],
        limit=5
    )

    assert len(result) == 5


def test_no_matching_skills(monkeypatch):

    sample_jobs = pd.DataFrame([
        {
            "job_id": "1",
            "Job Title": "Java Developer",
            "required_skills": [
                "java",
                "spring"
            ]
        }
    ])

    monkeypatch.setattr(
        "app.recommendations.get_jobs",
        lambda: sample_jobs
    )

    result = get_recommendations(
        ["python"],
        limit=10
    )

    assert result[0]["match_score"] == 0.0
    assert result[0]["matched_skills"] == []
    assert result[0]["missing_skills"] == [
        "java",
        "spring"
    ]