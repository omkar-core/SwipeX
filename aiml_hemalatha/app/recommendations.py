from app.job_data import get_jobs
from app.ats import calculate_ats_score


def get_recommendations(resume_skills, limit=10):
    """
    Generate job recommendations using simple rule-based
    skill matching.

    This implementation is heuristic-based and does not use
    a trained AI or Machine Learning model.
    """

    jobs = get_jobs()

    recommendations = []

    for _, job in jobs.iterrows():

        # Calculate skill match between resume and job
        result = calculate_ats_score(
            resume_skills,
            job["required_skills"]
        )

        recommendation = {
            "job_id": str(job["job_id"]),
            "title": job["Job Title"],
            "required_skills": job["required_skills"],
            "matched_skills": result["matched_skills"],
            "missing_skills": result["missing_skills"],
            "match_score": result["score"]
        }

        # Add optional columns only if they exist
        if "Location" in job.index:
            recommendation["location"] = job["Location"]

        if "Salary" in job.index:
            recommendation["salary"] = job["Salary"]

        if "Monthly Salary" in job.index:
            recommendation["monthly_salary"] = job["Monthly Salary"]

        recommendations.append(recommendation)

    # Highest matching jobs first
    recommendations.sort(
        key=lambda x: x["match_score"],
        reverse=True
    )

    return recommendations[:limit]