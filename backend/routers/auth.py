from fastapi import APIRouter, HTTPException
from database import fetch_one, fetch_all, execute
from schemas.auth import UserRegister, UserLogin, UserResponse, LoginResponse
from utils.password import hash_password, verify_password
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=dict)
def register(user: UserRegister):
    check_query = "SELECT user_id FROM users WHERE email = %s"
    existing = fetch_one(check_query, (user.email,))
    if existing:
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    
    hashed = hash_password(user.password)
    insert_query = "INSERT INTO users (name, email, password) VALUES (%s, %s, %s)"
    user_id = execute(insert_query, (user.name, user.email, hashed))
    
    return {
        "message": "Registrasi berhasil",
        "user_id": user_id,
        "name": user.name,
        "email": user.email
    }

@router.post("/login", response_model=LoginResponse)
def login(user: UserLogin):
    query = """
        SELECT user_id, name, email, password 
        FROM users 
        WHERE email = %s
    """
    result = fetch_one(query, (user.email,))
    if not result:
        raise HTTPException(status_code=401, detail="Email tidak ditemukan")
    
    if not verify_password(user.password, result["password"]):
        raise HTTPException(status_code=401, detail="Password salah")
    
    history_query = "INSERT INTO histories (user_id, login_time) VALUES (%s, %s)"
    execute(history_query, (result["user_id"], datetime.now()))
    
    return LoginResponse(
        message="Login berhasil",
        user_id=result["user_id"],
        name=result["name"],
        email=result["email"]
    )

@router.get("/user/{user_id}", response_model=UserResponse)
def get_user(user_id: int):
    query = """
        SELECT user_id, name, email 
        FROM users 
        WHERE user_id = %s
    """
    result = fetch_one(query, (user_id,))
    if not result:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    return UserResponse(**result)

@router.post("/logout/{user_id}")
def logout(user_id: int):
    query = """
        UPDATE histories 
        SET logout_time = %s 
        WHERE user_id = %s AND logout_time IS NULL 
        ORDER BY login_time DESC 
        LIMIT 1
    """
    execute(query, (datetime.now(), user_id))
    return {"message": "Logout berhasil"}
