import csv


def analyze_hiring_trends(csv_path):
    jobs = []

    with open(csv_path, "r", encoding="utf-8") as file:
        reader = csv.DictReader(file)

        for row in reader:
            jobs.append(row)

    # Job title demand
    job_title_demand = {}

    for job in jobs:
        title = job["job_title"]
        job_title_demand[title] = job_title_demand.get(title, 0) + 1

    # Location demand
    location_demand = {}

    for job in jobs:
        location = job["location"]
        location_demand[location] = location_demand.get(location, 0) + 1

    # Skill demand
    skill_demand = {}

    for job in jobs:
        skills = job["required_skills"].split("|")

        for skill in skills:
            skill = skill.strip().lower()
            skill_demand[skill] = skill_demand.get(skill, 0) + 1

    # Average salary
    salaries = [
        float(job["salary"])
        for job in jobs
        if job["salary"]
    ]

    average_salary = (
        sum(salaries) / len(salaries)
        if salaries else 0
    )

    return {
        "total_jobs": len(jobs),
        "job_title_demand": job_title_demand,
        "location_demand": location_demand,
        "skill_demand": skill_demand,
        "average_salary": round(average_salary, 2)
    }