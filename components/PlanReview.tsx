
import React, { useState, useMemo, useEffect } from 'react';
import { Plan, TaskItem, ReminderStyle, Language } from '../types';
import { Trash2, CheckCircle2, X, Wand2, Send, Loader2, Bell, BellRing, BellOff, Smartphone, ChevronRight, Target } from './Icons';
import { translations } from '../utils/translations';
import { useTheme } from '../contexts/ThemeContext';
import { TimePicker } from './TimePicker';
import { Select, SelectOption } from './Select';

interface PlanReviewProps {
  plan: Plan;
  onUpdateTask: (taskId: string, updates: Partial<TaskItem>) => void;
  onDeleteTask: (taskId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onRefine: (instruction: string) => Promise<void>;
  isRefining: boolean;
  language: Language;
}

export const PlanReview: React.FC<PlanReviewProps> = ({ 
  plan, 
  onUpdateTask, 
  onDeleteTask, 
  onConfirm,
  onCancel,
  onRefine,
  isRefining,
  language
}) => {
  const t = translations[language];
  const { themeColor } = useTheme();
  const [showAiInput, setShowAiInput] = useState(false);
  const [aiInstruction, setAiInstruction] = useState('');

  // Edit Modal State
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
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

  // Reminder Options
  const reminderOptions: SelectOption[] = [
      { label: 'Alarm (Sound)', value: 'ALARM' },
      { label: 'Vibrate Only', value: 'VIBRATE' },
      { label: 'No Reminder', value: 'NONE' },
  ];

  // Sync form when editingTask changes
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

  const handleSaveEdit = (e: React.FormEvent) => {
      e.preventDefault();
      if (editingTask) {
          onUpdateTask(editingTask.id, {
              title: editForm.title,
              description: editForm.description,
              startTime: editForm.startTime,
              durationMinutes: editForm.durationMinutes,
              reminderStyle: editForm.reminderStyle
          });
          setEditingTask(null);
      }
  };

  const handleDeleteFromEdit = () => {
    if (editingTask) {
        onDeleteTask(editingTask.id);
        setEditingTask(null);
    }
  };

  // Group tasks by day offset
  const tasksByDay = useMemo(() => {
    const grouped: Record<number, TaskItem[]> = {};
    plan.tasks.forEach(task => {
      if (!grouped[task.dayOffset]) grouped[task.dayOffset] = [];
      grouped[task.dayOffset].push(task);
    });
    return grouped;
  }, [plan.tasks]);

  const sortedOffsets = Object.keys(tasksByDay).map(Number).sort((a, b) => a - b);
  const startDate = new Date(plan.startDate);

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (aiInstruction.trim() && !isRefining) {
      onRefine(aiInstruction);
      setAiInstruction('');
    }
  };

  const getReminderIcon = (style?: ReminderStyle) => {
    switch (style) {
        case 'ALARM': return <BellRing className="w-4 h-4 text-red-500" />;
        case 'VIBRATE': return <Smartphone className={`w-4 h-4 text-${themeColor}-500`} />;
        case 'NONE': return <BellOff className="w-4 h-4 text-slate-300" />;
        default: return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      
      {/* Scrollable Content */}
      <div className={`flex-1 overflow-y-auto px-4 pb-48 no-scrollbar transition-opacity duration-300 ${isRefining ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        
        <div className="pt-6 pb-6 text-center space-y-2">
           <h2 className="text-xl font-bold text-slate-900">{t.review_title}</h2>
           <p className="text-sm text-slate-500 max-w-xs mx-auto">
             {t.review_subtitle}
           </p>
        </div>

        {sortedOffsets.map(offset => {
          const date = new Date(startDate);
          date.setDate(startDate.getDate() + offset);
          const tasks = tasksByDay[offset].sort((a, b) => a.startTime.localeCompare(b.startTime));
          
          let dayLabel = date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'});
          if (offset === 0) dayLabel = t.review_today;
          if (offset === 1) dayLabel = t.review_tomorrow;

          return (
            <div key={offset} className="space-y-3 pb-6">
              <div className="sticky top-0 bg-slate-50/95 backdrop-blur-sm py-2 z-10 border-b border-transparent shadow-sm shadow-slate-50">
                 <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                    {dayLabel}
                 </h3>
              </div>
              
              <div className="space-y-3">
                {tasks.map(task => (
                  <div key={task.id} className="flex gap-4">
                     {/* Time Column */}
                     <div className="flex flex-col items-end pt-1 w-12 shrink-0">
                        <span className="text-sm font-bold text-slate-700">{task.startTime}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{task.durationMinutes}m</span>
                     </div>

                     {/* Card */}
                     <button 
                       onClick={() => setEditingTask(task)}
                       className={`flex-1 text-left bg-white p-4 rounded-xl shadow-sm border border-slate-100 active:scale-[0.99] transition-all relative group overflow-hidden ${task.isCompleted ? 'opacity-60 grayscale' : ''}`}
                     >
                        
                        <div className="flex items-center justify-between mb-2">
                           {/* Goal Label */}
                           <div className="flex items-center gap-1 opacity-70">
                                <Target className={`w-3 h-3 text-${themeColor}-400`} />
                                <span className={`text-[10px] font-bold text-${themeColor}-500 uppercase tracking-wide truncate max-w-[150px]`}>
                                    {plan.goal}
                                </span>
                            </div>

                            <div className="flex items-center gap-2">
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
                        
                        {/* Expand Icon - Always visible */}
                        <div className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-300 pointer-events-none">
                             <ChevronRight className="w-5 h-5" />
                        </div>
                     </button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-visible animate-in slide-in-from-bottom-10 sm:zoom-in duration-300 ring-1 ring-slate-900/5">
              
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
                  <h3 className="font-bold text-slate-800 text-lg">{t.modal_edit_title}</h3>
                  <button onClick={() => setEditingTask(null)} className="bg-slate-200 active:bg-slate-300 rounded-full p-1 transition-colors">
                      <X className="w-5 h-5 text-slate-600" />
                  </button>
              </div>
              
              <form onSubmit={handleSaveEdit} className="p-5 space-y-5">
                  
                  {/* Title & Description */}
                  <div className="space-y-3">
                      <div>
                        <input 
                           autoFocus
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

      {/* Loading Overlay for AI */}
      {isRefining && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-30">
          <div className="bg-white p-4 rounded-2xl shadow-xl flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <Loader2 className={`w-8 h-8 text-${themeColor}-600 animate-spin mb-2`} />
            <p className="text-sm font-semibold text-slate-700">{t.review_updating}</p>
          </div>
        </div>
      )}

      {/* Floating Action Zone */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex flex-col pb-safe-bottom bg-gradient-to-t from-slate-50 via-slate-50 to-transparent">
        
        {/* AI Input Panel */}
        <div className="px-4 mb-2 max-w-2xl mx-auto w-full">
           {!showAiInput ? (
             <button 
               onClick={() => setShowAiInput(true)}
               disabled={isRefining}
               className={`mx-auto flex items-center gap-2 bg-white border border-${themeColor}-100 shadow-lg shadow-${themeColor}-100/50 text-${themeColor}-600 px-4 py-2 rounded-full text-sm font-semibold hover:bg-${themeColor}-50 transition-all active:scale-95`}
             >
               <Wand2 className="w-4 h-4" />
               <span>{t.review_ai_button}</span>
             </button>
           ) : (
             <form onSubmit={handleAiSubmit} className={`bg-white p-2 rounded-2xl shadow-xl border border-${themeColor}-100 animate-in slide-in-from-bottom-2 fade-in`}>
                <div className="flex items-center gap-2">
                   <div className={`p-2 bg-${themeColor}-50 rounded-full text-${themeColor}-600`}>
                     <Wand2 className="w-4 h-4" />
                   </div>
                   <input
                     autoFocus
                     type="text"
                     value={aiInstruction}
                     onChange={(e) => setAiInstruction(e.target.value)}
                     placeholder={t.review_ai_placeholder}
                     className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-slate-400"
                     disabled={isRefining}
                   />
                   {aiInstruction ? (
                     <button type="submit" disabled={isRefining} className={`p-2 bg-${themeColor}-600 text-white rounded-full hover:bg-${themeColor}-700 transition-colors`}>
                       <Send className="w-4 h-4" />
                     </button>
                   ) : (
                     <button type="button" onClick={() => setShowAiInput(false)} className="p-2 text-slate-400 hover:text-slate-600">
                       <X className="w-4 h-4" />
                     </button>
                   )}
                </div>
             </form>
           )}
        </div>

        {/* Main Action Buttons */}
        <div className="bg-white/80 backdrop-blur-xl border-t border-slate-200">
          <div className="flex gap-3 px-4 pt-2 pb-4 max-w-2xl mx-auto">
            <button 
              onClick={onCancel}
              disabled={isRefining}
              className="flex-1 py-3 px-4 rounded-xl font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <X className="w-5 h-5" />
              <span>{t.review_btn_cancel}</span>
            </button>
            <button 
              onClick={onConfirm}
              disabled={isRefining}
              className={`flex-[2] py-3 px-4 rounded-xl font-semibold text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 shadow-lg shadow-${themeColor}-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2`}
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>{t.review_btn_confirm}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
