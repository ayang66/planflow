# Requirements Document

## Introduction

本文档定义了 PlanFlow AI 应用的用户认证功能。该功能允许用户注册账户、登录、登出，并通过 JWT 令牌保护 API 访问。后端使用 Node.js + Express，数据库使用 SQLite（开发阶段）或 PostgreSQL（生产环境）。

## Glossary

- **User**: 应用的注册用户，拥有唯一的邮箱和密码
- **JWT (JSON Web Token)**: 用于用户认证的令牌，包含用户身份信息
- **Access Token**: 短期有效的 JWT，用于 API 请求认证
- **Refresh Token**: 长期有效的令牌，用于获取新的 Access Token
- **Password Hash**: 使用 bcrypt 算法加密后的密码
- **Authentication Service**: 处理用户注册、登录、令牌管理的后端服务

## Requirements

### Requirement 1: 用户注册

**User Story:** 作为新用户，我希望能够使用邮箱和密码注册账户，以便开始使用应用的云端功能。

#### Acceptance Criteria

1. WHEN 用户提交有效的邮箱和密码 THEN Authentication Service SHALL 创建新用户记录并返回 Access Token
2. IF 用户提交的邮箱已被注册 THEN Authentication Service SHALL 返回 409 状态码和错误信息
3. IF 用户提交的密码少于 8 个字符 THEN Authentication Service SHALL 返回 400 状态码和验证错误
4. IF 用户提交的邮箱格式无效 THEN Authentication Service SHALL 返回 400 状态码和验证错误
5. WHEN 存储用户密码 THEN Authentication Service SHALL 使用 bcrypt 算法进行哈希处理

### Requirement 2: 用户登录

**User Story:** 作为已注册用户，我希望能够使用邮箱和密码登录，以便访问我的计划数据。

#### Acceptance Criteria

1. WHEN 用户提交正确的邮箱和密码 THEN Authentication Service SHALL 返回 Access Token 和 Refresh Token
2. IF 用户提交的邮箱不存在 THEN Authentication Service SHALL 返回 401 状态码和通用错误信息
3. IF 用户提交的密码不正确 THEN Authentication Service SHALL 返回 401 状态码和通用错误信息
4. WHEN 登录成功 THEN Authentication Service SHALL 更新用户的最后登录时间

### Requirement 3: 令牌管理

**User Story:** 作为用户，我希望我的登录状态能够安全地保持，不需要频繁重新登录。

#### Acceptance Criteria

1. WHEN Access Token 过期 THEN 前端 SHALL 使用 Refresh Token 获取新的 Access Token
2. IF Refresh Token 有效 THEN Authentication Service SHALL 返回新的 Access Token
3. IF Refresh Token 过期或无效 THEN Authentication Service SHALL 返回 401 状态码，要求重新登录
4. WHEN 用户登出 THEN Authentication Service SHALL 使 Refresh Token 失效

### Requirement 4: 受保护路由

**User Story:** 作为用户，我希望我的数据只有我自己能访问，其他人无法查看。

#### Acceptance Criteria

1. WHEN 请求携带有效 Access Token THEN Authentication Service SHALL 允许访问受保护资源
2. IF 请求未携带 Access Token THEN Authentication Service SHALL 返回 401 状态码
3. IF Access Token 签名无效 THEN Authentication Service SHALL 返回 401 状态码
4. WHEN 验证 Token 成功 THEN Authentication Service SHALL 将用户信息附加到请求上下文

### Requirement 5: 密码安全

**User Story:** 作为用户，我希望我的密码被安全存储，即使数据库泄露也不会暴露原始密码。

#### Acceptance Criteria

1. WHEN 存储密码 THEN Authentication Service SHALL 使用 bcrypt 算法和至少 10 轮盐值进行哈希
2. WHEN 验证密码 THEN Authentication Service SHALL 使用 bcrypt compare 函数进行比对
3. THE Authentication Service SHALL 永不以明文形式存储或传输密码
