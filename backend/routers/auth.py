from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from database.supabase import get_supabase

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str = ""

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/register")
async def register(data: RegisterRequest):
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_up({
            "email": data.email,
            "password": data.password,
            "options": {
                "data": {"full_name": data.full_name}
            }
        })
        if result.user:
            return {
                "message": "Kayıt başarılı! Email doğrulaması gerekiyor.",
                "user_id": str(result.user.id),
                "email": result.user.email
            }
        raise HTTPException(status_code=400, detail="Kayıt başarısız")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login")
async def login(data: LoginRequest):
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        if result.user and result.session:
            return {
                "access_token": result.session.access_token,
                "refresh_token": result.session.refresh_token,
                "user": {
                    "id": str(result.user.id),
                    "email": result.user.email,
                    "full_name": result.user.user_metadata.get("full_name", "")
                }
            }
        raise HTTPException(status_code=401, detail="Giriş başarısız")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/logout")
async def logout():
    try:
        supabase = get_supabase()
        supabase.auth.sign_out()
        return {"message": "Çıkış başarılı"}
    except Exception as e:
        return {"message": "Çıkış yapıldı"}

@router.get("/me")
async def get_me(token: str):
    try:
        supabase = get_supabase()
        user = supabase.auth.get_user(token)
        if user and user.user:
            profile = supabase.table("profiles").select("*").eq("id", str(user.user.id)).execute()
            profile_data = profile.data[0] if profile.data else {}
            return {
                "id": str(user.user.id),
                "email": user.user.email,
                "full_name": user.user.user_metadata.get("full_name", ""),
                "plan": profile_data.get("plan", "free"),
                "api_calls_this_month": profile_data.get("api_calls_this_month", 0)
            }
        raise HTTPException(status_code=401, detail="Geçersiz token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=str(e))