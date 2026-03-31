import redis
import hashlib
from typing import Optional, Tuple
from datetime import datetime
from urllib.parse import urlparse
from app.config import get_settings

settings = get_settings()

if settings.redis_url:
    parsed = urlparse(settings.redis_url)
    redis_client = redis.Redis(
        host=parsed.hostname or "localhost",
        port=parsed.port or 6379,
        password=parsed.password or None,
        db=int(parsed.path.lstrip("/")) if parsed.path and parsed.path != "/" else 0,
        decode_responses=True
    )
else:
    redis_client = redis.Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        db=settings.redis_db,
        password=settings.redis_password or None,
        decode_responses=True
    )

REFRESH_TOKEN_PREFIX = "refresh_token:"
EMAIL_RATE_PREFIX = "email_rate:"
IP_RATE_PREFIX = "ip_rate:"


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()[:32]


def check_email_rate_limit(email: str) -> Tuple[bool, int, str]:
    """
    检查邮箱发送频率限制
    返回: (是否允许, 剩余秒数, 错误信息)
    """
    try:
        now = datetime.now()
        
        minute_key = f"{EMAIL_RATE_PREFIX}{email}:minute"
        hour_key = f"{EMAIL_RATE_PREFIX}{email}:hour"
        day_key = f"{EMAIL_RATE_PREFIX}{email}:day"
        
        if redis_client.exists(minute_key):
            ttl = redis_client.ttl(minute_key)
            return False, ttl, f"请等待 {ttl} 秒后再试"
        
        hour_count = int(redis_client.get(hour_key) or 0)
        if hour_count >= 5:
            ttl = redis_client.ttl(hour_key)
            return False, ttl, "发送次数过多，请 1 小时后再试"
        
        day_count = int(redis_client.get(day_key) or 0)
        if day_count >= 10:
            ttl = redis_client.ttl(day_key)
            return False, ttl, "今日发送次数已达上限，请明天再试"
        
        return True, 0, ""
    except Exception as e:
        print(f"Redis rate limit check error: {e}")
        return True, 0, ""


def record_email_sent(email: str) -> None:
    """记录邮箱发送"""
    try:
        minute_key = f"{EMAIL_RATE_PREFIX}{email}:minute"
        hour_key = f"{EMAIL_RATE_PREFIX}{email}:hour"
        day_key = f"{EMAIL_RATE_PREFIX}{email}:day"
        
        redis_client.setex(minute_key, 60, "1")
        
        hour_count = int(redis_client.get(hour_key) or 0)
        if hour_count == 0:
            redis_client.setex(hour_key, 3600, "1")
        else:
            redis_client.incr(hour_key)
        
        day_count = int(redis_client.get(day_key) or 0)
        if day_count == 0:
            redis_client.setex(day_key, 86400, "1")
        else:
            redis_client.incr(day_key)
    except Exception as e:
        print(f"Redis record email sent error: {e}")


def check_ip_rate_limit(ip: str) -> Tuple[bool, int, str]:
    """
    检查 IP 发送频率限制
    返回: (是否允许, 剩余秒数, 错误信息)
    """
    try:
        hour_key = f"{IP_RATE_PREFIX}{ip}:hour"
        day_key = f"{IP_RATE_PREFIX}{ip}:day"
        
        hour_count = int(redis_client.get(hour_key) or 0)
        if hour_count >= 20:
            ttl = redis_client.ttl(hour_key)
            return False, ttl, "请求过于频繁，请稍后再试"
        
        day_count = int(redis_client.get(day_key) or 0)
        if day_count >= 50:
            ttl = redis_client.ttl(day_key)
            return False, ttl, "今日请求次数已达上限"
        
        return True, 0, ""
    except Exception as e:
        print(f"Redis IP rate limit check error: {e}")
        return True, 0, ""


def record_ip_sent(ip: str) -> None:
    """记录 IP 发送"""
    try:
        hour_key = f"{IP_RATE_PREFIX}{ip}:hour"
        day_key = f"{IP_RATE_PREFIX}{ip}:day"
        
        hour_count = int(redis_client.get(hour_key) or 0)
        if hour_count == 0:
            redis_client.setex(hour_key, 3600, "1")
        else:
            redis_client.incr(hour_key)
        
        day_count = int(redis_client.get(day_key) or 0)
        if day_count == 0:
            redis_client.setex(day_key, 86400, "1")
        else:
            redis_client.incr(day_key)
    except Exception as e:
        print(f"Redis record IP sent error: {e}")


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
