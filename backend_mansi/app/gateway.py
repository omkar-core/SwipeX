"""
API Gateway routes.

Milestone 1 (Day 4): Job/Swipe proxy routes + Resume placeholder routes.
Milestone 2 (Day 1-2): added /jobs/search, /companies, /companies/{id};
switched browsing routes (jobs list/detail/search, companies) to OPTIONAL
auth, matching data_hanith's own "Public / Optional Auth" contract —
anyone can browse, but a logged-in Job Seeker gets personalized results
(their previously-swiped jobs excluded, handled on data_hanith's side).
Matching Engine route registered ahead of Intern 4's service landing
(Day 4 dependency) — same graceful-503-until-ready pattern as Job/Resume.

This is the single entry point the frontend talks to. It enforces
"is this person even logged in" (and, where relevant, "does their role
allow this") BEFORE forwarding the request on to the actual service —
so downstream services don't each need to reimplement auth checks.
"""
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from typing import Optional
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


async def _proxy(request: Request, base_url: str, path: str, current_user: Optional[User] = None) -> Response:
    """Forwards the incoming request to the target service and relays its response."""
    url = f"{base_url}{path}"
    params = None if "?" in path else request.query_params
    headers = {k: v for k, v in request.headers.items() if k.lower() != "host"}
    if current_user:
        headers["X-User-Id"] = str(current_user.id)
        headers["X-User-Role"] = str(current_user.role.value)
        headers["X-Gateway-Secret"] = os.getenv("GATEWAY_SHARED_SECRET", "swipex-internal-gateway-secret")

    async with httpx.AsyncClient() as client:
        try:
            upstream = await client.request(
                method=request.method,
                url=url,
                params=params,
                headers=headers,
                content=await request.body(),
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

@router.get("/api/v1/jobs")
async def gateway_list_jobs(request: Request, current_user: Optional[User] = Depends(get_optional_current_user)):
    return await _proxy(request, _job_service_url(), "/api/v1/jobs", current_user)


@router.get("/api/v1/jobs/{job_id}")
async def gateway_job_detail(job_id: str, request: Request, current_user: Optional[User] = Depends(get_optional_current_user)):
    return await _proxy(request, _job_service_url(), f"/api/v1/jobs/{job_id}", current_user)


@router.get("/api/v1/jobs/search")
async def gateway_job_search(request: Request, current_user: User = Depends(get_optional_current_user)):
    """
    Milestone 2 Day 3: dedicated search endpoint (keyword, location, job
    type, salary range, experience level, skills). Forwards to whatever
    data_hanith exposes at this path — coordinate the exact query
    parameter names with Intern 3 before Day 3 so both sides agree.
    """
    return await _proxy(request, _job_service_url(), "/api/v1/jobs/search")


@router.post("/api/v1/swipes")
async def gateway_create_swipe(
    request: Request,
    current_user: User = Depends(require_role("job_seeker")),
):
    return await _proxy(request, _job_service_url(), "/api/v1/swipes", current_user)


@router.get("/api/v1/swipes/history")
async def gateway_swipe_history(request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _job_service_url(), "/api/v1/swipes/history", current_user)


# ---------------------------------------------------------------------------
# Company & Startup listings — Milestone 2 Day 3. Public browsing; only
# Recruiters can manage (create/update) company or job-posting data.
# ---------------------------------------------------------------------------

@router.get("/api/v1/companies")
async def gateway_list_companies(request: Request, current_user: User = Depends(get_optional_current_user)):
    return await _proxy(request, _job_service_url(), "/api/v1/companies")


@router.get("/api/v1/companies/{company_id}")
async def gateway_company_detail(company_id: str, request: Request, current_user: User = Depends(get_optional_current_user)):
    return await _proxy(request, _job_service_url(), f"/api/v1/companies/{company_id}")


# ---------------------------------------------------------------------------
# Recruiter job-posting stub — Milestone 2 Day 4: "add a minimal Recruiter
# job-posting CRUD stub to seed realistic flow." Restricted to Recruiter
# role. Forwards to the Job service the same way everything else does —
# real create/update logic lives there, not in the Gateway.
# ---------------------------------------------------------------------------

@router.post("/api/v1/jobs")
async def gateway_create_job(
    request: Request,
    current_user: User = Depends(require_role("recruiter")),
):
    return await _proxy(request, _job_service_url(), "/api/v1/jobs")


@router.put("/api/v1/jobs/{job_id}")
async def gateway_update_job(
    job_id: str,
    request: Request,
    current_user: User = Depends(require_role("recruiter")),
):
    return await _proxy(request, _job_service_url(), f"/api/v1/jobs/{job_id}")


# ---------------------------------------------------------------------------
# Matching Engine (Intern 4) — Milestone 2 Day 4-5: registered ahead of
# their service landing, same graceful-503-until-ready pattern used for
# Resume/ATS in Milestone 1.
# ---------------------------------------------------------------------------

@router.get("/api/v1/recommendations")
async def gateway_recommendations(request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _matching_engine_url(), "/api/v1/recommendations")


# ---------------------------------------------------------------------------
# Resume/ATS service — placeholder routes (Milestone 1 Day 4). Intern 3's
# resume service isn't built yet, so these forward the SAME way the Job
# routes do — once resume-service exists and is running on
# RESUME_SERVICE_URL, these start working with zero changes here.
# ---------------------------------------------------------------------------

@router.post("/api/v1/resume/upload")
async def gateway_resume_upload(request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _resume_service_url(), "/api/v1/resume/upload")


@router.get("/api/v1/resume/{resume_id}/ats-score")
async def gateway_ats_score(resume_id: str, request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _resume_service_url(), f"/api/v1/resume/{resume_id}/ats-score")
