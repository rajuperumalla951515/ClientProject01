import datetime
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, status
from backend.app.config import settings
from backend.app.d1 import D1Database, get_d1
from backend.app.schemas import UserCreate, UserLogin, UserOut, UserUpdate, Token
from backend.app.security import (
    verify_password, get_password_hash, create_access_token,
    check_login_rate_limit, record_failed_login, clear_failed_login
)
from backend.app.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, d1: D1Database = Depends(get_d1)):
    clean_email = user_in.email.lower().strip()

    existing = await d1.fetch_one("SELECT id FROM users WHERE email = ?", clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists. Please log in."
        )
    
    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    hashed = get_password_hash(user_in.password)
    sql = """
        INSERT INTO users (name, email, hashed_password, phone, role, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'customer', 1, ?, ?)
    """
    user_id = await d1.execute_insert(
        sql,
        user_in.name.strip(),
        clean_email,
        hashed,
        user_in.phone.strip() if user_in.phone else None,
        now,
        now
    )

    user = await d1.fetch_one("SELECT * FROM users WHERE id = ?", user_id)
    token = create_access_token(subject=user["id"])
    return Token(access_token=token, token_type="bearer", user=UserOut(**user))


@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, request: Request, d1: D1Database = Depends(get_d1)):
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

    user = await d1.fetch_one("SELECT * FROM users WHERE email = ?", clean_email)
    if not user or not verify_password(login_data.password, user.get("hashed_password", "")):
        record_failed_login(rate_key)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password. Please verify your credentials and try again."
        )
    
    if not user.get("is_active"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled. Please contact Sri Adithya Organics customer support."
        )

    # Success: clear failed rate limiting
    clear_failed_login(rate_key)

    token = create_access_token(subject=user["id"])
    return Token(access_token=token, token_type="bearer", user=UserOut(**user))


@router.get("/me", response_model=UserOut)
async def get_profile(current_user: Dict[str, Any] = Depends(get_current_user)):
    return UserOut(**current_user)


@router.put("/profile", response_model=UserOut)
async def update_profile(
    update_data: UserUpdate,
    d1: D1Database = Depends(get_d1),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    user_id = current_user["id"]
    name = update_data.name.strip() if (update_data.name is not None and update_data.name.strip()) else current_user["name"]
    phone = update_data.phone.strip() if (update_data.phone is not None) else current_user.get("phone")
    hashed = get_password_hash(update_data.password) if update_data.password else current_user["hashed_password"]
    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

    await d1.execute(
        "UPDATE users SET name = ?, phone = ?, hashed_password = ?, updated_at = ? WHERE id = ?",
        name, phone, hashed, now, user_id
    )
    user = await d1.fetch_one("SELECT * FROM users WHERE id = ?", user_id)
    return UserOut(**user)
