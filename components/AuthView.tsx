import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { sendVerificationCode, verifyEmail } from '../services/authService';
import { Sparkles, Loader2, Mail, Lock, Eye, EyeOff, UserPlus, LogIn, Phone } from './Icons';

type LoginType = 'email' | 'phone';

export const AuthView: React.FC = () => {
  const { login: authLogin, register: authRegister } = useAuth();
  const { themeColor } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [loginType, setLoginType] = useState<LoginType>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifiedCode, setVerifiedCode] = useState(''); // 保存已验证的验证码

  const credential = loginType === 'email' ? email : phone;

  const validatePhone = (phone: string): boolean => {
    return /^1[3-9]\d{9}$/.test(phone);
  };

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // 发送验证码
  const handleSendCode = async () => {
    if (!validateEmail(email)) {
      setError('请输入有效的邮箱地址');
      return;
    }

    setSendingCode(true);
    setError('');

    try {
      const result = await sendVerificationCode(email);
      setCodeSent(true);
      
      // 开发环境：显示验证码用于测试
      if (result.expires_in) {
        console.log('验证码已发送，有效期 10 分钟');
        // 如果是开发环境且返回了验证码，可以显示在控制台
      }
      
      // 开始倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Send code error:', err);
      setError(err instanceof Error ? err.message : '发送失败，请重试');
    } finally {
      setSendingCode(false);
    }
  };

  // 验证邮箱
  const handleVerifyEmail = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('请输入 6 位验证码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await verifyEmail(email, verificationCode);
      setEmailVerified(true);
      setVerifiedCode(verificationCode); // 保存已验证的验证码
    } catch (err) {
      console.error('Verify email error:', err);
      setError(err instanceof Error ? err.message : '验证码错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证输入
    if (loginType === 'email') {
      if (!email) {
        setError('请填写邮箱');
        return;
      }
      if (!validateEmail(email)) {
        setError('邮箱格式不正确');
        return;
      }
    } else {
      if (!phone) {
        setError('请填写手机号');
        return;
      }
      if (!validatePhone(phone)) {
        setError('手机号格式不正确');
        return;
      }
    }

    if (!password) {
      setError('请填写密码');
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
        await authLogin(credential, password, loginType);
      } else {
        // 邮箱注册需要验证
        if (loginType === 'email' && !emailVerified) {
          setError('请先验证邮箱');
          setLoading(false);
          return;
        }
        console.log('Registering with:', { credential, type: loginType, hasCode: !!verificationCode, code: verificationCode, emailVerified, verifiedCode });
        // 使用已验证的验证码（防止用户清空输入框）
        const codeToUse = emailVerified ? verifiedCode : verificationCode;
        console.log('[DEBUG] codeToUse:', codeToUse, 'emailVerified:', emailVerified, 'verifiedCode:', verifiedCode);
        await authRegister(credential, password, loginType, loginType === 'email' ? codeToUse : undefined);
      }
    } catch (err) {
      console.error('Auth error:', err);
      let errorMessage = '操作失败，请重试';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'object' && err !== null) {
        const errorObj = err as Record<string, unknown>;
        errorMessage = (errorObj.detail || errorObj.message || JSON.stringify(err)) as string;
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
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              {isLogin ? '欢迎回来' : '创建账户'}
            </h1>
            <p className="text-slate-500 text-sm">
              {isLogin ? '登录以继续使用 PlanFlow' : '注册开始您的智能规划之旅'}
            </p>
          </div>

          {/* 登录方式切换 - 手机号登录暂时禁用 */}
          {/* <div className="flex bg-slate-100 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => { setLoginType('email'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                loginType === 'email' 
                  ? `bg-white text-${themeColor}-600 shadow-sm` 
                  : 'text-slate-500'
              }`}
            >
              邮箱登录
            </button>
            <button
              type="button"
              onClick={() => { setLoginType('phone'); setError(''); }}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                loginType === 'phone' 
                  ? `bg-white text-${themeColor}-600 shadow-sm` 
                  : 'text-slate-500'
              }`}
            >
              手机登录
            </button>
          </div> */}

          {/* 错误提示 */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
              {error}
            </div>
          )}

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 邮箱输入 */}
            <>
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
                    disabled={loading || codeSent}
                  />
                </div>
              </div>

              {/* 验证码（仅注册时显示） */}
              {!isLogin && (
                <div className="space-y-2 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-sm font-medium text-slate-700 ml-1">验证码</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className={`w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder:text-slate-400 text-center tracking-widest`}
                        placeholder="输入6位验证码"
                        maxLength={6}
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleSendCode}
                      disabled={sendingCode || countdown > 0}
                      className={`px-4 py-2 text-sm font-medium rounded-xl transition-all whitespace-nowrap ${
                        countdown > 0
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : sendingCode
                          ? `bg-${themeColor}-100 text-${themeColor}-600`
                          : `bg-${themeColor}-600 text-white hover:bg-${themeColor}-700`
                      }`}
                    >
                      {sendingCode ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : countdown > 0 ? (
                        `${countdown}s`
                      ) : (
                        '获取验证码'
                      )}
                    </button>
                  </div>
                  {codeSent && !emailVerified && (
                    <button
                      type="button"
                      onClick={handleVerifyEmail}
                      disabled={!verificationCode || verificationCode.length !== 6}
                      className={`w-full py-2 text-sm font-medium rounded-xl transition-all ${
                        verificationCode && verificationCode.length === 6
                          ? `bg-${themeColor}-100 text-${themeColor}-600 hover:bg-${themeColor}-200`
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      验证邮箱
                    </button>
                  )}
                  {emailVerified && (
                    <div className="text-green-600 text-sm font-medium flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-600 rounded-full" />
                      邮箱已验证
                    </div>
                  )}
                </div>
              )}
            </>

            {/* 手机号登录 - 暂时禁用
            {loginType === 'phone' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 ml-1">手机号</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className={`w-full pl-12 pr-4 py-3.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-${themeColor}-500 focus:border-transparent outline-none transition-all text-slate-900 placeholder:text-slate-400`}
                    placeholder="请输入手机号"
                    disabled={loading}
                  />
                </div>
              </div>
            )}
            */}

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
