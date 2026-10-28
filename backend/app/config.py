import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sri Adithya Organics API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Database (PostgreSQL compatible, fallback to local sqlite for development)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sri_adithya.db")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "sri_adithya_super_secure_organic_secret_key_2026_xyz789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # E-Commerce Defaults
    DEFAULT_MIN_ORDER_AMOUNT: float = 99.0
    DEFAULT_FREE_DELIVERY_THRESHOLD: float = 499.0
    DEFAULT_STANDARD_DELIVERY_FEE: float = 39.0
    DEFAULT_EXPRESS_DELIVERY_FEE: float = 59.0
    
    class Config:
        case_sensitive = True

settings = Settings()


