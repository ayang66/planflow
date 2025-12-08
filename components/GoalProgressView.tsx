
import React, { useState, useEffect } from 'react';
import { Plan, TaskItem, Language } from '../types';
import { ChevronRight, Trash2, CheckSquare, Square, Target, Calendar, Plus, Sparkles, Folder } from './Icons';
import { translations } from '../utils/translations';
import { useTheme } from '../contexts/ThemeContext';

interface GoalProgressViewProps {
  plans: Plan[];
  onSelectPlan: (plan: Plan) => void;
  onDeletePlan: (id: string) => void;
  onToggleTask: (planId: string, taskId: string) => void;
  onGoToCreate: () => void;
  language: Language;
}

export const GoalProgressView: React.FC<GoalProgressViewProps> = ({ plans, onSelectPlan, onDeletePlan, onToggleTask, onGoToCreate, language }) => {
  const t = translations[language];
  const { themeColor } = useTheme();
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<Plan | null>(null);
  
  const getProgress = (plan: Plan) => {
    const totalTasks = plan.tasks.length;
    if (totalTasks === 0) return 0;
    const completedTasks = plan.tasks.filter(t => t.isCompleted).length;
    return Math.round((completedTasks / totalTasks) * 100);
  };

  const getPlanStatus = (plan: Plan): 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED' => {
    if (plan.tasks.length === 0) return 'NOT_STARTED';

    const progress = getProgress(plan);
    if (progress === 100) return 'COMPLETED';
    
    if (progress > 0) return 'IN_PROGRESS';

    const offsets = plan.tasks.map(t => t.dayOffset);
    const minOffset = Math.min(...offsets);
    
    const planStart = new Date(plan.startDate);
    planStart.setHours(0,0,0,0);
    
    const earliestTaskDate = new Date(planStart);
    earliestTaskDate.setDate(planStart.getDate() + minOffset);
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    if (today >= earliestTaskDate) {
      return 'IN_PROGRESS';
    }

    return 'NOT_STARTED';
  };

  const inProgressPlans = plans.filter(p => getPlanStatus(p) === 'IN_PROGRESS');
  const notStartedPlans = plans.filter(p => getPlanStatus(p) === 'NOT_STARTED');
  const completedPlans = plans.filter(p => getPlanStatus(p) === 'COMPLETED');

  const [sections, setSections] = useState(() => ({
    inProgress: inProgressPlans.length > 0,
    notStarted: notStartedPlans.length > 0,
    completed: completedPlans.length > 0
  }));

  useEffect(() => {
    setSections({
        inProgress: inProgressPlans.length > 0,
        notStarted: notStartedPlans.length > 0,
        completed: completedPlans.length > 0
    });
  }, [plans]);

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleExpand = (id: string) => {
    setExpandedPlanId(expandedPlanId === id ? null : id);
  };

  // Full Empty State (No Plans At All)
  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 pb-32 text-center animate-in fade-in zoom-in duration-500">
          
          <div className="relative mb-8">
             <div className={`absolute inset-0 bg-${themeColor}-100 rounded-full blur-3xl opacity-40 animate-pulse`}></div>
             <div className="relative bg-white p-8 rounded-[2.5rem] shadow-xl shadow-slate-200 border border-slate-100 rotate-3 transition-transform hover:rotate-6 duration-500">
                <Target className={`w-20 h-20 text-${themeColor}-500`} strokeWidth={1.5} />
                <div className={`absolute -bottom-3 -right-3 bg-${themeColor}-600 text-white p-3 rounded-2xl shadow-lg`}>
                   <Sparkles className="w-6 h-6" />
                </div>
             </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">
            {t.goals_setup_title}
          </h2>
          <p className="text-slate-500 leading-relaxed max-w-xs mb-8">
            {t.goals_setup_desc}
          </p>

          <button 
             onClick={onGoToCreate}
             className={`group relative overflow-hidden rounded-2xl bg-${themeColor}-600 px-8 py-4 text-white font-bold shadow-xl shadow-${themeColor}-200 transition-all active:scale-95 hover:shadow-2xl hover:shadow-${themeColor}-300`}
          >
             <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
             <div className="relative flex items-center gap-2">
                <Plus className="w-5 h-5" />
                <span>{t.goals_setup_btn}</span>
             </div>
          </button>
      </div>
    );
  }

  const confirmDelete = () => {
    if (planToDelete) {
      onDeletePlan(planToDelete.id);
      setPlanToDelete(null);
    }
  };

  const renderSection = (title: string, list: Plan[], sectionKey: keyof typeof sections, colorClass: string) => {
    const isOpen = sections[sectionKey];

    return (
      <div className="space-y-2">
        <button 
          onClick={() => toggleSection(sectionKey)}
          className="flex items-center justify-between w-full py-2 px-1 hover:bg-slate-50 rounded-lg transition-colors group select-none"
        >
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded-md transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}>
               <ChevronRight className="w-4 h-4 text-slate-400" />
            </div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{title}</h3>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${list.length > 0 ? colorClass : 'bg-slate-100 text-slate-400'}`}>
              {list.length}
            </span>
          </div>
        </button>

        <div className={`space-y-4 transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
          {list.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 mx-1 border-2 border-dashed border-slate-100 rounded-2xl bg-slate-50/50">
               <div className="bg-white p-3 rounded-full shadow-sm mb-2">
                 <Folder className="w-6 h-6 text-slate-300" />
               </div>
               <span className="text-xs font-medium text-slate-400">{t.goals_section_empty}</span>
            </div>
          ) : (
            list.map((plan) => {
              const totalTasks = plan.tasks.length;
              const completedTasks = plan.tasks.filter(t => t.isCompleted).length;
              const progress = getProgress(plan);
              const isExpanded = expandedPlanId === plan.id;
              const startDate = new Date(plan.startDate);
              const endDate = new Date(startDate);
              const maxOffset = Math.max(...plan.tasks.map(t => t.dayOffset), 0);
              endDate.setDate(startDate.getDate() + maxOffset);

              return (
                <div 
                  key={plan.id}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all duration-300"
                >
                  <div 
                    onClick={() => toggleExpand(plan.id)}
                    className="p-5 cursor-pointer active:bg-slate-50 relative"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className={`font-bold text-lg leading-tight w-3/4 ${progress === 100 ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900'}`}>
                        {plan.goal}
                      </h3>
                      <div className="flex items-center text-slate-400">
                           <span className="text-xs mr-2">{completedTasks}/{totalTasks}</span>
                           <ChevronRight className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
      
                    <div className="relative h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                          progress === 100 ? 'bg-green-500' : `bg-${themeColor}-600`
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    
                    <div className="flex justify-between items-center mt-3 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}</span>
                      </div>
                      <span className={`${progress === 100 ? 'text-green-600' : `text-${themeColor}-600`}`}>
                        {progress}% {t.goals_complete_pct}
                      </span>
                    </div>
                  </div>
      
                  <div className={`border-t border-slate-100 bg-slate-50/50 transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                     <div className="p-4 space-y-3 overflow-y-auto max-h-[500px]">
                        
                        <div className="flex justify-end items-center mb-2 px-1">
                            <button 
                              onClick={(e) => {
                                  e.stopPropagation();
                                  setPlanToDelete(plan);
                              }}
                              className="text-xs font-semibold text-red-500 hover:text-red-600 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              {t.goals_delete_btn}
                            </button>
                        </div>

                        {plan.tasks.sort((a,b) => a.dayOffset - b.dayOffset || a.startTime.localeCompare(b.startTime)).map((task) => {
                            const taskDate = new Date(startDate);
                            taskDate.setDate(startDate.getDate() + task.dayOffset);
                            
                            return (
                              <div 
                                  key={task.id} 
                                  onClick={() => onToggleTask(plan.id, task.id)}
                                  className={`flex items-start gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                                      task.isCompleted ? `bg-${themeColor}-50/50` : 'bg-white shadow-sm border border-slate-100'
                                  }`}
                              >
                                  <button className={`mt-0.5 shrink-0 ${task.isCompleted ? `text-${themeColor}-600` : 'text-slate-300'}`}>
                                      {task.isCompleted ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                  </button>
                                  <div className={`flex-1 ${task.isCompleted ? 'opacity-50 line-through decoration-slate-400' : ''}`}>
                                      <div className="flex justify-between items-start">
                                          <p className="text-sm font-semibold text-slate-800">{task.title}</p>
                                          <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2 whitespace-nowrap">
                                              {taskDate.toLocaleDateString(undefined, {month:'short', day:'numeric'})}
                                          </span>
                                      </div>
                                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{task.description}</p>
                                  </div>
                              </div>
                            );
                        })}
                     </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="px-4 py-6 space-y-6 animate-in fade-in duration-500 pb-24 h-full">
        <>
          {renderSection(t.goals_in_progress, inProgressPlans, 'inProgress', `bg-${themeColor}-100 text-${themeColor}-700`)}
          {renderSection(t.goals_not_started, notStartedPlans, 'notStarted', 'bg-slate-200 text-slate-600')}
          {renderSection(t.goals_completed, completedPlans, 'completed', 'bg-green-100 text-green-700')}
        </>

      {/* Delete Confirmation Modal */}
      {planToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
              <h3 className="text-lg font-bold text-slate-900 mb-2">{t.goals_delete_title}</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                  {t.goals_delete_desc_1} <span className="font-semibold text-slate-800">"{planToDelete.goal}"</span> {t.goals_delete_desc_2}
              </p>
              <div className="flex gap-3">
                  <button 
                      onClick={() => setPlanToDelete(null)}
                      className="flex-1 py-2.5 rounded-xl font-semibold text-slate-600 bg-slate-100 active:bg-slate-200 transition-colors"
                  >
                      {t.common_cancel}
                  </button>
                  <button 
                      onClick={confirmDelete}
                      className="flex-1 py-2.5 rounded-xl font-semibold text-white bg-red-500 active:bg-red-600 shadow-md shadow-red-200 transition-colors"
                  >
                      {t.goals_delete_confirm}
                  </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
};
