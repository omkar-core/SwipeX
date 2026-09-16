def calculate_match_score(
    resume_skills,
    required_skills,
    candidate_location,
    job_location,
    candidate_experience,
    min_experience,
    swipe_signal=0
):
    """
    Rule-based Matching Engine.

    Score components:
    Skills      = 50%
    Location    = 20%
    Experience  = 20%
    Swipe       = 10%
    """

    # Handle empty values
    resume_skills = resume_skills or []
    required_skills = required_skills or []

    # Convert skills to lowercase
    resume_skills = {
        skill.strip().lower()
        for skill in resume_skills
    }

    required_skills = {
        skill.strip().lower()
        for skill in required_skills
    }

    # ------------------------------------------------
    # 1. Skills Score - 50%
    # ------------------------------------------------

    if required_skills:
        matched_skills = resume_skills.intersection(required_skills)

        skills_score = (
            len(matched_skills) /
            len(required_skills)
        ) * 100
    else:
        matched_skills = set()
        skills_score = 0

    # ------------------------------------------------
    # 2. Location Score - 20%
    # ------------------------------------------------

    if (
        candidate_location
        and job_location
        and candidate_location.lower().strip()
        == job_location.lower().strip()
    ):
        location_score = 100
    else:
        location_score = 0

    # ------------------------------------------------
    # 3. Experience Score - 20%
    # ------------------------------------------------

    candidate_experience = candidate_experience or 0
    min_experience = min_experience or 0

    if candidate_experience >= min_experience:
        experience_score = 100
    else:
        experience_score = 0

    # ------------------------------------------------
    # 4. Swipe History Score - 10%
    # ------------------------------------------------

    # 1 = liked
    # 0 = neutral
    # -1 = skipped

    if swipe_signal == 1:
        swipe_score = 100
    elif swipe_signal == -1:
        swipe_score = 0
    else:
        swipe_score = 50

    # ------------------------------------------------
    # Final Weighted Score
    # ------------------------------------------------

    final_score = (
        skills_score * 0.50
        + location_score * 0.20
        + experience_score * 0.20
        + swipe_score * 0.10
    )

    return {
        "match_score": round(final_score, 2),
        "skills_score": round(skills_score, 2),
        "location_score": location_score,
        "experience_score": experience_score,
        "swipe_score": swipe_score,
        "matched_skills": sorted(matched_skills)
    }