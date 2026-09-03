def calculate_ats_score(resume_skills, required_skills):
    """
    Calculate ATS score using rule-based skill matching.

    No trained AI or Machine Learning model is used.
    """

    # Handle empty values
    resume_skills = resume_skills or []
    required_skills = required_skills or []

    # Normalize resume skills
    normalized_resume_skills = {
        str(skill).lower().strip()
        for skill in resume_skills
        if str(skill).strip()
    }

    # Normalize required skills
    normalized_required_skills = {
        str(skill).lower().strip()
        for skill in required_skills
        if str(skill).strip()
    }

    # Find matched skills
    matched_skills = (
        normalized_resume_skills
        .intersection(normalized_required_skills)
    )

    # Find missing skills
    missing_skills = (
        normalized_required_skills
        - normalized_resume_skills
    )

    # Calculate score
    if not normalized_required_skills:
        score = 0.0
    else:
        score = round(
            (
                len(matched_skills)
                / len(normalized_required_skills)
            ) * 100,
            2
        )

    return {
        "score": score,
        "matched_skills": sorted(matched_skills),
        "missing_skills": sorted(missing_skills)
    }