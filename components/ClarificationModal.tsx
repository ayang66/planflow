
import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2, X } from './Icons';
import { Language } from '../types';
import { translations } from '../utils/translations';
import { useTheme } from '../contexts/ThemeContext';

interface ClarificationModalProps {
  question: string;
  onConfirm: (answer: string) => void;
  onSkip: () => void;
  isGenerating: boolean;
  language: Language;
}

export const ClarificationModal: React.FC<ClarificationModalProps> = ({ question, onConfirm, onSkip, isGenerating, language }) => {
  const t = translations[language];
  const { themeColor } = useTheme();
  const [answer, setAnswer] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onConfirm(answer);
    } else {
      onSkip();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 slide-in-from-bottom-5 duration-300 relative overflow-hidden">
        
        {/* Background Decor */}
        <div className={`absolute -top-10 -right-10 w-32 h-32 bg-${themeColor}-100 rounded-full blur-3xl opacity-50`}></div>
        <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-100 rounded-full blur-3xl opacity-50"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
             <div className="flex items-center gap-2">
                <div className={`p-2 bg-${themeColor}-100 rounded-lg text-${themeColor}-600`}>
                   <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg">{t.clarify_title}</h3>
             </div>
             <button 
                onClick={onSkip}
                disabled={isGenerating}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
             >
                <X className="w-5 h-5" />
             </button>
          </div>

          <p className="text-slate-600 text-sm leading-relaxed mb-5 font-medium">
            {question}
          </p>

          <form onSubmit={handleSubmit}>
            <textarea
              autoFocus
              className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:ring-0 focus:border-${themeColor}-500 outline-none resize-none mb-4 transition-all`}
              rows={3}
              placeholder={t.clarify_placeholder}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={isGenerating}
            />

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onSkip}
                disabled={isGenerating}
                className="flex-1 py-3 rounded-xl font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors text-sm"
              >
                {t.clarify_skip}
              </button>
              <button
                type="submit"
                disabled={isGenerating || !answer.trim()}
                className={`flex-[2] py-3 rounded-xl font-semibold text-white bg-${themeColor}-600 hover:bg-${themeColor}-700 active:scale-[0.98] transition-all text-sm shadow-lg shadow-${themeColor}-200 flex items-center justify-center gap-2`}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{t.clarify_create}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
