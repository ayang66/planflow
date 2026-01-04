from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List
import logging

from app.database import get_db
from app.models.user import User
from app.services.auth import get_current_user
from app.services.deepseek import check_goal_clarity, decompose_goal, modify_plan
from app.services.token_usage import record_token_usage, get_user_token_stats
from app.schemas.plan import TaskCreate

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


class ClarityCheckRequest(BaseModel):
    goal: str


class ClarityCheckResponse(BaseModel):
    is_sufficient: bool
    clarifying_question: Optional[str] = None


class DecomposeRequest(BaseModel):
    goal: str
    constraints: Optional[str] = None
    force_reminder_style: Optional[str] = None
    existing_schedule: Optional[str] = None


class ModifyRequest(BaseModel):
    current_tasks: List[dict]
    instruction: str
    current_day_offset: int = 0


class TokenStatsResponse(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    request_count: int
    period_days: int


@router.post("/check-clarity", response_model=ClarityCheckResponse)
async def api_check_clarity(
    request: ClarityCheckRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.info(f"=== CHECK CLARITY ===")
    logger.info(f"User: {current_user.email}")
    logger.info(f"Goal: {request.goal}")
    try:
        result, token_info = await check_goal_clarity(request.goal)
        logger.info(f"Result: {result}")
        
        # 记录 token 使用
        await record_token_usage(
            db=db,
            user_id=current_user.id,
            endpoint="/api/ai/check-clarity",
            model=token_info["model"],
            prompt_tokens=token_info["prompt_tokens"],
            completion_tokens=token_info["completion_tokens"],
            request_summary=request.goal[:100]
        )
        
        return ClarityCheckResponse(**result)
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/decompose", response_model=List[TaskCreate])
async def api_decompose_goal(
    request: DecomposeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logger.info(f"=== DECOMPOSE GOAL ===")
    logger.info(f"User: {current_user.email}")
    logger.info(f"Goal: {request.goal}")
    try:
        tasks, token_info = await decompose_goal(
            goal=request.goal,
            constraints=request.constraints,
            force_reminder_style=request.force_reminder_style,
            existing_schedule=request.existing_schedule,
        )
        logger.info(f"Generated {len(tasks)} tasks")
        
        # 记录 token 使用
        await record_token_usage(
            db=db,
            user_id=current_user.id,
            endpoint="/api/ai/decompose",
            model=token_info["model"],
            prompt_tokens=token_info["prompt_tokens"],
            completion_tokens=token_info["completion_tokens"],
            request_summary=request.goal[:100]
        )
        
        return tasks
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/modify", response_model=List[TaskCreate])
async def api_modify_plan(
    request: ModifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    try:
        tasks, token_info = await modify_plan(
            current_tasks=request.current_tasks,
            instruction=request.instruction,
            current_day_offset=request.current_day_offset,
        )
        
        # 记录 token 使用
        await record_token_usage(
            db=db,
            user_id=current_user.id,
            endpoint="/api/ai/modify",
            model=token_info["model"],
            prompt_tokens=token_info["prompt_tokens"],
            completion_tokens=token_info["completion_tokens"],
            request_summary=request.instruction[:100]
        )
        
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/token-stats", response_model=TokenStatsResponse)
async def api_get_token_stats(
    days: int = 30,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取用户 token 使用统计"""
    stats = await get_user_token_stats(db, current_user.id, days)
    return TokenStatsResponse(**stats)
