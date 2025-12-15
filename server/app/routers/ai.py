from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional, List
import logging

from app.models.user import User
from app.services.auth import get_current_user
from app.services.deepseek import check_goal_clarity, decompose_goal, modify_plan
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


@router.post("/check-clarity", response_model=ClarityCheckResponse)
async def api_check_clarity(
    request: ClarityCheckRequest,
    current_user: User = Depends(get_current_user),
):
    logger.info(f"=== CHECK CLARITY ===")
    logger.info(f"User: {current_user.email}")
    logger.info(f"Goal: {request.goal}")
    try:
        result = await check_goal_clarity(request.goal)
        logger.info(f"Result: {result}")
        return ClarityCheckResponse(**result)
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/decompose", response_model=List[TaskCreate])
async def api_decompose_goal(
    request: DecomposeRequest,
    current_user: User = Depends(get_current_user),
):
    logger.info(f"=== DECOMPOSE GOAL ===")
    logger.info(f"User: {current_user.email}")
    logger.info(f"Goal: {request.goal}")
    logger.info(f"Constraints: {request.constraints}")
    logger.info(f"Force style: {request.force_reminder_style}")
    try:
        tasks = await decompose_goal(
            goal=request.goal,
            constraints=request.constraints,
            force_reminder_style=request.force_reminder_style,
            existing_schedule=request.existing_schedule,
        )
        logger.info(f"Generated {len(tasks)} tasks")
        return tasks
    except Exception as e:
        logger.error(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/modify", response_model=List[TaskCreate])
async def api_modify_plan(
    request: ModifyRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        tasks = await modify_plan(
            current_tasks=request.current_tasks,
            instruction=request.instruction,
            current_day_offset=request.current_day_offset,
        )
        return tasks
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
