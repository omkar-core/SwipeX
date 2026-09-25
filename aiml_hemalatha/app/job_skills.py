SKILL_MAP = {
    "python developer": [
        "python",
        "sql",
        "git",
        "api"
    ],

    "java developer": [
        "java",
        "sql",
        "spring",
        "git"
    ],

    "data analyst": [
        "python",
        "sql",
        "excel",
        "pandas"
    ],

    "frontend developer": [
        "html",
        "css",
        "javascript",
        "react"
    ],

    "embedded engineer": [
        "c",
        "embedded systems",
        "microcontroller",
        "arduino"
    ],

}


def get_required_skills(job_title):
    title = str(job_title).lower().strip()

    for job, skills in SKILL_MAP.items():
        if job in title:
            return skills

    return []