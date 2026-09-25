def calculate_blended_ats(
    keyword_score,
    semantic_similarity,
    keyword_weight=0.5,
    semantic_weight=0.5
):
    semantic_score = semantic_similarity * 100

    final_score = (
        keyword_score * keyword_weight
        + semantic_score * semantic_weight
    )

    return round(final_score, 2)