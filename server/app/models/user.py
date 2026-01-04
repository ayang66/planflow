from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)  # 改为可空
    phone = Column(String(20), unique=True, index=True, nullable=True)  # 新增手机号
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)

    plans = relationship("Plan", back_populates="user", cascade="all, delete-orphan")
    token_usages = relationship("TokenUsage", back_populates="user", cascade="all, delete-orphan")
