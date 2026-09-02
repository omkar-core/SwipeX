"""
API Gateway routes — Day 4 checklist:
  "Gateway routes to Job Service"
  "Placeholder route for Resume/ATS"
  "RBAC enforced on protected routes"

This is the single entry point the frontend talks to. It enforces
"is this person even logged in" (and, where relevant, "does their role
allow this") BEFORE forwarding the request on to the actual service —
so Job/Resume services don't each need to reimplement auth checks.
"""
import os
import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, Response

from app.deps import get_current_user, require_role
from app.models import User

router = APIRouter()


def _job_service_url() -> str:
    """Read fresh on every call (not once at import) so tests can point
    this at a fake URL — see tests/test_gateway_proxy.py."""
    return os.getenv("JOB_SERVICE_URL", "http://localhost:8002")


def _resume_service_url() -> str:
    return os.getenv("RESUME_SERVICE_URL", "http://localhost:8003")


async def _proxy(request: Request, base_url: str, path: str) -> Response:
    """Forwards the incoming request to the target service and relays its response."""
    url = f"{base_url}{path}"
    async with httpx.AsyncClient() as client:
        try:
            upstream = await client.request(
                method=request.method,
                url=url,
                params=request.query_params,
                headers={k: v for k, v in request.headers.items() if k.lower() != "host"},
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
# Job & Swipe service — any logged-in user can browse/swipe (Job Seeker role)
# ---------------------------------------------------------------------------

@router.get("/api/v1/jobs")
async def gateway_list_jobs(request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _job_service_url(), "/api/v1/jobs")


@router.get("/api/v1/jobs/{job_id}")
async def gateway_job_detail(job_id: str, request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _job_service_url(), f"/api/v1/jobs/{job_id}")


@router.post("/api/v1/swipes")
async def gateway_create_swipe(
    request: Request,
    current_user: User = Depends(require_role("job_seeker")),
):
    return await _proxy(request, _job_service_url(), "/api/v1/swipes")


@router.get("/api/v1/swipes/history")
async def gateway_swipe_history(request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _job_service_url(), "/api/v1/swipes/history")


# ---------------------------------------------------------------------------
# Resume/ATS service — placeholder routes (Day 4: "Placeholder route for
# Resume/ATS"). Intern 3's service isn't built yet, so these forward the
# SAME way the Job routes do — once resume-service exists and is running
# on RESUME_SERVICE_URL, these start working with zero changes here.
# ---------------------------------------------------------------------------

@router.post("/api/v1/resume/upload")
async def gateway_resume_upload(request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _resume_service_url(), "/api/v1/resume/upload")


@router.get("/api/v1/resume/{resume_id}/ats-score")
async def gateway_ats_score(resume_id: str, request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _resume_service_url(), f"/api/v1/resume/{resume_id}/ats-score")


@router.get("/api/v1/recommendations")
async def gateway_recommendations(request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _resume_service_url(), "/api/v1/recommendations")