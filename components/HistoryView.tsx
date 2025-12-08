import React from 'react';
import { Plan } from '../types';
import { ChevronRight, Calendar, Trash2 } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

interface HistoryViewProps {
  plans: Plan[];
  onSelectPlan: (plan: Plan) => void;
  onDeletePlan: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ plans, onSelectPlan, onDeletePlan }) => {
  const { themeColor } = useTheme();
  
  if (plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-6">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <Calendar className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">No History Yet</h3>
        <p className="text-slate-500 mt-1 text-sm">
          Plans you create will appear here automatically.
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 py-4 space-y-4 animate-in fade-in duration-500">
      {plans.map((plan) => (
        <div 
          key={plan.id}
          className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 active:bg-slate-50 transition-colors relative group overflow-hidden"
        >
          <div onClick={() => onSelectPlan(plan)} className="cursor-pointer">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-semibold text-slate-900 line-clamp-1 pr-8">{plan.goal}</h3>
              <span className="text-xs text-slate-400 whitespace-nowrap">
                {new Date(plan.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center text-xs text-slate-500 gap-3">
              <span className={`bg-${themeColor}-50 text-${themeColor}-600 px-2 py-0.5 rounded-md font-medium`}>
                {plan.tasks.length} Steps
              </span>
              <span>
                {Math.max(...plan.tasks.map(t => t.dayOffset)) + 1} Days
              </span>
            </div>
          </div>

          <div className="absolute top-4 right-4 text-slate-300">
             <ChevronRight className="w-5 h-5" />
          </div>

          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDeletePlan(plan.id);
            }}
            className="absolute bottom-3 right-4 p-2 text-slate-300 hover:text-red-500 transition-colors z-10"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};