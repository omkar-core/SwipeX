from app.suggestions import generate_suggestions


resume_skills = [
    "python",
    "sql",
    "git"
]

missing_skills = [
    "api"
]

missing_keywords = [
    "api"
]


suggestions = generate_suggestions(
    resume_skills,
    missing_skills,
    missing_keywords
)


print("RESUME OPTIMIZATION SUGGESTIONS")
print("===============================")

for index, suggestion in enumerate(suggestions, start=1):
    print(f"{index}. {suggestion}")