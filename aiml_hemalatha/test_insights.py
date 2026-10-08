from app.insights import generate_recommendation_insight


result = generate_recommendation_insight(
    job_title="Python Developer",
    match_score=82.69,
    semantic_score=68.48,
    matched_skills=["python", "sql", "git"],
    missing_skills=["api"],
    swipe_score=100
)

print("Recommendation Insight:")
print(result)