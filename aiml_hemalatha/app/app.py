from fastapi import FastAPI, UploadFile, File
import re
import uuid

app = FastAPI()

SKILLS = [
    "python",
    "java",
    "javascript",
    "sql",
    "html",
    "css",
    "react",
    "fastapi",
    "machine learning",
    "c++",
    "c",
]

@app.get("/")
def home():
    return {"message": "Resume Service is running"}


@app.post("/api/v1/resume/upload")
async def upload_resume(file: UploadFile = File(...)):
    content = await file.read()

    text = content.decode("utf-8", errors="ignore").lower()

    parsed_skills = []

    for skill in SKILLS:
        pattern = r"\b" + re.escape(skill) + r"\b"

        if re.search(pattern, text):
            parsed_skills.append(skill)

    return {
        "resume_id": str(uuid.uuid4()),
        "parsed_skills": parsed_skills
    }
