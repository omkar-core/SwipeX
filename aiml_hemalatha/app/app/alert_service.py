HIGH_MATCH_THRESHOLD = 80
LOW_COMPETITION_THRESHOLD = 50


def check_high_match(match_score):
    """
    Generate an alert when the job match score is high.
    """

    if match_score >= HIGH_MATCH_THRESHOLD:
        return {
            "alert_type": "HIGH_MATCH",
            "message": "Strong job match found",
            "match_score": match_score
        }

    return None


def check_low_competition(applicant_count):
    """
    Generate an alert when competition is low.
    """

    if applicant_count < LOW_COMPETITION_THRESHOLD:
        return {
            "alert_type": "LOW_COMPETITION",
            "message": "This job currently has low competition",
            "applicant_count": applicant_count
        }

    return None


def generate_alerts(
    match_score,
    applicant_count=None,
    startup=False
):
    """
    Generate all applicable career alerts.
    """

    alerts = []

    high_match = check_high_match(match_score)

    if high_match:
        alerts.append(high_match)

    if applicant_count is not None:
        low_competition = check_low_competition(applicant_count)

        if low_competition:
            alerts.append(low_competition)

    if startup:
        alerts.append({
            "alert_type": "STARTUP",
            "message": "Startup job opportunity found"
        })

    return alerts