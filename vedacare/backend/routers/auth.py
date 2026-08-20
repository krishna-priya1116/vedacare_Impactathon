"""
VedaCare — Auth router.
POST /auth/signup, /auth/login, /auth/forgot-password, /auth/reset-password
Includes JWT helper functions.
"""

import os
import datetime
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import jwt
import bcrypt

from database import get_db
from models import Caregiver, DeviceToken
from schemas import (
    SignupRequest, SignupResponse,
    LoginRequest, LoginResponse,
    ForgotPasswordRequest, ForgotPasswordResponse,
    ResetPasswordRequest, SuccessResponse,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

JWT_SECRET = os.getenv("JWT_SECRET_KEY", "vedacare-dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24

# In-memory OTP store (stub — no real SMS delivery)
_otp_store: dict[str, str] = {}


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------
def create_token(subject: dict, expires_hours: int = JWT_EXPIRE_HOURS) -> str:
    payload = {
        **subject,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=expires_hours),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_caregiver(
    token: str = Depends(lambda: None),  # overridden below
    db: Session = Depends(get_db),
):
    """Dependency — extract caregiver from Authorization header."""
    ...  # wired up via get_current_user


from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
):
    """FastAPI dependency: decode JWT, return caregiver or raise 401."""
    payload = decode_token(credentials.credentials)
    role = payload.get("role")
    user_id = payload.get("id")
    if role == "caregiver":
        caregiver = db.query(Caregiver).filter(Caregiver.id == user_id).first()
        if not caregiver:
            raise HTTPException(status_code=401, detail="Caregiver not found")
        return {"role": "caregiver", "id": caregiver.id, "user": caregiver}
    raise HTTPException(status_code=401, detail="Invalid token role")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.post("/signup", response_model=SignupResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    # Check duplicate contact
    if db.query(Caregiver).filter(Caregiver.contact == req.contact).first():
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_INPUT", "message": "Contact already registered."},
        )
    if len(req.password) < 6:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_INPUT", "message": "Password must be at least 6 characters."},
        )
    hashed = bcrypt.hashpw(req.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    caregiver = Caregiver(
        name=req.name,
        contact=req.contact,
        password_hash=hashed,
    )
    db.add(caregiver)
    db.commit()
    db.refresh(caregiver)
    token = create_token({"id": caregiver.id, "role": "caregiver"})
    return SignupResponse(caregiver_id=caregiver.id, token=token)


@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    # Try caregiver first
    caregiver = db.query(Caregiver).filter(Caregiver.contact == req.contact).first()
    if caregiver and bcrypt.checkpw(req.password.encode('utf-8'), caregiver.password_hash.encode('utf-8')):
        token = create_token({"id": caregiver.id, "role": "caregiver"})
        return LoginResponse(role="caregiver", token=token, redirect="/caregiver")

    # Try patient device_token login (contact = device_token)
    device = db.query(DeviceToken).filter(DeviceToken.token == req.contact).first()
    if device:
        token = create_token({"id": device.patient_id, "role": "patient"})
        return LoginResponse(role="patient", token=token, redirect="/patient")

    raise HTTPException(
        status_code=401,
        detail={"code": "UNAUTHORIZED", "message": "Invalid credentials."},
    )


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    caregiver = db.query(Caregiver).filter(Caregiver.contact == req.contact).first()
    if not caregiver:
        # don't reveal whether contact exists — still return success
        return ForgotPasswordResponse()
    otp = f"{secrets.randbelow(900000) + 100000}"
    _otp_store[req.contact] = otp
    # Stub: log OTP server-side for dev/demo purposes
    print(f"[OTP STUB] Contact={req.contact}  OTP={otp}")
    return ForgotPasswordResponse()


@router.post("/reset-password", response_model=SuccessResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    stored_otp = _otp_store.get(req.contact)
    if not stored_otp or stored_otp != req.otp:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_INPUT", "message": "Wrong or expired OTP."},
        )
    caregiver = db.query(Caregiver).filter(Caregiver.contact == req.contact).first()
    if not caregiver:
        raise HTTPException(status_code=404, detail="Contact not found.")
    hashed = bcrypt.hashpw(req.new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    caregiver.password_hash = hashed
    db.commit()
    _otp_store.pop(req.contact, None)
    return SuccessResponse()
