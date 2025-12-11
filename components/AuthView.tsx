import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ConnectionTest } from './ConnectionTest';
import { AuthTest } from './AuthTest';

export const AuthView: React.FC = () => {
  const { login: authLogin, register: authRegister, isLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConnectionTest, setShowConnectionTest] = useState(false);
  const [showAuthTest, setShowAuthTest] = useState(false);

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
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">
          PlanFlow AI
        </h1>
        <p className="text-center text-gray-500 mb-6">
          {isLogin ? '登录您的账户' : '创建新账户'}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              placeholder="your@email.com"
              disabled={loading}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
              placeholder="至少8个字符"
              disabled={loading}
            />
          </div>
          
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                确认密码
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition"
                placeholder="再次输入密码"
                disabled={loading}
              />
            </div>
          )}
          
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setConfirmPassword('');
            }}
            className="text-indigo-600 hover:text-indigo-700 text-sm"
          >
            {isLogin ? '没有账户？点击注册' : '已有账户？点击登录'}
          </button>
        </div>
        
        <div className="mt-4 text-center">
          <button
            onClick={() => setShowConnectionTest(!showConnectionTest)}
            className="text-gray-500 hover:text-gray-700 text-xs underline mr-4"
          >
            {showConnectionTest ? '隐藏连接测试' : '遇到问题？测试连接'}
          </button>
          
          <button
            onClick={() => setShowAuthTest(!showAuthTest)}
            className="text-gray-500 hover:text-gray-700 text-xs underline"
          >
            {showAuthTest ? '隐藏认证测试' : '认证失败？测试认证'}
          </button>
        </div>
        
        {showConnectionTest && (
          <div className="mt-4">
            <ConnectionTest />
          </div>
        )}
        
        {showAuthTest && (
          <div className="mt-4">
            <AuthTest />
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthView;
