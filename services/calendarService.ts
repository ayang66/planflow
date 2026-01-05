import { TaskItem } from '../types';
import { Capacitor, registerPlugin } from '@capacitor/core';

// 定义自定义插件接口
interface CalendarPluginInterface {
  openICSFile(options: { content: string; fileName: string }): Promise<{ success: boolean }>;
}

// 注册自定义插件
const CalendarPlugin = registerPlugin<CalendarPluginInterface>('CalendarPlugin');

/**
 * 检查是否在原生平台上运行
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
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
 * 一键同步到日历 - 使用自定义 Android 插件直接打开日历应用
 */
export const syncToCalendar = async (
  tasks: TaskItem[],
  planStartDate: number,
  goalName?: string
): Promise<void> => {
  if (tasks.length === 0) {
    alert('没有任务可以同步');
    return;
  }

  const content = generateICSFileContent(tasks, planStartDate);
  // 文件名使用计划名
  const fileName = `${goalName || 'plan'}.ics`;

  if (isNativePlatform()) {
    try {
      // 使用自定义插件直接打开日历应用
      await CalendarPlugin.openICSFile({
        content: content,
        fileName: fileName
      });
    } catch (err: any) {
      console.error('Calendar plugin failed:', err);
      alert(`打开日历失败: ${err?.message || err}\n\n请确保手机上安装了日历应用`);
    }
  } else {
    // Web 环境直接下载
    downloadICSFile(tasks, planStartDate, fileName);
  }
};

/**
 * 同步单个任务到日历
 */
export const syncSingleTaskToCalendar = async (
  task: TaskItem,
  planStartDate: number,
  goalName?: string
): Promise<void> => {
  const content = generateICSFileContent([task], planStartDate);
  const fileName = `${goalName || 'task'}.ics`;

  if (isNativePlatform()) {
    try {
      await CalendarPlugin.openICSFile({
        content: content,
        fileName: fileName
      });
    } catch (err: any) {
      console.error('Calendar plugin failed:', err);
      alert(`打开日历失败: ${err?.message || err}\n\n请确保手机上安装了日历应用`);
    }
  } else {
    downloadICSFile([task], planStartDate, fileName);
  }
};
