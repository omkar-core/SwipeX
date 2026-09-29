from app.ats_engine import calculate_ats_score
from app.job_data import load_job_data


# Load India job-market data
df = load_job_data()

# Select Python Developer job
job = df[df["job_id"] == "JOB001"].iloc[0]

# Resume skills
resume_skills = [
    "python",
    "sql",
    "git"
]

# Get required skills from CSV
required_skills = job["required_skills"]

# Calculate ATS score
result = calculate_ats_score(
    resume_skills,
    required_skills
)

print("Job:", job["job_title"])
print("Required Skills:", required_skills)
print("Resume Skills:", resume_skills)
print("ATS Result:", result)