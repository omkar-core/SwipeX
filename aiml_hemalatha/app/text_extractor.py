import re
from pathlib import Path

import pdfplumber
from docx import Document


def clean_text(text: str) -> str:
    """Clean extracted resume text."""
    text = text.replace("\x00", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_from_pdf(file_path: str) -> str:
    """Extract text from PDF resume."""
    text = ""

    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            text += page_text + "\n"

    return clean_text(text)


def extract_from_docx(file_path: str) -> str:
    """Extract text from DOCX resume."""
    document = Document(file_path)

    paragraphs = []

    for paragraph in document.paragraphs:
        if paragraph.text.strip():
            paragraphs.append(paragraph.text)

    text = "\n".join(paragraphs)

    return clean_text(text)


def extract_resume_text(file_path: str) -> str:
    """Extract text based on file extension."""
    extension = Path(file_path).suffix.lower()

    if extension == ".pdf":
        return extract_from_pdf(file_path)

    elif extension == ".docx":
        return extract_from_docx(file_path)

    else:
        raise ValueError("Only PDF and DOCX files are supported.")