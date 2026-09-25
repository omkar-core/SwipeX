from app.text_extractor import extract_resume_text
from app.skill_extractor import extract_skills


def process_resume(file_path: str):
    text = extract_resume_text(file_path)
    skills = extract_skills(text)

    return {
        "raw_text": text,
        "skills": skills
    }