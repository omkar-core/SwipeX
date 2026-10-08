import app.semantic_engine as semantic_engine


def test_graceful_fallback():

    original_model = semantic_engine.model

    try:
        # Temporarily disable the AI model
        semantic_engine.model = None

        resume_text = "python sql git"
        job_text = "python sql api"

        result = semantic_engine.calculate_semantic_similarity(
            resume_text,
            job_text
        )

        print("GRACEFUL FALLBACK TEST")
        print("======================")
        print("Fallback similarity:", round(result, 4))
        print("Fallback working:", result >= 0)

        assert result >= 0

    finally:
        # Restore the original model
        semantic_engine.model = original_model