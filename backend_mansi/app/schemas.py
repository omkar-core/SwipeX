from pydantic import BaseModel, EmailStr
from app.models import Role


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Role = Role.JOB_SEEKER


class RegisterResponse(BaseModel):
    user_id: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    role: Role


class RefreshRequest(BaseModel):
    refresh_token: str


class RefreshResponse(BaseModel):
    access_token: str


class MeResponse(BaseModel):
    user_id: str
    name: str
    role: Role
