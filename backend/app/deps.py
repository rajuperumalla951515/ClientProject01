from typing import Generator, Optional, Any
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.database import get_db, check_db_connection
from backend.app.models import User
from backend.app.security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token", auto_error=False)

class SheetsUser:
    """Lightweight user representation when operating on Google Sheets storage."""
    def __init__(self, data: dict):
        self.id = data.get("id") or data.get("customer_id")
        self.name = data.get("name", "")
        self.email = data.get("email", "")
        self.phone = data.get("phone", "")
        self.role = data.get("role", "customer")
        self.is_active = data.get("is_active", True)
        self.hashed_password = data.get("password_hash") or data.get("hashed_password", "")

def get_current_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> Any:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id_str = decode_access_token(token)
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        user_id = int(user_id_str)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload.")

    # Google Sheets Storage Mode
    if settings.STORAGE_BACKEND == "sheets" or not check_db_connection()[0]:
        from backend.app.sheets.service import sheets_service
        cust = sheets_service.get_customer_by_id(user_id)
        if not cust or not cust.get("is_active", True):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")
        return SheetsUser(cust)
        
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found or inactive.")
    
    return user


def get_optional_user(
    db: Session = Depends(get_db),
    token: Optional[str] = Depends(oauth2_scheme)
) -> Optional[Any]:
    if not token:
        return None
    try:
        user_id_str = decode_access_token(token)
        if not user_id_str:
            return None
        user_id = int(user_id_str)

        if settings.STORAGE_BACKEND == "sheets" or not check_db_connection()[0]:
            from backend.app.sheets.service import sheets_service
            cust = sheets_service.get_customer_by_id(user_id)
            if not cust or not cust.get("is_active", True):
                return None
            return SheetsUser(cust)

        return db.query(User).filter(User.id == user_id, User.is_active == True).first()
    except Exception:
        return None


def get_current_admin(
    current_user: Any = Depends(get_current_user)
) -> Any:
    if getattr(current_user, "role", "customer") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required for this operation."
        )
    return current_user

