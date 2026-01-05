import React, { useState } from 'react';
import { Plan, TaskItem } from '../types';
import { X, Calendar, Check, ChevronRight } from './Icons';

interface CalendarSyncModalProps {
  plans: Plan[];
  onClose: () => void;
  onSyncPlan: (plan: Plan) => void;
  onSyncTask: (task: TaskItem, plan: Plan) => void;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  plans,
  onClose,
  onSyncPlan,
  onSyncTask,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [syncedTasks, setSyncedTasks] = useState<Set<string>>(new Set());

  const handleSyncTask = async (task: TaskItem) => {
    if (!selectedPlan) return;
    await onSyncTask(task, selectedPlan);
    setSyncedTasks(prev => new Set(prev).add(task.id));
  };

  const handleSyncAllTasks = async () => {
    if (!selectedPlan) return;
    await onSyncPlan(selectedPlan);
    const allIds = new Set(selectedPlan.tasks.map(t => t.id));
    setSyncedTasks(allIds);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-slate-800">
            {selectedPlan ? '选择要导入的任务' : '选择要导入的计划'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedPlan ? (
            // 计划列表
            <div className="space-y-2">
              {plans.map(plan => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-indigo-500" />
                    <div className="text-left">
                      <p className="font-medium text-slate-800">{plan.goal}</p>
                      <p className="text-sm text-slate-500">{plan.tasks.length} 个任务</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </button>
              ))}
            </div>
          ) : (
            // 任务列表
            <div className="space-y-2">
              {/* 返回按钮 */}
              <button
                onClick={() => {
                  setSelectedPlan(null);
                  setSyncedTasks(new Set());
                }}
                className="text-sm text-indigo-600 mb-2 flex items-center gap-1"
              >
                ← 返回计划列表
              </button>
              
              {/* 一键导入全部 */}
              <button
                onClick={handleSyncAllTasks}
                className="w-full p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium mb-4"
              >
                一键导入全部任务
              </button>

              {/* 单个任务列表 */}
              {selectedPlan.tasks.map(task => {
                const isSynced = syncedTasks.has(task.id);
                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{task.title}</p>
                      <p className="text-sm text-slate-500">
                        第{task.dayOffset + 1}天 {task.startTime} · {task.durationMinutes}分钟
                      </p>
                    </div>
                    <button
                      onClick={() => handleSyncTask(task)}
                      disabled={isSynced}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isSynced
                          ? 'bg-green-100 text-green-600'
                          : 'bg-indigo-100 text-indigo-600 hover:bg-indigo-200'
                      }`}
                    >
                      {isSynced ? (
                        <span className="flex items-center gap-1">
                          <Check className="w-4 h-4" /> 已导入
                        </span>
                      ) : (
                        '导入'
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
