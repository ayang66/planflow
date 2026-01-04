from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token, TokenRefresh
from app.services.auth import (
    get_password_hash,
    get_user_by_email,
    get_user_by_phone,
    authenticate_user,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    get_current_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    # 必须提供邮箱或手机号
    if not user_data.email and not user_data.phone:
        raise HTTPException(status_code=400, detail="请提供邮箱或手机号")

    # 检查邮箱是否已存在
    if user_data.email and await get_user_by_email(db, user_data.email):
        raise HTTPException(status_code=400, detail="该邮箱已被注册")

    # 检查手机号是否已存在
    if user_data.phone and await get_user_by_phone(db, user_data.phone):
        raise HTTPException(status_code=400, detail="该手机号已被注册")

    # 创建用户
    user = User(
        email=user_data.email,
        phone=user_data.phone,
        password_hash=get_password_hash(user_data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    # 必须提供邮箱或手机号
    if not user_data.email and not user_data.phone:
        raise HTTPException(status_code=400, detail="请提供邮箱或手机号")

    user = await authenticate_user(db, user_data.email, user_data.phone, user_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="账号或密码错误",
        )

    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})

    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/refresh", response_model=Token)
async def refresh_token(token_data: TokenRefresh, db: AsyncSession = Depends(get_db)):
    user = await verify_refresh_token(token_data.refresh_token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    access_token = create_access_token(data={"sub": user.id})
    refresh_token = create_refresh_token(data={"sub": user.id})

    return Token(access_token=access_token, refresh_token=refresh_token)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/upgrade", response_model=UserResponse)
async def upgrade_to_pro(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """升级到专业版（模拟支付成功后调用）"""
    current_user.is_pro = True
    current_user.pro_expires_at = datetime.utcnow() + timedelta(days=365)  # 一年有效期
    await db.commit()
    await db.refresh(current_user)
    return current_user
