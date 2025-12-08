
import React from 'react';
import { Sparkles, Loader2 } from './Icons';
import { Language } from '../types';
import { translations } from '../utils/translations';
import { useTheme } from '../contexts/ThemeContext';

interface SplashScreenProps {
  language: Language;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ language }) => {
  const t = translations[language];
  const { themeColor } = useTheme();

  return (
    <div className="fixed inset-0 z-[100] bg-slate-50 flex flex-col items-center justify-center p-6 animate-out fade-out duration-700 fill-mode-forwards">
      
      <div className="relative mb-8">
         <div className={`absolute inset-0 bg-${themeColor}-500 rounded-full blur-2xl opacity-20 animate-pulse`}></div>
         <div className={`relative bg-white p-6 rounded-3xl shadow-xl shadow-${themeColor}-100 border border-slate-100`}>
            <Sparkles className={`w-16 h-16 text-${themeColor}-600 animate-[pulse_3s_ease-in-out_infinite]`} />
         </div>
      </div>

      <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
        {t.app_name}
      </h1>
      
      <p className="text-slate-500 font-medium text-center max-w-xs leading-relaxed mb-12">
        {t.splash_slogan}
      </p>

      <div className="absolute bottom-12 flex flex-col items-center gap-3">
         <Loader2 className={`w-6 h-6 text-${themeColor}-400 animate-spin`} />
      </div>

    </div>
  );
};
