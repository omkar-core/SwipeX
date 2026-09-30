import pandas as pd
from pathlib import Path

from app.job_skills import get_required_skills

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "job_market_india.csv"


def load_job_data():
    df = pd.read_csv(CSV_PATH)

    # Remove extra spaces
    df.columns = df.columns.str.strip()

    print("CSV columns:", df.columns.tolist())

    # Standardize column names
    column_mapping = {}

    for column in df.columns:
        clean_name = column.strip().lower().replace("_", " ")

        if clean_name in ["job id", "jobid", "id"]:
            column_mapping[column] = "job_id"

        elif clean_name in ["job title", "jobtitle", "title"]:
            column_mapping[column] = "job_title"

        elif clean_name in ["location", "job location"]:
            column_mapping[column] = "location"

        elif clean_name in ["salary", "annual salary"]:
            column_mapping[column] = "Salary"

        elif clean_name in ["monthly salary"]:
            column_mapping[column] = "Monthly Salary"

    df = df.rename(columns=column_mapping)

    if "job_id" not in df.columns:
        import uuid
        df["job_id"] = [str(uuid.uuid5(uuid.NAMESPACE_DNS, f"swipex-job-{i+1}")) for i in range(len(df))]

    # Generate required skills from job title
    df["required_skills"] = df["job_title"].apply(
        get_required_skills
    )

    return df


def get_jobs():
    return load_job_data()
