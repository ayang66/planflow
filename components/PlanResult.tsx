
import React, { useState, useMemo, useEffect } from 'react';
import { TaskItem, Plan, ReminderStyle, Language } from '../types';
import { Sparkles, Wand2, Send, X, Loader2, Plus, Trash2, Target, Bell, BellRing, BellOff, Smartphone, ChevronRight } from './Icons';
import { CalendarWidget } from './CalendarWidget';
import { translations } from '../utils/translations';
import { useTheme } from '../contexts/ThemeContext';
import { TimePicker } from './TimePicker';
import { Select, SelectOption } from './Select';

interface PlanResultProps {
  plans: Plan[];
  focusedPlan: Plan | null;
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onUpdateTask: (planId: string, taskId: string, updates: Partial<TaskItem>) => void;
  onDeleteTask: (planId: string, taskId: string) => void;
  onAddTask: (planId: string | 'NEW', task: Omit<TaskItem, 'id' | 'dayOffset'> & { date: Date }, newGoalName?: string) => void;
  onRefine: (planId: string, instruction: string) => Promise<void>;
  isRefining: boolean;
  onClearSelection: () => void;
  language: Language;
}

interface RenderTask extends TaskItem {
  planId: string;
  planGoal: string;
  planColor?: string;
}

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (totalMinutes: number): string => {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const getLocale = (lang: Language) => {
  switch (lang) {
    case 'zh': return 'zh-CN';
    case 'ja': return 'ja-JP';
    case 'ko': return 'ko-KR';
    default: return 'en-US';
  }
};

export const PlanResult: React.FC<PlanResultProps> = ({ 
  plans, 
  focusedPlan,
  selectedDate,
  onSelectDate,
  onUpdateTask, 
  onDeleteTask, 
  onAddTask,
  onRefine, 
  isRefining,
  onClearSelection,
  language
}) => {
  const t = translations[language];
  const { themeColor } = useTheme();
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<{planId: string, taskId: string, title: string} | null>(null);
  const [isCalendarCollapsed, setIsCalendarCollapsed] = useState(false);

  // Editing State
  const [editingTask, setEditingTask] = useState<RenderTask | null>(null);
  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    startTime: string;
    durationMinutes: number;
    reminderStyle: ReminderStyle;
  }>({
    title: '',
    description: '',
    startTime: '',
    durationMinutes: 0,
    reminderStyle: 'ALARM'
  });

  const [newTask, setNewTask] = useState<{
    title: string;
    description: string;
    startTime: string;
    durationMinutes: number;
    goalId: string;
    newGoalName: string;
    reminderStyle: ReminderStyle;
  }>({
    title: '',
    description: '',
    startTime: '09:00',
    durationMinutes: 30,
    goalId: '',
    newGoalName: '',
    reminderStyle: 'ALARM'
  });

  const locale = getLocale(language);

  // Reminder Options
  const reminderOptions: SelectOption[] = [
      { label: 'Alarm (Sound)', value: 'ALARM' },
      { label: 'Vibrate Only', value: 'VIBRATE' },
      { label: 'No Reminder', value: 'NONE' },
  ];

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (!mainElement) return;

    const handleScroll = () => {
        if (mainElement.scrollTop > 20) {
            setIsCalendarCollapsed(true);
        } else {
            setIsCalendarCollapsed(false);
        }
    };

    mainElement.addEventListener('scroll', handleScroll);
    return () => mainElement.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isAddingTask && !newTask.goalId) {
      const defaultGoalId = focusedPlan ? focusedPlan.id : (plans.length > 0 ? plans[0].id : 'NEW');
      setNewTask(prev => ({ ...prev, goalId: defaultGoalId }));
    }
  }, [isAddingTask, focusedPlan, plans]);

  useEffect(() => {
    if (editingTask) {
        setEditForm({
            title: editingTask.title,
            description: editingTask.description,
            startTime: editingTask.startTime,
            durationMinutes: editingTask.durationMinutes,
            reminderStyle: editingTask.reminderStyle || 'ALARM'
        });
    }
  }, [editingTask]);

  const getDateKey = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };

  const { tasksByDate, dayStats } = useMemo(() => {
    const mapping: Record<string, RenderTask[]> = {};
    const stats: Record<string, { total: number; completed: number }> = {};

    plans.forEach(plan => {
      const startDate = new Date(plan.startDate);
      startDate.setHours(0, 0, 0, 0);

      plan.tasks.forEach(task => {
        const taskDate = new Date(startDate);
        taskDate.setDate(startDate.getDate() + task.dayOffset);
        
        const key = getDateKey(taskDate);
        if (!mapping[key]) mapping[key] = [];
        if (!stats[key]) stats[key] = { total: 0, completed: 0 };
        
        mapping[key].push({
          ...task,
          planId: plan.id,
          planGoal: plan.goal
        });
        
        stats[key].total += 1;
        if (task.isCompleted) stats[key].completed += 1;
      });
    });
    return { tasksByDate: mapping, dayStats: stats };
  }, [plans]);

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiInstruction.trim() && !isRefining) {
       if (focusedPlan) {
          onRefine(focusedPlan.id, aiInstruction);
          setAiInstruction('');
          setShowAiInput(false);
       }
    }
  };

  const handleAddTaskSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;

    onAddTask(
      newTask.goalId,
      {
        title: newTask.title,
        description: newTask.description,
        startTime: newTask.startTime,
        durationMinutes: newTask.durationMinutes,
        date: selectedDate,
        isCompleted: false,
        reminderStyle: newTask.reminderStyle
      },
      newTask.newGoalName
    );
    setIsAddingTask(false);
    setNewTask(prev => ({ ...prev, title: '', description: '', newGoalName: '', reminderStyle: 'ALARM' }));
  };

  const handleEditTaskSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingTask) {
          onUpdateTask(editingTask.planId, editingTask.id, {
              title: editForm.title,
              description: editForm.description,
              startTime: editForm.startTime,
              durationMinutes: editForm.durationMinutes,
              reminderStyle: editForm.reminderStyle
          });
          setEditingTask(null);
      }
  };

  const handleConfirmDelete = () => {
    if (taskToDelete) {
        onDeleteTask(taskToDelete.planId, taskToDelete.taskId);
        setTaskToDelete(null);
    }
  };

  const handleDeleteFromEdit = () => {
      if (editingTask) {
          setEditingTask(null); 
          setTaskToDelete({
              planId: editingTask.planId,
              taskId: editingTask.id,
              title: editingTask.title
          });
      }
  };

  const handleFreeTimeClick = (startTimeMinutes: number) => {
    const timeStr = minutesToTime(startTimeMinutes);
    setNewTask(prev => ({
      ...prev,
      startTime: timeStr,
      durationMinutes: 30
    }));
    setIsAddingTask(true);
  };

  const getReminderIcon = (style?: ReminderStyle) => {
    switch (style) {
        case 'ALARM': return <BellRing className="w-4 h-4 text-red-500" />;
        case 'VIBRATE': return <Smartphone className={`w-4 h-4 text-${themeColor}-500`} />;
        case 'NONE': return <BellOff className="w-4 h-4 text-slate-300" />;
        default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const goalOptions: SelectOption[] = [
      ...plans.map(p => ({ label: p.goal, value: p.id })),
      { label: t.modal_goal_new, value: 'NEW' }
  ];

  const selectedKey = getDateKey(selectedDate);
  const todaysTasks = tasksByDate[selectedKey] || [];
  
  const scheduleItems = useMemo(() => {
    const sorted = [...todaysTasks].sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
    const dayStartMinutes = 0;
    const dayEndMinutes = 24 * 60;
    let currentCursor = dayStartMinutes;
    const items: Array<{ type: 'TASK' | 'FREE', data: any, start: number, end: number }> = [];

    sorted.forEach(task => {
        const taskStart = timeToMinutes(task.startTime);
        const taskEnd = taskStart + task.durationMinutes;

        if (taskStart > currentCursor + 15) { 
            items.push({
                type: 'FREE',
                data: null,
                start: currentCursor,
                end: taskStart
            });
        }

        items.push({
            type: 'TASK',
            data: task,
            start: taskStart,
            end: taskEnd
        });

        currentCursor = Math.max(currentCursor, taskEnd);
    });

    if (currentCursor < dayEndMinutes) {
        items.push({
            type: 'FREE',
            data: null,
            start: currentCursor,
            end: dayEndMinutes
        });
    }

    return items;
  }, [todaysTasks]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 relative w-full">
      
      {/* 1. Resident Calendar Widget (Sticky) */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 transition-all">
        <div className="relative">
           <CalendarWidget 
             selectedDate={selectedDate} 
             onSelectDate={onSelectDate} 
             dayStats={dayStats}
             isCollapsed={isCalendarCollapsed}
             language={language}
           />
        </div>
      </div>
      
      {/* Content Area */}
      <div className={`flex-1 px-4 py-6 space-y-4 animate-in fade-in duration-300 pb-32 transition-opacity ${isRefining ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        
        <div className="flex items-center justify-between">
            <div>
                <h3 className="text-lg font-bold text-slate-800 capitalize">
                  {selectedDate.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' })}
                </h3>
                <p className={`text-[11px] font-medium text-${themeColor}-500 opacity-90 mt-0.5 flex items-center gap-1`}>
                   <Sparkles className="w-3 h-3" />
                   {t.plan_tap_to_schedule}
                </p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-white border border-slate-100 shadow-sm px-2.5 py-1 rounded-full uppercase tracking-wider">
              {todaysTasks.length} {t.plan_tasks_count}
            </span>
        </div>

        {scheduleItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center opacity-60">
              <div className="bg-slate-100 p-3 rounded-full mb-3">
                <Sparkles className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">{t.plan_empty_title}</p>
              <button onClick={() => setIsAddingTask(true)} className={`mt-4 text-${themeColor}-600 text-sm font-semibold active:opacity-75`}>
                {t.plan_empty_btn}
              </button>
          </div>
        ) : (
          <div className="space-y-3">
            {scheduleItems.map((item, idx) => {
              if (item.type === 'FREE') {
                 const duration = item.end - item.start;
                 const startStr = minutesToTime(item.start);
                 const endStr = minutesToTime(item.end);
                 
                 return (
                    <button 
                        key={`free-${idx}`} 
                        onClick={() => handleFreeTimeClick(item.start)}
                        className="flex gap-4 w-full text-left group"
                    >
                        <div className="flex flex-col items-end pt-1 w-12 shrink-0">
                             <span className="text-xs font-medium text-slate-400">{startStr}</span>
                             <div className="h-full border-r border-slate-200 border-dashed mr-2 my-1"></div>
                        </div>
                        <div className={`flex-1 py-3 px-4 rounded-xl border-2 border-dashed border-slate-200 active:bg-${themeColor}-50 active:border-${themeColor}-300 flex items-center justify-between transition-all cursor-pointer`}>
                             <div className="flex items-center gap-3">
                                <div className={`p-2 bg-slate-100 group-active:bg-${themeColor}-100 rounded-full text-slate-400 group-active:text-${themeColor}-600 transition-colors`}>
                                   <Plus className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className={`text-sm font-bold text-slate-600 group-active:text-${themeColor}-700 transition-colors`}>
                                        {t.plan_free_time}
                                    </p>
                                    <p className={`text-[10px] font-semibold text-${themeColor}-500 uppercase tracking-wide`}>
                                        {t.plan_tap_to_schedule}
                                    </p>
                                </div>
                             </div>
                             <div className="text-right">
                                 <span className="text-xs font-bold text-slate-400 block">{duration}m</span>
                                 <span className="text-[10px] font-medium text-slate-300 block">
                                    {startStr} - {endStr}
                                 </span>
                             </div>
                        </div>
                    </button>
                 );
              }

              const task = item.data as RenderTask;
              return (
              <div key={`${task.planId}-${task.id}`} className="flex gap-4">
                  <div className="flex flex-col items-end pt-1 w-12 shrink-0">
                    <span className="text-sm font-bold text-slate-700">{task.startTime}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{task.durationMinutes}m</span>
                  </div>

                  <button 
                      onClick={() => setEditingTask(task)}
                      className={`flex-1 text-left bg-white p-4 rounded-xl shadow-sm border border-slate-100 active:scale-[0.99] transition-all relative group overflow-hidden ${task.isCompleted ? 'opacity-60 grayscale' : ''}`}
                  >
                    
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1 opacity-70">
                            <Target className={`w-3 h-3 text-${themeColor}-400`} />
                            <span className={`text-[10px] font-bold text-${themeColor}-500 uppercase tracking-wide truncate max-w-[150px]`}>
                                {task.planGoal}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                             {task.reminderStyle !== 'NONE' && (
                                <div className="opacity-50">
                                   {getReminderIcon(task.reminderStyle)}
                                </div>
                             )}
                        </div>
                    </div>

                    <h4 className={`text-base font-semibold text-slate-900 leading-tight mb-1 ${task.isCompleted ? 'line-through' : ''}`}>
                        {task.title}
                    </h4>
                    <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">
                       {task.description}
                    </p>
                    
                    <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <ChevronRight className="w-5 h-5 text-slate-300" />
                    </div>
                  </button>
              </div>
            )})}
          </div>
        )}
      </div>

      {/* --- Action Layer --- */}
      
      {!showAiInput && !isAddingTask && !editingTask && focusedPlan && (
        <div className="fixed bottom-24 right-4 z-30">
          <button 
            onClick={() => setShowAiInput(true)}
            className={`flex items-center gap-2 bg-${themeColor}-600 text-white shadow-xl shadow-${themeColor}-600/30 px-5 py-3 rounded-full text-sm font-bold active:scale-95 transition-all`}
          >
            <Sparkles className={`w-4 h-4 text-${themeColor}-200`} />
            <span>{t.plan_ai_adjust}</span>
          </button>
        </div>
      )}

      {/* AI Assistant Panel */}
      {showAiInput && (
        <div className="fixed bottom-20 left-4 right-4 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl z-50 animate-in slide-in-from-bottom-10 rounded-2xl overflow-hidden">
             <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                    <span className={`text-xs font-bold text-${themeColor}-600 uppercase tracking-wider flex items-center gap-1`}>
                        <Wand2 className="w-3 h-3" />
                        {t.plan_ai_assistant}
                    </span>
                    <button onClick={() => setShowAiInput(false)} className="text-slate-400 active:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <form onSubmit={handleAiSubmit} className="flex gap-2">
                    <input
                       autoFocus
                       type="text"
                       value={aiInstruction}
                       onChange={(e) => setAiInstruction(e.target.value)}
                       placeholder={t.plan_ai_placeholder}
                       className={`flex-1 bg-slate-100 border-transparent focus:border-${themeColor}-500 focus:bg-white focus:ring-0 rounded-xl px-4 py-3 text-slate-900 placeholder:text-slate-400 transition-all`}
                       disabled={isRefining}
                    />
                    <button 
                        type="submit" 
                        disabled={!aiInstruction.trim() || isRefining} 
                        className={`bg-${themeColor}-600 text-white p-3 rounded-xl active:bg-${themeColor}-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
                    >
                         {isRefining ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </button>
                </form>
             </div>
        </div>
      )}

      {/* Refining Loader */}
      {isRefining && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
           <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-xs text-center animate-in zoom-in-95 duration-300">
              <div className="relative mb-6">
                 <div className={`w-16 h-16 bg-${themeColor}-100 rounded-full animate-ping absolute opacity-75`}></div>
                 <div className={`w-16 h-16 bg-white rounded-full flex items-center justify-center relative z-10 shadow-sm border border-${themeColor}-50`}>
                    <Loader2 className={`w-8 h-8 text-${themeColor}-600 animate-spin`} />
                 </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{t.plan_updating}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {t.plan_updating_desc}
              </p>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {taskToDelete && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{t.plan_delete_title}</h3>
                  <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                      {t.plan_delete_desc} <span className="font-semibold text-slate-800">"{taskToDelete.title}"</span>?
                  </p>
                  <div className="flex gap-3">
                      <button 
                          onClick={() => setTaskToDelete(null)}
                          className="flex-1 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 active:bg-slate-200 transition-colors"
                      >
                          {t.plan_cancel}
                      </button>
                      <button 
                          onClick={handleConfirmDelete}
                          className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-red-500 active:bg-red-600 shadow-md shadow-red-200 transition-colors"
                      >
                          {t.plan_delete_confirm}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-visible animate-in slide-in-from-bottom-10 sm:zoom-in duration-300 ring-1 ring-slate-900/5">
              
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                  <h3 className="font-bold text-slate-800 text-lg">{t.modal_edit_title}</h3>
                  <button onClick={() => setEditingTask(null)} className="bg-slate-200 active:bg-slate-300 rounded-full p-1 transition-colors">
                      <X className="w-5 h-5 text-slate-600" />
                  </button>
              </div>
              
              <form onSubmit={handleEditTaskSubmit} className="p-5 space-y-5">
                  
                  {/* Title & Description */}
                  <div className="space-y-3">
                      <div>
                        <input 
                           placeholder={t.modal_title_placeholder} 
                           className="w-full text-xl font-bold placeholder:text-slate-300 border-none p-0 focus:ring-0 text-slate-900"
                           value={editForm.title}
                           onChange={e => setEditForm({...editForm, title: e.target.value})}
                        />
                      </div>
                      <div>
                        <textarea
                           placeholder={t.modal_desc_placeholder}
                           rows={3}
                           className="w-full text-sm text-slate-600 placeholder:text-slate-400 border-none p-0 focus:ring-0 resize-none bg-transparent leading-relaxed"
                           value={editForm.description}
                           onChange={e => setEditForm({...editForm, description: e.target.value})}
                        />
                      </div>
                  </div>

                  {/* Time Row */}
                  <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t.modal_label_time}</label>
                          <TimePicker 
                            value={editForm.startTime}
                            onChange={(val) => setEditForm({...editForm, startTime: val})}
                          />
                      </div>
                      <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t.modal_label_duration}</label>
                          <div className="bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-3 flex items-center h-[46px]">
                             <input 
                                type="number" 
                                className="w-full bg-transparent border-none p-0 text-sm font-semibold text-slate-700 focus:ring-0"
                                value={editForm.durationMinutes}
                                onChange={e => setEditForm({...editForm, durationMinutes: parseInt(e.target.value) || 0})}
                             />
                             <span className="text-xs font-medium text-slate-500 ml-1">min</span>
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-4">
                       <div className="flex-1 space-y-1">
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t.modal_label_reminder}</label>
                           <Select 
                              value={editForm.reminderStyle}
                              onChange={(v) => setEditForm({...editForm, reminderStyle: v as ReminderStyle})}
                              options={reminderOptions}
                           />
                       </div>
                  </div>
                  
                  <div className="pt-2 flex gap-3">
                      <button 
                          type="button" 
                          onClick={handleDeleteFromEdit}
                          className="px-4 py-3.5 rounded-xl border border-red-100 text-red-500 bg-red-50 font-semibold active:bg-red-100 transition-colors"
                      >
                          <Trash2 className="w-5 h-5" />
                      </button>
                      <button 
                          type="submit" 
                          className={`flex-1 bg-${themeColor}-600 text-white font-semibold py-3.5 rounded-xl active:bg-${themeColor}-700 active:scale-[0.98] transition-all shadow-lg shadow-${themeColor}-200 flex items-center justify-center gap-2`}
                      >
                          <span>{t.modal_edit_save}</span>
                      </button>
                  </div>
              </form>
           </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAddingTask && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-visible animate-in slide-in-from-bottom-10 sm:zoom-in duration-300 ring-1 ring-slate-900/5">
              
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                  <h3 className="font-bold text-slate-800 text-lg">{t.modal_add_title}</h3>
                  <button onClick={() => setIsAddingTask(false)} className="bg-slate-200 active:bg-slate-300 rounded-full p-1 transition-colors">
                      <X className="w-5 h-5 text-slate-600" />
                  </button>
              </div>
              
              <form onSubmit={handleAddTaskSubmit} className="p-5 space-y-5">
                  
                  {/* Title & Description */}
                  <div className="space-y-3">
                      <div>
                        <input 
                           autoFocus
                           placeholder={t.modal_title_placeholder} 
                           className="w-full text-xl font-bold placeholder:text-slate-300 border-none p-0 focus:ring-0 text-slate-900"
                           value={newTask.title}
                           onChange={e => setNewTask({...newTask, title: e.target.value})}
                        />
                      </div>
                      <div>
                        <textarea
                           placeholder={t.modal_desc_placeholder}
                           rows={2}
                           className="w-full text-sm text-slate-600 placeholder:text-slate-400 border-none p-0 focus:ring-0 resize-none bg-transparent"
                           value={newTask.description}
                           onChange={e => setNewTask({...newTask, description: e.target.value})}
                        />
                      </div>
                  </div>

                  {/* Time Row */}
                  <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t.modal_label_time}</label>
                          <TimePicker 
                            value={newTask.startTime}
                            onChange={(val) => setNewTask({...newTask, startTime: val})}
                          />
                      </div>
                      <div className="flex-1 space-y-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t.modal_label_duration}</label>
                          <div className="bg-slate-100/50 border border-slate-200 rounded-xl px-4 py-3 flex items-center h-[46px]">
                             <input 
                                type="number" 
                                className="w-full bg-transparent border-none p-0 text-sm font-semibold text-slate-700 focus:ring-0"
                                value={newTask.durationMinutes}
                                onChange={e => setNewTask({...newTask, durationMinutes: parseInt(e.target.value) || 0})}
                             />
                             <span className="text-xs font-medium text-slate-500 ml-1">min</span>
                          </div>
                      </div>
                  </div>

                  <div className="flex gap-4">
                       <div className="flex-1 space-y-1">
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t.modal_label_reminder}</label>
                           <Select 
                              value={newTask.reminderStyle}
                              onChange={(v) => setNewTask({...newTask, reminderStyle: v as ReminderStyle})}
                              options={reminderOptions}
                           />
                       </div>
                  </div>

                  {/* Goal Selector */}
                  <div className="pt-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5 block">{t.modal_label_goal}</label>
                      <Select 
                         value={newTask.goalId}
                         onChange={(v) => setNewTask({...newTask, goalId: v})}
                         options={goalOptions}
                         icon={newTask.goalId === 'NEW' 
                            ? <Plus className={`w-5 h-5 text-${themeColor}-500`} /> 
                            : <Target className={`w-5 h-5 text-${themeColor}-500`} />
                         }
                      />

                      {/* Expanding New Goal Name Input */}
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${newTask.goalId === 'NEW' ? 'max-h-20 opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
                          <input 
                             autoFocus={newTask.goalId === 'NEW'}
                             placeholder={t.modal_goal_new_placeholder} 
                             className={`w-full bg-${themeColor}-50 border border-${themeColor}-200 rounded-xl px-4 py-3 text-sm text-${themeColor}-900 placeholder:text-${themeColor}-400 focus:ring-0 focus:border-${themeColor}-500 outline-none transition-colors`}
                             value={newTask.newGoalName}
                             onChange={e => setNewTask({...newTask, newGoalName: e.target.value})}
                          />
                      </div>
                  </div>

                  <button 
                      type="submit" 
                      className={`w-full bg-${themeColor}-600 text-white font-semibold py-3.5 rounded-xl active:bg-${themeColor}-700 active:scale-[0.98] transition-all shadow-lg shadow-${themeColor}-200 flex items-center justify-center gap-2 mt-4`}
                  >
                      <span>{t.modal_add_save}</span>
                  </button>
              </form>
           </div>
        </div>
      )}

    </div>
  );
};
