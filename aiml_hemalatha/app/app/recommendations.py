from app.job_data import get_jobs
from app.ats import calculate_ats_score
from app.semantic_engine import calculate_semantic_similarity
from app.swipes import get_user_swipes


def get_swipe_score(user_id, job_id):

    if not user_id:
        return 50.0

    swipes = get_user_swipes(user_id)

    # Check latest swipe first
    for swipe in reversed(swipes):

        if swipe["job_id"] == str(job_id):

            if swipe["action"] == "like":
                return 100.0

            if swipe["action"] == "dislike":
                return 0.0

    # No previous swipe
    return 50.0


def get_recommendations(
    resume_skills,
    resume_text="",
    user_id=None,
    limit=10
):
    """
    Generate personalized job recommendations using:

    1. Keyword / skill matching
    2. Semantic similarity
    3. Swipe history
    """

    jobs = get_jobs()

    recommendations = []

    for _, job in jobs.iterrows():

        # ==========================================
        # 1. KEYWORD ATS SCORE
        # ==========================================

        result = calculate_ats_score(
            resume_skills,
            job["required_skills"]
        )

        keyword_score = result["score"]

        # ==========================================
        # JOB INFORMATION
        # ==========================================

        job_title = str(
            job.get(
                "job_title",
                "Unknown Role"
            )
        )

        location = str(
            job.get(
                "location",
                "Remote"
            )
        )

        required_skills = job.get(
            "required_skills",
            []
        )

        # Make sure skills are a list
        if isinstance(
            required_skills,
            str
        ):
            required_skills = [
                skill.strip().lower()
                for skill in required_skills.split("|")
                if skill.strip()
            ]

        # ==========================================
        # 2. SEMANTIC MATCHING
        # ==========================================

        # Create complete job text
        job_text = (
            f"Job Title: {job_title}. "
            f"Required Skills: "
            f"{', '.join(required_skills)}. "
            f"Location: {location}."
        )

        # Resume text
        if resume_text:

            resume_text_for_similarity = (
                resume_text
            )

        else:

            resume_text_for_similarity = (
                "Candidate Skills: "
                + ", ".join(resume_skills)
            )

        semantic_similarity = (
            calculate_semantic_similarity(
                resume_text_for_similarity,
                job_text
            )
        )

        semantic_score = (
            semantic_similarity * 100
        )

        # ==========================================
        # 3. SWIPE SCORE
        # ==========================================

        swipe_score = get_swipe_score(
            user_id,
            job["job_id"]
        )

        # ==========================================
        # 4. FINAL RECOMMENDATION SCORE
        # ==========================================

        recommendation_score = (
            keyword_score * 0.4
            + semantic_score * 0.4
            + swipe_score * 0.2
        )

        # ==========================================
        # 5. REASON TAGS
        # ==========================================

        reason_tags = []

        if result["matched_skills"]:

            reason_tags.append(
                "Matches your skills"
            )

        if semantic_score >= 70:

            reason_tags.append(
                "Strong semantic match"
            )

        if swipe_score == 100:

            reason_tags.append(
                "Previously liked"
            )

        elif swipe_score == 0:

            reason_tags.append(
                "Previously disliked"
            )

        if not reason_tags:

            reason_tags.append(
                "Low match"
            )

        # ==========================================
        # 6. SALARY
        # ==========================================

        salary = job.get(
            "Salary",
            job.get("salary", 0)
        )

        monthly_salary = job.get(
            "Monthly Salary",
            job.get("monthly_salary", 0)
        )

        # ==========================================
        # 7. FINAL RECOMMENDATION OBJECT
        # ==========================================

        recommendation = {

            "job_id":
                str(job["job_id"]),

            "title":
                job_title,

            "required_skills":
                required_skills,

            "matched_skills":
                result["matched_skills"],

            "missing_skills":
                result["missing_skills"],

            "keyword_score":
                round(keyword_score, 2),

            "semantic_score":
                round(semantic_score, 2),

            "swipe_score":
                swipe_score,

            "recommendation_score":
                round(
                    recommendation_score,
                    2
                ),

            "reason_tags":
                reason_tags,

            "location":
                location,

            "salary":
                salary,

            "monthly_salary":
                monthly_salary
        }

        recommendations.append(
            recommendation
        )

    # ==========================================
    # 8. SORT BY FINAL SCORE
    # ==========================================

    recommendations.sort(
        key=lambda x:
        x["recommendation_score"],
        reverse=True
    )

    # Return top N jobs
    return recommendations[:limit]