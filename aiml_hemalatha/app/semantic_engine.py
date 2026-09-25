from sentence_transformers import SentenceTransformer


MODEL_NAME = "all-MiniLM-L6-v2"

model = SentenceTransformer(MODEL_NAME)


def create_embedding(text):
    embedding = model.encode(text)

    return embedding.tolist()


def calculate_semantic_similarity(resume_text, job_text):
    resume_embedding = model.encode(resume_text)
    job_embedding = model.encode(job_text)

    similarity = model.similarity(
        resume_embedding,
        job_embedding
    )

    return float(similarity[0][0])