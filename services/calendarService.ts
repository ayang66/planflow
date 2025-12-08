import { TaskItem } from '../types';

/**
 * Formats a Date object into a UTC iCalendar string: YYYYMMDDTHHmmSSZ
 */
const formatICSDate = (date: Date): string => {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

/**
 * Generates the content of an .ics file from a list of tasks.
 * Uses the planStartDate to anchor the offsets.
 */
export const generateICSFileContent = (tasks: TaskItem[], planStartDate: number): string => {
  const events: string[] = [];
  const originDate = new Date(planStartDate);
  const now = new Date(); // For DTSTAMP

  tasks.forEach((task) => {
    // Calculate actual task date based on plan start date + offset
    const startDate = new Date(originDate);
    startDate.setDate(originDate.getDate() + task.dayOffset);
    
    const [hours, minutes] = task.startTime.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);

    // Calculate end time
    const endDate = new Date(startDate.getTime() + task.durationMinutes * 60000);

    const startStr = formatICSDate(startDate);
    const endStr = formatICSDate(endDate);
    const nowStr = formatICSDate(now);

    // Create unique ID
    const uid = `${now.getTime()}-${task.id}@planflow.ai`;

    // Construct the VEVENT block
    const lines = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${nowStr}`,
      `DTSTART:${startStr}`,
      `DTEND:${endStr}`,
      `SUMMARY:${task.title}`,
      `DESCRIPTION:${task.description.replace(/\n/g, '\\n')}`
    ];

    // Add Reminder (Alarm) if style is ALARM or VIBRATE
    // Note: VIBRATE often is treated as DISPLAY/AUDIO depending on client, we'll use DISPLAY with a specific note.
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

  // Construct the full VCALENDAR
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
 * Triggers a download of the .ics file in the browser.
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