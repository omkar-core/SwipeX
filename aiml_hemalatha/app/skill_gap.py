def calculate_skill_gap(resume_skills, required_skills):

    resume_skills = {
        skill.lower().strip()
        for skill in resume_skills
    }

    required_skills = {
        skill.lower().strip()
        for skill in required_skills
    }

    matched_skills = sorted(
        resume_skills.intersection(required_skills)
    )

    missing_skills = sorted(
        required_skills.difference(resume_skills)
    )

    total_required = len(required_skills)

    if total_required == 0:
        skill_gap_percentage = 0
    else:
        skill_gap_percentage = (
            len(missing_skills) / total_required
        ) * 100

    return {
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "skill_gap_percentage": round(
            skill_gap_percentage, 2
        )
    }