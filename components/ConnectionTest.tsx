import React, { useState } from 'react';
import { API_BASE_URL } from '../services/config';
import { CheckCircle2, Loader2, X } from './Icons';
import { useAuth } from '../contexts/AuthContext';

export const ConnectionTest: React.FC = () => {
  const { login, register, user, isAuthenticated } = useAuth();
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  const testConnection = async () => {
    setTestResult({ status: 'testing', message: '正在测试连接...' });
    
    // 尝试多个可能的地址
    const urls = [
      `${API_BASE_URL}/health`,
      'http://10.0.2.2:8000/api/health',
      'http://10.0.2.2:8000/health'
    ];
    
    let success = false;
    let successUrl = '';
    
    for (const url of urls) {
      try {
        console.log(`尝试连接: ${url}`);
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          successUrl = url;
          success = true;
          setTestResult({
            status: 'success',
            message: `连接成功！URL: ${url}\n服务器响应: ${JSON.stringify(data)}`
          });
          break;
        } else {
          console.warn(`连接失败: ${url}, 状态码: ${response.status}`);
        }
      } catch (error) {
        console.error(`连接错误: ${url}`, error);
      }
    }
    
    if (!success) {
      setTestResult({
        status: 'error',
        message: `所有连接尝试均失败。尝试的URLs: ${urls.join(', ')}`
      });
    }
  };

  const testAuthEndpoint = async () => {
    setTestResult({ status: 'testing', message: '正在测试认证端点...' });
    
    // 尝试使用不同的URLs
    const urls = [
      `${API_BASE_URL}/auth/register`,
      'http://10.0.2.2:8000/api/auth/register'
    ];
    
    let success = false;
    let successUrl = '';
    
    for (const url of urls) {
      try {
        console.log(`尝试注册: ${url}`);
        
        // 生成唯一邮箱避免重复注册错误
        const timestamp = Date.now();
        const email = `test${timestamp}@example.com`;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            username: `test${timestamp}`,
            password: 'testpassword123'
          }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
          successUrl = url;
          success = true;
          setTestResult({
            status: 'success',
            message: `注册测试成功！URL: ${url}\n邮箱: ${email}\n响应: ${JSON.stringify(data)}`
          });
          break;
        } else {
          console.warn(`注册失败: ${url}, 状态码: ${response.status}, 错误: ${JSON.stringify(data)}`);
        }
      } catch (error) {
        console.error(`注册错误: ${url}`, error);
      }
    }
    
    if (!success) {
      setTestResult({
        status: 'error',
        message: `所有注册尝试均失败。尝试的URLs: ${urls.join(', ')}`
      });
    }
  };

  const testAuthContext = async () => {
    setTestResult({ status: 'testing', message: '正在测试AuthContext...' });
    
    try {
      // 生成唯一邮箱
      const timestamp = Date.now();
      const email = `context${timestamp}@example.com`;
      
      console.log(`使用AuthContext注册: ${email}`);
      const registerResult = await register(email, 'testpassword123');
      
      setTestResult({
        status: 'success',
        message: `AuthContext测试成功！邮箱: ${email}\n响应: ${JSON.stringify(registerResult)}`
      });
    } catch (error) {
      console.error('AuthContext测试错误:', error);
      setTestResult({
        status: 'error',
        message: `AuthContext测试失败: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">连接测试</h2>
      
      <div className="space-y-4 mb-6">
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-600">API基础URL:</p>
          <p className="font-mono text-sm">{API_BASE_URL}</p>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-600">当前认证状态:</p>
          <p className="font-mono text-sm">已认证: {isAuthenticated ? '是' : '否'}</p>
          {user && <p className="font-mono text-sm">用户: {user.email}</p>}
        </div>
        
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={testConnection}
            disabled={testResult.status === 'testing'}
            className="py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
          >
            测试连接
          </button>
          
          <button
            onClick={testAuthEndpoint}
            disabled={testResult.status === 'testing'}
            className="py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
          >
            测试注册
          </button>
          
          <button
            onClick={testAuthContext}
            disabled={testResult.status === 'testing'}
            className="py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 disabled:bg-gray-400"
          >
            测试AuthContext
          </button>
        </div>
      </div>
      
      {testResult.status !== 'idle' && (
        <div className={`p-3 rounded-md flex items-start gap-2 ${
          testResult.status === 'testing' ? 'bg-blue-50 text-blue-700' :
          testResult.status === 'success' ? 'bg-green-50 text-green-700' :
          'bg-red-50 text-red-700'
        }`}>
          {testResult.status === 'testing' && <Loader2 className="w-5 h-5 mt-0.5 flex-shrink-0 animate-spin" />}
          {testResult.status === 'success' && <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />}
          {testResult.status === 'error' && <X className="w-5 h-5 mt-0.5 flex-shrink-0" />}
          <span className="text-sm">{testResult.message}</span>
        </div>
      )}
    </div>
  );
};