def generate_suggestions(
    resume_skills,
    missing_skills,
    missing_keywords=None
):
    suggestions = []

    missing_skills = missing_skills or []
    missing_keywords = missing_keywords or []

    if missing_skills:
        for skill in missing_skills:
            suggestions.append(
                f"Consider adding relevant {skill} experience "
                f"or projects if you have them."
            )

    if missing_keywords:
        for keyword in missing_keywords:
            suggestions.append(
                f"Consider including the keyword '{keyword}' "
                f"in relevant resume sections if it accurately "
                f"describes your experience."
            )

    if resume_skills:
        suggestions.append(
            "Highlight your strongest matching skills "
            "in the skills and project sections."
        )

    if not suggestions:
        suggestions.append(
            "Your resume has a strong match with the selected job. "
            "Keep the most relevant skills and projects clearly visible."
        )

    return suggestions