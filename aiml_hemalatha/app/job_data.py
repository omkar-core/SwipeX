import pandas as pd
from pathlib import Path

from app.job_skills import get_required_skills


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "job_market_india.csv"

jobs_df = pd.read_csv(DATA_PATH)

print("Dataset loaded successfully")
print("Rows:", len(jobs_df))
print("Columns:", list(jobs_df.columns))


import json
import os
import urllib.request
import uuid

def fetch_jobs_from_service():
    """Attempt to fetch live jobs with canonical UUIDs from the Job Service or Gateway."""
    urls = [
        os.environ.get("JOB_SERVICE_URL", "http://job-data-service:8002") + "/api/v1/jobs?page=1&page_size=50",
        "http://localhost:8002/api/v1/jobs?page=1&page_size=50",
        "http://localhost:8001/api/v1/jobs?page=1&page_size=50",
    ]
    for url in urls:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "SwipeX-AIML-Service"})
            with urllib.request.urlopen(req, timeout=2.0) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode("utf-8"))
                    if isinstance(data, list) and len(data) > 0:
                        return data
        except Exception:
            continue
    return None


def get_jobs():
    # 1. First priority: Live jobs from Job Service with canonical database UUIDs
    live_jobs = fetch_jobs_from_service()
    if live_jobs:
        rows = []
        for j in live_jobs:
            title = j.get("title", "")
            rows.append({
                "job_id": str(j.get("job_id")),
                "Job Title": title,
                "required_skills": get_required_skills(title),
                "Location": j.get("location", ""),
                "Salary": j.get("max_salary", 0),
                "Monthly Salary": (j.get("max_salary") or 0) / 12 if j.get("max_salary") else 0
            })
        return pd.DataFrame(rows)

    # 2. Fallback: CSV dataset mapped to canonical UUIDv5 identifiers (fixes DEF-015)
    df = jobs_df.copy()
    df["job_id"] = [str(uuid.uuid5(uuid.NAMESPACE_DNS, f"swipex-india-job-{i}")) for i in range(len(df))]
    df["required_skills"] = df["Job Title"].apply(
        get_required_skills
    )
    return df
import pandas as pd
import os

DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "data",
    "job_market_india.csv"
)


def load_job_data():
    return pd.read_csv(DATA_PATH)


def get_all_jobs():
    df = load_job_data()

    return df.to_dict(orient="records")