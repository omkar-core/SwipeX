"""
test_run_suites_parser.py - Unit tests for run_suites.py JUnit XML and output parsing.
Owned by Intern 5 (Platform, Testing & Deployment).
"""
import os
import tempfile
import xml.etree.ElementTree as ET
from integration_omkar.scripts.run_suites import parse_junit_xml, parse_pytest_output

def test_parse_junit_xml_clean_pass():
    xml_content = """<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="pytest" errors="0" failures="0" skipped="0" tests="46" time="1.23">
    <testcase classname="test_auth" name="test_login" time="0.01"/>
  </testsuite>
</testsuites>
"""
    with tempfile.NamedTemporaryFile("w", suffix=".xml", delete=False) as f:
        f.write(xml_content)
        f_name = f.name
    try:
        passed, failed, skipped = parse_junit_xml(f_name)
        assert passed == 46
        assert failed == 0
        assert skipped == 0
    finally:
        os.remove(f_name)

def test_parse_junit_xml_errors_counted_as_failures_38_errors_case():
    """
    Regression test for Failure 1:
    Pytest reports 2 passed, 38 errors (no such table: jobs).
    The runner MUST count errors as FAILED, yielding passed=2, failed=38.
    """
    xml_content = """<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="pytest" errors="38" failures="0" skipped="0" tests="40" time="0.85">
    <testcase classname="test_storage" name="test_storage_1" time="0.01"/>
    <testcase classname="test_storage" name="test_storage_2" time="0.01"/>
    <testcase classname="test_db" name="test_job_1" time="0.01">
      <error message="sqlite3.OperationalError: no such table: jobs">Traceback...</error>
    </testcase>
  </testsuite>
</testsuites>
"""
    with tempfile.NamedTemporaryFile("w", suffix=".xml", delete=False) as f:
        f.write(xml_content)
        f_name = f.name
    try:
        passed, failed, skipped = parse_junit_xml(f_name)
        assert passed == 2
        assert failed == 38, f"Errors must count as failed! Got {failed}"
        assert skipped == 0
    finally:
        os.remove(f_name)

def test_parse_junit_xml_failures_and_skipped():
    xml_content = """<?xml version="1.0" encoding="utf-8"?>
<testsuites>
  <testsuite name="pytest" errors="2" failures="3" skipped="4" tests="20" time="2.0">
  </testsuite>
</testsuites>
"""
    with tempfile.NamedTemporaryFile("w", suffix=".xml", delete=False) as f:
        f.write(xml_content)
        f_name = f.name
    try:
        passed, failed, skipped = parse_junit_xml(f_name)
        assert passed == 11
        assert failed == 5
        assert skipped == 4
    finally:
        os.remove(f_name)

def test_parse_junit_xml_single_testsuite_root():
    xml_content = """<?xml version="1.0" encoding="utf-8"?>
<testsuite name="pytest" errors="0" failures="1" skipped="2" tests="10" time="0.5">
</testsuite>
"""
    with tempfile.NamedTemporaryFile("w", suffix=".xml", delete=False) as f:
        f.write(xml_content)
        f_name = f.name
    try:
        passed, failed, skipped = parse_junit_xml(f_name)
        assert passed == 7
        assert failed == 1
        assert skipped == 2
    finally:
        os.remove(f_name)

def test_parse_pytest_output_fallback_with_errors():
    stdout_with_errors = "=== 2 passed, 38 errors in 0.45s ==="
    passed, failed, skipped = parse_pytest_output(stdout_with_errors)
    assert passed == 2
    assert failed == 38
    assert skipped == 0

def test_parse_pytest_output_clean_summary():
    stdout_clean = "=== 46 passed in 2.10s ==="
    passed, failed, skipped = parse_pytest_output(stdout_clean)
    assert passed == 46
    assert failed == 0
    assert skipped == 0
