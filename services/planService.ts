import { API_BASE_URL } from './config';
import { getAccessToken, refreshAccessToken, clearAuth } from './authService';
import { Plan, TaskItem } from '../types';

// 带认证的 fetch
const authFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const accessToken = getAccessToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }
  
  let response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
  
  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${getAccessToken()}`;
      response = await fetch(`${API_BASE_URL}${url}`, { ...options, headers });
    } else {
      clearAuth();
      throw new Error('Session expired');
    }
  }
  
  return response;
};

// 后端响应转前端格式
const transformPlanFromServer = (serverPlan: any): Plan => ({
  id: String(serverPlan.id),
  createdAt: new Date(serverPlan.created_at).getTime(),
  startDate: new Date(serverPlan.start_date).getTime(),
  goal: serverPlan.goal,
  tasks: serverPlan.tasks.map((t: any): TaskItem => ({
    id: String(t.id),
    title: t.title,
    description: t.description || '',
    dayOffset: t.day_offset,
    startTime: t.start_time,
    durationMinutes: t.duration_minutes,
    isCompleted: t.is_completed,
    reminderStyle: t.reminder_style,
  })),
});

// 前端格式转后端请求
const transformTaskForServer = (task: Omit<TaskItem, 'id' | 'isCompleted'>) => ({
  title: task.title,
  description: task.description,
  day_offset: task.dayOffset,
  start_time: task.startTime,
  duration_minutes: task.durationMinutes,
  reminder_style: task.reminderStyle || 'ALARM',
});

// 获取所有计划
export const fetchPlans = async (): Promise<Plan[]> => {
  const response = await authFetch('/plans');
  if (!response.ok) throw new Error('Failed to fetch plans');
  const data = await response.json();
  return data.map(transformPlanFromServer);
};

// 创建计划
export const createPlan = async (goal: string, tasks: Omit<TaskItem, 'id' | 'isCompleted'>[]): Promise<Plan> => {
  const response = await authFetch('/plans', {
    method: 'POST',
    body: JSON.stringify({
      goal,
      tasks: tasks.map(transformTaskForServer),
    }),
  });
  if (!response.ok) throw new Error('Failed to create plan');
  return transformPlanFromServer(await response.json());
};

// 删除计划
export const deletePlan = async (planId: string): Promise<void> => {
  const response = await authFetch(`/plans/${planId}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete plan');
};

// 更新任务
export const updateTask = async (
  planId: string,
  taskId: string,
  updates: Partial<TaskItem>
): Promise<Plan> => {
  const serverUpdates: any = {};
  if (updates.title !== undefined) serverUpdates.title = updates.title;
  if (updates.description !== undefined) serverUpdates.description = updates.description;
  if (updates.dayOffset !== undefined) serverUpdates.day_offset = updates.dayOffset;
  if (updates.startTime !== undefined) serverUpdates.start_time = updates.startTime;
  if (updates.durationMinutes !== undefined) serverUpdates.duration_minutes = updates.durationMinutes;
  if (updates.isCompleted !== undefined) serverUpdates.is_completed = updates.isCompleted;
  if (updates.reminderStyle !== undefined) serverUpdates.reminder_style = updates.reminderStyle;

  const response = await authFetch(`/plans/${planId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(serverUpdates),
  });
  if (!response.ok) throw new Error('Failed to update task');
  return transformPlanFromServer(await response.json());
};

// 添加任务到计划
export const addTaskToPlan = async (
  planId: string,
  task: Omit<TaskItem, 'id' | 'isCompleted'>
): Promise<Plan> => {
  const response = await authFetch(`/plans/${planId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(transformTaskForServer(task)),
  });
  if (!response.ok) throw new Error('Failed to add task');
  return transformPlanFromServer(await response.json());
};

// 删除任务
export const deleteTask = async (planId: string, taskId: string): Promise<Plan> => {
  const response = await authFetch(`/plans/${planId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to delete task');
  return transformPlanFromServer(await response.json());
};
