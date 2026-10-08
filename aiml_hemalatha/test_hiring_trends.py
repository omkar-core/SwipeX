from app.hiring_trends import analyze_hiring_trends


result = analyze_hiring_trends(
    "data/job_market_india.csv"
)

print("Hiring Trends:")
print(result)