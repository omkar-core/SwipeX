from app.resume_metrics import calculate_resume_performance


result = calculate_resume_performance(
    views=100,
    applications=20,
    shortlists=5
)

print("Resume Performance:")
print(result)