import time

from app.semantic_engine import calculate_semantic_similarity


resume_text = """
Python developer with Python, SQL and Git experience.
"""

job_text = """
Python Developer required with Python, SQL, Git and API skills.
"""


# First call warms up the model
calculate_semantic_similarity(resume_text, job_text)


# Measure actual repeated calculation
start = time.perf_counter()

for _ in range(5):
    calculate_semantic_similarity(
        resume_text,
        job_text
    )

end = time.perf_counter()

total_time = end - start
average_time = total_time / 5

print("Total time for 5 calculations:", round(total_time, 4), "seconds")
print("Average time per calculation:", round(average_time, 4), "seconds")
print("Average time in milliseconds:", round(average_time * 1000, 2), "ms")