
import React, { useState } from 'react';
import { Loader2, ArrowRight, SlidersHorizontal, Zap, Mic } from './Icons';
import { LoadingState, ReminderSetting, Language } from '../types';
import { translations } from '../utils/translations';
import { useTheme } from '../contexts/ThemeContext';
import { Select, SelectOption } from './Select';

interface CreateViewProps {
  onGenerate: (goal: string, constraints?: string, reminderSetting?: ReminderSetting) => Promise<void>;
  onStartVoice: () => void;
  loadingState: LoadingState;
  language: Language;
}

export const CreateView: React.FC<CreateViewProps> = ({ onGenerate, onStartVoice, loadingState, language }) => {
  const t = translations[language];
  const { themeColor } = useTheme();
  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  
  // Settings State
  const [isAuto, setIsAuto] = useState(true);
  const [duration, setDuration] = useState('1 week');
  const [frequency, setFrequency] = useState('Daily');
  const [timeOfDay, setTimeOfDay] = useState('Morning');
  const [reminderSetting, setReminderSetting] = useState<ReminderSetting>('ALARM');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      let constraints = undefined;
      const effectiveReminder = isAuto ? 'AUTO' : reminderSetting;

      if (!isAuto) {
        constraints = `
          - Plan Duration: ${duration}
          - Task Frequency: ${frequency}
          - Preferred Time of Day: ${timeOfDay}
        `;
      }
      onGenerate(input, constraints, effectiveReminder);
    }
  };

  const suggestions = [
    t.suggestion_1,
    t.suggestion_2,
    t.suggestion_3,
    t.suggestion_4
  ];

  // Options
  const durationOptions: SelectOption[] = [
      { label: '3 days', value: '3 days' },
      { label: '1 week', value: '1 week' },
      { label: '2 weeks', value: '2 weeks' },
      { label: '1 month', value: '1 month' },
      { label: '3 months', value: '3 months' },
      { label: '6 months', value: '6 months' },
  ];

  const frequencyOptions: SelectOption[] = [
      { label: 'Daily', value: 'Daily' },
      { label: 'Weekdays', value: 'Weekdays' },
      { label: 'Weekends', value: 'Weekends' },
      { label: 'Every other day', value: 'Every other day' },
  ];

  const timeOptions: SelectOption[] = [
      { label: 'Morning (8-11 AM)', value: 'Morning' },
      { label: 'Afternoon (1-5 PM)', value: 'Afternoon' },
      { label: 'Evening (6-9 PM)', value: 'Evening' },
      { label: 'Anytime', value: 'Anytime' },
  ];

  const reminderOptions: SelectOption[] = [
      { label: 'Alarm (Sound)', value: 'ALARM' },
      { label: 'Vibrate Only', value: 'VIBRATE' },
      { label: 'No Reminder', value: 'NONE' },
  ];

  return (
    <div className="px-4 py-6 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
      
      {/* Hero Section */}
      <div className="text-center space-y-3 mt-4">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
          {t.create_hero_title} <span className={`text-${themeColor}-600`}>{t.create_hero_title_highlight}</span>?
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xs mx-auto">
          {t.create_hero_subtitle}
        </p>
      </div>

      {/* Input Card */}
      <form onSubmit={handleSubmit} className="relative z-10">
        <div className={`bg-white rounded-2xl shadow-xl border border-${themeColor}-50 transition-all ${showSettings ? 'overflow-visible pb-0' : 'overflow-hidden'}`}>
          
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t.create_placeholder}
            className="w-full h-32 p-4 bg-transparent border-none resize-none focus:ring-0 text-lg placeholder:text-slate-300 text-slate-900"
            disabled={loadingState === LoadingState.GENERATING}
          />
          
          {/* Action Bar */}
          <div className="flex items-center justify-between p-3 bg-slate-50/50 border-t border-slate-100">
             
             {/* Left Actions: Settings & Voice */}
             <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 ${
                    isAuto 
                      ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                      : `bg-${themeColor}-50 text-${themeColor}-600 border border-${themeColor}-100`
                  }`}
                >
                  {isAuto ? <Zap className="w-3.5 h-3.5" /> : <SlidersHorizontal className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{isAuto ? t.create_settings_auto : t.create_settings_custom}</span>
                </button>

                <button
                  type="button"
                  onClick={onStartVoice}
                  disabled={loadingState === LoadingState.GENERATING}
                  className={`flex items-center gap-2 px-3 py-2 rounded-full text-xs font-semibold bg-${themeColor}-100 text-${themeColor}-700 border border-${themeColor}-200 hover:bg-${themeColor}-200 transition-all active:scale-95`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{t.create_btn_voice}</span>
                </button>
             </div>

             {/* Submit Button */}
             <button
              type="submit"
              disabled={loadingState === LoadingState.GENERATING || !input.trim()}
              className={`bg-${themeColor}-600 hover:bg-${themeColor}-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl px-5 py-2.5 font-semibold transition-all active:scale-95 flex items-center gap-2 shadow-md shadow-${themeColor}-200`}
            >
              {loadingState === LoadingState.GENERATING ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="hidden sm:inline">{t.create_btn_planning}</span>
                </>
              ) : (
                <>
                  <span className="hidden sm:inline">{t.create_btn_generate}</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>

          {/* Configuration Panel (Expandable) */}
          <div className={`bg-slate-50 border-t border-slate-200 rounded-b-2xl transition-all duration-300 ease-in-out ${showSettings ? 'max-h-[30rem] opacity-100 p-4' : 'max-h-0 opacity-0 p-0 overflow-hidden'}`}>
             
             <div className="flex items-center justify-between mb-4">
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t.create_settings_title}</span>
               <div className="flex bg-slate-200 p-0.5 rounded-lg">
                  <button 
                    type="button" 
                    onClick={() => setIsAuto(true)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${isAuto ? `bg-white text-${themeColor}-600 shadow-sm` : 'text-slate-500 hover:text-slate-600'}`}
                  >
                    {t.create_settings_auto}
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setIsAuto(false)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${!isAuto ? `bg-white text-${themeColor}-600 shadow-sm` : 'text-slate-500 hover:text-slate-600'}`}
                  >
                    {t.create_settings_custom}
                  </button>
               </div>
             </div>

             <div className={`space-y-4 ${isAuto ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                
                {/* Duration */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600 ml-1">
                    {t.create_label_duration}
                  </label>
                  <Select 
                      options={durationOptions} 
                      value={duration} 
                      onChange={setDuration} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Frequency */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 ml-1">
                      {t.create_label_frequency}
                    </label>
                    <Select 
                        options={frequencyOptions} 
                        value={frequency} 
                        onChange={setFrequency} 
                    />
                  </div>

                  {/* Time of Day */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 ml-1">
                      {t.create_label_time}
                    </label>
                    <Select 
                        options={timeOptions} 
                        value={timeOfDay} 
                        onChange={setTimeOfDay} 
                    />
                  </div>
                </div>

                 {/* Reminder Style */}
                 <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-600 ml-1">
                      {t.create_label_reminder}
                    </label>
                    <Select 
                        options={reminderOptions} 
                        value={reminderSetting} 
                        onChange={(v) => setReminderSetting(v as ReminderSetting)} 
                    />
                  </div>

             </div>
          </div>
        </div>
      </form>

      {/* Suggestions */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">{t.create_suggestions}</h3>
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => setInput(suggestion)}
              className="bg-white border border-slate-200 text-slate-600 text-sm px-4 py-2 rounded-full hover:bg-slate-50 active:bg-slate-100 transition-colors text-left shadow-sm"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
