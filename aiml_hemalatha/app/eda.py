import pandas as pd

# Load job data
df = pd.read_csv("data/jobs.csv")

print("JOB DATA")
print(df)

print("\nNUMBER OF ROWS AND COLUMNS")
print(df.shape)

print("\nCOLUMN NAMES")
print(df.columns.tolist())

print("\nDATA INFORMATION")
print(df.info())

print("\nMISSING VALUES")
print(df.isnull().sum())

print("\nJOB TYPES")
print(df["type"].value_counts())

print("\nLOCATIONS")
print(df["location"].value_counts())

print("\nREMOTE JOBS")
print(df["remote"].value_counts())
print("\nSKILLS IN JOB DATA")

all_skills = []

for skills in df["skills"]:
    skill_list = skills.split(",")

    for skill in skill_list:
        all_skills.append(skill.strip().lower())

skill_counts = pd.Series(all_skills).value_counts()

print(skill_counts)