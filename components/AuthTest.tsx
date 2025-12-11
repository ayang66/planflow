import React, { useState } from 'react';
import { API_BASE_URL } from '../services/config';
import { CheckCircle2, Loader2, X } from './Icons';

export const AuthTest: React.FC = () => {
  const [testResult, setTestResult] = useState<{
    status: 'idle' | 'testing' | 'success' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });
  
  const [testEmail, setTestEmail] = useState('test@example.com');
  const [testPassword, setTestPassword] = useState('testpassword123');

  const testRegister = async () => {
    setTestResult({ status: 'testing', message: '正在测试注册...' });
    
    try {
      const requestBody = {
        email: testEmail,
        password: testPassword
      };
      
      console.log(`测试注册到: ${API_BASE_URL}/auth/register`);
      console.log('请求方法: POST');
      console.log('请求头:', {
        'Content-Type': 'application/json',
      });
      console.log('请求体:', JSON.stringify(requestBody));
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
      
      console.log(`注册响应状态: ${response.status}`);
      
      let data;
      try {
        const text = await response.text();
        console.log(`注册响应原始文本:`, text);
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { rawResponse: text };
        }
        console.log(`注册响应解析后数据:`, data);
      } catch (e) {
        console.error('解析响应失败:', e);
        data = { error: '无法解析响应' };
      }
      
      if (response.ok) {
        setTestResult({
          status: 'success',
          message: `注册成功！\n状态码: ${response.status}\n响应: ${JSON.stringify(data, null, 2)}`
        });
      } else {
        setTestResult({
          status: 'error',
          message: `注册失败！\n状态码: ${response.status}\n状态文本: ${response.statusText}\n响应头: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}\n错误: ${JSON.stringify(data, null, 2)}`
        });
      }
    } catch (error) {
      console.error('注册测试错误:', error);
      setTestResult({
        status: 'error',
        message: `注册测试错误: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }
  };

  const testLogin = async () => {
    setTestResult({ status: 'testing', message: '正在测试登录...' });
    
    try {
      console.log(`测试登录到: ${API_BASE_URL}/auth/login`);
      
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword
        }),
      });
      
      console.log(`登录响应状态: ${response.status}`);
      
      let data;
      try {
        const text = await response.text();
        console.log(`登录响应原始文本:`, text);
        try {
          data = JSON.parse(text);
        } catch (e) {
          data = { rawResponse: text };
        }
        console.log(`登录响应解析后数据:`, data);
      } catch (e) {
        console.error('解析响应失败:', e);
        data = { error: '无法解析响应' };
      }
      
      if (response.ok) {
        setTestResult({
          status: 'success',
          message: `登录成功！\n状态码: ${response.status}\n响应: ${JSON.stringify(data, null, 2)}`
        });
      } else {
        setTestResult({
          status: 'error',
          message: `登录失败！\n状态码: ${response.status}\n状态文本: ${response.statusText}\n响应头: ${JSON.stringify(Object.fromEntries(response.headers.entries()), null, 2)}\n错误: ${JSON.stringify(data, null, 2)}`
        });
      }
    } catch (error) {
      console.error('登录测试错误:', error);
      setTestResult({
        status: 'error',
        message: `登录测试错误: ${error instanceof Error ? error.message : '未知错误'}`
      });
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">认证测试工具</h2>
      
      <div className="space-y-4 mb-6">
        <div className="bg-gray-50 p-3 rounded-md">
          <p className="text-sm text-gray-600">API基础URL:</p>
          <p className="font-mono text-sm">{API_BASE_URL}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            测试邮箱
          </label>
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            测试密码
          </label>
          <input
            type="password"
            value={testPassword}
            onChange={(e) => setTestPassword(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={testRegister}
            disabled={testResult.status === 'testing'}
            className="flex-1 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-400"
          >
            测试注册
          </button>
          
          <button
            onClick={testLogin}
            disabled={testResult.status === 'testing'}
            className="flex-1 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400"
          >
            测试登录
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
          <pre className="text-sm whitespace-pre-wrap">{testResult.message}</pre>
        </div>
      )}
      
      <div className="mt-4 text-xs text-gray-500">
        <p>打开浏览器开发者工具的Console查看更多调试信息</p>
      </div>
    </div>
  );
};