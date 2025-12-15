from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List

from app.database import get_db
from app.models.user import User
from app.models.plan import Plan, Task
from app.schemas.plan import PlanCreate, PlanResponse, TaskUpdate
from app.services.auth import get_current_user

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("", response_model=List[PlanResponse])
async def get_plans(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Plan)
        .where(Plan.user_id == current_user.id)
        .options(selectinload(Plan.tasks))
        .order_by(Plan.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
async def create_plan(
    plan_data: PlanCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plan = Plan(user_id=current_user.id, goal=plan_data.goal)
    db.add(plan)
    await db.flush()

    for task_data in plan_data.tasks:
        task = Task(plan_id=plan.id, **task_data.model_dump())
        db.add(task)

    await db.commit()
    await db.refresh(plan)

    # Reload with tasks
    result = await db.execute(
        select(Plan).where(Plan.id == plan.id).options(selectinload(Plan.tasks))
    )
    return result.scalar_one()


@router.get("/{plan_id}", response_model=PlanResponse)
async def get_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Plan)
        .where(Plan.id == plan_id, Plan.user_id == current_user.id)
        .options(selectinload(Plan.tasks))
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Plan).where(Plan.id == plan_id, Plan.user_id == current_user.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    await db.delete(plan)
    await db.commit()


@router.patch("/{plan_id}/tasks/{task_id}", response_model=PlanResponse)
async def update_task(
    plan_id: int,
    task_id: int,
    task_data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify plan ownership
    result = await db.execute(
        select(Plan).where(Plan.id == plan_id, Plan.user_id == current_user.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Get task
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.plan_id == plan_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update fields
    update_data = task_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(task, field, value)

    await db.commit()

    # Return updated plan
    result = await db.execute(
        select(Plan).where(Plan.id == plan_id).options(selectinload(Plan.tasks))
    )
    return result.scalar_one()
