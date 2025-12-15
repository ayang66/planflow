from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    day_offset: int = 0
    start_time: str
    duration_minutes: int = 30
    reminder_style: str = "ALARM"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    day_offset: Optional[int] = None
    start_time: Optional[str] = None
    duration_minutes: Optional[int] = None
    is_completed: Optional[bool] = None
    reminder_style: Optional[str] = None


class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    day_offset: int
    start_time: str
    duration_minutes: int
    is_completed: bool
    reminder_style: str

    class Config:
        from_attributes = True


class PlanCreate(BaseModel):
    goal: str
    tasks: List[TaskCreate] = []


class PlanResponse(BaseModel):
    id: int
    goal: str
    start_date: datetime
    created_at: datetime
    tasks: List[TaskResponse] = []

    class Config:
        from_attributes = True
