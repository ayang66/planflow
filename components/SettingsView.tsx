
import React, { useState, useRef } from 'react';
import { Language, ThemeColor, BackgroundTheme } from '../types';
import { Crown, Globe, Check, CreditCard, ChevronRight, Loader2, Sparkles, CheckCircle2, X, Palette, Layout, Smartphone, Upload, Trash2, LogOut } from './Icons';
import { translations } from '../utils/translations';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { ImageCropper } from './ImageCropper';

interface SettingsViewProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  isPro: boolean;
  setIsPro: (isPro: boolean) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ language, setLanguage, isPro, setIsPro }) => {
  const t = translations[language];
  const { 
    themeColor, setThemeColor, 
    backgroundTheme, setBackgroundTheme,
    bgOpacity, setBgOpacity,
    customBgImage, setCustomBgImage
  } = useTheme();
  const { user, isPro: userIsPro, logout: authLogout, upgrade: authUpgrade } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // 使用服务器的 isPro 状态，如果没有则使用本地状态
  const isProUser = userIsPro || isPro;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authLogout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  // Navigation State
  const [activeModal, setActiveModal] = useState<'NONE' | 'APPEARANCE' | 'LANGUAGE'>('NONE');
  const [appearanceTab, setAppearanceTab] = useState<'COLOR' | 'BG'>('COLOR');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  // Pending States
  const [pendingColor, setPendingColor] = useState<ThemeColor>(themeColor);
  const [pendingBg, setPendingBg] = useState<BackgroundTheme>(backgroundTheme);
  const [pendingLanguage, setPendingLanguage] = useState<Language>(language);
  const [pendingOpacity, setPendingOpacity] = useState<number>(bgOpacity);
  
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cropper State
  const [showCropper, setShowCropper] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);

  const languages: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文 (Chinese)' },
    { code: 'ja', label: '日本語 (Japanese)' },
    { code: 'ko', label: '한국어 (Korean)' },
  ];

  const colors: { code: ThemeColor; label: string; colorClass: string }[] = [
    { code: 'indigo', label: t.theme_indigo, colorClass: 'bg-indigo-500' },
    { code: 'blue', label: t.theme_blue, colorClass: 'bg-blue-500' },
    { code: 'emerald', label: t.theme_emerald, colorClass: 'bg-emerald-500' },
    { code: 'rose', label: t.theme_rose, colorClass: 'bg-rose-500' },
    { code: 'amber', label: t.theme_amber, colorClass: 'bg-amber-500' },
    { code: 'violet', label: t.theme_violet, colorClass: 'bg-violet-500' },
    { code: 'slate', label: t.theme_slate, colorClass: 'bg-slate-500' },
    { code: 'teal', label: t.theme_teal, colorClass: 'bg-teal-500' },
    { code: 'cyan', label: t.theme_cyan, colorClass: 'bg-cyan-500' },
    { code: 'fuchsia', label: t.theme_fuchsia, colorClass: 'bg-fuchsia-500' },
    { code: 'pink', label: t.theme_pink, colorClass: 'bg-pink-500' },
    { code: 'orange', label: t.theme_orange, colorClass: 'bg-orange-500' },
  ];

  const backgrounds: { code: BackgroundTheme; label: string; imageUrl: string }[] = [
    { code: 'DEFAULT', label: t.bg_default, imageUrl: '' },
    { code: 'SUMMER', label: t.bg_summer, imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop' },
    { code: 'WARM', label: t.bg_warm, imageUrl: 'https://images.unsplash.com/photo-1618588507085-c79565432917?q=80&w=400&auto=format&fit=crop' },
    { code: 'CYBER', label: t.bg_cyber, imageUrl: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=400&auto=format&fit=crop' },
  ];

  const handleOpenAppearance = () => {
    setPendingColor(themeColor);
    setPendingBg(backgroundTheme);
    setPendingOpacity(bgOpacity);
    setActiveModal('APPEARANCE');
  };

  const handleOpenLanguage = () => {
    setPendingLanguage(language);
    setActiveModal('LANGUAGE');
  };

  const handleSaveAppearance = () => {
    setThemeColor(pendingColor);
    setBackgroundTheme(pendingBg);
    setBgOpacity(pendingOpacity);
    setActiveModal('NONE');
  };

  const handleSaveLanguage = () => {
    setLanguage(pendingLanguage);
    setActiveModal('NONE');
  };

  const handleUpgrade = () => {
    setShowPaymentModal(true);
  };

  const processPayment = async (method: 'VISA' | 'PAYPAL') => {
    setProcessing(true);
    try {
      // 模拟支付延迟
      await new Promise(resolve => setTimeout(resolve, 1500));
      // 调用后端升级 API
      await authUpgrade();
      setShowPaymentModal(false);
    } catch (error) {
      console.error('Payment error:', error);
      alert('升级失败，请重试');
    } finally {
      setProcessing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
         alert("Image size must be less than 10MB");
         return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImageSrc(reader.result as string);
        setShowCropper(true);
        // Reset input so same file can be selected again if needed
        if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedImage: string) => {
    setCustomBgImage(croppedImage);
    setPendingBg('CUSTOM');
    setShowCropper(false);
    setRawImageSrc(null);
  };

  const handleCropCancel = () => {
    setShowCropper(false);
    setRawImageSrc(null);
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const getCurrentLanguageLabel = () => languages.find(l => l.code === language)?.label;

  return (
    <>
      <div className="px-4 py-6 space-y-6 pb-32 animate-in fade-in slide-in-from-bottom-2">
        
        {/* User Account Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">账户信息</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-800">{user?.email || user?.phone || '未知用户'}</p>
                <p className="text-xs text-slate-500">已登录</p>
              </div>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className={`flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>登出中...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>登出</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Plan Status Card */}
        <div className={`rounded-2xl p-6 relative overflow-hidden ${isProUser ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-900 shadow-sm'}`}>
           {isProUser && (
               <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Crown className="w-32 h-32" />
               </div>
           )}
           
           <div className="relative z-10">
               <div className="flex justify-between items-start mb-4">
                   <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">{t.settings_current_plan}</h3>
                      <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">{isProUser ? t.settings_pro : t.settings_free}</span>
                          {isProUser && <Crown className="w-6 h-6 text-yellow-400 fill-current" />}
                      </div>
                   </div>
                   {!isProUser && (
                      <div className={`bg-${themeColor}-50 p-2 rounded-full`}>
                          <Crown className={`w-6 h-6 text-${themeColor}-600`} />
                      </div>
                   )}
               </div>

               {!isProUser ? (
                   <>
                      <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                          {t.settings_pro_desc}
                      </p>
                      <button 
                          onClick={handleUpgrade}
                          className={`w-full py-3 rounded-xl bg-gradient-to-r from-${themeColor}-600 to-purple-600 text-white font-bold shadow-lg shadow-${themeColor}-200 active:scale-[0.98] transition-transform flex items-center justify-center gap-2`}
                      >
                          <Sparkles className="w-4 h-4" />
                          {t.settings_btn_upgrade}
                      </button>
                      <p className="text-center text-xs text-slate-400 mt-3 font-medium">
                          {t.settings_pro_price}
                      </p>
                   </>
               ) : (
                   <div className="flex items-center gap-2 text-green-400 bg-white/10 px-4 py-2 rounded-lg w-fit">
                       <CheckCircle2 className="w-5 h-5" />
                       <span className="font-semibold text-sm">Active Member</span>
                   </div>
               )}
           </div>
        </div>

        {/* Settings List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
           
           {/* Appearance Setting */}
           <button 
              onClick={handleOpenAppearance}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
           >
               <div className="flex items-center gap-3">
                   <div className={`p-2 bg-${themeColor}-50 text-${themeColor}-600 rounded-lg group-hover:scale-110 transition-transform`}>
                       <Palette className="w-5 h-5" />
                   </div>
                   <span className="font-bold text-slate-800">{t.settings_appearance}</span>
               </div>
               <ChevronRight className="w-5 h-5 text-slate-300" />
           </button>

           {/* Language Setting */}
           <button 
              onClick={handleOpenLanguage}
              className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors group"
           >
               <div className="flex items-center gap-3">
                   <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:scale-110 transition-transform">
                       <Globe className="w-5 h-5" />
                   </div>
                   <span className="font-bold text-slate-800">{t.settings_language}</span>
               </div>
               <div className="flex items-center gap-2 text-slate-400">
                   <span className="text-sm font-medium text-slate-600">{getCurrentLanguageLabel()}</span>
                   <ChevronRight className="w-5 h-5" />
               </div>
           </button>
        </div>
      </div>

      {/* --- CROPPER OVERLAY --- */}
      {showCropper && rawImageSrc && (
          <ImageCropper 
            imageSrc={rawImageSrc} 
            onCancel={handleCropCancel} 
            onCrop={handleCropComplete} 
          />
      )}

      {/* --- APPEARANCE MODAL --- */}
      {activeModal === 'APPEARANCE' && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in duration-300 ring-1 ring-slate-900/5 flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10 shrink-0">
                    <h3 className="font-bold text-slate-800 text-lg">{t.settings_appearance}</h3>
                    <div className="flex gap-2">
                        <button onClick={() => setActiveModal('NONE')} className="bg-slate-200 active:bg-slate-300 rounded-full p-1 transition-colors">
                            <X className="w-5 h-5 text-slate-600" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 bg-white shrink-0">
                    <button 
                       onClick={() => setAppearanceTab('COLOR')}
                       className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${appearanceTab === 'COLOR' ? `border-${pendingColor}-600 text-${pendingColor}-600` : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                       {t.tab_color}
                    </button>
                    <button 
                       onClick={() => setAppearanceTab('BG')}
                       className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${appearanceTab === 'BG' ? `border-${pendingColor}-600 text-${pendingColor}-600` : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                    >
                       {t.tab_bg}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-5 bg-slate-50/50 space-y-6 no-scrollbar">

                    {/* Color Content */}
                    {appearanceTab === 'COLOR' && (
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {colors.map((color) => (
                                <button 
                                    key={color.code}
                                    onClick={() => setPendingColor(color.code)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 text-left bg-white ${
                                        pendingColor === color.code
                                        ? `border-${color.code}-500 ring-1 ring-${color.code}-500/20 shadow-sm` 
                                        : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full ${color.colorClass} shadow-sm shrink-0 flex items-center justify-center`}>
                                        {pendingColor === color.code && <Check className="w-3.5 h-3.5 text-white" />}
                                    </div>
                                    <span className={`text-sm font-semibold ${pendingColor === color.code ? `text-${color.code}-700` : 'text-slate-600'}`}>
                                        {color.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Background Content */}
                    {appearanceTab === 'BG' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-3">
                                {backgrounds.map((bg) => (
                                    <button
                                        key={bg.code}
                                        onClick={() => setPendingBg(bg.code)}
                                        className={`relative rounded-xl overflow-hidden aspect-[4/3] group transition-all active:scale-95 border-2 ${
                                            pendingBg === bg.code ? `border-${pendingColor}-500 shadow-lg shadow-${pendingColor}-200` : 'border-transparent'
                                        }`}
                                    >
                                        {bg.imageUrl ? (
                                            <img src={bg.imageUrl} alt={bg.label} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full bg-slate-50 border border-slate-100 flex items-center justify-center">
                                                {/* Empty clean white background */}
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
                                            <div className="absolute bottom-3 left-3 text-white font-bold text-sm drop-shadow-md">
                                                {bg.label}
                                            </div>
                                            {pendingBg === bg.code && (
                                                <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm">
                                                    <Check className={`w-3 h-3 text-${pendingColor}-600`} />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}

                                {/* Custom Upload Button */}
                                <button
                                    onClick={() => {
                                        setPendingBg('CUSTOM');
                                        if (!customBgImage) triggerFileUpload();
                                    }}
                                    className={`relative rounded-xl overflow-hidden aspect-[4/3] group transition-all active:scale-95 border-2 flex flex-col items-center justify-center gap-2 bg-slate-100 ${
                                        pendingBg === 'CUSTOM' ? `border-${pendingColor}-500 shadow-lg shadow-${pendingColor}-200` : 'border-slate-200 hover:bg-slate-200'
                                    }`}
                                >
                                    {customBgImage && pendingBg === 'CUSTOM' ? (
                                         <div className="absolute inset-0">
                                            <img src={customBgImage} alt="Custom" className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="bg-white/20 backdrop-blur-sm p-2 rounded-full">
                                                    <Upload className="w-5 h-5 text-white" />
                                                </div>
                                            </div>
                                            <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm">
                                                <Check className={`w-3 h-3 text-${pendingColor}-600`} />
                                            </div>
                                         </div>
                                    ) : (
                                        <>
                                            <div className={`p-3 rounded-full bg-white shadow-sm text-slate-400 group-hover:text-${themeColor}-500 transition-colors`}>
                                                <Upload className="w-6 h-6" />
                                            </div>
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">{t.bg_custom}</span>
                                            <div className="absolute bottom-2 text-[10px] text-slate-400 opacity-60">
                                                {t.settings_bg_upload}
                                            </div>
                                        </>
                                    )}
                                    {/* Hidden Input */}
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handleFileSelect}
                                    />
                                </button>
                            </div>
                            
                            {/* Opacity Slider */}
                            {pendingBg !== 'DEFAULT' && (
                                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                    <label className="flex items-center justify-between text-sm font-bold text-slate-700 mb-3">
                                        <div className="flex items-center gap-2">
                                            <Layout className="w-4 h-4 text-slate-400" />
                                            {t.settings_bg_opacity}
                                        </div>
                                        <span className={`text-${pendingColor}-600`}>{Math.round(pendingOpacity * 100)}%</span>
                                    </label>
                                    <input 
                                        type="range" 
                                        min="0" 
                                        max="1" 
                                        step="0.1" 
                                        value={pendingOpacity}
                                        onChange={(e) => setPendingOpacity(parseFloat(e.target.value))}
                                        className={`w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-${pendingColor}-500`}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Action */}
                <div className="p-5 border-t border-slate-100 bg-white shrink-0 pb-safe-bottom">
                    <button 
                        onClick={handleSaveAppearance}
                        className={`w-full bg-${pendingColor}-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-${pendingColor}-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2`}
                    >
                        <Check className="w-5 h-5" />
                        {t.settings_save}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- LANGUAGE MODAL --- */}
      {activeModal === 'LANGUAGE' && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 sm:zoom-in duration-300 ring-1 ring-slate-900/5 flex flex-col max-h-[85vh]">
                
                <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 sticky top-0 z-10 shrink-0">
                    <h3 className="font-bold text-slate-800 text-lg">{t.settings_language}</h3>
                    <button onClick={() => setActiveModal('NONE')} className="bg-slate-200 active:bg-slate-300 rounded-full p-1 transition-colors">
                        <X className="w-5 h-5 text-slate-600" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3 no-scrollbar">
                    {languages.map((lang) => (
                        <button
                            key={lang.code}
                            onClick={() => setPendingLanguage(lang.code)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all active:scale-95 ${
                                pendingLanguage === lang.code 
                                ? `border-${themeColor}-500 bg-${themeColor}-50 ring-1 ring-${themeColor}-500/20` 
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                            <span className={`font-semibold ${pendingLanguage === lang.code ? `text-${themeColor}-700` : 'text-slate-700'}`}>
                                {lang.label}
                            </span>
                            {pendingLanguage === lang.code && (
                                <div className={`bg-${themeColor}-500 rounded-full p-1`}>
                                    <Check className="w-3 h-3 text-white" />
                                </div>
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-5 border-t border-slate-100 bg-white shrink-0 pb-safe-bottom">
                    <button 
                        onClick={handleSaveLanguage}
                        className={`w-full bg-${themeColor}-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-${themeColor}-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2`}
                    >
                        <Check className="w-5 h-5" />
                        {t.settings_save}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- PAYMENT MODAL --- */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-400 via-orange-500 to-purple-600"></div>
                
                <div className="text-center mb-6 mt-2">
                    <div className="inline-block p-3 bg-yellow-100 rounded-full mb-3">
                        <Crown className="w-8 h-8 text-yellow-600" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">{t.settings_pro_title}</h3>
                    <p className="text-slate-500 text-sm mt-1">{t.settings_pro_desc}</p>
                </div>

                {processing ? (
                    <div className="flex flex-col items-center justify-center py-8">
                        <Loader2 className={`w-10 h-10 text-${themeColor}-600 animate-spin mb-3`} />
                        <p className="font-semibold text-slate-600">{t.payment_processing}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{t.payment_method}</p>
                        
                        <button 
                            onClick={() => processPayment('VISA')}
                            className="w-full flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group"
                        >
                            <CreditCard className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
                            <span className="font-bold text-slate-700">Credit Card</span>
                        </button>
                        
                        <button 
                            onClick={() => processPayment('PAYPAL')}
                            className="w-full flex items-center gap-3 p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group"
                        >
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">P</div>
                            <span className="font-bold text-slate-700">PayPal</span>
                        </button>

                        <button 
                            onClick={() => setShowPaymentModal(false)}
                            className="w-full py-3 mt-2 text-slate-400 font-semibold text-sm hover:text-slate-600 transition-colors"
                        >
                            {t.common_cancel}
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}
    </>
  );
};
