from app.alert_volume import limit_alerts


alerts = [
    {"alert_type": "HIGH_MATCH"},
    {"alert_type": "LOW_COMPETITION"},
    {"alert_type": "STARTUP"},
    {"alert_type": "SKILL_GAP"},
    {"alert_type": "TRENDING_SKILL"}
]


result = limit_alerts(alerts, max_alerts=3)

print("Limited Alerts:")
print(result)
print("Alert Count:", len(result))