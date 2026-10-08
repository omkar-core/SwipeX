def calculate_skill_score(user_skills, required_skills):
    user_skills = {
        skill.lower().strip()
        for skill in user_skills
    }

    required_skills = {
        skill.lower().strip()
        for skill in required_skills
    }

    if not required_skills:
        return 0

    matched_skills = user_skills.intersection(required_skills)

    return round(
        len(matched_skills) / len(required_skills) * 100,
        2
    )


def calculate_location_score(user_location, job_location):
    if not user_location or not job_location:
        return 0

    if user_location.lower().strip() == job_location.lower().strip():
        return 100

    return 0


def calculate_match_score(
    user_skills,
    user_location,
    job
):
    skill_score = calculate_skill_score(
        user_skills,
        job.get("required_skills", [])
    )

    location_score = calculate_location_score(
        user_location,
        job.get("location", "")
    )

    # Experience and swipe history
    # will be integrated in later stages.
    experience_score = 0
    swipe_score = 0

    final_score = (
        0.50 * skill_score
        + 0.20 * location_score
        + 0.20 * experience_score
        + 0.10 * swipe_score
    )

    return round(final_score, 2)