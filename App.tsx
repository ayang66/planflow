
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { CreateView } from './components/CreateView';
import { PlanResult } from './components/PlanResult';
import { GoalProgressView } from './components/GoalProgressView';
import { PlanReview } from './components/PlanReview';
import { SettingsView } from './components/SettingsView';
import { Download, Loader2, Sparkles, Calendar } from './components/Icons';
import { LiveVoiceMode } from './components/LiveVoiceMode';
import { ClarificationModal } from './components/ClarificationModal';
import { SplashScreen } from './components/SplashScreen';
import { AuthView } from './components/AuthView';
import { decomposeGoal, modifyPlan, checkGoalClarity } from './services/geminiService';
import { syncToCalendar } from './services/calendarService';
import { fetchPlans, createPlan, deletePlan, updateTask as updateTaskApi, deleteTask as deleteTaskApi, addTaskToPlan } from './services/planService';
import { LoadingState, Plan, Tab, TaskItem, ReminderSetting, ReminderStyle, Language } from './types';
import { translations } from './utils/translations';
import { useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);
  const [showVoiceMode, setShowVoiceMode] = useState(false);
  const { themeColor, getBackgroundImage, bgOpacity } = useTheme();
  
  // Settings State
  const [language, setLanguage] = useState<Language>(() => {
    // Load language from local storage if available
    const savedLang = localStorage.getItem('planflow_language');
    return (savedLang as Language) || 'en';
  });
  const [isPro, setIsPro] = useState(false);

  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [draftPlan, setDraftPlan] = useState<Plan | null>(null);
  const [isRefining, setIsRefining] = useState(false);
  
  // Calendar State (Lifted from PlanResult)
  const [selectedDate, setSelectedDate] = useState(new Date());

  // Clarification State
  const [clarificationRequest, setClarificationRequest] = useState<{
    originalGoal: string;
    constraints?: string;
    reminderSetting: ReminderSetting;
    question: string;
  } | null>(null);
  
  // Initialize history - will be loaded from server after auth
  const [history, setHistory] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(false);

  // Background Transition State
  const targetBg = getBackgroundImage();
  const [activeBgLayer, setActiveBgLayer] = useState<string | null>(targetBg);
  const [incomingBgLayer, setIncomingBgLayer] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Background Preloading & Transition Effect
  useEffect(() => {
    // Determine if we need to transition. 
    // We transition if targetBg is different from what is currently fully active (activeBgLayer).
    // Note: If a transition is already pending (incomingBgLayer != null), we let that settle or override it.
    
    // Exact equality check might fail if strings are huge base64 but same content, 
    // but in React state terms, they will be referentially different or string-equal.
    if (targetBg === activeBgLayer && !incomingBgLayer) return;
    
    // Avoid double-triggering if we are already loading exactly this target
    if (targetBg === incomingBgLayer) return;

    let isMounted = true;

    const performTransition = async () => {
        // 1. Preload if it's an image
        if (targetBg) {
            const img = new Image();
            img.src = targetBg;
            try {
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                });
            } catch (e) {
                console.error("Failed to load background image", e);
                // Even if load fails, we might want to proceed to clear background or show broken image
            }
        }

        if (!isMounted) return;

        // 2. Start Transition
        setIncomingBgLayer(targetBg); // The new background sits on top, initially transparent (handled by CSS)
        
        // Force a small delay to allow React to render the new layer structure
        // This ensures the DOM has the new element with opacity 0 before we add the opacity 1 class
        await new Promise(r => setTimeout(r, 50));
        
        if (!isMounted) return;
        setIsTransitioning(true); // Triggers fade-in of incoming, fade-out of active

        // 3. Wait for animation to finish (1000ms to match CSS)
        setTimeout(() => {
            if (!isMounted) return;
            // Promotion: Incoming becomes Active
            setActiveBgLayer(targetBg);
            setIncomingBgLayer(null);
            setIsTransitioning(false);
        }, 1000);
    };

    performTransition();

    return () => { isMounted = false; };
  }, [targetBg]); // Only re-run when the target background (from context) changes

  // Splash Screen Timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500); // 2.5 seconds splash screen
    return () => clearTimeout(timer);
  }, []);

  // Load plans from server when authenticated
  useEffect(() => {
    const loadPlans = async () => {
      if (isAuthenticated && !isLoading) {
        setIsLoadingPlans(true);
        try {
          const plans = await fetchPlans();
          setHistory(plans);
        } catch (error) {
          console.error('Failed to load plans:', error);
          // 如果加载失败，尝试从 localStorage 恢复
          try {
            const saved = localStorage.getItem('planflow_history');
            if (saved) {
              setHistory(JSON.parse(saved));
            }
          } catch {}
        } finally {
          setIsLoadingPlans(false);
        }
      }
    };
    loadPlans();
  }, [isAuthenticated, isLoading]);

  // Backup to localStorage (as fallback)
  useEffect(() => {
    if (history.length > 0) {
      localStorage.setItem('planflow_history', JSON.stringify(history));
    }
  }, [history]);

  // Save language whenever it changes
  useEffect(() => {
    localStorage.setItem('planflow_language', language);
  }, [language]);

  // Sync currentPlan with history if it changes
  useEffect(() => {
    if (currentPlan) {
        const updatedFromHistory = history.find(p => p.id === currentPlan.id);
        if (updatedFromHistory && JSON.stringify(updatedFromHistory) !== JSON.stringify(currentPlan)) {
            setCurrentPlan(updatedFromHistory);
        }
    }
  }, [history, currentPlan]);


  const executeDecomposition = async (goal: string, constraints?: string, reminderSetting: ReminderSetting = 'AUTO', displayTitle?: string) => {
      setLoadingState(LoadingState.GENERATING);
      try {
        const forceStyle: ReminderStyle | undefined = reminderSetting !== 'AUTO' ? reminderSetting : undefined;

        // Build Existing Schedule Context
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const relevantTasks = history.flatMap(plan => {
            const planStart = new Date(plan.startDate);
            planStart.setHours(0,0,0,0);
            
            return plan.tasks.map(t => {
               const taskDate = new Date(planStart);
               taskDate.setDate(planStart.getDate() + t.dayOffset);
               return { ...t, date: taskDate };
            });
        })
        .filter(t => t.date >= today)
        .sort((a,b) => a.date.getTime() - b.date.getTime() || a.startTime.localeCompare(b.startTime));

        let scheduleContext = "";
        if (relevantTasks.length > 0) {
            scheduleContext = relevantTasks.map(t => {
               const diffTime = t.date.getTime() - today.getTime();
               const dayDiff = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
               
               const [h, m] = t.startTime.split(':').map(Number);
               const endMin = h * 60 + m + t.durationMinutes;
               const endH = Math.floor(endMin / 60);
               const endM = endMin % 60;
               const endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`;
               
               return `Day ${dayDiff}: ${t.startTime}-${endTime} (Busy)`;
            }).join('\n');
        }

        const tasks = await decomposeGoal(goal, constraints, forceStyle, scheduleContext);
        const now = Date.now();
        
        const newDraft: Plan = {
          id: now.toString(),
          createdAt: now,
          startDate: now,
          goal: displayTitle || goal, // Use specific title if provided (e.g. keeping original goal name)
          tasks: tasks.map(t => ({
            ...t, 
            isCompleted: false,
            reminderStyle: t.reminderStyle || 'ALARM'
          }))
        };
        
        setDraftPlan(newDraft);
        setLoadingState(LoadingState.SUCCESS);
        setActiveTab('review');
      } catch (err) {
        console.error(err);
        setLoadingState(LoadingState.ERROR);
        alert("Failed to generate plan. Please try again.");
      }
  };

  const handleGenerate = async (goal: string, constraints?: string, reminderSetting: ReminderSetting = 'AUTO') => {
    setLoadingState(LoadingState.GENERATING);
    
    try {
        // Step 1: Check Clarity
        const clarity = await checkGoalClarity(goal);
        
        if (!clarity.isSufficient && clarity.clarifyingQuestion) {
            // Pause Generation and Ask User
            setLoadingState(LoadingState.IDLE);
            setClarificationRequest({
                originalGoal: goal,
                constraints,
                reminderSetting,
                question: clarity.clarifyingQuestion
            });
            return;
        }

        // Step 2: Proceed if clear
        await executeDecomposition(goal, constraints, reminderSetting);

    } catch (e) {
        console.error("Analysis Failed, defaulting to generation", e);
        // Fallback to generation
        await executeDecomposition(goal, constraints, reminderSetting);
    }
  };

  const handleClarificationResponse = (answer: string) => {
      if (!clarificationRequest) return;
      
      // KEY FIX: Do not change the goal title.
      // Pass the answer as an additional CONSTRAINT.
      const updatedConstraints = clarificationRequest.constraints 
         ? `${clarificationRequest.constraints}\nAdditional Context: ${answer}`
         : `Additional Context: ${answer}`;

      const titleToKeep = clarificationRequest.originalGoal; // Keep the original title
      
      setClarificationRequest(null);
      // Pass original goal as prompt, updated constraints, and use original goal as title
      executeDecomposition(clarificationRequest.originalGoal, updatedConstraints, clarificationRequest.reminderSetting, titleToKeep);
  };

  const handleClarificationSkip = () => {
      if (!clarificationRequest) return;
      setClarificationRequest(null);
      executeDecomposition(clarificationRequest.originalGoal, clarificationRequest.constraints, clarificationRequest.reminderSetting);
  };

  const handleVoicePlanGenerated = (goal: string, constraints: string) => {
    setShowVoiceMode(false);
    handleGenerate(goal, constraints, 'AUTO');
  };

  // --- Draft Management Actions ---

  const handleConfirmDraft = async () => {
    if (draftPlan) {
      try {
        // 保存到数据库
        const savedPlan = await createPlan(
          draftPlan.goal,
          draftPlan.tasks.map(t => ({
            title: t.title,
            description: t.description,
            dayOffset: t.dayOffset,
            startTime: t.startTime,
            durationMinutes: t.durationMinutes,
            reminderStyle: t.reminderStyle,
          }))
        );
        setCurrentPlan(savedPlan);
        setSelectedDate(new Date(savedPlan.startDate));
        setHistory(prev => [savedPlan, ...prev]);
      } catch (error) {
        console.error('Failed to save plan:', error);
        // 失败时仍然保存到本地
        setCurrentPlan(draftPlan);
        setSelectedDate(new Date(draftPlan.startDate));
        setHistory(prev => [draftPlan, ...prev]);
      }
      setDraftPlan(null);
      setActiveTab('plan');
    }
  };

  const handleCancelDraft = () => {
    setDraftPlan(null);
    setActiveTab('create');
  };

  const handleUpdateDraftTask = (taskId: string, updates: Partial<TaskItem>) => {
    if (!draftPlan) return;
    setDraftPlan(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
      };
    });
  };

  const handleDeleteDraftTask = (taskId: string) => {
    if (!draftPlan) return;
    setDraftPlan(prev => {
      if (!prev) return null;
      return {
        ...prev,
        tasks: prev.tasks.filter(t => t.id !== taskId)
      };
    });
  };

  const handleRefineDraft = async (instruction: string) => {
    if (!draftPlan) return;
    setIsRefining(true);
    try {
      // Drafts are effectively starting "Today" (Day 0)
      const updatedTasks = await modifyPlan(draftPlan.tasks, instruction, 0);
      setDraftPlan(prev => {
         if (!prev) return null;
         const styleMap = new Map(prev.tasks.map(t => [t.title, t.reminderStyle]));
         return { 
           ...prev, 
           tasks: updatedTasks.map(t => ({
             ...t, 
             isCompleted: t.isCompleted || false,
             reminderStyle: styleMap.get(t.title) || t.reminderStyle || 'ALARM'
           })) 
         };
      });
    } catch (err) {
      console.error(err);
      alert("Failed to refine plan. Please try again.");
    } finally {
      setIsRefining(false);
    }
  };

  // --- Main Plan Actions (Multi-Plan Support) ---

  const handleRefinePlan = async (planId: string, instruction: string) => {
    const targetPlan = history.find(p => p.id === planId);
    if (!targetPlan) return;

    setIsRefining(true);
    try {
        const planStart = new Date(targetPlan.startDate);
        planStart.setHours(0,0,0,0);
        const today = new Date();
        today.setHours(0,0,0,0);
        const currentDayOffset = Math.round((today.getTime() - planStart.getTime()) / (1000 * 60 * 60 * 24));

        const updatedTasks = await modifyPlan(targetPlan.tasks, instruction, currentDayOffset);
        const styleMap = new Map(targetPlan.tasks.map(t => [t.title, t.reminderStyle]));

        const updatedPlan = { 
          ...targetPlan, 
          tasks: updatedTasks.map(t => ({
            ...t, 
            isCompleted: t.isCompleted || false,
            reminderStyle: styleMap.get(t.title) || t.reminderStyle || 'ALARM'
           })) 
        };
        
        setHistory(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
        if (currentPlan?.id === planId) setCurrentPlan(updatedPlan);
    } catch (err) {
        console.error(err);
        alert("Failed to update plan. Please try again.");
    } finally {
        setIsRefining(false);
    }
  };

  const handleUpdateTaskInPlan = async (planId: string, taskId: string, updates: Partial<TaskItem>) => {
    // 先更新本地状态
    setHistory(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        tasks: plan.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
      };
    }));

    if (currentPlan?.id === planId) {
       setCurrentPlan(prev => {
          if (!prev) return null;
          return {
             ...prev,
             tasks: prev.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t)
          };
       });
    }

    // 同步到服务器
    try {
      await updateTaskApi(planId, taskId, updates);
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const handleDeleteTaskInPlan = async (planId: string, taskId: string) => {
    // 先更新本地状态
    setHistory(prev => prev.map(plan => {
      if (plan.id !== planId) return plan;
      return {
        ...plan,
        tasks: plan.tasks.filter(t => t.id !== taskId)
      };
    }));

    if (currentPlan?.id === planId) {
       setCurrentPlan(prev => {
          if (!prev) return null;
          return {
             ...prev,
             tasks: prev.tasks.filter(t => t.id !== taskId)
          };
       });
    }

    // 同步到服务器
    try {
      await deleteTaskApi(planId, taskId);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleAddTaskToPlan = async (
    planId: string | 'NEW', 
    taskData: Omit<TaskItem, 'id' | 'dayOffset'> & { date: Date }, 
    newGoalName?: string
  ) => {
    const now = Date.now();

    const getOffset = (planStart: number, taskDate: Date) => {
      const start = new Date(planStart);
      start.setHours(0,0,0,0);
      const target = new Date(taskDate);
      target.setHours(0,0,0,0);
      const diffTime = target.getTime() - start.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    if (planId === 'NEW' && newGoalName) {
      // 创建新计划
      const offset = getOffset(now, taskData.date);
      const taskToCreate = {
        title: taskData.title,
        description: taskData.description,
        startTime: taskData.startTime,
        durationMinutes: taskData.durationMinutes,
        dayOffset: offset,
        reminderStyle: taskData.reminderStyle || 'ALARM'
      };

      try {
        const savedPlan = await createPlan(newGoalName, [taskToCreate]);
        setHistory(prev => [savedPlan, ...prev]);
        setCurrentPlan(savedPlan);
      } catch (error) {
        console.error('Failed to create plan:', error);
        // 失败时本地创建
        const newTask: TaskItem = {
          id: `manual_${now}`,
          ...taskToCreate,
          isCompleted: false
        };
        const newPlan: Plan = {
          id: now.toString(),
          createdAt: now,
          startDate: now,
          goal: newGoalName,
          tasks: [newTask]
        };
        setHistory(prev => [newPlan, ...prev]);
        setCurrentPlan(newPlan);
      }
    } else {
      // 添加任务到现有计划
      const plan = history.find(p => p.id === planId);
      if (!plan) return;

      const offset = getOffset(plan.startDate, taskData.date);
      const taskToAdd = {
        title: taskData.title,
        description: taskData.description,
        startTime: taskData.startTime,
        durationMinutes: taskData.durationMinutes,
        dayOffset: offset,
        reminderStyle: taskData.reminderStyle || 'ALARM'
      };

      try {
        const updatedPlan = await addTaskToPlan(planId, taskToAdd);
        setHistory(prev => prev.map(p => p.id === planId ? updatedPlan : p));
        if (currentPlan?.id === planId) {
          setCurrentPlan(updatedPlan);
        }
      } catch (error) {
        console.error('Failed to add task:', error);
        // 失败时本地添加
        const newTask: TaskItem = {
          id: `manual_${now}`,
          ...taskToAdd,
          isCompleted: false
        };
        setHistory(prev => prev.map(p => {
          if (p.id !== planId) return p;
          return { ...p, tasks: [...p.tasks, newTask] };
        }));
      }
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      await deletePlan(id);
    } catch (error) {
      console.error('Failed to delete plan from server:', error);
    }
    setHistory(prev => prev.filter(p => p.id !== id));
    if (currentPlan?.id === id) {
      setCurrentPlan(null);
      if (activeTab === 'plan') {
         setActiveTab('goals');
      }
    }
  };

  const handleSelectPlan = (plan: Plan) => {
    setCurrentPlan(plan);
    setSelectedDate(new Date(plan.startDate));
    setActiveTab('plan');
  };

  const handleToggleTaskCompletion = async (planId: string, taskId: string) => {
    const plan = history.find(p => p.id === planId);
    const task = plan?.tasks.find(t => t.id === taskId);
    if (!task) return;

    const newCompleted = !task.isCompleted;
    
    // 先更新本地状态
    setHistory(prev => prev.map(p => {
        if (p.id !== planId) return p;
        return {
            ...p,
            tasks: p.tasks.map(t => {
                if (t.id !== taskId) return t;
                return { ...t, isCompleted: newCompleted };
            })
        };
    }));

    // 同步到服务器
    try {
      await updateTaskApi(planId, taskId, { isCompleted: newCompleted });
    } catch (error) {
      console.error('Failed to sync task completion:', error);
    }
  };

  const handleDownload = () => {
    if (currentPlan) {
      downloadICSFile(currentPlan.tasks, currentPlan.startDate, `Plan_${currentPlan.goal.substring(0, 10)}.ics`);
    }
  };
  
  const handleTabChange = (tab: Tab) => {
    if (tab === 'plan' && activeTab === 'plan') {
      setCurrentPlan(null);
    }
    setActiveTab(tab);
  };

  const getHeaderProps = () => {
    const t = translations[language];
    switch(activeTab) {
      case 'create': return { title: t.app_name };
      case 'review': return { title: t.header_review };
      case 'plan': 
        return { 
          title: t.header_schedule,
          rightAction: (
            <div className="flex items-center gap-2">
               <button 
                  onClick={() => setSelectedDate(new Date())}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-all shadow-sm active:scale-95"
               >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">{t.plan_calendar_today}</span>
               </button>
               {history.length > 0 && (
                 <button 
                    onClick={handleDownload}
                    className={`flex items-center gap-1.5 px-3 py-1.5 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white rounded-lg transition-all shadow-sm shadow-${themeColor}-200 active:scale-95`}
                 >
                    <Download className="w-3.5 h-3.5" />
                    <span className="text-xs font-semibold">{t.plan_calendar_sync}</span>
                 </button>
               )}
            </div>
          )
        }; 
      case 'goals': return { title: t.header_goals };
      case 'settings': return { title: t.header_settings };
    }
  };

  // 显示启动画面
  if (showSplash) {
    return <SplashScreen language={language} />;
  }

  // 如果未认证，显示登录界面（不受 isLoading 影响，避免登录失败时组件被卸载）
  if (!isAuthenticated) {
    // 只在初始加载时显示加载画面
    if (isLoading) {
      return (
        <div className="flex flex-col h-screen max-w-2xl mx-auto items-center justify-center bg-slate-50">
          <div className={`w-16 h-16 bg-${themeColor}-100 rounded-full animate-ping absolute opacity-75`}></div>
          <div className={`w-16 h-16 bg-white rounded-full flex items-center justify-center relative z-10 shadow-sm border border-${themeColor}-50`}>
            <Sparkles className={`w-8 h-8 text-${themeColor}-600 animate-pulse`} />
          </div>
          <h3 className="mt-6 text-xl font-bold text-slate-800">{translations[language].loading_checking_auth || '验证登录状态...'}</h3>
        </div>
      );
    }
    return <AuthView />;
  }

  // Calculate Opacity for Dual Layers
  // Active Layer: Fades OUT (opacity -> 0) if transitioning.
  // Incoming Layer: Fades IN (opacity -> bgOpacity) if transitioning.
  
  const activeLayerStyle = {
      backgroundImage: activeBgLayer ? `url(${activeBgLayer})` : 'none',
      opacity: isTransitioning ? 0 : bgOpacity,
      transition: isTransitioning ? 'opacity 1s ease-in-out' : 'none' // Key Fix: Disable transition when not transitioning to prevent flicker
  };
  
  const incomingLayerStyle = {
      backgroundImage: incomingBgLayer ? `url(${incomingBgLayer})` : 'none',
      opacity: isTransitioning ? bgOpacity : 0,
      transition: 'opacity 1s ease-in-out'
  };

  return (
    <div className={`flex flex-col h-screen max-w-2xl mx-auto relative shadow-2xl sm:border-x sm:border-slate-200 overflow-hidden selection:bg-${themeColor}-100 selection:text-${themeColor}-700 transition-colors duration-300`}>
      
      {/* Background Layers */}
      
      {/* 1. Base Solid Color (Always visible) */}
      <div className="absolute inset-0 z-0 bg-slate-50" />

      {/* 2. Active Layer (Bottom) */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-fixed"
        style={activeLayerStyle}
      ></div>

      {/* 3. Incoming Layer (Top) */}
      {incomingBgLayer && (
          <div 
            className="absolute inset-0 z-0 bg-cover bg-center bg-fixed"
            style={incomingLayerStyle}
          ></div>
      )}

      {/* 4. Slight Blur overlay to ensure text readability */}
      {(activeBgLayer || incomingBgLayer) && (
         <div 
            className="absolute inset-0 z-0 backdrop-blur-[1px] pointer-events-none transition-opacity duration-1000"
            style={{ opacity: bgOpacity * 0.3 }}
         ></div>
      )}

      {/* Voice Mode Overlay */}
      {showVoiceMode && (
        <LiveVoiceMode 
          onClose={() => setShowVoiceMode(false)} 
          onPlanGenerated={handleVoicePlanGenerated}
          language={language}
        />
      )}

      {/* Clarification Modal */}
      {clarificationRequest && (
        <ClarificationModal 
            question={clarificationRequest.question}
            onConfirm={handleClarificationResponse}
            onSkip={handleClarificationSkip}
            isGenerating={loadingState === LoadingState.GENERATING}
            language={language}
        />
      )}

      {/* Blocking Loading Overlay */}
      {loadingState === LoadingState.GENERATING && !clarificationRequest && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
           <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center max-w-xs text-center animate-in zoom-in-95 duration-300">
              <div className="relative mb-6">
                 <div className={`w-16 h-16 bg-${themeColor}-100 rounded-full animate-ping absolute opacity-75`}></div>
                 <div className={`w-16 h-16 bg-white rounded-full flex items-center justify-center relative z-10 shadow-sm border border-${themeColor}-50`}>
                    <Sparkles className={`w-8 h-8 text-${themeColor}-600 animate-pulse`} />
                 </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{translations[language].loading_crafting}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                {translations[language].loading_desc}
              </p>
           </div>
        </div>
      )}

      {/* Main Content Wrapper - z-10 to sit above background */}
      <div className="flex flex-col h-full relative z-10">
          <Header {...getHeaderProps()} />

          <main className={`flex-1 relative w-full ${activeTab === 'review' ? 'overflow-hidden pb-0' : 'overflow-y-auto no-scrollbar pb-0 scroll-smooth'}`}>
            
            {activeTab === 'create' && (
              <CreateView 
                onGenerate={handleGenerate} 
                onStartVoice={() => setShowVoiceMode(true)}
                loadingState={loadingState} 
                language={language}
              />
            )}

            {activeTab === 'review' && draftPlan && (
              <PlanReview 
                plan={draftPlan}
                onUpdateTask={handleUpdateDraftTask}
                onDeleteTask={handleDeleteDraftTask}
                onConfirm={handleConfirmDraft}
                onCancel={handleCancelDraft}
                onRefine={handleRefineDraft}
                isRefining={isRefining}
                language={language}
              />
            )}

            {activeTab === 'plan' && (
              <PlanResult 
                plans={history} 
                focusedPlan={currentPlan} 
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onUpdateTask={handleUpdateTaskInPlan}
                onDeleteTask={handleDeleteTaskInPlan}
                onAddTask={handleAddTaskToPlan}
                onRefine={handleRefinePlan}
                isRefining={isRefining}
                onClearSelection={() => setCurrentPlan(null)}
                language={language}
              />
            )}

            {activeTab === 'goals' && (
              <GoalProgressView 
                plans={history} 
                onSelectPlan={handleSelectPlan}
                onDeletePlan={handleDeletePlan}
                onToggleTask={handleToggleTaskCompletion}
                onGoToCreate={() => setActiveTab('create')}
                language={language}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView 
                language={language}
                setLanguage={setLanguage}
                isPro={isPro}
                setIsPro={setIsPro}
              />
            )}

          </main>

          <BottomNav activeTab={activeTab} onChange={handleTabChange} language={language} />
      </div>
      
    </div>
  );
}

// 包装App内容在AuthProvider中
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
