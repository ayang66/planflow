from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class TokenUsage(Base):
    __tablename__ = "token_usages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # 调用信息
    endpoint = Column(String(100), nullable=False)  # 调用的接口，如 /api/ai/decompose
    model = Column(String(50), nullable=False)  # 使用的模型，如 deepseek-chat
    
    # Token 统计
    prompt_tokens = Column(Integer, default=0)  # 输入 token 数
    completion_tokens = Column(Integer, default=0)  # 输出 token 数
    total_tokens = Column(Integer, default=0)  # 总 token 数
    
    # 请求内容摘要（可选）
    request_summary = Column(String(200), nullable=True)  # 请求摘要，如目标名称
    
    # 时间
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="token_usages")
