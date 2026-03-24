from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timedelta, timezone
import random

from app.database import get_db
from app.models.user import User
from app.models.email_verification import EmailVerification
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token, TokenRefresh, EmailVerifyRequest
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
from app.services.email import send_verification_code, generate_verification_code
from app.services.redis import (
    check_email_rate_limit,
    record_email_sent,
    check_ip_rate_limit,
    record_ip_sent,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/send-verification-code")
async def send_verification_code_endpoint(
    request: Request,
    email: str,
    db: AsyncSession = Depends(get_db)
):
    """
    发送邮箱验证码
    
    - **email**: 要验证的邮箱地址
    """
    # 检查邮箱格式
    if not email or "@" not in email:
        raise HTTPException(status_code=400, detail="请输入有效的邮箱地址")
    
    # 获取客户端 IP
    client_ip = request.client.host if request.client else "unknown"
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        client_ip = forwarded.split(",")[0].strip()
    
    # 检查 IP 发送频率限制
    ip_allowed, _, ip_error = check_ip_rate_limit(client_ip)
    if not ip_allowed:
        raise HTTPException(status_code=429, detail=ip_error)
    
    # 检查邮箱发送频率限制
    email_allowed, wait_seconds, email_error = check_email_rate_limit(email)
    if not email_allowed:
        raise HTTPException(status_code=429, detail=email_error)
    
    # 检查邮箱是否已被注册
    existing_user = await get_user_by_email(db, email)
    if existing_user:
        raise HTTPException(status_code=400, detail="该邮箱已被注册")
    
    # 生成验证码
    code = generate_verification_code()
    
    # 删除旧的验证码
    result = await db.execute(
        select(EmailVerification).where(EmailVerification.email == email)
    )
    old_verifications = result.scalars().all()
    for old in old_verifications:
        await db.delete(old)
    
    # 创建新的验证码记录
    verification = EmailVerification(
        email=email,
        code=code,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=10)
    )
    db.add(verification)
    await db.commit()
    
    # 发送邮件
    success = send_verification_code(email, code)
    print(f"[DEBUG] Verification code for {email}: {code}")
    
    if not success:
        raise HTTPException(status_code=500, detail="邮件发送失败，请稍后重试")
    
    # 记录发送频率
    record_email_sent(email)
    record_ip_sent(client_ip)
    
    return {"message": "验证码已发送，请查收邮箱", "expires_in": 600}


@router.post("/verify-email")
async def verify_email_endpoint(
    request: EmailVerifyRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    验证邮箱验证码
    
    - **email**: 邮箱地址
    - **code**: 验证码
    """
    # 查找验证码记录
    result = await db.execute(
        select(EmailVerification)
        .where(EmailVerification.email == request.email)
        .where(EmailVerification.is_used == False)
        .order_by(EmailVerification.created_at.desc())
    )
    verification = result.scalars().first()
    
    if not verification:
        raise HTTPException(status_code=400, detail="请先获取验证码")
    
    # 检查是否过期
    if verification.is_expired():
        raise HTTPException(status_code=400, detail="验证码已过期，请重新获取")
    
    # 验证验证码
    if verification.code != request.code:
        raise HTTPException(status_code=400, detail="验证码错误")
    
    # 标记为已使用
    verification.is_used = True
    await db.commit()
    
    return {"message": "邮箱验证成功"}


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    verification_code: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """
    用户注册
    
    - **email**: 邮箱（可选）
    - **phone**: 手机号（可选）
    - **password**: 密码
    - **verification_code**: 邮箱验证码（如果使用邮箱注册则必填）
    """
    print(f"[DEBUG] Register request - email: {user_data.email}, phone: {user_data.phone}, verification_code: {verification_code}")
    
    # 必须提供邮箱或手机号
    if not user_data.email and not user_data.phone:
        raise HTTPException(status_code=400, detail="请提供邮箱或手机号")

    # 检查邮箱是否已存在
    if user_data.email and await get_user_by_email(db, user_data.email):
        raise HTTPException(status_code=400, detail="该邮箱已被注册")

    # 检查手机号是否已存在
    if user_data.phone and await get_user_by_phone(db, user_data.phone):
        raise HTTPException(status_code=400, detail="该手机号已被注册")
    
    # 如果使用邮箱注册，验证邮箱验证码
    if user_data.email:
        if not verification_code:
            print(f"[DEBUG] No verification code provided for email: {user_data.email}")
            raise HTTPException(status_code=400, detail="请输入邮箱验证码")
        
        # 查找验证码（允许使用已验证过的验证码，因为用户可能已经验证过邮箱）
        result = await db.execute(
            select(EmailVerification)
            .where(EmailVerification.email == user_data.email)
            .where(EmailVerification.code == verification_code)
            .order_by(EmailVerification.created_at.desc())
        )
        verification = result.scalars().first()
        
        print(f"[DEBUG] Verification record found: {verification is not None}, code: {verification.code if verification else 'N/A'}, is_used: {verification.is_used if verification else 'N/A'}")
        
        if not verification:
            raise HTTPException(status_code=400, detail="验证码错误，请重新获取")
        
        if verification.is_expired():
            raise HTTPException(status_code=400, detail="验证码已过期，请重新获取")
        
        # 标记验证码为已使用（如果还未使用）
        if not verification.is_used:
            verification.is_used = True
            await db.commit()

    # 创建用户
    user = User(
        email=user_data.email,
        phone=user_data.phone,
        password_hash=get_password_hash(user_data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    print(f"[DEBUG] User created successfully: {user.id}")
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
