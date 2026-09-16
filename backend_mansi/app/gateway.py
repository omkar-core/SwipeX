"""
API Gateway routes.

Milestone 1 (Day 4): Job/Swipe proxy routes + Resume placeholder routes.
Milestone 2 (Day 1-2): /jobs/search, /companies, /companies/{id}; browsing
routes switched to OPTIONAL auth, matching data_hanith's own "Public /
Optional Auth" contract.
Milestone 2 (Day 3-4): swipe direction normalised to UPPERCASE before
forwarding (data_hanith stores RIGHT/LEFT; our API contract and the
frontend use lowercase right/left — normalising here means neither side
has to change); Recruiter job-posting CRUD stub; Matching Engine route.
Milestone 2 (Day 5): all M2 services reachable through this one Gateway.

This is the single entry point the frontend talks to. It enforces
"is this person even logged in" (and, where relevant, "does their role
allow this") BEFORE forwarding the request on to the actual service —
so downstream services don't each need to reimplement auth checks.
"""
import json
import os
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.deps import get_current_user, get_optional_current_user, require_role
from app.models import User

router = APIRouter()


def _job_service_url() -> str:
    """Read fresh on every call (not once at import) so tests can point
    this at a fake URL — see tests/test_gateway_proxy.py."""
    return os.getenv("JOB_SERVICE_URL", "http://localhost:8002")


def _resume_service_url() -> str:
    return os.getenv("RESUME_SERVICE_URL", "http://localhost:8003")


def _matching_engine_url() -> str:
    """Intern 4's Matching Engine — registered Day 4 of Milestone 2,
    ahead of their service actually landing (same pattern as Resume in M1)."""
    return os.getenv("MATCHING_ENGINE_URL", "http://localhost:8004")


async def _proxy(
    request: Request,
    base_url: str,
    path: str,
    body_override: Optional[bytes] = None,
    current_user: Optional[User] = None,
) -> Response:
    """
    Forwards the incoming request to the target service and relays its response.

    body_override: used when the Gateway rewrites the payload before
    forwarding (see swipe direction normalisation below).
    current_user: when given, injects X-User-Id / X-User-Role identity
    headers, which data_hanith's dependencies.py reads for trusted
    internal calls.
    """
    url = f"{base_url}{path}"
    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in ("host", "content-length")
    }

    if current_user is not None:
        headers["X-User-Id"] = current_user.id
        headers["X-User-Role"] = current_user.role.value
        gateway_secret = os.getenv("GATEWAY_SHARED_SECRET")
        if gateway_secret:
            headers["X-Gateway-Secret"] = gateway_secret

    content = body_override if body_override is not None else await request.body()

    async with httpx.AsyncClient() as client:
        try:
            upstream = await client.request(
                method=request.method,
                url=url,
                params=request.query_params,
                headers=headers,
                content=content,
                timeout=10.0,
            )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=503,
                detail=f"Upstream service unreachable at {base_url} — is it running?",
            )
    return Response(
        content=upstream.content,
        status_code=upstream.status_code,
        media_type=upstream.headers.get("content-type"),
    )


# ---------------------------------------------------------------------------
# Job & Swipe service — browsing is PUBLIC (optional auth); swiping requires
# a logged-in Job Seeker.
# ---------------------------------------------------------------------------

@router.get("/api/v1/jobs/search")
async def gateway_job_search(request: Request, current_user: User = Depends(get_optional_current_user)):
    """
    Milestone 2 Day 3: keyword search across title + job_description, on top
    of the existing structured filters (location, job_type, salary range,
    experience level, skills).

    NOTE: declared BEFORE /jobs/{job_id} on purpose — FastAPI matches routes
    in definition order, so a literal path like /jobs/search must come first
    or the {job_id} wildcard swallows it and treats "search" as a job ID.
    """
    return await _proxy(request, _job_service_url(), "/api/v1/jobs/search", current_user=current_user)


@router.get("/api/v1/jobs")
async def gateway_list_jobs(request: Request, current_user: User = Depends(get_optional_current_user)):
    return await _proxy(request, _job_service_url(), "/api/v1/jobs", current_user=current_user)


@router.get("/api/v1/jobs/{job_id}")
async def gateway_job_detail(job_id: str, request: Request, current_user: User = Depends(get_optional_current_user)):
    return await _proxy(request, _job_service_url(), f"/api/v1/jobs/{job_id}", current_user=current_user)


@router.post("/api/v1/swipes")
async def gateway_create_swipe(
    request: Request,
    current_user: User = Depends(require_role("job_seeker")),
):
    """
    Normalises `direction` to uppercase before forwarding.

    data_hanith's swipes table has a CHECK constraint allowing only
    'RIGHT'/'LEFT', but our public API contract and the frontend use
    lowercase 'right'/'left'. Converting here means neither side has to
    change, and a lowercase swipe no longer fails with a confusing
    database constraint error.
    """
    raw = await request.body()
    body_override = raw
    try:
        payload = json.loads(raw) if raw else {}
        if isinstance(payload.get("direction"), str):
            payload["direction"] = payload["direction"].upper()
            body_override = json.dumps(payload).encode()
    except (json.JSONDecodeError, AttributeError):
        # Malformed body — forward untouched and let the Job service return
        # its own validation error rather than masking it here.
        pass

    return await _proxy(
        request, _job_service_url(), "/api/v1/swipes",
        body_override=body_override, current_user=current_user,
    )


@router.get("/api/v1/swipes/history")
async def gateway_swipe_history(request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _job_service_url(), "/api/v1/swipes/history", current_user=current_user)


# ---------------------------------------------------------------------------
# Company & Startup listings — Milestone 2 Day 3. Public browsing.
# Fields per Intern 3: company_id, name, company_type, industry, size,
# about, is_newly_founded, active job count.
# ---------------------------------------------------------------------------

@router.get("/api/v1/companies")
async def gateway_list_companies(request: Request, current_user: User = Depends(get_optional_current_user)):
    return await _proxy(request, _job_service_url(), "/api/v1/companies", current_user=current_user)


@router.get("/api/v1/companies/{company_id}")
async def gateway_company_detail(company_id: str, request: Request, current_user: User = Depends(get_optional_current_user)):
    return await _proxy(request, _job_service_url(), f"/api/v1/companies/{company_id}", current_user=current_user)


# ---------------------------------------------------------------------------
# Recruiter job-posting stub — Milestone 2 Day 4: "add a minimal Recruiter
# job-posting CRUD stub to seed realistic flow." RBAC-restricted to the
# Recruiter role. Real create/update logic lives in the Job service.
# ---------------------------------------------------------------------------

@router.post("/api/v1/jobs")
async def gateway_create_job(
    request: Request,
    current_user: User = Depends(require_role("recruiter")),
):
    return await _proxy(request, _job_service_url(), "/api/v1/jobs", current_user=current_user)


@router.put("/api/v1/jobs/{job_id}")
async def gateway_update_job(
    job_id: str,
    request: Request,
    current_user: User = Depends(require_role("recruiter")),
):
    return await _proxy(request, _job_service_url(), f"/api/v1/jobs/{job_id}", current_user=current_user)


# ---------------------------------------------------------------------------
# Matching Engine (Intern 4) — Milestone 2 Day 4-5.
# ---------------------------------------------------------------------------

@router.get("/api/v1/recommendations")
async def gateway_recommendations(request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _matching_engine_url(), "/api/v1/recommendations", current_user=current_user)


# ---------------------------------------------------------------------------
# Resume/ATS service — placeholder routes (Milestone 1 Day 4).
# ---------------------------------------------------------------------------

@router.post("/api/v1/resume/upload")
async def gateway_resume_upload(request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _resume_service_url(), "/api/v1/resume/upload", current_user=current_user)


@router.get("/api/v1/resume/{resume_id}/ats-score")
async def gateway_ats_score(resume_id: str, request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _resume_service_url(), f"/api/v1/resume/{resume_id}/ats-score", current_user=current_user)
