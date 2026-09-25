"""
test_m3_storage_vector_mocks.py - Unit test suite for M3 Mock Infrastructure.
Verifies that fake storage, embedding generator, vector store, and LLM suggestion mocks
operate deterministically and satisfy all Milestone 3 testing prerequisites.
"""
import pytest
import math
from integration_omkar.tests.mocks.storage_mock import FakeStorageService, StorageError
from integration_omkar.tests.mocks.ai_vector_mock import (
    FakeEmbeddingService,
    FakeVectorStore,
    FakeLLMSuggestionsService,
)


@pytest.fixture
def storage():
    return FakeStorageService()


@pytest.fixture
def embedder():
    return FakeEmbeddingService(dimension=384)


@pytest.fixture
def vector_store():
    return FakeVectorStore(collection_name="test_collection")


@pytest.fixture
def llm_mock():
    return FakeLLMSuggestionsService()


# -----------------------------------------------------------------------------
# 1. Storage Mock Verification
# -----------------------------------------------------------------------------

def test_mock_storage_upload_and_retrieve(storage):
    """Verifies that FakeStorageService stores and retrieves binary content accurately."""
    content = b"%PDF-1.4 Fake PDF Data Stream"
    meta = storage.upload_file(
        bucket="swipex-resumes",
        file_key="user_1/v1/resume.pdf",
        data=content,
        content_type="application/pdf"
    )
    assert meta["size"] == len(content)
    assert meta["content_type"] == "application/pdf"
    assert storage.has_object("swipex-resumes", "user_1/v1/resume.pdf")

    retrieved = storage.get_file("swipex-resumes", "user_1/v1/resume.pdf")
    assert retrieved == content


def test_mock_storage_nonexistent_key_raises(storage):
    """Verifies that accessing an unuploaded key raises KeyError."""
    with pytest.raises(KeyError):
        storage.get_file("swipex-resumes", "nonexistent_key.pdf")


def test_mock_storage_simulated_failure(storage):
    """Verifies that FakeStorageService can simulate backend outages (MinIO down)."""
    storage.should_fail = True
    with pytest.raises(StorageError) as exc:
        storage.upload_file(
            bucket="swipex-resumes",
            file_key="user_1/v1/resume.pdf",
            data=b"data"
        )
    assert "Simulated storage backend failure" in str(exc.value)


def test_mock_storage_delete_and_clear(storage):
    """Verifies object deletion and storage cleanup."""
    storage.upload_file("swipex-resumes", "key1.pdf", b"abc")
    assert storage.has_object("swipex-resumes", "key1.pdf")
    assert storage.delete_file("swipex-resumes", "key1.pdf") is True
    assert not storage.has_object("swipex-resumes", "key1.pdf")


# -----------------------------------------------------------------------------
# 2. Embedding Mock Verification
# -----------------------------------------------------------------------------

def test_mock_embedder_dimension_and_normalization(embedder):
    """Verifies that FakeEmbeddingService produces unit-normalized vectors of length 384."""
    vec = embedder.embed_text("Senior Python Developer with FastAPI and PostgreSQL")
    assert len(vec) == 384
    norm = math.sqrt(sum(x * x for x in vec))
    assert pytest.approx(norm, rel=1e-5) == 1.0


def test_mock_embedder_determinism(embedder):
    """Verifies that identical text yields 100% identical embeddings."""
    text = "Full Stack Engineer React Node Docker"
    vec1 = embedder.embed_text(text)
    vec2 = embedder.embed_text(text)
    assert vec1 == vec2


def test_mock_embedder_empty_string(embedder):
    """Empty string returns all-zero vector."""
    vec = embedder.embed_text("")
    assert len(vec) == 384
    assert all(x == 0.0 for x in vec)


# -----------------------------------------------------------------------------
# 3. Vector DB (ChromaDB Mock) Verification
# -----------------------------------------------------------------------------

def test_mock_vector_store_ranking(vector_store, embedder):
    """Verifies cosine similarity search ranks the most semantically related document first."""
    # Index 3 documents
    doc1 = "Python FastAPI Backend Microservices"
    doc2 = "Frontend React UI TailwindCSS TypeScript"
    doc3 = "Data Analyst Tableau SQL Excel"

    v1 = embedder.embed_text(doc1)
    v2 = embedder.embed_text(doc2)
    v3 = embedder.embed_text(doc3)

    vector_store.add(
        ids=["job_backend", "job_frontend", "job_analyst"],
        embeddings=[v1, v2, v3],
        metadatas=[{"role": "backend"}, {"role": "frontend"}, {"role": "analytics"}],
        documents=[doc1, doc2, doc3]
    )

    assert vector_store.count() == 3

    # Query with exact matching text
    query_vec = embedder.embed_text(doc1)
    res = vector_store.query(query_vec, n_results=2)

    top_id = res["ids"][0][0]
    top_score = res["scores"][0][0]

    assert top_id == "job_backend"
    assert pytest.approx(top_score, rel=1e-5) == 1.0


def test_mock_vector_store_metadata_filtering(vector_store, embedder):
    """Verifies metadata filtering in vector queries."""
    v1 = embedder.embed_text("Job A")
    v2 = embedder.embed_text("Job B")

    vector_store.add(
        ids=["id_a", "id_b"],
        embeddings=[v1, v2],
        metadatas=[{"department": "engineering"}, {"department": "sales"}]
    )

    res = vector_store.query(v1, n_results=5, where={"department": "sales"})
    assert res["ids"][0] == ["id_b"]


# -----------------------------------------------------------------------------
# 4. LLM Suggestions Mock Verification
# -----------------------------------------------------------------------------

def test_mock_llm_suggestions_format(llm_mock):
    """Verifies mock LLM suggestions adhere to M3 schema requirements."""
    res = llm_mock.generate_suggestions(
        resume_text="Experienced developer in Python and Django",
        job_description="Seeking FastAPI, Docker, and Kubernetes engineer",
        missing_skills=["FastAPI", "Docker", "Kubernetes"]
    )
    assert res["is_mock"] is True
    assert "FastAPI" in res["missing_skills_flagged"]
    assert len(res["actionable_recommendations"]) > 0
    assert 0 <= res["readability_score"] <= 100
