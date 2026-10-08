from app.skill_gap import calculate_skill_gap


resume_skills = [
    "python",
    "sql",
    "git"
]

required_skills = [
    "python",
    "sql",
    "git",
    "api"
]

result = calculate_skill_gap(
    resume_skills,
    required_skills
)

print("Skill Gap Result:")
print(result)