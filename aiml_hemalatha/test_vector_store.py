from app.semantic_engine import create_embedding
from app.vector_store import store_job_embedding, search_similar_jobs


job_id = "JOB001"

job_text = """
Python Developer
Required Skills: Python, SQL, Git, API
Location: Bangalore
"""


# Create embedding for the job
job_embedding = create_embedding(job_text)

print("Embedding created:", len(job_embedding))


# Store job embedding in ChromaDB
store_job_embedding(
    job_id,
    job_text,
    job_embedding
)

print("Job stored successfully in ChromaDB")


# Search using the same embedding
results = search_similar_jobs(
    job_embedding,
    top_k=1
)

print("Search completed")
print("Found Job ID:", results["ids"][0][0])
