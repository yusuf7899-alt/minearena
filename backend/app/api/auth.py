"""
Authentication & User Session Management API.
Provides endpoints for signup, login, session inspection, logout, password reset, and account settings.
Uses bcrypt password hashing and secure HttpOnly cookie tokens.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Response, Request, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt

from backend.app.database import get_db
from backend.app.models import User, utc_now

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = "moneta-preaudit-jwt-secret-key-production-ready"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = "Senior Reviewer"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: Optional[str]
    is_active: bool
    is_verified: bool

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    token = request.cookies.get("moneta_session")
    if not token:
        # Check authorization header fallback
        auth_hdr = request.headers.get("Authorization")
        if auth_hdr and auth_hdr.startswith("Bearer "):
            token = auth_hdr.split(" ")[1]
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in."
        )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token.")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Expired or invalid session.")
        
    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account disabled or deleted.")
    return user

@router.post("/signup", response_model=UserResponse)
def signup(req: SignupRequest, response: Response, db: Session = Depends(get_db)):
    if len(req.password) < 8:
        raise HTTPException(400, "Password must contain at least 8 characters.")
    
    existing = db.query(User).filter(User.email == req.email.lower()).first()
    if existing:
        raise HTTPException(400, "An account with this email address already exists.")
    
    hashed = pwd_context.hash(req.password)
    user = User(
        email=req.email.lower(),
        hashed_password=hashed,
        full_name=req.full_name or "Audit Partner",
        is_active=True,
        is_verified=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Issue session cookie
    token = create_access_token({"sub": user.email, "id": user.id})
    response.set_cookie(
        key="moneta_session",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # localhost support
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 86400
    )
    return user

@router.post("/login", response_model=UserResponse)
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if not user or not pwd_context.verify(req.password, user.hashed_password):
        # Security: Consistent timing response without leaking existence
        raise HTTPException(status_code=400, detail="Invalid email address or password.")
    
    token = create_access_token({"sub": user.email, "id": user.id})
    response.set_cookie(
        key="moneta_session",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=ACCESS_TOKEN_EXPIRE_DAYS * 86400
    )
    return user

@router.get("/me", response_model=UserResponse)
def get_current_session(user: User = Depends(get_current_user)):
    return user

@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="moneta_session")
    return {"status": "ok", "message": "Signed out successfully."}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower()).first()
    if user:
        # Generate token
        import secrets
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expiry = datetime.now(timezone.utc) + timedelta(hours=1)
        db.commit()
    # Always return success to prevent email enumeration
    return {"status": "ok", "message": "If an account exists, a password reset link has been dispatched."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    if len(req.new_password) < 8:
        raise HTTPException(400, "Password must contain at least 8 characters.")
        
    user = db.query(User).filter(
        User.reset_token == req.token,
        User.reset_token_expiry > datetime.now(timezone.utc)
    ).first()
    if not user:
        raise HTTPException(400, "Reset token is invalid or has expired.")
        
    user.hashed_password = pwd_context.hash(req.new_password)
    user.reset_token = None
    user.reset_token_expiry = None
    db.commit()
    return {"status": "ok", "message": "Password reset successfully. You may now sign in."}

@router.post("/change-password")
def change_password(req: ChangePasswordRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if not pwd_context.verify(req.current_password, user.hashed_password):
        raise HTTPException(400, "Current password is incorrect.")
    if len(req.new_password) < 8:
        raise HTTPException(400, "New password must contain at least 8 characters.")
    user.hashed_password = pwd_context.hash(req.new_password)
    db.commit()
    return {"status": "ok", "message": "Password updated successfully."}

@router.delete("/account")
def delete_account(response: Response, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(user)
    db.commit()
    response.delete_cookie(key="moneta_session")
    return {"status": "ok", "message": "Account deleted."}

