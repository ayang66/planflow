import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sparkles, Loader2, Mail, Lock, Eye, EyeOff, UserPlus, LogIn } from './Icons';

export const AuthView: React.FC = () => {
  const { login: authLogin, register: authRegister } = useAuth();
  const { themeColor } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('请填写邮箱和密码');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (password.length < 8) {
      setError('密码至少需要8个字符');
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        await authLogin(email, password);
      } else {
        await authRegister(email, password);
      }
    } catch (err) {
      console.error('Auth error:', err);
      console.log('Error type:', typeof err);
      console.log('Error message:', err instanceof Error ? err.message : String(err));
      let errorMessage = '操作失败，请重试';

      if (err instanceof Error) {
        const msg = err.message.toLowerCase();
        if (msg.includes('incorrect') || msg.includes('password') || msg.includes('invalid')) {
          errorMessage = '邮箱或密码错误';
        } else if (msg.includes('not found') || msg.includes('no user')) {
          errorMessage = '用户不存在，请先注册';
        } else if (msg.includes('already') || msg.includes('exist') || msg.includes('registered')) {
          errorMessage = '该邮箱已被注册';
        } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('failed to fetch')) {
          errorMessage = '网络连接失败，请检查网络';
        } else if (msg.includes('timeout')) {
          errorMessage = '请求超时，请稍后重试';
        } else if (msg.includes('401') || msg.includes('unauthorized')) {
          errorMessage = '认证失败，请重新登录';
        } else if (msg.includes('500') || msg.includes('server')) {
          errorMessage = '服务器错误，请稍后重试';
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* 顶部装饰 */}
      <div className={`h-40 bg-gradient-to-br from-${themeColor}-500 to-${themeColor}-600 relative overflow-visible`}>
        <div className="absolute inset-0 opacity-10 overflow-hidden">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-10 w-48 h-48 bg-white rounded-full blur-3xl" />
        </div>
        
        {/* Logo */}
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-10">
          <div className={`bg-white p-4 rounded-2xl shadow-xl shadow-${themeColor}-200 border border-slate-100`}>
            <Sparkles className={`w-10 h-10 text-${themeColor}-600`} />
          </div>
        </div>
      </div>

      {/* 主内容 */}
      <div className="flex-1 px-6 pt-14 pb-8">
        <div className="max-w-sm mx-auto">
          {/* 标题 */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {isLogin ? '欢迎回来' : '创建账户'}
            </h1>
            <p className="text-slate-500 text-sm">
              {isLogin ? '登录以继续使用 PlanFlow' : '注册开始您的智能规划之旅'}
            </p>
          </div>

          {/* 错误提示 */}
          {error && (
            <div className={`mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3 animate-in slide-in-from-top-2 duration-300`}>
              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
              {error}
            </div>
          )}

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 邮箱 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 ml-1">邮箱</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder:text-slate-400`}
                  placeholder="your@email.com"
                  disabled={loading}
                />
              </div>
            </div>

            {/* 密码 */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 ml-1">密码</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder:text-slate-400`}
                  placeholder="至少8个字符"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* 确认密码（注册时） */}
            {!isLogin && (
              <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-medium text-slate-700 ml-1">确认密码</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder:text-slate-400`}
                    placeholder="再次输入密码"
                    disabled={loading}
                  />
                </div>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-4 bg-${themeColor}-600 hover:bg-${themeColor}-700 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-${themeColor}-200 active:scale-[0.98] mt-6`}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>处理中...</span>
                </>
              ) : (
                <>
                  {isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                  <span>{isLogin ? '登录' : '注册'}</span>
                </>
              )}
            </button>
          </form>

          {/* 切换登录/注册 */}
          <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">
              {isLogin ? '还没有账户？' : '已有账户？'}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setConfirmPassword('');
                }}
                className={`ml-1 text-${themeColor}-600 hover:text-${themeColor}-700 font-semibold transition-colors`}
              >
                {isLogin ? '立即注册' : '立即登录'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* 底部装饰 */}
      <div className="text-center pb-8 text-slate-400 text-xs">
        PlanFlow AI · 智能规划助手
      </div>
    </div>
  );
};

export default AuthView;
