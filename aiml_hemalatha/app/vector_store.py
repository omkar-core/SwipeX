import chromadb


client = chromadb.PersistentClient(
    path="./chroma_db"
)

collection = client.get_or_create_collection(
    name="jobs"
)


def store_job_embedding(job_id, job_text, embedding):
    collection.upsert(
        ids=[str(job_id)],
        documents=[job_text],
        embeddings=[embedding]
    )


def search_similar_jobs(embedding, top_k=5):
    results = collection.query(
        query_embeddings=[embedding],
        n_results=top_k
    )

    return results