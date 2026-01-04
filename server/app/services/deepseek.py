import json
import httpx
from typing import List, Optional, Tuple
from app.config import get_settings
from app.schemas.plan import TaskCreate

settings = get_settings()

DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"


async def call_deepseek(system_prompt: str, user_prompt: str) -> Tuple[str, dict]:
    """调用 DeepSeek API，返回 (内容, token使用信息)"""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            DEEPSEEK_API_URL,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {settings.deepseek_api_key}",
            },
            json={
                "model": "deepseek-chat",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.7,
            },
        )
        response.raise_for_status()
        data = response.json()
        
        # 提取 token 使用信息
        usage = data.get("usage", {})
        token_info = {
            "model": "deepseek-chat",
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
        }
        
        return data["choices"][0]["message"]["content"], token_info


def parse_json_response(text: str) -> any:
    """解析 JSON 响应"""
    clean = text.replace("```json", "").replace("```", "").strip()
    return json.loads(clean)


async def check_goal_clarity(goal: str) -> Tuple[dict, dict]:
    """检查目标是否足够清晰，返回 (结果, token信息)"""
    system_prompt = """你是一个效率教练。分析用户目标是否有足够细节来制定计划。
只返回 JSON 格式: {"is_sufficient": boolean, "clarifying_question": "string or null"}"""

    user_prompt = f"""
用户目标: "{goal}"

判断标准:
1. 有具体结果吗？(如 "跑5公里", "完成报告")
2. 有时间线或频率吗？(如 "1个月内", "每天")

规则:
- 如果用户指定了时间，不要问时间线
- 如果目标简单(如 "打扫车库")，假设"尽快"并标记为充分
- 只有极度模糊且没有时间线时才提问

返回 JSON:
- 充分: {{"is_sufficient": true}}
- 模糊: {{"is_sufficient": false, "clarifying_question": "你的问题"}}
"""

    try:
        response, token_info = await call_deepseek(system_prompt, user_prompt)
        return parse_json_response(response), token_info
    except Exception as e:
        print(f"Clarity check error: {e}")
        return {"is_sufficient": True}, {"model": "deepseek-chat", "prompt_tokens": 0, "completion_tokens": 0}


async def decompose_goal(
    goal: str,
    constraints: Optional[str] = None,
    force_reminder_style: Optional[str] = None,
    existing_schedule: Optional[str] = None,
) -> Tuple[List[TaskCreate], dict]:
    """将目标分解为具体任务，返回 (任务列表, token信息)"""
    
    system_prompt = """你是一个专业的项目经理和效率教练。将用户目标分解为具体可执行的任务。
返回 JSON 数组格式，每个任务包含:
- title: 简短的任务标题
- description: 详细说明
- day_offset: 从今天开始的天数(0=今天, 1=明天)
- start_time: 开始时间 "HH:MM" 24小时格式
- duration_minutes: 持续时间(分钟)
- reminder_style: "ALARM"(紧急), "VIBRATE"(重要), "NONE"(普通)"""

    user_prompt = f"""目标: "{goal}"

规则:
1. 分解为逻辑、按时间顺序的步骤
2. 分配合理的 day_offset (从0开始)
3. 分配具体的 start_time
4. 描述要简洁有激励性
"""

    if existing_schedule:
        user_prompt += f"\n\n已有日程(避免冲突):\n{existing_schedule}"

    if force_reminder_style:
        user_prompt += f"\n\n所有任务的 reminder_style 设为 '{force_reminder_style}'"
    else:
        user_prompt += """

reminder_style 规则:
- ALARM: 紧急/时间敏感(起床、会议、截止日期)
- VIBRATE: 中等优先级(锻炼、学习)
- NONE: 低优先级/灵活任务"""

    if constraints:
        user_prompt += f"\n\n用户约束:\n{constraints}"

    response, token_info = await call_deepseek(system_prompt, user_prompt)
    tasks_data = parse_json_response(response)
    return [TaskCreate(**task) for task in tasks_data], token_info


async def modify_plan(
    current_tasks: List[dict],
    instruction: str,
    current_day_offset: int = 0,
) -> Tuple[List[TaskCreate], dict]:
    """AI 辅助修改计划，返回 (任务列表, token信息)"""
    
    completed = [t for t in current_tasks if t.get("is_completed")]
    active = [t for t in current_tasks if not t.get("is_completed")]

    system_prompt = """你是一个项目经理。根据用户指令修改任务列表。
只返回修改后的活跃任务 JSON 数组，不要包含已完成的任务。"""

    user_prompt = f"""时间线: 今天是第 {current_day_offset} 天

已完成任务(只读): {json.dumps(completed, ensure_ascii=False)}

活跃任务(可编辑): {json.dumps(active, ensure_ascii=False)}

用户指令: "{instruction}"

根据指令修改活跃任务列表，只输出活跃任务的 JSON 数组。
"""

    response, token_info = await call_deepseek(system_prompt, user_prompt)
    tasks_data = parse_json_response(response)
    return [TaskCreate(**task) for task in tasks_data], token_info
