from app.alert_service import generate_alerts


result = generate_alerts(
    match_score=85,
    applicant_count=30,
    startup=True
)

print("Generated Alerts:")
print(result)