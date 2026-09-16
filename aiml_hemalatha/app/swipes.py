SWIPE_STORE = {}


def add_swipe(user_id, job_id, action):

    action = str(action).lower().strip()

    if action not in ["like", "dislike"]:

        return {
            "success": False,
            "message": "Action must be 'like' or 'dislike'"
        }

    user_id = str(user_id)
    job_id = str(job_id)

    if user_id not in SWIPE_STORE:
        SWIPE_STORE[user_id] = []

    swipe = {
        "job_id": job_id,
        "action": action
    }

    SWIPE_STORE[user_id].append(swipe)

    return swipe


def get_user_swipes(user_id):

    user_id = str(user_id)

    return SWIPE_STORE.get(
        user_id,
        []
    )