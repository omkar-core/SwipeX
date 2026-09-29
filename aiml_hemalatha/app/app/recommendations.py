from app.job_data import get_jobs
from app.ats import calculate_ats_score
from app.semantic_engine import calculate_semantic_similarity
from app.swipes import get_user_swipes


def get_swipe_score(user_id, job_id):
    if not user_id:
        return 50.0

    swipes = get_user_swipes(user_id)

    for swipe in reversed(swipes):
        if swipe["job_id"] == str(job_id):

            if swipe["action"] == "like":
                return 100.0

            if swipe["action"] == "dislike":
                return 0.0

    return 50.0


def get_recommendations(
    resume_skills,
    resume_text="",
    user_id=None,
    limit=10
):
    """
    Generate recommendations using:
    - skill matching
    - semantic similarity
    - swipe history
    """

    jobs = get_jobs()

    recommendations = []

    for _, job in jobs.iterrows():

        result = calculate_ats_score(
            resume_skills,
            job["required_skills"]
        )

        keyword_score = result["score"]

        # Support both lowercase and title-case dataset columns
        job_title = (
            job.get("job_title")
            or job.get("Job Title")
            or "Unknown Role"
        )

        location = (
            job.get("location")
            or job.get("Location")
            or "Remote"
        )

        job_text = f"{job_title} {location}"

        resume_text_for_similarity = (
            resume_text
            if resume_text
            else f"Skills: {', '.join(resume_skills)}"
        )

        semantic_similarity = calculate_semantic_similarity(
            resume_text_for_similarity,
            job_text
        )

        semantic_score = semantic_similarity * 100

        swipe_score = get_swipe_score(
            user_id,
            job["job_id"]
        )

        recommendation_score = (
            keyword_score * 0.4
            + semantic_score * 0.4
            + swipe_score * 0.2
        )

        reason_tags = []

        if result["matched_skills"]:
            reason_tags.append("Matches your skills")

        if semantic_score >= 70:
            reason_tags.append("Strong semantic match")

        if swipe_score == 100:
            reason_tags.append("Previously liked")

        elif swipe_score == 0:
            reason_tags.append("Previously disliked")

        if not reason_tags:
            reason_tags.append("Low match")

        salary = job.get(
            "Salary",
            job.get("salary", 0)
        )

        monthly_salary = job.get(
            "Monthly Salary",
            job.get("monthly_salary", 0)
        )

        recommendation = {
            "job_id": str(job["job_id"]),
            "title": str(job_title),

            "required_skills":
                job["required_skills"],

            "matched_skills":
                result["matched_skills"],

            "missing_skills":
                result["missing_skills"],

            "keyword_score":
                keyword_score,

            "semantic_score":
                round(semantic_score, 2),

            "swipe_score":
                swipe_score,

            "recommendation_score":
                round(recommendation_score, 2),

            "reason_tags":
                reason_tags,

            "location":
                str(location),

            "salary":
                salary,

            "monthly_salary":
                monthly_salary
        }

        recommendations.append(
            recommendation
        )

    recommendations.sort(
        key=lambda x: x["recommendation_score"],
        reverse=True
    )

    return recommendations[:limit]