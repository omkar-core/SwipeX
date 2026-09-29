import spacy

from app.skills_dictionary import get_all_skills


nlp = spacy.load("en_core_web_sm")


def extract_skills(text: str):
    """Extract skills using spaCy and curated skill dictionary."""

    doc = nlp(text.lower())

    extracted_skills = set()

    # Dictionary-based skill matching
    for skill in get_all_skills():
        if skill.lower() in doc.text:
            extracted_skills.add(skill)

    # spaCy entity extraction
    for entity in doc.ents:
        if entity.label_ in {"ORG", "PRODUCT", "GPE"}:
            extracted_skills.add(entity.text.lower())

    return sorted(extracted_skills)