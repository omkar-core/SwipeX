from sklearn.metrics.pairwise import cosine_similarity

try:
    from sentence_transformers import SentenceTransformer
    model = SentenceTransformer("all-MiniLM-L6-v2")
except Exception:
    model = None


def create_embedding(text):
    if model is None:
        return None

    embedding = model.encode(text)
    return embedding.tolist()


def calculate_semantic_similarity(resume_text, job_text):
    if model is None:
        set_r = set(resume_text.lower().split())
        set_j = set(job_text.lower().split())

        return len(set_r & set_j) / max(len(set_r | set_j), 1)

    resume_embedding = model.encode(resume_text)
    job_embedding = model.encode(job_text)

    similarity = cosine_similarity(
        [resume_embedding],
        [job_embedding]
    )[0][0]

    return float(similarity)