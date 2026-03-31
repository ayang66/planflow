from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./planflow.db"
    secret_key: str = "change-this-secret-key"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    gemini_api_key: str = ""
    deepseek_api_key: str = ""
    aliyun_api_key: str = "sk-sp-bdc1a264ee4c46b3939ad71f49abde4b"
    
    # Redis 配置 - 支持 URL 或分离参数
    redis_url: str = ""  # 例如: redis://red-xxx:6379 或 redis://default:password@host:6379
    redis_host: str = "localhost"
    redis_port: int = 6379
    redis_db: int = 0
    redis_password: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
