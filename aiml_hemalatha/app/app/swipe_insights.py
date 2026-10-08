def summarize_swipes(swipes):

    likes = sum(
        1 for swipe in swipes
        if swipe.get("action") == "like"
    )

    dislikes = sum(
        1 for swipe in swipes
        if swipe.get("action") == "dislike"
    )

    total = likes + dislikes

    like_percentage = (
        (likes / total) * 100
        if total > 0
        else 0
    )

    return {
        "likes": likes,
        "dislikes": dislikes,
        "total_swipes": total,
        "like_percentage": round(like_percentage, 2)
    }