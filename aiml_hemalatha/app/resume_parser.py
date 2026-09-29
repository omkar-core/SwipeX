import io
import os
from typing import List

import pdfplumber
from docx import Document


# ==============================
# CUSTOM EXCEPTION
# ==============================

class UnsupportedFileType(Exception):
    pass


# ==============================
# SKILL KEYWORDS
# ==============================

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


# ==============================
# PDF TEXT EXTRACTION
# ==============================

def extract_text_from_pdf(file_bytes: bytes) -> str:

    text = ""

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:

        for page in pdf.pages:

            page_text = page.extract_text()

            if page_text:
                text += page_text + "\n"

    return text


# ==============================
# DOCX TEXT EXTRACTION
# ==============================

def extract_text_from_docx(file_bytes: bytes) -> str:

    document = Document(io.BytesIO(file_bytes))

    text = "\n".join(
        paragraph.text
        for paragraph in document.paragraphs
    )

    return text


# ==============================
# SKILL EXTRACTION
# ==============================

def extract_skills(text: str) -> List[str]:

    lowered = text.lower()

    return [
        skill
        for skill in SKILL_KEYWORDS
        if skill in lowered
    ]


# ==============================
# RESUME PARSER
# ==============================

def parse_resume(file_bytes: bytes, filename: str):

    extension = os.path.splitext(filename)[1].lower()

    # PDF
    if extension == ".pdf":

        text = extract_text_from_pdf(file_bytes)

    # DOCX
    elif extension == ".docx":

        text = extract_text_from_docx(file_bytes)

    # TXT
    elif extension == ".txt":

        text = file_bytes.decode(
            "utf-8",
            errors="ignore"
        )

    # Unsupported file
    else:

        raise UnsupportedFileType(
            "Only .pdf, .docx and .txt files are supported."
        )

    # Empty resume
    if not text.strip():

        raise ValueError(
            "Could not extract any text from resume."
        )

    # Extract skills
    skills = extract_skills(text)

    return {
        "parsed_skills": skills,
        "raw_text_preview": text[:500],
    }
