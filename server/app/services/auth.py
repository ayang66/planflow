from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.services.redis import store_refresh_token, verify_refresh_token_in_redis, revoke_refresh_token

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    # 确保 sub 是字符串
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def create_refresh_token(data: dict, store_in_redis: bool = True) -> str:
    to_encode = data.copy()
    user_id = to_encode.get("sub")
    # 确保 sub 是字符串
    if "sub" in to_encode:
        to_encode["sub"] = str(to_encode["sub"])
    expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire, "type": "refresh"})
    token = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    
    # 存储到 Redis
    if store_in_redis and user_id:
        store_refresh_token(int(user_id), token, settings.refresh_token_expire_days)
    
    return token


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_phone(db: AsyncSession, phone: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.phone == phone))
    return result.scalar_one_or_none()


async def authenticate_user(db: AsyncSession, email: Optional[str], phone: Optional[str], password: str) -> Optional[User]:
    """支持邮箱或手机号登录"""
    user = None
    if email:
        user = await get_user_by_email(db, email)
    elif phone:
        user = await get_user_by_phone(db, phone)
    
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    token = credentials.credentials
    print(f"=== TOKEN VALIDATION ===")
    print(f"Token: {token[:30]}...")
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        print(f"Payload: {payload}")
        user_id_str = payload.get("sub")
        user_id: int = int(user_id_str) if user_id_str else None
        token_type: str = payload.get("type")
        print(f"User ID: {user_id}, Type: {token_type}")
        if user_id is None or token_type != "access":
            print("Invalid user_id or token_type")
            raise credentials_exception
    except JWTError as e:
        print(f"JWT Error: {e}")
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    print(f"User found: {user}")
    if user is None:
        print("User not found in DB")
        raise credentials_exception
    return user


async def verify_refresh_token(token: str, db: AsyncSession) -> Optional[User]:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id_str = payload.get("sub")
        user_id: int = int(user_id_str) if user_id_str else None
        token_type: str = payload.get("type")
        if user_id is None or token_type != "refresh":
            return None
        
        # 验证 token 是否在 Redis 中（未被撤销）
        if not verify_refresh_token_in_redis(user_id, token):
            print(f"Refresh token not found in Redis for user {user_id}")
            return None
            
    except JWTError:
        return None

    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def logout_user(user_id: int, refresh_token: str) -> bool:
    """登出用户，撤销 refresh token"""
    return revoke_refresh_token(user_id, refresh_token)
