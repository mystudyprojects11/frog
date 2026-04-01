import re
import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    phone: str | None = None
    city: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        if v is None:
            return v
        digits = re.sub(r"\D", "", v)
        if not re.match(r"^[78]\d{10}$", digits):
            raise ValueError("Некорректный номер телефона. Ожидается формат: +7 (XXX) XXX-XX-XX")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        errors = []
        if len(v) < 8:
            errors.append("не менее 8 символов")
        if not re.search(r"[A-Z]", v):
            errors.append("минимум одна заглавная буква")
        if not re.match(r"^[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?`~]+$", v):
            errors.append("только латинские буквы, цифры и спецсимволы")
        if not re.search(r"\d", v):
            errors.append("минимум одна цифра")
        if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>/?`~]", v):
            errors.append("минимум один спецсимвол")
        if errors:
            raise ValueError("Пароль должен содержать: " + ", ".join(errors))
        return v


class UserRead(BaseModel):
    id: uuid.UUID
    email: EmailStr
    username: str
    phone: str | None
    city: str | None
    avatar_url: str | None
    rating: float
    reviews_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    username: str | None = None
    phone: str | None = None
    city: str | None = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
