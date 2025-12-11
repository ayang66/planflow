# Requirements Document

## Introduction

本文档定义了 PlanFlow AI 应用添加后端功能的技术路线规划。当前应用是一个纯前端应用（React + Capacitor），数据存储在本地 localStorage，API 密钥暴露在前端代码中。本规划旨在为应用添加后端支持，实现数据持久化、用户认证、API 安全等功能。

## Glossary

- **PlanFlow AI**: 基于 AI 的任务规划移动应用
- **Backend Service**: 后端服务，处理 API 请求、数据存储、用户认证
- **API Proxy**: API 代理层，保护第三方 API 密钥不暴露给客户端
- **User Authentication**: 用户认证系统，支持注册、登录、会话管理
- **Data Sync**: 数据同步机制，实现多设备间的计划数据同步
- **DeepSeek/Gemini API**: 第三方 AI 服务，用于生成任务计划

## Requirements

### Requirement 1: API 安全代理

**User Story:** 作为开发者，我希望将 AI API 调用移到后端，以便保护 API 密钥不被泄露。

#### Acceptance Criteria

1. WHEN 前端发起 AI 请求 THEN Backend Service SHALL 代理请求到 DeepSeek/Gemini API 并返回结果
2. WHEN API 密钥配置在后端 THEN Backend Service SHALL 从环境变量读取密钥而非硬编码
3. IF 第三方 API 返回错误 THEN Backend Service SHALL 返回标准化的错误响应给前端
4. WHEN 请求到达后端 THEN Backend Service SHALL 验证请求来源的合法性

### Requirement 2: 用户认证系统

**User Story:** 作为用户，我希望能够注册和登录账户，以便在不同设备上访问我的计划。

#### Acceptance Criteria

1. WHEN 用户提交注册信息 THEN Backend Service SHALL 创建新用户账户并返回认证令牌
2. WHEN 用户提交登录凭证 THEN Backend Service SHALL 验证凭证并返回认证令牌
3. WHEN 用户携带有效令牌请求 THEN Backend Service SHALL 允许访问受保护资源
4. IF 认证令牌过期或无效 THEN Backend Service SHALL 返回 401 状态码
5. WHEN 用户请求登出 THEN Backend Service SHALL 使当前令牌失效

### Requirement 3: 数据持久化

**User Story:** 作为用户，我希望我的计划数据保存在云端，以便不会因为清除应用数据而丢失。

#### Acceptance Criteria

1. WHEN 用户创建新计划 THEN Backend Service SHALL 将计划数据存储到数据库
2. WHEN 用户更新任务状态 THEN Backend Service SHALL 同步更新数据库中的记录
3. WHEN 用户删除计划 THEN Backend Service SHALL 从数据库中移除对应记录
4. WHEN 用户登录 THEN Backend Service SHALL 返回该用户的所有计划数据

### Requirement 4: 多设备数据同步

**User Story:** 作为用户，我希望在手机和其他设备上看到相同的计划数据。

#### Acceptance Criteria

1. WHEN 用户在设备 A 创建计划 THEN 设备 B 登录后 SHALL 能获取到该计划
2. WHEN 用户在设备 A 完成任务 THEN 设备 B SHALL 能看到更新后的状态
3. WHEN 数据发生冲突 THEN Backend Service SHALL 采用最后更新时间戳策略解决冲突

### Requirement 5: 离线支持与本地缓存

**User Story:** 作为用户，我希望在没有网络时仍能使用应用，网络恢复后自动同步。

#### Acceptance Criteria

1. WHILE 设备处于离线状态 THEN 应用 SHALL 使用本地缓存数据正常运行
2. WHEN 设备从离线恢复到在线 THEN 应用 SHALL 自动同步本地变更到服务器
3. WHEN 本地有未同步的变更 THEN 应用 SHALL 显示同步状态指示器
