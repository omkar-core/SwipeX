from app.semantic_engine import calculate_semantic_similarity
from app.ats_semantic import calculate_blended_ats


resume_text = """
Python developer with experience in Python,
SQL, Git, FastAPI and REST APIs.
"""

job_text = """
We are looking for a Python developer
with Python, SQL, Git, FastAPI and API
development experience.
"""


keyword_score = 75.0

semantic_similarity = calculate_semantic_similarity(
    resume_text,
    job_text
)

final_score = calculate_blended_ats(
    keyword_score,
    semantic_similarity
)

print("DAY 4 ATS RESULT")
print("====================")

print(
    "Keyword Score:",
    keyword_score,
    "%"
)

print(
    "Semantic Similarity:",
    round(semantic_similarity, 4)
)

print(
    "Semantic Score:",
    round(semantic_similarity * 100, 2),
    "%"
)

print(
    "Final Blended ATS Score:",
    final_score,
    "%"
)