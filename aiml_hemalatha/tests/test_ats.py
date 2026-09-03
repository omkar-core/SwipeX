from app.ats import calculate_ats_score


def test_all_skills_match():

    result = calculate_ats_score(
        ["python", "sql", "fastapi"],
        ["python", "sql", "fastapi"]
    )

    assert result["score"] == 100.0
    assert result["missing_skills"] == []


def test_partial_skills_match():

    result = calculate_ats_score(
        ["python", "sql"],
        ["python", "sql", "fastapi", "git"]
    )

    assert result["score"] == 50.0

    assert result["matched_skills"] == [
        "python",
        "sql"
    ]

    assert result["missing_skills"] == [
        "fastapi",
        "git"
    ]


def test_no_skills_match():

    result = calculate_ats_score(
        ["java"],
        ["python", "sql"]
    )

    assert result["score"] == 0.0
    assert result["matched_skills"] == []


def test_empty_required_skills():

    result = calculate_ats_score(
        ["python"],
        []
    )

    assert result["score"] == 0.0


def test_case_insensitive_matching():

    result = calculate_ats_score(
        ["PYTHON", "Sql"],
        ["python", "SQL"]
    )

    assert result["score"] == 100.0