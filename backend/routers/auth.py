from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from database.supabase import get_supabase
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/api/auth", tags=["Auth"])

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str = ""

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

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
            # 14 gunluk trial — Pro ozellikleri
            trial_end = (datetime.now(timezone.utc) + timedelta(days=14)).isoformat()
            try:
                supabase.table("profiles").upsert({
                    "id": str(result.user.id),
                    "email": data.email,
                    "full_name": data.full_name,
                    "plan": "trial",
                    "trial_ends_at": trial_end,
                    "searches_per_day": 200,
                }).execute()
            except Exception as e:
                print(f"Profile olusturma hatasi: {e}")

            return {
                "message": "Kayit basarili! 14 gun ucretsiz Pro denemeniz basladi.",
                "user_id": str(result.user.id),
                "email": result.user.email,
                "trial_days": 14,
            }
        raise HTTPException(status_code=400, detail="Kayit basarisiz")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Register hatasi: {e}")
        raise HTTPException(status_code=400, detail="Kayit sirasinda bir hata olustu")

@router.post("/login")
async def login(data: LoginRequest):
    try:
        supabase = get_supabase()
        result = supabase.auth.sign_in_with_password({
            "email": data.email,
            "password": data.password
        })
        if result.user and result.session:
            # Profil ve trial durumunu kontrol et
            plan = "free"
            trial_ends_at = None
            trial_days_left = 0

            try:
                profile = supabase.table("profiles").select("*").eq(
                    "id", str(result.user.id)
                ).execute()
                if profile.data:
                    p = profile.data[0]
                    plan = p.get("plan", "free")
                    trial_ends_at = p.get("trial_ends_at")

                    # Trial bitti mi kontrol et
                    if plan == "trial" and trial_ends_at:
                        trial_end = datetime.fromisoformat(trial_ends_at.replace("Z", "+00:00"))
                        now = datetime.now(timezone.utc)
                        if now > trial_end:
                            # Trial bitti — free'ye duşur
                            plan = "free"
                            supabase.table("profiles").update({
                                "plan": "free",
                                "searches_per_day": 5
                            }).eq("id", str(result.user.id)).execute()
                        else:
                            remaining = trial_end - now
                            trial_days_left = remaining.days + 1
            except Exception as e:
                print(f"Profile okuma hatasi: {e}")

            return {
                "access_token": result.session.access_token,
                "refresh_token": result.session.refresh_token,
                "user": {
                    "id": str(result.user.id),
                    "email": result.user.email,
                    "full_name": result.user.user_metadata.get("full_name", ""),
                    "plan": plan,
                    "trial_days_left": trial_days_left,
                }
            }
        raise HTTPException(status_code=401, detail="Giris basarisiz")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Login hatasi: {e}")
        raise HTTPException(status_code=401, detail="Giris sirasinda bir hata olustu")

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest):
    try:
        supabase = get_supabase()
        supabase.auth.reset_password_for_email(data.email)
    except Exception as e:
        print(f"Forgot password: {e}")
    return {"message": "Gonderildi"}

@router.post("/logout")
async def logout():
    try:
        supabase = get_supabase()
        supabase.auth.sign_out()
        return {"message": "Cikis basarili"}
    except Exception:
        return {"message": "Cikis yapildi"}

@router.get("/me")
async def get_me(token: str):
    try:
        supabase = get_supabase()
        user = supabase.auth.get_user(token)
        if user and user.user:
            profile = supabase.table("profiles").select("*").eq(
                "id", str(user.user.id)
            ).execute()
            profile_data = profile.data[0] if profile.data else {}
            return {
                "id": str(user.user.id),
                "email": user.user.email,
                "full_name": user.user.user_metadata.get("full_name", ""),
                "plan": profile_data.get("plan", "free"),
                "trial_ends_at": profile_data.get("trial_ends_at"),
                "api_calls_this_month": profile_data.get("api_calls_this_month", 0)
            }
        raise HTTPException(status_code=401, detail="Gecersiz token")
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get me hatasi: {e}")
        raise HTTPException(status_code=401, detail="Gecersiz token")
