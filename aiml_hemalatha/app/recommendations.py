from app.job_data import get_jobs
from app.ats import calculate_ats_score


def get_recommendations(resume_skills, limit=10):
    """
    Generate job recommendations using
    rule-based skill matching.
    """

    jobs = get_jobs()

    recommendations = []

    for _, job in jobs.iterrows():

        result = calculate_ats_score(
            resume_skills,
            job["required_skills"]
        )

        reason_tags = []

        if result["matched_skills"]:

            if result["score"] >= 70:

                reason_tags.append(
                    "Strong skill match"
                )

            else:

                reason_tags.append(
                    "Matches your skills"
                )

        else:

            reason_tags.append(
                "Low skill match"
            )

        # Handle salary column safely
        salary = job.get(
            "Salary",
            job.get("salary", 0)
        )

        monthly_salary = job.get(
            "Monthly Salary",
            job.get("monthly_salary", 0)
        )

        recommendation = {

            "job_id": str(
                job["job_id"]
            ),

            "title": str(
                job["job_title"]
            ),

            "required_skills":
                job["required_skills"],

            "matched_skills":
                result["matched_skills"],

            "missing_skills":
                result["missing_skills"],

            "match_score":
                result["score"],

            "reason_tags":
                reason_tags,

            "location":
                str(job["location"]),

            "salary":
                salary,

            "monthly_salary":
                monthly_salary
        }

        recommendations.append(
            recommendation
        )

    recommendations.sort(
        key=lambda x: x["match_score"],
        reverse=True
    )

    return recommendations[:limit]


