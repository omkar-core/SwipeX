"""
ai_vector_mock.py - Deterministic AI, Embeddings & Vector DB (ChromaDB) mocks for M3 testing.
Zero external calls, zero API token costs, sub-millisecond execution.
"""
from typing import List, Dict, Any, Optional
import hashlib
import math


class FakeEmbeddingService:
    """
    Deterministic embedding generator producing normalized 384-dimensional vectors.
    Matches sentence-transformers (all-MiniLM-L6-v2) output dimension without model downloads.
    """
    def __init__(self, dimension: int = 384):
        self.dimension = dimension

    def embed_text(self, text: str) -> List[float]:
        """Converts arbitrary text into a deterministic, unit-length normalized float vector."""
        if not text:
            return [0.0] * self.dimension

        # Generate a seed from sha256 of text
        h = hashlib.sha256(text.encode("utf-8")).digest()
        raw_vals = []
        for i in range(self.dimension):
            # Deterministic pseudo-random float between -1.0 and 1.0
            byte_val = h[i % len(h)]
            # modulate with index
            val = math.sin((byte_val + i) * 0.1)
            raw_vals.append(val)

        # L2-normalize
        norm = math.sqrt(sum(v * v for v in raw_vals)) or 1.0
        return [v / norm for v in raw_vals]


class FakeVectorStore:
    """
    In-memory simulation of ChromaDB collection.
    Supports upserting vectors, metadata, and calculating cosine-similarity queries.
    """
    def __init__(self, collection_name: str = "jobs_resumes"):
        self.collection_name = collection_name
        # id -> {"id": str, "vector": List[float], "metadata": Dict, "document": str}
        self.records: Dict[str, Dict[str, Any]] = {}

    def add(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        metadatas: Optional[List[Dict[str, Any]]] = None,
        documents: Optional[List[str]] = None
    ) -> None:
        """Adds or updates records in the vector collection."""
        metadatas = metadatas or [{} for _ in ids]
        documents = documents or ["" for _ in ids]

        for doc_id, emb, meta, doc in zip(ids, embeddings, metadatas, documents):
            self.records[doc_id] = {
                "id": doc_id,
                "vector": emb,
                "metadata": meta,
                "document": doc
            }

    def query(
        self,
        query_embedding: List[float],
        n_results: int = 5,
        where: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Calculates cosine similarity between query_embedding and all stored vectors.
        Returns top n_results ranked by similarity score.
        """
        scores = []
        for doc_id, rec in self.records.items():
            # Check metadata filters if given
            if where:
                match = True
                for k, v in where.items():
                    if rec["metadata"].get(k) != v:
                        match = False
                        break
                if not match:
                    continue

            # Dot product (since vectors are L2-normalized)
            v = rec["vector"]
            dot_product = sum(q * r for q, r in zip(query_embedding, v))
            scores.append((dot_product, rec))

        # Sort descending by score
        scores.sort(key=lambda x: x[0], reverse=True)
        top = scores[:n_results]

        return {
            "ids": [[item[1]["id"] for item in top]],
            "scores": [[item[0] for item in top]],
            "metadatas": [[item[1]["metadata"] for item in top]],
            "documents": [[item[1]["document"] for item in top]]
        }

    def count(self) -> int:
        return len(self.records)

    def clear(self) -> None:
        self.records.clear()


class FakeLLMSuggestionsService:
    """
    Deterministic AI resume suggestion generator.
    Simulates LLM response according to Milestone 3 schema without external API calls.
    """
    def generate_suggestions(
        self,
        resume_text: str,
        job_description: str,
        missing_skills: List[str]
    ) -> Dict[str, Any]:
        """Returns deterministic, actionable suggestions for resume optimization."""
        bullet_revisions = [
            f"Explicitly quantify achievements using {skill}" for skill in missing_skills[:3]
        ] or ["Highlight project metrics and business impact with concrete numbers"]

        return {
            "ats_compatibility_tier": "Optimized" if not missing_skills else "Needs Revision",
            "missing_skills_flagged": missing_skills,
            "actionable_recommendations": bullet_revisions,
            "readability_score": 88,
            "model_used": "mock-ai-engine-v1",
            "is_mock": True
        }
