# PlanFlow AI

AI 驱动的智能目标规划应用，帮助你将目标分解为可执行的任务。

## 技术栈

**前端**
- React 19.2.0 + TypeScript 5.8.2
- Vite 6.2.0
- Tailwind CSS
- Capacitor 7.4.4 (Android)
- Lucide React 0.555.0 (图标库)

**后端**
- FastAPI (Python 3.11)
- PostgreSQL 14+
- Redis

**AI**
- Google Gemini API (@google/genai 1.30.0)
- DeepSeek API

## 依赖版本

### 前端依赖 (package.json)

| 包名 | 版本 | 说明 |
|------|------|------|
| react | ^19.2.0 | React 框架 |
| react-dom | ^19.2.0 | React DOM |
| @capacitor/core | ^7.4.4 | Capacitor 核心 |
| @capacitor/android | ^7.4.4 | Capacitor Android 平台 |
| @capacitor/cli | ^7.4.4 | Capacitor CLI |
| @capacitor/filesystem | ^7.0.0 | 文件系统插件 |
| @capacitor/share | ^7.0.0 | 分享插件 |
| @google/genai | ^1.30.0 | Google Gemini AI SDK |
| lucide-react | ^0.555.0 | 图标库 |

### 开发依赖

| 包名 | 版本 | 说明 |
|------|------|------|
| vite | ^6.2.0 | 构建工具 |
| typescript | ~5.8.2 | TypeScript |
| @vitejs/plugin-react | ^5.0.0 | Vite React 插件 |
| @types/node | ^22.14.0 | Node.js 类型定义 |

### 后端依赖 (Python)

| 包名 | 说明 |
|------|------|
| fastapi | Web 框架 |
| uvicorn | ASGI 服务器 |
| sqlalchemy | ORM |
| asyncpg | PostgreSQL 异步驱动 |
| python-jose | JWT 处理 |
| passlib | 密码哈希 |
| bcrypt | 加密 |
| pydantic-settings | 配置管理 |
| httpx | HTTP 客户端 |
| redis | Redis 客户端 |
| email-validator | 邮箱验证 |

## 环境要求

- Node.js 22.17.0+
- Python 3.11
- PostgreSQL 14+
- Redis (Docker)
- Android Studio (用于 Android 开发)

## 快速开始

### 1. 克隆项目

```bash
git clone <repo-url>
cd planflow
```

### 2. 安装前端依赖

```bash
npm install
```

### 3. 配置后端环境

```bash
# 创建 conda 环境
conda create -n planflow python=3.11
conda activate planflow

# 安装依赖
cd server
pip install fastapi uvicorn sqlalchemy asyncpg python-jose passlib bcrypt pydantic-settings httpx redis
pip install email-validator
```

### 4. 配置数据库

在 PostgreSQL 中创建数据库：

```sql
CREATE DATABASE planflow;
```

运行初始化脚本：

```bash
psql -U postgres -d planflow -f server/sql/init.sql
```

### 5. 配置环境变量

复制 `server/.env.example` 为 `server/.env`，填入配置：

```env
DATABASE_URL=postgresql+asyncpg://postgres:123456@localhost:5432/planflow
SECRET_KEY=your-secret-key-here
DEEPSEEK_API_KEY=your-deepseek-api-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=
```

### 6. 启动 Redis

```bash
# Docker 方式
docker run -d -p 6379:6379 redis
```

### 7. 启动后端

```bash
cd server
python run.py
```

后端运行在 http://localhost:8000

### 8. 启动前端开发服务器

```bash
npm run dev
```

前端运行在 http://localhost:5173

## Android 打包

### 1. 构建前端

```bash
npm run build
```

### 2. 同步到 Android

```bash
npx cap sync android
```

### 3. 在 Android Studio 中运行

```bash
npx cap open android
```

或直接在 Android Studio 中打开 `android` 目录。

## 项目结构

```
planflow/
├── android/              # Android 原生代码
├── components/           # React 组件
├── contexts/             # React Context
├── services/             # 前端服务层
├── utils/                # 工具函数
├── server/               # FastAPI 后端
│   ├── app/
│   │   ├── models/       # 数据库模型
│   │   ├── routers/      # API 路由
│   │   ├── schemas/      # Pydantic 模型
│   │   └── services/     # 业务逻辑
│   └── sql/              # SQL 脚本
├── App.tsx               # 主应用组件
├── index.tsx             # 入口文件
└── types.ts              # TypeScript 类型定义
```

## API 端点

### 认证
- `POST /api/auth/register` - 注册（支持邮箱/手机号）
- `POST /api/auth/login` - 登录
- `POST /api/auth/refresh` - 刷新 Token
- `GET /api/auth/me` - 获取当前用户

### 计划
- `GET /api/plans` - 获取所有计划
- `POST /api/plans` - 创建计划
- `DELETE /api/plans/{id}` - 删除计划
- `PATCH /api/plans/{id}/tasks/{task_id}` - 更新任务
- `POST /api/plans/{id}/tasks` - 添加任务
- `DELETE /api/plans/{id}/tasks/{task_id}` - 删除任务

### AI
- `POST /api/ai/check-clarity` - 检查目标清晰度
- `POST /api/ai/decompose` - 分解目标为任务
- `POST /api/ai/modify` - AI 修改计划
- `GET /api/ai/token-stats` - 获取 Token 使用统计

## 功能特性

- 🎯 AI 智能目标分解
- 📅 日历同步（ICS 导出）
- 🔐 邮箱/手机号登录
- 🌍 多语言支持（中/英/日/韩）
- 🎨 主题自定义
- 📊 Token 使用统计
- 🔄 数据云端同步

## License

MIT
