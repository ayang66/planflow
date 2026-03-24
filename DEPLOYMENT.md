# PlanFlow 海外部署 & 上架教程

> 目标：零成本试水，面向海外用户，上架 iOS App Store

---

## 目录

1. [架构概览](#1-架构概览)
2. [准备工作](#2-准备工作)
3. [后端部署（Render + Supabase + Upstash）](#3-后端部署)
4. [前端部署（Vercel）](#4-前端部署)
5. [iOS App Store 上架](#5-ios-app-store-上架)
6. [隐私政策](#6-隐私政策)
7. [常见问题](#7-常见问题)

---

## 1. 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户访问                                  │
├─────────────────────────────────────────────────────────────────┤
│  iOS App (App Store)  │  Android App  │  Web (Vercel)          │
└────────────┬──────────┴───────┬────────┴──────────┬───────────┘
             │                  │                     │
             └──────────────────┼─────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    后端 API (Render)                            │
│                    planflow-api.onrender.com                   │
├─────────────────────────────────────────────────────────────────┤
│  FastAPI + Python 3.11                                         │
└────────┬───────────────────┬────────────────────┬──────────────┘
         │                   │                    │
         ▼                   ▼                    ▼
┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐
│ PostgreSQL  │    │     Redis       │    │   AI APIs        │
│ (Supabase)  │    │   (Upstash)     │    │ Gemini/DeepSeek  │
│ 500MB 免费   │    │ 10K请求/天 免费  │    │ 各自有免费额度    │
└─────────────┘    └─────────────────┘    └──────────────────┘
```

**总成本：$0/月**

---

## 2. 准备工作

### 2.1 需要注册的账号

| 平台 | 用途 | 注册地址 |
|------|------|----------|
| Apple Developer | iOS 上架 | https://developer.apple.com ($99/年) |
| GitHub | 代码托管 + Pages | https://github.com |
| Vercel | 前端托管 | https://vercel.com |
| Render | 后端托管 | https://render.com |
| Supabase | PostgreSQL 数据库 | https://supabase.com |
| Upstash | Redis | https://upstash.com |

### 2.2 本地环境检查

```bash
# 确认 Node.js 版本
node -v  # 需要 22.17.0+

# 确认 Python 版本
python --version  # 需要 3.11

# 确认已安装 Xcode（iOS 开发）
xcodebuild -version
```

---

## 3. 后端部署

### 3.1 创建 Supabase PostgreSQL 数据库

1. 访问 https://supabase.com，注册并创建新项目
2. 进入项目 → Settings → Database
3. 找到 **Connection string** → 选择 **URI** 格式
4. 复制连接字符串，格式如下：
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

5. 在 SQL Editor 中初始化数据库：
   ```sql
   -- 复制 server/sql/init.sql 的内容执行
   ```

### 3.2 创建 Upstash Redis

1. 访问 https://upstash.com，注册并创建 Redis 数据库
2. 进入数据库详情，复制 **UPSTASH_REDIS_REST_URL** 和 **UPSTASH_REDIS_REST_TOKEN**
3. 或者使用传统 Redis URL 格式：
   ```
   redis://default:[TOKEN]@[REGION].upstash.io:6379
   ```

### 3.3 准备后端代码

修改 `server/requirements.txt`，确保包含：

```txt
fastapi
uvicorn[standard]
sqlalchemy[asyncio]
asyncpg
python-jose[cryptography]
passlib[bcrypt]
pydantic-settings
httpx
redis
email-validator
aioredis
```

创建 `server/render.yaml`（Render 自动部署配置）：

```yaml
services:
  - type: web
    name: planflow-api
    env: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
```

修改 `server/app/main.py`，添加 CORS 配置：

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://planflow.vercel.app",  # 替换为你的 Vercel 域名
        "http://localhost:5173",  # 本地开发
        "capacitor://localhost",  # iOS App
        "http://localhost",  # Android App
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3.4 部署到 Render

1. 访问 https://render.com，使用 GitHub 登录
2. 点击 **New** → **Web Service**
3. 连接你的 GitHub 仓库
4. 配置：
   - **Name**: `planflow-api`
   - **Region**: Singapore（离中国最近）
   - **Branch**: main
   - **Root Directory**: `server`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: Free

5. 添加环境变量：
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres
   SECRET_KEY=your-secret-key-at-least-32-characters-long
   DEEPSEEK_API_KEY=your-deepseek-api-key
   REDIS_URL=redis://default:[TOKEN]@[REGION].upstash.io:6379
   ```

6. 点击 **Create Web Service**

部署完成后，你的后端 API 地址为：
```
https://planflow-api.onrender.com
```

> ⚠️ **注意**：免费实例会在 15 分钟无请求后休眠，首次请求需要等待 30-60 秒唤醒。

---

## 4. 前端部署

### 4.1 更新 API 地址

修改前端代码中的 API 地址，使用环境变量：

创建 `.env.production`：

```env
VITE_API_URL=https://planflow-api.onrender.com
```

修改 `services/api.ts`（或相应文件）：

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
```

### 4.2 部署到 Vercel

1. 访问 https://vercel.com，使用 GitHub 登录
2. 点击 **Add New** → **Project**
3. 导入你的 GitHub 仓库
4. 配置：
   - **Framework Preset**: Vite
   - **Root Directory**: `./`（默认）
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. 添加环境变量：
   ```
   VITE_API_URL=https://planflow-api.onrender.com
   ```

6. 点击 **Deploy**

部署完成后，你的 Web 版地址为：
```
https://planflow.vercel.app
```

### 4.3 配置自定义域名（可选）

如果以后想用自定义域名：

1. 在 Vercel 项目设置 → Domains
2. 添加你的域名（如 `planflow.app`）
3. 按提示配置 DNS

---

## 5. iOS App Store 上架

### 5.1 准备 Apple Developer 账号

1. 访问 https://developer.apple.com
2. 注册 Apple Developer Program（$99/年）
3. 完成个人/企业信息填写

### 5.2 配置 Capacitor iOS

```bash
# 安装 iOS 平台（如果还没安装）
npm install @capacitor/ios
npx cap add ios

# 更新 capacitor.config.ts
```

`capacitor.config.ts`:

```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.planflow.app',  // 你的 Bundle ID
  appName: 'PlanFlow',
  webDir: 'dist',
  server: {
    url: 'https://planflow.vercel.app',  // 或使用本地打包
    cleartext: true,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
```

### 5.3 构建 iOS 应用

```bash
# 构建前端
npm run build

# 同步到 iOS
npx cap sync ios

# 打开 Xcode
npx cap open ios
```

### 5.4 Xcode 配置

1. 在 Xcode 中选择项目
2. 配置 **Signing & Capabilities**：
   - Team: 选择你的开发者账号
   - Bundle Identifier: `com.planflow.app`
   
3. 配置 **Info.plist**，添加：
   ```xml
   <key>NSCameraUsageDescription</key>
   <string>PlanFlow needs camera access for profile photos</string>
   <key>ITSAppUsesNonExemptEncryption</key>
   <false/>
   ```

4. 更新版本号和构建号

### 5.5 上传到 App Store Connect

1. 在 Xcode 中：**Product** → **Archive**
2. Archive 完成后，点击 **Distribute App**
3. 选择 **App Store Connect**
4. 上传完成后，登录 [App Store Connect](https://appstoreconnect.apple.com)

### 5.6 App Store Connect 配置

1. **创建新 App**：
   - App Name: PlanFlow - AI Goal Planner
   - Primary Language: Simplified Chinese
   - Bundle ID: com.planflow.app
   - SKU: planflow-2024

2. **填写 App 信息**：
   - 名称：PlanFlow - AI Goal Planner
   - 副标题：AI驱动的智能目标规划助手
   - 描述：（见下方模板）
   - 关键词：目标管理,任务规划,AI助手,效率工具,GTD
   - 技术支持 URL：你的隐私政策页面
   - 营销 URL：https://planflow.vercel.app（可选）

3. **上传截图**：
   - 6.7" (iPhone 14 Pro Max): 1290 x 2796
   - 6.5" (iPhone 11 Pro Max): 1242 x 2688
   - 5.5" (iPhone 8 Plus): 1242 x 2208
   
   > 使用模拟器截图或设计工具制作

4. **选择构建版本**：选择刚才上传的 Archive

5. **提交审核**

### 5.7 App 描述模板（英文）

**Name**: PlanFlow - AI Goal Planner

**Subtitle**: Smart AI-powered goal planning assistant

**Description**:

Transform your goals into actionable plans with AI.

PlanFlow uses advanced AI to help you:
• Break down complex goals into manageable tasks
• Get intelligent suggestions for your plans
• Track progress with beautiful calendar integration
• Stay motivated with smart reminders

Key Features:
✓ AI-Powered Goal Decomposition - Our smart AI analyzes your goals and creates step-by-step action plans
✓ Calendar Sync - Export your tasks to any calendar app
✓ Multi-Language Support - Available in Chinese, English, Japanese, and Korean
✓ Secure Cloud Sync - Your data is always backed up and synced
✓ Beautiful Dark Mode - Easy on your eyes, day or night

Whether you're planning a project, learning a new skill, or achieving personal goals, PlanFlow is your intelligent companion for success.

Privacy Policy: https://planflow.vercel.app/privacy

---

## 6. 隐私政策

### 6.1 创建隐私政策页面

在项目中创建 `public/privacy.html`：

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - PlanFlow</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; line-height: 1.6; }
        h1 { color: #333; }
        h2 { color: #666; margin-top: 30px; }
        p { color: #555; }
        .last-updated { color: #888; font-size: 14px; }
    </style>
</head>
<body>
    <h1>Privacy Policy for PlanFlow</h1>
    <p class="last-updated">Last updated: March 24, 2026</p>
    
    <h2>1. Information We Collect</h2>
    <p>PlanFlow collects the following information:</p>
    <ul>
        <li><strong>Account Information:</strong> Email address, phone number (optional)</li>
        <li><strong>Goal and Task Data:</strong> Your goals, tasks, and progress</li>
        <li><strong>Usage Data:</strong> How you interact with the app</li>
    </ul>
    
    <h2>2. How We Use Your Information</h2>
    <p>We use your information to:</p>
    <ul>
        <li>Provide AI-powered goal planning services</li>
        <li>Sync your data across devices</li>
        <li>Improve our services</li>
    </ul>
    
    <h2>3. Third-Party Services</h2>
    <p>PlanFlow uses the following third-party services:</p>
    <ul>
        <li><strong>Google Gemini AI:</strong> For intelligent goal analysis</li>
        <li><strong>DeepSeek AI:</strong> For task decomposition</li>
    </ul>
    <p>These services may process your goal descriptions to provide AI features. Please review their privacy policies:</p>
    <ul>
        <li><a href="https://ai.google.dev/privacy">Google AI Privacy Policy</a></li>
        <li><a href="https://www.deepseek.com/privacy">DeepSeek Privacy Policy</a></li>
    </ul>
    
    <h2>4. Data Security</h2>
    <p>We implement industry-standard security measures to protect your data, including encryption in transit and at rest.</p>
    
    <h2>5. Data Retention</h2>
    <p>Your data is retained as long as your account is active. You can delete your account at any time, which will permanently remove all your data.</p>
    
    <h2>6. Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
        <li>Access your personal data</li>
        <li>Correct inaccurate data</li>
        <li>Delete your data</li>
        <li>Export your data</li>
    </ul>
    
    <h2>7. Children's Privacy</h2>
    <p>PlanFlow is not intended for children under 13. We do not knowingly collect data from children.</p>
    
    <h2>8. Contact Us</h2>
    <p>If you have questions about this privacy policy, please contact us at:</p>
    <p>Email: support@planflow.app</p>
    
    <h2>9. Changes to This Policy</h2>
    <p>We may update this policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
</body>
</html>
```

### 6.2 添加路由（如果使用 React Router）

在 `App.tsx` 或路由配置中添加：

```tsx
// 静态页面，可以直接放在 public 文件夹
// 访问地址：https://planflow.vercel.app/privacy.html
```

或者创建一个 React 组件：

```tsx
// pages/Privacy.tsx
export function Privacy() {
  return (
    <div className="privacy-page">
      {/* 隐私政策内容 */}
    </div>
  );
}
```

---

## 7. 常见问题

### Q: 免费的 Render 实例会休眠怎么办？

A: 几个解决方案：
1. 使用外部服务定时 ping（如 UptimeRobot）
2. 升级到付费实例（$7/月）
3. 迁移到 Fly.io 或 Railway

### Q: iOS 审核被拒怎么办？

A: 常见原因：
1. **缺少隐私政策** → 添加隐私政策链接
2. **登录功能问题** → 提供测试账号
3. **元数据问题** → 确保截图和描述准确
4. **崩溃问题** → 修复后重新提交

### Q: 如何提供测试账号给 Apple 审核？

A: 在 App Store Connect → App Review Information：
- 添加一个测试用的邮箱/密码
- 确保账号可以正常登录和使用

### Q: 如何更新 App？

A: 
1. 修改代码
2. 更新版本号（Xcode）
3. 重新 Archive 并上传
4. 在 App Store Connect 选择新版本提交审核

### Q: 审核需要多久？

A: 通常 1-3 天，首次提交可能稍长

---

## 8. 部署检查清单

### 后端
- [ ] Supabase 数据库已创建
- [ ] Upstash Redis 已创建
- [ ] Render 服务已部署
- [ ] 环境变量已配置
- [ ] API 可以正常访问

### 前端
- [ ] API 地址已更新
- [ ] Vercel 已部署
- [ ] Web 版可以正常使用
- [ ] 隐私政策页面可访问

### iOS App
- [ ] Apple Developer 账号已注册
- [ ] Bundle ID 已配置
- [ ] 签名配置完成
- [ ] Info.plist 已配置
- [ ] 截图已准备
- [ ] App 信息已填写
- [ ] 隐私政策链接已添加
- [ ] 已提交审核

---

## 9. 费用总结

| 服务 | 费用 |
|------|------|
| Apple Developer | $99/年 |
| Supabase | 免费（500MB） |
| Upstash Redis | 免费（10K请求/天） |
| Render | 免费（休眠模式） |
| Vercel | 免费（100GB流量/月） |
| DeepSeek API | 按量付费（新用户有额度） |
| Gemini API | 按量付费（有免费额度） |
| **总计** | **$99/年 + AI API 按量** |

---

## 10. 相关链接

- [Apple App Store 审核指南](https://developer.apple.com/app-store/review/guidelines/)
- [Capacitor iOS 文档](https://capacitorjs.com/docs/ios)
- [Render 部署文档](https://render.com/docs)
- [Supabase 文档](https://supabase.com/docs)
- [Upstash Redis 文档](https://docs.upstash.com/redis)

---

**祝 PlanFlow 上架顺利！** 🚀