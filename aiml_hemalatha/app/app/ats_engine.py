def normalize_items(items):
    if not items:
        return set()

    if isinstance(items, str):
        items = items.split(",")

    return {
        str(item).strip().lower()
        for item in items
        if item and str(item).strip()
    }


def calculate_ats_score(resume_skills, required_skills):
    resume_set = normalize_items(resume_skills)
    required_set = normalize_items(required_skills)

    if not required_set:
        return {
            "keyword_match_percentage": 0.0,
            "matched_skills": [],
            "missing_skills": []
        }

    matched_skills = resume_set.intersection(required_set)
    missing_skills = required_set - resume_set

    score = (len(matched_skills) / len(required_set)) * 100

    return {
        "keyword_match_percentage": round(score, 2),
        "matched_skills": sorted(matched_skills),
        "missing_skills": sorted(missing_skills)
    }