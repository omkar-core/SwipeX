import pandas as pd
from pathlib import Path


CSV_PATH = (
    Path(__file__).resolve().parent.parent
    / "data"
    / "job_market_india.csv"
)


def parse_required_skills(value):

    if pd.isna(value):
        return []

    return [
        skill.strip().lower()
        for skill in str(value).split("|")
        if skill.strip()
    ]


def load_job_data():

    df = pd.read_csv(CSV_PATH)

    # Remove extra spaces
    df.columns = df.columns.str.strip()

    print(
        "CSV columns:",
        df.columns.tolist()
    )

    # Standardize column names
    column_mapping = {}

    for column in df.columns:

        clean_name = (
            column.strip()
            .lower()
            .replace("_", " ")
        )

        if clean_name in [
            "job id",
            "jobid",
            "id"
        ]:
            column_mapping[column] = "job_id"

        elif clean_name in [
            "job title",
            "jobtitle",
            "title"
        ]:
            column_mapping[column] = "job_title"

        elif clean_name in [
            "location",
            "job location"
        ]:
            column_mapping[column] = "location"

        elif clean_name in [
            "salary",
            "annual salary"
        ]:
            column_mapping[column] = "Salary"

        elif clean_name in [
            "monthly salary"
        ]:
            column_mapping[column] = "Monthly Salary"

    df = df.rename(
        columns=column_mapping
    )

    # Convert required skills from CSV
    # into Python lists
    df["required_skills"] = (
        df["required_skills"]
        .apply(parse_required_skills)
    )

    return df


def get_jobs():

    return load_job_data()