import { TaskItem, ReminderStyle } from "../types";
import { API_BASE_URL } from "./config";
import { getAccessToken, getRefreshToken, refreshAccessToken } from "./authService";

const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const accessToken = getAccessToken();
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };
  
  if (accessToken) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${accessToken}`;
  }
  
  let response = await fetch(url, { ...options, headers });
  
  // 如果 token 过期，尝试刷新
  if (response.status === 401 && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${getAccessToken()}`;
      response = await fetch(url, { ...options, headers });
    }
  }
  
  return response;
};

export const checkGoalClarity = async (
  goal: string
): Promise<{ isSufficient: boolean; clarifyingQuestion?: string }> => {
  try {
    const response = await authFetch(`${API_BASE_URL}/ai/check-clarity`, {
      method: "POST",
      body: JSON.stringify({ goal }),
    });

    if (!response.ok) {
      console.error("Clarity check failed:", response.status);
      return { isSufficient: true };
    }

    const data = await response.json();
    return {
      isSufficient: data.is_sufficient,
      clarifyingQuestion: data.clarifying_question,
    };
  } catch (error) {
    console.error("Clarity Check Error:", error);
    return { isSufficient: true };
  }
};

export const decomposeGoal = async (
  goal: string,
  constraints?: string,
  forceReminderStyle?: ReminderStyle,
  existingSchedule?: string
): Promise<TaskItem[]> => {
  const response = await authFetch(`${API_BASE_URL}/ai/decompose`, {
    method: "POST",
    body: JSON.stringify({
      goal,
      constraints,
      force_reminder_style: forceReminderStyle,
      existing_schedule: existingSchedule,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to generate plan");
  }

  const tasks = await response.json();
  // 转换后端 snake_case 为前端 camelCase
  return tasks.map((t: any, index: number) => ({
    id: t.id || `task_${index}`,
    title: t.title,
    description: t.description,
    dayOffset: t.day_offset,
    startTime: t.start_time,
    durationMinutes: t.duration_minutes,
    reminderStyle: t.reminder_style || "ALARM",
    isCompleted: false,
  }));
};

export const modifyPlan = async (
  currentTasks: TaskItem[],
  instruction: string,
  currentDayOffset: number = 0
): Promise<TaskItem[]> => {
  // 转换为后端格式
  const tasksForBackend = currentTasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    day_offset: t.dayOffset,
    start_time: t.startTime,
    duration_minutes: t.durationMinutes,
    reminder_style: t.reminderStyle,
    is_completed: t.isCompleted,
  }));

  const response = await authFetch(`${API_BASE_URL}/ai/modify`, {
    method: "POST",
    body: JSON.stringify({
      current_tasks: tasksForBackend,
      instruction,
      current_day_offset: currentDayOffset,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || "Failed to modify plan");
  }

  const tasks = await response.json();
  // 保留已完成的任务
  const completedTasks = currentTasks.filter((t) => t.isCompleted);

  const newActiveTasks = tasks.map((t: any, index: number) => ({
    id: t.id || `task_${index}`,
    title: t.title,
    description: t.description,
    dayOffset: t.day_offset,
    startTime: t.start_time,
    durationMinutes: t.duration_minutes,
    reminderStyle: t.reminder_style || "ALARM",
    isCompleted: false,
  }));

  return [...completedTasks, ...newActiveTasks];
};
