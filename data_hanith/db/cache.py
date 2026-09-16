"""
Redis Cache Abstraction Module for Job & Data Intelligence Service.
Handles fast caching of job feeds, user swiped job sets, and graceful PostgreSQL fallback.
"""
import os
import json
import hashlib
import logging
from typing import Optional, Set, List, Dict, Any

logger = logging.getLogger("swipex_cache")

# Redis configuration from environment variables
REDIS_HOST = os.environ.get("REDIS_HOST", "127.0.0.1")
REDIS_PORT = int(os.environ.get("REDIS_PORT", "6379"))
REDIS_DB = int(os.environ.get("REDIS_DB", "0"))
REDIS_PASSWORD = os.environ.get("REDIS_PASSWORD", None)
REDIS_TIMEOUT = float(os.environ.get("REDIS_TIMEOUT", "1.0"))

_redis_client = None
_redis_available = None


def get_redis_client():
    """
    Returns a connected redis.Redis client instance, or None if redis module or server is unavailable.
    """
    global _redis_client, _redis_available
    if _redis_available is False:
        return None
    if _redis_client is not None:
        return _redis_client

    try:
        import redis
        client = redis.Redis(
            host=REDIS_HOST,
            port=REDIS_PORT,
            db=REDIS_DB,
            password=REDIS_PASSWORD,
            socket_timeout=REDIS_TIMEOUT,
            socket_connect_timeout=REDIS_TIMEOUT,
            decode_responses=True
        )
        # Test connection ping
        client.ping()
        _redis_client = client
        _redis_available = True
        return _redis_client
    except Exception as exc:
        _redis_available = False
        logger.warning(f"[Cache Warning] Unable to connect to Redis at {REDIS_HOST}:{REDIS_PORT}: {exc}. Fallback to PostgreSQL enabled.")
        return None


def reset_redis_client():
    """Resets global client cache for testing or re-connection attempts."""
    global _redis_client, _redis_available
    _redis_client = None
    _redis_available = None


class RedisCacheService:
    def __init__(self, client=None):
        self._client = client

    @property
    def client(self):
        if self._client is not None:
            return self._client
        return get_redis_client()

    # -------------------------------------------------------------------------
    # USER SWIPED JOBS CACHE (swiped_jobs:{user_id})
    # -------------------------------------------------------------------------
    def get_swiped_job_ids(self, user_id: str) -> Optional[Set[str]]:
        """
        Retrieves the set of job IDs swiped by the user from Redis.
        Returns None if Redis is unavailable or cache miss (set doesn't exist).
        """
        cli = self.client
        if cli is None:
            return None
        key = f"swiped_jobs:{user_id}"
        try:
            if not cli.exists(key):
                return None
            members = cli.smembers(key)
            return set(members) if members else set()
        except Exception as exc:
            logger.warning(f"[Cache Failure] get_swiped_job_ids error for user {user_id}: {exc}")
            return None

    def add_swiped_job_id(self, user_id: str, job_id: str, ttl: int = 86400) -> bool:
        """
        Adds a single job_id to the user's Redis swiped set.
        """
        cli = self.client
        if cli is None:
            return False
        key = f"swiped_jobs:{user_id}"
        try:
            cli.sadd(key, job_id)
            cli.expire(key, ttl)
            return True
        except Exception as exc:
            logger.warning(f"[Cache Failure] add_swiped_job_id error for user {user_id}: {exc}")
            return False

    def set_swiped_job_ids(self, user_id: str, job_ids: Set[str], ttl: int = 86400) -> bool:
        """
        Populates the user's swiped set in Redis from PostgreSQL source data.
        """
        cli = self.client
        if cli is None:
            return False
        key = f"swiped_jobs:{user_id}"
        try:
            cli.delete(key)
            if job_ids:
                cli.sadd(key, *list(job_ids))
                cli.expire(key, ttl)
            return True
        except Exception as exc:
            logger.warning(f"[Cache Failure] set_swiped_job_ids error for user {user_id}: {exc}")
            return False

    # -------------------------------------------------------------------------
    # JOB FEED CACHE (job_feed:...)
    # -------------------------------------------------------------------------
    @staticmethod
    def build_feed_cache_key(
        user_id: Optional[str],
        page: int,
        page_size: int,
        company_type: Optional[str],
        location: Optional[str],
        remote: Optional[str],
        salary_min: Optional[float],
        salary_max: Optional[float],
        skills: Optional[List[str]]
    ) -> str:
        """
        Generates a unique, non-colliding cache key string for job feed queries.
        Includes user_id (if personalized/authenticated) to prevent cross-user data leakage.
        """
        params_dict = {
            "page": page,
            "page_size": page_size,
            "type": company_type or "",
            "location": location or "",
            "remote": remote,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "skills": sorted(skills) if skills else []
        }
        param_str = json.dumps(params_dict, sort_keys=True)
        param_hash = hashlib.md5(param_str.encode("utf-8")).hexdigest()

        if user_id:
            return f"job_feed:user:{user_id}:{param_hash}"
        return f"job_feed:public:{param_hash}"

    def get_job_feed(self, cache_key: str) -> Optional[List[Dict[str, Any]]]:
        """
        Retrieves cached job feed JSON payload. Returns None on cache miss or error.
        """
        cli = self.client
        if cli is None:
            return None
        try:
            val = cli.get(cache_key)
            if val:
                return json.loads(val)
            return None
        except Exception as exc:
            logger.warning(f"[Cache Failure] get_job_feed error for key {cache_key}: {exc}")
            return None

    def set_job_feed(self, cache_key: str, data: List[Dict[str, Any]], ttl: int = 300) -> bool:
        """
        Caches job feed JSON payload with TTL (default 5 minutes).
        """
        cli = self.client
        if cli is None:
            return False
        try:
            cli.setex(cache_key, ttl, json.dumps(data))
            return True
        except Exception as exc:
            logger.warning(f"[Cache Failure] set_job_feed error for key {cache_key}: {exc}")
            return False

    def invalidate_user_feed_cache(self, user_id: str) -> bool:
        """
        Invalidates cached query results for a specific user upon a new swipe.
        """
        cli = self.client
        if cli is None:
            return False
        try:
            pattern = f"job_feed:user:{user_id}:*"
            keys = cli.keys(pattern)
            if keys:
                cli.delete(*keys)
            return True
        except Exception as exc:
            logger.warning(f"[Cache Failure] invalidate_user_feed_cache error for user {user_id}: {exc}")
            return False


def get_cache_service() -> RedisCacheService:
    return RedisCacheService()
