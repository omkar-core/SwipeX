def generate_recommendation_insight(
    job_title,
    match_score,
    semantic_score,
    matched_skills,
    missing_skills,
    swipe_score
):
    reasons = []

    if matched_skills:
        reasons.append("Matches your skills")

    if semantic_score >= 70:
        reasons.append("High semantic similarity")

    if swipe_score >= 100:
        reasons.append("Previously liked similar job")

    if missing_skills:
        reasons.append("Some skills are missing")

    return {
        "job_title": job_title,
        "match_score": match_score,
        "semantic_score": semantic_score,
        "swipe_score": swipe_score,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "reasons": reasons
    }