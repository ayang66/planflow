import redis
import hashlib
from typing import Optional
from app.config import get_settings

settings = get_settings()

# Redis 连接
redis_client = redis.Redis(
    host=settings.redis_host,
    port=settings.redis_port,
    db=settings.redis_db,
    password=settings.redis_password or None,
    decode_responses=True
)

# Token 前缀
REFRESH_TOKEN_PREFIX = "refresh_token:"


def _hash_token(token: str) -> str:
    """对 token 进行哈希，避免存储原始 token"""
    return hashlib.sha256(token.encode()).hexdigest()[:32]


def store_refresh_token(user_id: int, token: str, expire_days: int = 7) -> bool:
    """存储 refresh token 到 Redis"""
    try:
        key = f"{REFRESH_TOKEN_PREFIX}{user_id}:{_hash_token(token)}"
        expire_seconds = expire_days * 24 * 60 * 60
        redis_client.setex(key, expire_seconds, str(user_id))
        return True
    except Exception as e:
        print(f"Redis store error: {e}")
        return False


def verify_refresh_token_in_redis(user_id: int, token: str) -> bool:
    """验证 refresh token 是否存在于 Redis"""
    try:
        key = f"{REFRESH_TOKEN_PREFIX}{user_id}:{_hash_token(token)}"
        return redis_client.exists(key) == 1
    except Exception as e:
        print(f"Redis verify error: {e}")
        return False


def revoke_refresh_token(user_id: int, token: str) -> bool:
    """撤销单个 refresh token"""
    try:
        key = f"{REFRESH_TOKEN_PREFIX}{user_id}:{_hash_token(token)}"
        redis_client.delete(key)
        return True
    except Exception as e:
        print(f"Redis revoke error: {e}")
        return False


def revoke_all_user_tokens(user_id: int) -> int:
    """撤销用户所有 refresh token（强制登出所有设备）"""
    try:
        pattern = f"{REFRESH_TOKEN_PREFIX}{user_id}:*"
        keys = redis_client.keys(pattern)
        if keys:
            return redis_client.delete(*keys)
        return 0
    except Exception as e:
        print(f"Redis revoke all error: {e}")
        return 0


def check_redis_connection() -> bool:
    """检查 Redis 连接"""
    try:
        redis_client.ping()
        return True
    except Exception:
        return False
