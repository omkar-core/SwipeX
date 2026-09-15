"""
Automated Test Suite for Company Service API Endpoints (GET /api/v1/companies & GET /api/v1/companies/{company_id}).
Tests company listing, pagination, startup/newly_founded filtering, industry filtering, and detail lookup.
"""
import os
import sys
import uuid
import pytest
from fastapi.testclient import TestClient

# Add data_hanith to sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SERVICE_DIR = os.path.join(BASE_DIR, "data_hanith")
sys.path.insert(0, SERVICE_DIR)

from config import DATABASE_URL
from main import app
from db.connection import get_raw_connection, init_db


@pytest.fixture(scope="module")
def api_client():
    """
    Ensures database context is ready and returns FastAPI TestClient instance.
    """
    db_url = os.environ.get("DATABASE_URL", DATABASE_URL)
    schema_sql_path = os.path.join(SERVICE_DIR, "db", "schema.sql")
    init_db(db_url, schema_sql_path)
    client = TestClient(app)
    yield client


# 1. GET /api/v1/companies basic listing
def test_get_companies_basic(api_client):
    response = api_client.get("/api/v1/companies")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 20
    first = data[0]
    assert "company_id" in first
    assert "name" in first
    assert "about" in first
    assert "size" in first
    assert "industry" in first
    assert "is_newly_founded" in first
    assert "job_count" in first


# 2. Pagination verification
def test_get_companies_pagination(api_client):
    res1 = api_client.get("/api/v1/companies?page=1&page_size=5")
    assert res1.status_code == 200
    data1 = res1.json()
    assert len(data1) == 5

    res2 = api_client.get("/api/v1/companies?page=2&page_size=5")
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data2) == 5

    ids1 = [c["company_id"] for c in data1]
    ids2 = [c["company_id"] for c in data2]
    assert set(ids1).isdisjoint(set(ids2))


# 3. Newly Founded / Startup filtering
def test_get_companies_newly_founded_filter(api_client):
    response = api_client.get("/api/v1/companies?newly_founded=true&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    for comp in data:
        assert comp["is_newly_founded"] is True


# 4. Industry filtering
def test_get_companies_industry_filter(api_client):
    response = api_client.get("/api/v1/companies?industry=Technology&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    for comp in data:
        assert "technology" in comp["industry"].lower()


# 5. GET /api/v1/companies/{company_id} valid retrieval
def test_get_company_detail_valid(api_client):
    list_res = api_client.get("/api/v1/companies?page_size=1")
    assert list_res.status_code == 200
    first_company_id = list_res.json()[0]["company_id"]

    detail_res = api_client.get(f"/api/v1/companies/{first_company_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["company_id"] == first_company_id
    assert "name" in detail
    assert "about" in detail
    assert "size" in detail
    assert "industry" in detail
    assert "jobs" in detail
    assert isinstance(detail["jobs"], list)


# 6. Non-existent UUID -> 404 NOT FOUND
def test_get_company_detail_nonexistent_uuid(api_client):
    random_uuid = str(uuid.uuid4())
    response = api_client.get(f"/api/v1/companies/{random_uuid}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# 7. Invalid UUID format -> 400 BAD REQUEST
def test_get_company_detail_invalid_uuid(api_client):
    response = api_client.get("/api/v1/companies/invalid-uuid-12345")
    assert response.status_code == 400
    assert "invalid company_id format" in response.json()["detail"].lower()


# 8. Maximum page_size boundary verification
def test_max_page_size_boundary(api_client):
    res_100 = api_client.get("/api/v1/companies?page_size=100")
    assert res_100.status_code == 200
    assert len(res_100.json()) <= 100

    res_101 = api_client.get("/api/v1/companies?page_size=101")
    assert res_101.status_code in (400, 422)
