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
Milestone 2 (Day 5): all M2 services reachable through this one Gateway;
Gateway-secret header now always sent (fallback default matches
data_hanith's own default), resolved during a merge with a teammate's
concurrent edit to this same file.
Milestone 2 (post-Day 5): _proxy now handles httpx.TimeoutException
separately from ConnectError (504 vs 503) — a slow-but-reachable upstream
used to crash with an unhandled 500; timeout raised to 30s.
Milestone 3 (Day 1-5): Resume Service (upload/list/detail/parse) and ATS
Scoring (/ats/score) replace the M1 Resume placeholder routes, now with
the real contract. Resume actions restricted to Job Seeker; ATS score
requires login only (a Recruiter viewing a candidate's fit is plausible
future use, so it's not role-locked here — revisit if that's wrong).

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
    current_user: when given, injects X-User-Id / X-User-Role / X-Gateway-Secret
    identity headers, which data_hanith's dependencies.py reads for trusted
    internal calls. The secret has a fallback default matching their own
    documented default, so this works out of the box even before either
    .env is customised.
    """
    url = f"{base_url}{path}"
    headers = {
        k: v for k, v in request.headers.items()
        if k.lower() not in ("host", "content-length")
    }

    if current_user is not None:
        headers["X-User-Id"] = str(current_user.id)
        headers["X-User-Role"] = str(current_user.role.value)
        headers["X-Gateway-Secret"] = os.getenv(
            "GATEWAY_SHARED_SECRET", "swipex-internal-gateway-secret"
        )

    content = body_override if body_override is not None else await request.body()

    async with httpx.AsyncClient() as client:
        try:
            upstream = await client.request(
                method=request.method,
                url=url,
                params=request.query_params,
                headers=headers,
                content=content,
                timeout=30.0,
            )
        except httpx.ConnectError:
            raise HTTPException(
                status_code=503,
                detail=f"Upstream service unreachable at {base_url} — is it running?",
            )
        except httpx.TimeoutException:
            raise HTTPException(
                status_code=504,
                detail=f"Upstream service at {base_url} took too long to respond.",
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
# Resume Service — Milestone 3. Replaces the M1 placeholder routes with the
# real contract: upload, list versions, get one version, trigger parsing.
# All require login (a resume is personal data); uploads/parsing restricted
# to Job Seeker, matching FR-01 ownership (Intern 1/2/3) and the M3 Day 2-3
# brief ("RBAC restricting uploads to the Job Seeker role").
# ---------------------------------------------------------------------------

@router.post("/api/v1/resumes/upload")
async def gateway_resume_upload(
    request: Request,
    current_user: User = Depends(require_role("job_seeker")),
):
    return await _proxy(request, _resume_service_url(), "/api/v1/resumes/upload", current_user=current_user)


@router.get("/api/v1/resumes")
async def gateway_list_resumes(request: Request, current_user: User = Depends(get_current_user)):
    """Lists the logged-in user's uploaded resume versions."""
    return await _proxy(request, _resume_service_url(), "/api/v1/resumes", current_user=current_user)


@router.get("/api/v1/resumes/{resume_id}")
async def gateway_resume_detail(resume_id: str, request: Request, current_user: User = Depends(get_current_user)):
    return await _proxy(request, _resume_service_url(), f"/api/v1/resumes/{resume_id}", current_user=current_user)


@router.post("/api/v1/resumes/{resume_id}/parse")
async def gateway_resume_parse(
    resume_id: str,
    request: Request,
    current_user: User = Depends(require_role("job_seeker")),
):
    """
    Milestone 3 Day 3: triggers Intern 4's text/skill-extraction module.
    Stores parsed_text and extracted_skills back on the resume record
    (handled entirely on the Resume Service side — the Gateway just routes
    and gates this by role).
    """
    return await _proxy(request, _resume_service_url(), f"/api/v1/resumes/{resume_id}/parse", current_user=current_user)


# ---------------------------------------------------------------------------
# ATS Scoring — Milestone 3 Day 4-5. Blended keyword + semantic score
# between a resume and a job, missing-skill/keyword detection, and
# AI-generated improvement suggestions (extended onto the same response
# per the Day 5 brief: "AI-suggestions endpoint (or extend /ats/score)").
# ---------------------------------------------------------------------------

@router.post("/api/v1/ats/score")
async def gateway_ats_score(
    request: Request,
    current_user: User = Depends(get_current_user),
):
    """Body: { resume_id, job_id } -> { match_score, missing_keywords[], missing_skills[], suggestions[] }"""
    return await _proxy(request, _resume_service_url(), "/api/v1/ats/score", current_user=current_user)