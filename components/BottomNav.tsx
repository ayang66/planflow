
import React from 'react';
import { PlusCircle, CalendarCheck, Target, Settings } from './Icons';
import { Tab, Language } from '../types';
import { translations } from '../utils/translations';
import { useTheme } from '../contexts/ThemeContext';

interface BottomNavProps {
  activeTab: Tab;
  onChange: (tab: Tab) => void;
  language: Language;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChange, language }) => {
  const t = translations[language];
  const { themeColor } = useTheme();

  // Hide bottom nav if we are reviewing a plan
  if (activeTab === 'review') return null;

  const navItems = [
    { id: 'create', label: t.nav_create, icon: PlusCircle },
    { id: 'plan', label: t.nav_schedule, icon: CalendarCheck },
    { id: 'goals', label: t.nav_goals, icon: Target },
    { id: 'settings', label: t.nav_settings, icon: Settings },
  ] as const;

  return (
    <nav className="pb-safe-bottom fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 bg-white/80 backdrop-blur-xl border-t border-slate-200">
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id as Tab)}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-200 active:scale-95 ${
                isActive ? `text-${themeColor}-600` : 'text-slate-400 hover:text-slate-500'
              }`}
            >
              <Icon 
                className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} 
              />
              <span className="text-[10px] font-medium tracking-wide">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
