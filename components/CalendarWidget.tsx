
import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2 } from './Icons';
import { Language } from '../types';
import { useTheme } from '../contexts/ThemeContext';

interface CalendarWidgetProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  dayStats: Record<string, { total: number; completed: number }>;
  isCollapsed?: boolean;
  language: Language;
}

const getLocale = (lang: Language) => {
  switch (lang) {
    case 'zh': return 'zh-CN';
    case 'ja': return 'ja-JP';
    case 'ko': return 'ko-KR';
    default: return 'en-US';
  }
};

export const CalendarWidget: React.FC<CalendarWidgetProps> = ({ selectedDate, onSelectDate, dayStats, isCollapsed = false, language }) => {
  const { themeColor } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date(selectedDate));
  const locale = getLocale(language);

  // Sync internal month view when selectedDate changes
  useEffect(() => {
    if (selectedDate.getMonth() !== currentMonth.getMonth() || selectedDate.getFullYear() !== currentMonth.getFullYear()) {
        setCurrentMonth(new Date(selectedDate));
    }
  }, [selectedDate]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const renderProgressRing = (percentage: number, isSelected: boolean) => {
    const size = 38;
    const strokeWidth = 2.5;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage * circumference);

    // Map theme colors to Hex for SVG stroke
    const themeColorMap: Record<string, string> = {
        indigo: '#6366f1',
        blue: '#3b82f6',
        emerald: '#10b981',
        rose: '#f43f5e',
        amber: '#f59e0b',
        violet: '#8b5cf6',
        slate: '#64748b',
        teal: '#14b8a6',
        cyan: '#06b6d4',
        fuchsia: '#d946ef',
        pink: '#ec4899',
        orange: '#f97316'
    };
    const activeColor = themeColorMap[themeColor] || '#6366f1';

    return (
       <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <svg width={size} height={size} className="transform -rotate-90">
             <circle 
                cx={size/2} 
                cy={size/2} 
                r={radius} 
                fill="transparent"
                stroke={isSelected ? "rgba(255,255,255,0.2)" : "#e2e8f0"}
                strokeWidth={strokeWidth}
             />
             <circle 
                cx={size/2} 
                cy={size/2} 
                r={radius} 
                fill="transparent"
                stroke={isSelected ? "white" : activeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
             />
          </svg>
       </div>
    );
  };

  // Generate Week Rows
  const renderWeekRows = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    // Create an array of all day slots (including empty prefix)
    const slots: React.ReactNode[] = [];
    
    // Empty slots for previous month
    for (let i = 0; i < firstDay; i++) {
      slots.push(<div key={`empty-${i}`} className="h-12 w-full" />);
    }

    let selectedRowIndex = 0;

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isSelected = date.toDateString() === selectedDate.toDateString();
      const isToday = date.toDateString() === new Date().toDateString();
      
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const stats = dayStats[dateKey];
      
      const hasTasks = !!stats && stats.total > 0;
      const isAllDone = hasTasks && stats.completed === stats.total;
      const progressPct = hasTasks ? stats.completed / stats.total : 0;

      // Calculate which row (week) this day belongs to
      if (isSelected) {
          const currentIndex = slots.length; 
          selectedRowIndex = Math.floor(currentIndex / 7);
      }

      slots.push(
        <button
          key={day}
          onClick={() => onSelectDate(date)}
          className="relative h-12 w-full flex flex-col items-center justify-center rounded-full transition-all duration-200 active:scale-95"
        >
          <div className={`w-10 h-10 flex items-center justify-center rounded-full text-sm font-medium transition-all relative z-10 ${
            isSelected 
              ? `bg-${themeColor}-600 text-white shadow-md shadow-${themeColor}-200 scale-105` 
              : isAllDone
                ? 'bg-green-500 text-white shadow-sm'
                : isToday 
                  ? `text-${themeColor}-600 font-bold bg-${themeColor}-50`
                  : 'text-slate-700 active:bg-slate-100'
          }`}>
            {day}
            
            {!isSelected && isAllDone && (
                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm">
                   <CheckCircle2 className="w-3 h-3 text-green-500 fill-current" />
                </div>
            )}
          </div>
          
          {hasTasks && !isAllDone && renderProgressRing(progressPct, isSelected)}
        </button>
      );
    }

    // Chunk slots into weeks
    const weeks: React.ReactNode[][] = [];
    for (let i = 0; i < slots.length; i += 7) {
        weeks.push(slots.slice(i, i + 7));
    }

    return (
        <div className="flex flex-col gap-y-1">
            {weeks.map((week, idx) => {
                const isRowVisible = !isCollapsed || idx === selectedRowIndex;
                return (
                    <div 
                        key={idx} 
                        className={`grid grid-cols-7 transition-all duration-500 ease-in-out overflow-hidden ${
                            isRowVisible ? 'max-h-14 opacity-100' : 'max-h-0 opacity-0'
                        }`}
                    >
                        {week}
                    </div>
                );
            })}
        </div>
    );
  };

  const monthLabel = useMemo(() => {
    return currentMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
  }, [currentMonth, locale]);

  const weekDayLabels = useMemo(() => {
     const days = [];
     // Use a fixed week known to start on Sunday (e.g. Jan 7, 2024 is Sunday)
     for(let i=0; i<7; i++) {
        const d = new Date(2024, 0, 7 + i);
        days.push(d.toLocaleDateString(locale, { weekday: 'narrow' }));
     }
     return days;
  }, [locale]);

  return (
    <div className="bg-white p-4 pb-2 rounded-b-3xl shadow-sm border-b border-slate-100 transition-all duration-500 ease-in-out">
      
      {/* Header - Collapses when scrolling */}
      <div className={`flex items-center justify-between px-2 overflow-hidden transition-all duration-500 ease-in-out ${
          isCollapsed ? 'max-h-0 opacity-0 mb-0' : 'max-h-16 opacity-100 mb-4'
      }`}>
        <button onClick={handlePrevMonth} className="p-2 active:bg-slate-50 rounded-full text-slate-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-base font-bold text-slate-800 capitalize">
          {monthLabel}
        </h2>
        <button onClick={handleNextMonth} className="p-2 active:bg-slate-50 rounded-full text-slate-500">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Weekday Labels - Always Visible */}
      <div className="grid grid-cols-7 mb-2">
        {weekDayLabels.map((d, i) => (
          <div key={i} className="text-center text-xs font-semibold text-slate-400">
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid (Rows) */}
      {renderWeekRows()}
    </div>
  );
};
