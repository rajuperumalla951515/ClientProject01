import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Sri Adithya Organics API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    
    # Environment Detection
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", os.getenv("NODE_ENV", "development")).lower()
    
    @property
    def IS_RENDER(self) -> bool:
        return os.getenv("RENDER", "").lower() in ("true", "1")
    
    @property
    def IS_PRODUCTION(self) -> bool:
        return self.IS_RENDER or self.ENVIRONMENT in ("production", "prod")
    
    # Database Configuration (Supabase PostgreSQL)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    STORAGE_BACKEND: str = "database"
    
    # Centralized Supabase Configuration
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "https://gahduzexqmmlahshsyre.supabase.co")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "sri_adithya_super_secure_organic_secret_key_2026_xyz789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # E-Commerce Defaults
    DEFAULT_MIN_ORDER_AMOUNT: float = 99.0
    DEFAULT_FREE_DELIVERY_THRESHOLD: float = 499.0
    DEFAULT_STANDARD_DELIVERY_FEE: float = 39.0
    DEFAULT_EXPRESS_DELIVERY_FEE: float = 59.0

    # WhatsApp Business Configuration (International format without '+' or spaces, e.g. 919515159006)
    WHATSAPP_NUMBER: str = os.getenv("WHATSAPP_NUMBER", "919515159006")
    
    class Config:
        case_sensitive = True

settings = Settings()
