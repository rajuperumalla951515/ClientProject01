from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import User
from backend.app.schemas import UserCreate, UserLogin, UserOut, UserUpdate, Token
from backend.app.security import (
    verify_password, get_password_hash, create_access_token,
    check_login_rate_limit, record_failed_login, clear_failed_login
)
from backend.app.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    clean_email = user_in.email.lower().strip()

    existing = db.query(User).filter(User.email == clean_email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in."
        )
    
    user = User(
        name=user_in.name.strip(),
        email=clean_email,
        hashed_password=get_password_hash(user_in.password),
        phone=user_in.phone.strip() if user_in.phone else None,
        role="customer",
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return Token(access_token=token, token_type="bearer", user=user)


@router.post("/login", response_model=Token)
def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
    clean_email = login_data.email.lower().strip()
    client_ip = request.client.host if request.client else "unknown"
    rate_key = f"{client_ip}:{clean_email}"

    # Rate Limit Check
    allowed, remaining_sec = check_login_rate_limit(rate_key, max_attempts=5, window_seconds=900)
    if not allowed:
        minutes = max(1, remaining_sec // 60)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed login attempts. Please wait {minutes} minute(s) before trying again."
        )

    user = db.query(User).filter(User.email == clean_email).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        record_failed_login(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials and try again."
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled. Please contact Sri Adithya Organics customer support."
        )

    # Success: clear failed rate limiting
    clear_failed_login(rate_key)

    token = create_access_token(subject=user.id)
    return Token(access_token=token, token_type="bearer", user=user)


@router.get("/me", response_model=UserOut)
def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/profile", response_model=UserOut)
def update_profile(
    update_data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if update_data.name is not None and update_data.name.strip():
        current_user.name = update_data.name.strip()
    if update_data.phone is not None:
        current_user.phone = update_data.phone.strip() if update_data.phone else None
    if update_data.password:
        current_user.hashed_password = get_password_hash(update_data.password)

    db.commit()
    db.refresh(current_user)
    return current_user
