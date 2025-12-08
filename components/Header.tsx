
import React from 'react';
import { Sparkles } from './Icons';
import { useTheme } from '../contexts/ThemeContext';

interface HeaderProps {
  title: string;
  rightAction?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, rightAction }) => {
  const { themeColor } = useTheme();

  return (
    <header className="pt-safe-top sticky top-0 z-30 transition-all duration-300 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="flex items-center justify-between px-4 h-14 sm:h-16 max-w-2xl mx-auto">
        <div className="flex items-center gap-2">
           {/* Only show icon if we are in the default view (PlanFlow is usually constant, but we can check logic) */}
           {/* If title equals translated 'PlanFlow', show icon */}
           {(title === "PlanFlow" || title === "PlanFlow") ? (
             <div className={`bg-${themeColor}-600 p-1.5 rounded-lg`}>
                <Sparkles className="w-5 h-5 text-white" />
             </div>
           ) : null}
           <h1 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h1>
        </div>
        
        {rightAction && (
          <div className="flex items-center">
            {rightAction}
          </div>
        )}
      </div>
    </header>
  );
};
