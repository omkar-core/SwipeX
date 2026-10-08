def limit_alerts(alerts, max_alerts=3):

    if not alerts:
        return []

    return alerts[:max_alerts]
