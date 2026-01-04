import { TaskItem } from '../types';
import { Capacitor } from '@capacitor/core';

/**
 * 检查是否在原生平台上运行
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * 使用 Android Intent 打开日历添加事件界面
 * 这种方式不需要额外权限，兼容所有 Android 设备
 */
export const addTaskToCalendarIntent = async (
  task: TaskItem,
  planStartDate: number,
  goalName?: string
): Promise<void> => {
  const originDate = new Date(planStartDate);
  const startDate = new Date(originDate);
  startDate.setDate(originDate.getDate() + task.dayOffset);
  
  const [hours, minutes] = task.startTime.split(':').map(Number);
  startDate.setHours(hours, minutes, 0, 0);

  const endDate = new Date(startDate.getTime() + task.durationMinutes * 60000);

  const title = goalName ? `[${goalName}] ${task.title}` : task.title;
  
  // 使用 Google Calendar Intent URL scheme
  // 这在大多数 Android 设备上都能工作
  const calendarUrl = new URL('https://www.google.com/calendar/render');
  calendarUrl.searchParams.set('action', 'TEMPLATE');
  calendarUrl.searchParams.set('text', title);
  calendarUrl.searchParams.set('details', task.description);
  calendarUrl.searchParams.set('dates', 
    `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`
  );
  
  window.open(calendarUrl.toString(), '_blank');
};

/**
 * 格式化日期为 Google Calendar 格式
 */
const formatGoogleDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
};

/**
 * Formats a Date object into a UTC iCalendar string: YYYYMMDDTHHmmSSZ
 */
const formatICSDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Generates the content of an .ics file from a list of tasks.
 */
export const generateICSFileContent = (tasks: TaskItem[], planStartDate: number): string => {
  const events: string[] = [];
  const originDate = new Date(planStartDate);
  const now = new Date();

  tasks.forEach((task) => {
    const startDate = new Date(originDate);
    startDate.setDate(originDate.getDate() + task.dayOffset);
    
    const [hours, minutes] = task.startTime.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);

    const endDate = new Date(startDate.getTime() + task.durationMinutes * 60000);

    const startStr = formatICSDate(startDate);
    const endStr = formatICSDate(endDate);
    const nowStr = formatICSDate(now);

    const uid = `${now.getTime()}-${task.id}@planflow.ai`;

    const lines = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${nowStr}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${task.title}`,
      `DESCRIPTION:${task.description.replace(/\n/g, '\\n')}`
    ];

    if (task.reminderStyle === 'ALARM' || task.reminderStyle === 'VIBRATE') {
      lines.push(
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        'DESCRIPTION:Reminder: ' + task.title,
        'END:VALARM'
      );
    }

    lines.push('END:VEVENT');
    events.push(lines.join('\r\n'));
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PlanFlow AI//Goal Planner//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...events,
    'END:VCALENDAR'
  ].join('\r\n');
};

/**
 * 下载 ICS 文件（Web 方式）
 */
export const downloadICSFile = (tasks: TaskItem[], planStartDate: number, fileName: string = 'my-plan.ics') => {
  const content = generateICSFileContent(tasks, planStartDate);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * 通过分享 ICS 文件同步到日历（Android 原生方式）
 * 用户可以选择任意日历应用打开
 */
export const shareICSFile = async (
  tasks: TaskItem[], 
  planStartDate: number, 
  fileName: string = 'my-plan.ics'
): Promise<void> => {
  const content = generateICSFileContent(tasks, planStartDate);
  
  if (isNativePlatform() && navigator.share) {
    try {
      const file = new File([content], fileName, { type: 'text/calendar' });
      await navigator.share({
        files: [file],
        title: 'PlanFlow 日程',
        text: '导入到日历'
      });
    } catch (err) {
      // 如果分享失败，回退到下载
      console.log('Share failed, falling back to download:', err);
      downloadICSFile(tasks, planStartDate, fileName);
    }
  } else {
    // Web 环境直接下载
    downloadICSFile(tasks, planStartDate, fileName);
  }
};

/**
 * 智能同步到日历 - 自动选择最佳方式
 */
export const syncToCalendar = async (
  tasks: TaskItem[],
  planStartDate: number,
  goalName?: string
): Promise<void> => {
  const fileName = `PlanFlow_${goalName?.substring(0, 10) || 'Plan'}.ics`;
  await shareICSFile(tasks, planStartDate, fileName);
};
