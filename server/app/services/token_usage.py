from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta
from typing import Optional
from app.models.token_usage import TokenUsage


async def record_token_usage(
    db: AsyncSession,
    user_id: int,
    endpoint: str,
    model: str,
    prompt_tokens: int,
    completion_tokens: int,
    request_summary: Optional[str] = None
) -> TokenUsage:
    """记录一次 token 使用"""
    usage = TokenUsage(
        user_id=user_id,
        endpoint=endpoint,
        model=model,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=prompt_tokens + completion_tokens,
        request_summary=request_summary[:200] if request_summary else None
    )
    db.add(usage)
    await db.commit()
    await db.refresh(usage)
    return usage


async def get_user_token_stats(
    db: AsyncSession,
    user_id: int,
    days: int = 30
) -> dict:
    """获取用户 token 使用统计"""
    since = datetime.utcnow() - timedelta(days=days)
    
    result = await db.execute(
        select(
            func.sum(TokenUsage.prompt_tokens).label("total_prompt"),
            func.sum(TokenUsage.completion_tokens).label("total_completion"),
            func.sum(TokenUsage.total_tokens).label("total"),
            func.count(TokenUsage.id).label("request_count")
        )
        .where(TokenUsage.user_id == user_id)
        .where(TokenUsage.created_at >= since)
    )
    row = result.one()
    
    return {
        "prompt_tokens": row.total_prompt or 0,
        "completion_tokens": row.total_completion or 0,
        "total_tokens": row.total or 0,
        "request_count": row.request_count or 0,
        "period_days": days
    }


async def get_user_usage_history(
    db: AsyncSession,
    user_id: int,
    limit: int = 50
) -> list:
    """获取用户最近的使用记录"""
    result = await db.execute(
        select(TokenUsage)
        .where(TokenUsage.user_id == user_id)
        .order_by(TokenUsage.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
