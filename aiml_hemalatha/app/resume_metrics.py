def calculate_resume_performance(views, applications, shortlists):

    apply_rate = (
        applications / views * 100
        if views > 0 else 0
    )

    shortlist_rate = (
        shortlists / applications * 100
        if applications > 0 else 0
    )

    return {
        "views": views,
        "applications": applications,
        "shortlists": shortlists,
        "apply_rate": round(apply_rate, 2),
        "shortlist_rate": round(shortlist_rate, 2)
    }