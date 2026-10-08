from app.recommendations import get_recommendations
from app.swipes import add_swipe


resume_skills = [
    "python",
    "sql",
    "git"
]

resume_text = """
Python developer with experience in Python,
SQL, Git, FastAPI and REST APIs.
"""

user_id = "USER001"


# Add swipe history
add_swipe(
    user_id,
    "JOB001",
    "like"
)

add_swipe(
    user_id,
    "JOB002",
    "dislike"
)


recommendations = get_recommendations(
    resume_skills,
    resume_text,
    user_id,
    limit=10
)


print("PERSONALIZED JOB RECOMMENDATIONS")
print("================================")

for job in recommendations:

    print()
    print("Job:", job["title"])
    print("Keyword Score:", job["keyword_score"])
    print("Semantic Score:", job["semantic_score"])
    print("Swipe Score:", job["swipe_score"])
    print(
        "Recommendation Score:",
        job["recommendation_score"]
    )
    print("Reason:", job["reason_tags"])