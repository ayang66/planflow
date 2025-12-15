# PlanFlow AI Backend (FastAPI)

## 快速开始

### 1. 创建虚拟环境
```bash
cd server
python -m venv venv

# Windows
venv\Scripts\activate

# macOS/Linux
source venv/bin/activate
```

### 2. 安装依赖
```bash
pip install -r requirements.txt
```

### 3. 配置环境变量
```bash
# 复制示例配置
copy .env.example .env

# 编辑 .env 文件，填入你的 API Key
```

### 4. 启动服务
```bash
python run.py
```

服务将在 http://localhost:8000 启动

### 5. API 文档
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API 端点

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `POST /api/auth/refresh` - 刷新 Token
- `GET /api/auth/me` - 获取当前用户

### 计划管理
- `GET /api/plans` - 获取所有计划
- `POST /api/plans` - 创建计划
- `GET /api/plans/{id}` - 获取单个计划
- `DELETE /api/plans/{id}` - 删除计划
- `PATCH /api/plans/{id}/tasks/{task_id}` - 更新任务

### AI 功能
- `POST /api/ai/check-clarity` - 检查目标清晰度
- `POST /api/ai/decompose` - 分解目标为任务
- `POST /api/ai/modify` - AI 修改计划

## 项目结构
```
server/
├── app/
│   ├── __init__.py
│   ├── main.py          # FastAPI 应用入口
│   ├── config.py        # 配置管理
│   ├── database.py      # 数据库连接
│   ├── models/          # SQLAlchemy 模型
│   ├── schemas/         # Pydantic 模式
│   ├── routers/         # API 路由
│   └── services/        # 业务逻辑
├── requirements.txt
├── run.py
└── .env
```
