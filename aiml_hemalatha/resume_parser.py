from fastapi import UploadFile, File
from resume_parser import parse_resume
import io
import os

import pdfplumber


SKILL_KEYWORDS = [
    "python",
    "java",
    "javascript",
    "typescript",
    "sql",
    "nosql",
    "react",
    "angular",
    "vue",
    "node.js",
    "django",
    "flask",
    "fastapi",
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "git",
    "machine learning",
    "deep learning",
    "nlp",
    "pandas",
    "numpy",
    "scikit-learn",
    "tensorflow",
    "pytorch",
    "html",
    "css",
    "rest api",
    "graphql",
    "postgresql",
    "mongodb",
    "redis",
    "linux",
    "ci/cd",
    "agile",
    "communication",
    "leadership",
]


class UnsupportedFileType(Exception):
    pass


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

    return text


def extract_skills(text: str) -> List[str]:
    lowered = text.lower()

    return [
        skill
        for skill in SKILL_KEYWORDS
        if skill in lowered
    ]


def parse_resume(file_bytes: bytes, filename: str):
    extension = os.path.splitext(filename)[1].lower()

    if extension == ".pdf":
        text = extract_text_from_pdf(file_bytes)

    elif extension == ".txt":
        text = file_bytes.decode(
            "utf-8",
            errors="ignore"
        )

    else:
        raise UnsupportedFileType(
            "Only .pdf and .txt files are supported."
        )

    if not text.strip():
        raise ValueError(
            "Could not extract any text from resume."
        )

    skills = extract_skills(text)

    return {
        "parsed_skills": skills,
        "raw_text_preview": text[:500],
    }
@app.post("/gateway/resume")
async def upload_resume(file: UploadFile = File(...)):

    try:
        file_bytes = await file.read()

        result = parse_resume(
            file_bytes,
            file.filename
        )

        return {
            "status": "success",
            "filename": file.filename,
            "resume": result
        }

    except Exception as e:

        return {
            "status": "error",
            "error": str(e),
            "error_type": type(e).__name__
        }