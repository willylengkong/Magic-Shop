from pydantic import BaseModel, EmailStr, Field

class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    role_id: int = Field(default=2)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: int
    email: str
    role_id: int
    role_name: str

class LoginResponse(BaseModel):
    message: str
    user_id: int
    email: str
    role_id: int
    role_name: str
