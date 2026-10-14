"""
test_manual_render_guide.py - Validates that MANUAL_RENDER_SETUP.md is synchronized with render.yaml
Owned by Intern 5 (Platform, Testing & Deployment).
"""
import os
import yaml
import pytest

from integration_omkar.scripts.render_manual_guide import (
    load_render_spec,
    generate_manual_guide_markdown,
    OUTPUT_MD_PATH,
    RENDER_YAML_PATH,
)


def test_render_spec_structure():
    spec = load_render_spec()
    assert "databases" in spec
    assert "services" in spec
    assert len(spec["databases"]) >= 1
    assert len(spec["services"]) >= 4


def test_every_service_in_render_yaml_appears_in_manual_guide():
    spec = load_render_spec()
    assert os.path.exists(OUTPUT_MD_PATH), "MANUAL_RENDER_SETUP.md must exist"

    with open(OUTPUT_MD_PATH, "r", encoding="utf-8") as f:
        guide_text = f.read()

    # Verify database
    for db in spec["databases"]:
        db_name = db["name"]
        assert db_name in guide_text, f"Database '{db_name}' missing from MANUAL_RENDER_SETUP.md"

    # Verify services
    for svc in spec["services"]:
        svc_name = svc["name"]
        assert svc_name in guide_text, f"Service '{svc_name}' missing from MANUAL_RENDER_SETUP.md"


def test_manual_guide_generator_output_is_deterministic():
    spec = load_render_spec()
    generated = generate_manual_guide_markdown(spec)

    assert "SwipeX — Render Production Manual Setup Guide" in generated
    assert "swipex-bpgb.onrender.com" in generated
    assert "/health" in generated
    assert "VITE_BASE_API_URL" in generated
    assert "JOB_SERVICE_URL" in generated
    assert "RESUME_SERVICE_URL" in generated
    assert "MATCHING_ENGINE_URL" in generated
    assert "CORS_ORIGINS" in generated
    assert "Production Troubleshooting Matrix" in generated
