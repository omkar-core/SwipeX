import pandas as pd
from pathlib import Path

from app.job_skills import get_required_skills


DATA_PATH = Path(__file__).resolve().parent.parent / "data" / "job_market_india.csv"

jobs_df = pd.read_csv(DATA_PATH)

print("Dataset loaded successfully")
print("Rows:", len(jobs_df))
print("Columns:", list(jobs_df.columns))


def get_jobs():

    df = jobs_df.copy()

    df["job_id"] = df.index.astype(str)

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