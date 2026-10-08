from app.swipe_insights import summarize_swipes


swipes = [
    {"job_id": "JOB001", "action": "like"},
    {"job_id": "JOB002", "action": "like"},
    {"job_id": "JOB003", "action": "dislike"},
    {"job_id": "JOB004", "action": "like"},
    {"job_id": "JOB005", "action": "dislike"}
]


result = summarize_swipes(swipes)

print("Swipe Behavior Summary:")
print(result)
