import json
from typing import List, Optional
from google import genai
from google.genai import types
from app.config import get_settings
from app.schemas.plan import TaskCreate

settings = get_settings()


def parse_response(text: str) -> any:
    clean = text.replace("```json", "").replace("```", "").strip()
    return json.loads(clean)


TASK_SCHEMA = types.Schema(
    type=types.Type.ARRAY,
    items=types.Schema(
        type=types.Type.OBJECT,
        properties={
            "title": types.Schema(type=types.Type.STRING),
            "description": types.Schema(type=types.Type.STRING),
            "day_offset": types.Schema(type=types.Type.INTEGER),
            "start_time": types.Schema(type=types.Type.STRING),
            "duration_minutes": types.Schema(type=types.Type.INTEGER),
            "reminder_style": types.Schema(type=types.Type.STRING, enum=["ALARM", "VIBRATE", "NONE"]),
        },
        required=["title", "description", "day_offset", "start_time", "duration_minutes", "reminder_style"],
    ),
)


async def check_goal_clarity(goal: str) -> dict:
    """检查目标是否足够清晰"""
    if not settings.gemini_api_key:
        return {"is_sufficient": True}

    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = f"""
    Analyze if this goal has enough detail to build a schedule: "{goal}"
    
    CRITERIA:
    1. Has specific outcome? (e.g. "Run 5k", "Finish report")
    2. Has timeline or frequency? (e.g. "in 1 month", "daily")
    
    RULES:
    - If user specifies TIME, don't ask for timeline
    - If goal is simple (e.g., "Clean garage"), assume ASAP and mark SUFFICIENT
    - Only ask if extremely vague with NO timeline
    
    Return JSON: {{"is_sufficient": boolean, "clarifying_question": "string or null"}}
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.7,
        ),
    )

    if response.text:
        return parse_response(response.text)
    return {"is_sufficient": True}


async def decompose_goal(
    goal: str,
    constraints: Optional[str] = None,
    force_reminder_style: Optional[str] = None,
    existing_schedule: Optional[str] = None
) -> List[TaskCreate]:
    """将目标分解为具体任务"""
    if not settings.gemini_api_key:
        raise ValueError("Gemini API key not configured")

    client = genai.Client(api_key=settings.gemini_api_key)

    prompt = f"""
    Goal: "{goal}"
    
    Break this down into a concrete, step-by-step plan.
    
    Rules:
    1. Break into logical, chronological steps
    2. Assign realistic 'day_offset' starting from today (0)
    3. Assign specific 'start_time' (e.g. "09:00", "14:30")
    4. Keep descriptions motivating but concise
    """

    if existing_schedule:
        prompt += f"\n\nEXISTING SCHEDULE (AVOID CONFLICTS):\n{existing_schedule}"

    if force_reminder_style:
        prompt += f"\n\nSet 'reminder_style' for ALL tasks to '{force_reminder_style}'."
    else:
        prompt += """
        
    For 'reminder_style':
    - 'ALARM': High priority, time-sensitive
    - 'VIBRATE': Medium priority
    - 'NONE': Low priority or flexible
    """

    if constraints:
        prompt += f"\n\nUSER CONSTRAINTS:\n{constraints}"

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=TASK_SCHEMA,
            temperature=0.7,
        ),
    )

    if response.text:
        tasks_data = parse_response(response.text)
        return [TaskCreate(**task) for task in tasks_data]
    raise ValueError("No response from Gemini")


async def modify_plan(
    current_tasks: List[dict],
    instruction: str,
    current_day_offset: int = 0
) -> List[TaskCreate]:
    """AI 辅助修改计划"""
    if not settings.gemini_api_key:
        raise ValueError("Gemini API key not configured")

    client = genai.Client(api_key=settings.gemini_api_key)

    completed = [t for t in current_tasks if t.get("is_completed")]
    active = [t for t in current_tasks if not t.get("is_completed")]

    prompt = f"""
    TIMELINE: Today is Day {current_day_offset}.
    
    COMPLETED TASKS (READ ONLY): {json.dumps(completed)}
    
    ACTIVE TASKS (EDITABLE): {json.dumps(active)}
    
    USER INSTRUCTION: "{instruction}"
    
    Regenerate the list of ACTIVE tasks based on the instruction.
    OUTPUT ONLY active/upcoming tasks, NOT completed ones.
    """

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=TASK_SCHEMA,
            temperature=0.7,
        ),
    )

    if response.text:
        tasks_data = parse_response(response.text)
        return [TaskCreate(**task) for task in tasks_data]
    raise ValueError("No response from Gemini")
