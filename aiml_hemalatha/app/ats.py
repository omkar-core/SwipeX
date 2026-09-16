def calculate_ats_score(resume_skills, required_skills):
    """
    Calculate ATS score using rule-based skill matching.

    No trained AI or Machine Learning model is used.
    """

    # Handle empty values
    resume_skills = resume_skills or []
    required_skills = required_skills or []

    # Convert resume skills to lowercase
    resume_skills = [
        str(skill).strip().lower()
        for skill in resume_skills
    ]

    # -------------------------------------------------
    # Convert required skills into a weighted dictionary
    # -------------------------------------------------

    if isinstance(required_skills, list):

        # Default weights
        default_weights = {
            "python": 40,
            "sql": 25,
            "fastapi": 20,
            "git": 10,
            "java": 30,
            "html": 10,
            "css": 10,
            "javascript": 20,
            "machine learning": 30,
            "data analysis": 25,
            "excel": 10,
            "power bi": 20,
            "react": 20,
            "node.js": 20,
            "c++": 30,
            "c": 20
        }

        weighted_skills = {}

        for skill in required_skills:
            skill = str(skill).strip().lower()

            # Use predefined weight if available
            # Otherwise give default weight of 10
            weighted_skills[skill] = default_weights.get(skill, 10)

        required_skills = weighted_skills

    # If required_skills is already a dictionary
    elif isinstance(required_skills, dict):

        required_skills = {
            str(skill).strip().lower(): weight
            for skill, weight in required_skills.items()
        }

    else:
        required_skills = {}

    # -------------------------------------------------
    # Calculate total weight
    # -------------------------------------------------

    total_weight = sum(required_skills.values())

    if total_weight == 0:
        return {
            "score": 0,
            "matched_skills": [],
            "missing_skills": []
        }

    # -------------------------------------------------
    # Match resume skills with job skills
    # -------------------------------------------------

    matched_skills = []
    missing_skills = []
    matched_weight = 0

    for skill, weight in required_skills.items():

        if skill in resume_skills:
            matched_skills.append(skill)
            matched_weight += weight
        else:
            missing_skills.append(skill)

    # -------------------------------------------------
    # Calculate ATS percentage
    # -------------------------------------------------

    score = round(
        (matched_weight / total_weight) * 100,
        2
    )

    # Make sure score is between 0 and 100
    score = min(max(score, 0), 100)

    return {
        "score": score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills
    }