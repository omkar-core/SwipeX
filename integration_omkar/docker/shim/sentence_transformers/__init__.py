"""Deterministic lightweight sentence_transformers shim for containerized integration testing.
Complies with SwipeX M3 SRS Section 1.5 & NFR-04 (zero paid APIs, deterministic embeddings).
"""
import numpy as np


class SentenceTransformer:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", *args, **kwargs):
        self.model_name = model_name

    def encode(self, text, *args, **kwargs):
        if isinstance(text, list):
            return [self._encode_single(t) for t in text]
        return self._encode_single(text)

    def _encode_single(self, text):
        h = sum(ord(c) for c in str(text)) if text else 1
        rng = np.random.RandomState(h % 10000)
        vec = rng.randn(384).astype(np.float32)
        norm = np.linalg.norm(vec)
        return vec / (norm if norm > 0 else 1.0)

    def similarity(self, emb1, emb2):
        v1 = np.array(emb1).flatten()
        v2 = np.array(emb2).flatten()
        denom = float(np.linalg.norm(v1) * np.linalg.norm(v2))
        cos_sim = float(np.dot(v1, v2) / denom) if denom > 0 else 0.5
        norm_score = max(0.0, min(1.0, (cos_sim + 1.0) / 2.0))
        return [[norm_score]]
