from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database.supabase import get_supabase

security = HTTPBearer(auto_error=False)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Token gerekli")
    
    try:
        supabase = get_supabase()
        user = supabase.auth.get_user(credentials.credentials)
        if not user or not user.user:
            raise HTTPException(status_code=401, detail="Geçersiz token")
        return user.user
    except Exception as e:
        raise HTTPException(status_code=401, detail="Kimlik doğrulama hatası")

async def get_optional_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    if not credentials:
        return None
    try:
        supabase = get_supabase()
        user = supabase.auth.get_user(credentials.credentials)
        return user.user if user else None
    except:
        return None