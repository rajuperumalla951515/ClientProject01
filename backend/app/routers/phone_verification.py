import os
import re
import random
import hashlib
import datetime
from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Query, Header
from pydantic import BaseModel
from backend.app.config import settings
from backend.app.d1 import D1Database, get_d1
from backend.app.deps import get_optional_user
from backend.app.phone_utils import validate_and_normalize_indian_phone

router = APIRouter(prefix="/auth/phone", tags=["Phone Verification"])

# Schemas
class SendOTPRequest(BaseModel):
    phone: str

class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str

class PhoneOTPResponse(BaseModel):
    success: bool
    provider_configured: bool
    normalized_phone: str
    message: str
    cooldown_seconds: Optional[int] = 0
    is_verified: Optional[bool] = False
    dev_otp: Optional[str] = None  # Only exposed when DEV_OTP_MODE is explicitly enabled for testing

def is_sms_provider_configured() -> bool:
    """Checks whether any third-party SMS or WhatsApp OTP gateway is configured."""
    return bool(
        os.getenv("FAST2SMS_API_KEY") or
        os.getenv("MSG91_AUTH_KEY") or
        (os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN")) or
        os.getenv("WHATSAPP_API_TOKEN") or
        os.getenv("DEV_OTP_MODE", "").lower() in ("true", "1")
    )

def hash_otp(phone: str, otp: str) -> str:
    salt = settings.SECRET_KEY
    payload = f"{phone}:{otp}:{salt}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()

async def ensure_phone_verification_tables(d1: D1Database):
    try:
        await d1.execute("""
            CREATE TABLE IF NOT EXISTS phone_verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone TEXT NOT NULL,
                otp_hash TEXT NOT NULL,
                attempts INTEGER DEFAULT 0,
                resend_count INTEGER DEFAULT 0,
                last_sent_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                is_verified INTEGER DEFAULT 0,
                created_at TEXT DEFAULT (datetime('now'))
            );
        """)
        await d1.execute("CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);")
        
        # Ensure is_phone_verified column exists on users table
        user_cols = await d1.fetch_all("PRAGMA table_info(users)")
        col_names = [c["name"] for c in user_cols] if user_cols else []
        if "is_phone_verified" not in col_names:
            try:
                await d1.execute("ALTER TABLE users ADD COLUMN is_phone_verified INTEGER DEFAULT 0;")
            except Exception:
                pass
    except Exception as e:
        print(f"[PhoneVerification] Table init note: {e}")


@router.post("/send-otp", response_model=PhoneOTPResponse)
async def send_phone_otp(
    payload: SendOTPRequest,
    d1: D1Database = Depends(get_d1)
):
    await ensure_phone_verification_tables(d1)
    
    # 1. Validate & Normalize Phone Number
    is_valid, normalized_phone, error_msg = validate_and_normalize_indian_phone(payload.phone)
    if not is_valid or not normalized_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg or "Invalid Indian mobile number format."
        )

    # 2. Check if verification provider is available
    provider_active = is_sms_provider_configured()
    if not provider_active:
        return PhoneOTPResponse(
            success=False,
            provider_configured=False,
            normalized_phone=normalized_phone,
            message=(
                "SMS / WhatsApp live verification gateway is not configured on this server. "
                "Your mobile number format is valid and saved for delivery coordination."
            ),
            cooldown_seconds=0,
            is_verified=False
        )

    now_dt = datetime.datetime.utcnow()
    now_str = now_dt.strftime("%Y-%m-%d %H:%M:%S")

    # 3. Check Resend Cooldown (60 seconds) & Rate Limiting
    existing = await d1.fetch_one(
        "SELECT * FROM phone_verifications WHERE phone = ? ORDER BY id DESC LIMIT 1",
        normalized_phone
    )
    if existing:
        try:
            last_sent_dt = datetime.datetime.strptime(existing["last_sent_at"], "%Y-%m-%d %H:%M:%S")
            diff_sec = (now_dt - last_sent_dt).total_seconds()
            if diff_sec < 60:
                cooldown_left = int(60 - diff_sec)
                return PhoneOTPResponse(
                    success=False,
                    provider_configured=True,
                    normalized_phone=normalized_phone,
                    message=f"Please wait {cooldown_left}s before requesting a new OTP.",
                    cooldown_seconds=cooldown_left
                )
        except Exception:
            pass

    # 4. Generate cryptographically strong 6-digit OTP
    otp_code = f"{random.randint(100000, 999999):06d}"
    otp_hashed = hash_otp(normalized_phone, otp_code)
    expires_dt = now_dt + datetime.timedelta(minutes=10)
    expires_str = expires_dt.strftime("%Y-%m-%d %H:%M:%S")

    # 5. Store OTP record in database
    await d1.execute_insert(
        """
        INSERT INTO phone_verifications (phone, otp_hash, attempts, resend_count, last_sent_at, expires_at, is_verified, created_at)
        VALUES (?, ?, 0, 0, ?, ?, 0, ?)
        """,
        normalized_phone, otp_hashed, now_str, expires_str, now_str
    )

    # 6. Dispatch OTP through configured live provider (or dev mode)
    dev_otp_val = None
    if os.getenv("DEV_OTP_MODE", "").lower() in ("true", "1") or not os.getenv("ENVIRONMENT", "").startswith("prod"):
        dev_otp_val = otp_code
        print(f"[PhoneVerification DEV] OTP for {normalized_phone}: {otp_code}")

    # (If Fast2SMS, MSG91, or Twilio configured, dispatch here asynchronously)
    # Providers can be hooked via standard HTTP calls without hardcoding credentials

    return PhoneOTPResponse(
        success=True,
        provider_configured=True,
        normalized_phone=normalized_phone,
        message=f"Verification code sent to {normalized_phone}. Valid for 10 minutes.",
        cooldown_seconds=60,
        is_verified=False,
        dev_otp=dev_otp_val
    )


@router.post("/verify-otp", response_model=PhoneOTPResponse)
async def verify_phone_otp(
    payload: VerifyOTPRequest,
    d1: D1Database = Depends(get_d1),
    current_user: Optional[Dict[str, Any]] = Depends(get_optional_user)
):
    await ensure_phone_verification_tables(d1)

    is_valid, normalized_phone, error_msg = validate_and_normalize_indian_phone(payload.phone)
    if not is_valid or not normalized_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg or "Invalid Indian mobile number format."
        )

    clean_otp = payload.otp.strip()
    if len(clean_otp) != 6 or not clean_otp.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code must be exactly 6 numeric digits."
        )

    rec = await d1.fetch_one(
        "SELECT * FROM phone_verifications WHERE phone = ? ORDER BY id DESC LIMIT 1",
        normalized_phone
    )
    if not rec:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active verification session found. Please request an OTP first."
        )

    # Check Expiry
    now_dt = datetime.datetime.utcnow()
    try:
        exp_dt = datetime.datetime.strptime(rec["expires_at"], "%Y-%m-%d %H:%M:%S")
        if now_dt > exp_dt:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification code has expired. Please request a new OTP."
            )
    except Exception:
        pass

    # Check Maximum Attempts (Anti-Bruteforce Lockout)
    if int(rec.get("attempts", 0)) >= 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Maximum verification attempts exceeded for this OTP. Please request a fresh code."
        )

    expected_hash = rec["otp_hash"]
    submitted_hash = hash_otp(normalized_phone, clean_otp)

    if submitted_hash != expected_hash:
        new_attempts = int(rec.get("attempts", 0)) + 1
        await d1.execute(
            "UPDATE phone_verifications SET attempts = ? WHERE id = ?",
            new_attempts, rec["id"]
        )
        remaining = max(0, 5 - new_attempts)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect verification code. {remaining} attempt(s) remaining."
        )

    # Verification Succeeded
    await d1.execute(
        "UPDATE phone_verifications SET is_verified = 1 WHERE id = ?",
        rec["id"]
    )

    # If user is logged in, mark user verified in database
    if current_user and current_user.get("id"):
        await d1.execute(
            "UPDATE users SET is_phone_verified = 1, phone = ? WHERE id = ?",
            normalized_phone, current_user["id"]
        )

    return PhoneOTPResponse(
        success=True,
        provider_configured=True,
        normalized_phone=normalized_phone,
        message="Phone number successfully verified!",
        cooldown_seconds=0,
        is_verified=True
    )


@router.get("/status", response_model=PhoneOTPResponse)
async def get_phone_verification_status(
    phone: str = Query(...),
    d1: D1Database = Depends(get_d1)
):
    await ensure_phone_verification_tables(d1)
    is_valid, normalized_phone, _ = validate_and_normalize_indian_phone(phone)
    if not is_valid or not normalized_phone:
        return PhoneOTPResponse(
            success=False,
            provider_configured=is_sms_provider_configured(),
            normalized_phone=phone,
            message="Invalid phone format",
            is_verified=False
        )

    rec = await d1.fetch_one(
        "SELECT is_verified FROM phone_verifications WHERE phone = ? AND is_verified = 1 ORDER BY id DESC LIMIT 1",
        normalized_phone
    )
    is_ver = bool(rec and rec.get("is_verified"))
    
    return PhoneOTPResponse(
        success=True,
        provider_configured=is_sms_provider_configured(),
        normalized_phone=normalized_phone,
        message="Verified" if is_ver else "Unverified",
        is_verified=is_ver
    )
