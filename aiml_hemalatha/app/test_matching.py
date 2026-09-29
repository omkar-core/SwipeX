from app.matching import calculate_match_score

result = calculate_match_score(
    resume_skills=["python", "sql", "fastapi", "html"],
    required_skills=["python", "sql", "fastapi", "java"],
    candidate_location="Bangalore",
    job_location="Bangalore",
    candidate_experience=1,
    min_experience=0,
    swipe_signal=0
)

print(result)