from app.job_data import get_jobs
from app.ats import calculate_ats_score


def normalize_column_name(df, old_name, new_name):
    """Rename column if exists, for test/prod compatibility"""
    if old_name in df.columns and new_name not in df.columns:
        df = df.rename(columns={old_name: new_name})
    return df


def get_recommendations(resume_skills, limit=10):
    """
    Generate job recommendations using
    rule-based skill matching.
    """

    jobs = get_jobs()

    # Normalize column names for test compatibility
    jobs = normalize_column_name(jobs, "Job Title", "job_title")
    jobs = normalize_column_name(jobs, "Location", "location")

    recommendations = []

    for _, job in jobs.iterrows():

        result = calculate_ats_score(
            resume_skills,
            job.get("required_skills", [])
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

        job_title = job.get(
            "job_title",
            job.get("Job Title", "Unknown")
        )

        location = job.get(
            "location",
            job.get("Location", "")
        )

        recommendation = {

            "job_id": str(
                job["job_id"]
            ),

            "title": str(
                job_title
            ),

            "required_skills":
                job.get("required_skills", []),

            "matched_skills":
                result["matched_skills"],

            "missing_skills":
                result["missing_skills"],

            "match_score":
                result["score"],

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
        key=lambda x: x["match_score"],
        reverse=True
    )

    return recommendations[:limit]


