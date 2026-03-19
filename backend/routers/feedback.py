from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database.supabase import get_supabase
from datetime import datetime
import anthropic
import os

router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

class FeedbackRequest(BaseModel):
    user_id: str = "guest"
    type: str
    text: str
    nps_score: int | None = None

class PointRequest(BaseModel):
    user_id: str
    action: str
    points: int

class BotRequest(BaseModel):
    messages: list
    system: str = ""

POINT_LIMITS = {
    "feedback_submit": 50,
    "bug_report": 200,
    "nps_score": 20,
    "vote": 5,
    "daily_login": 10,
    "first_search": 25,
    "niche_score": 15,
    "referral": 300,
}

@router.post("/submit")
async def submit_feedback(data: FeedbackRequest):
    try:
        supabase = get_supabase()
        supabase.table("feedback").insert({
            "user_id": data.user_id if data.user_id != "guest" else None,
            "type": data.type,
            "text": data.text,
            "nps_score": data.nps_score,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
    except Exception as e:
        print(f"Feedback kayit hatasi: {e}")
    return {"success": True, "message": "Feedback alindi"}

@router.post("/add-points")
async def add_points(data: PointRequest):
    if not data.user_id or data.user_id == "guest":
        return {"success": False}

    max_points = POINT_LIMITS.get(data.action, 0)
    if data.points > max_points * 2:
        raise HTTPException(status_code=400, detail="Gecersiz puan")

    try:
        supabase = get_supabase()
        supabase.table("lens_points").insert({
            "user_id": data.user_id,
            "action": data.action,
            "points": data.points,
            "created_at": datetime.utcnow().isoformat()
        }).execute()

        profile = supabase.table("profiles").select("lens_points").eq("id", data.user_id).execute()
        current = profile.data[0].get("lens_points", 0) if profile.data else 0
        supabase.table("profiles").update({
            "lens_points": current + data.points
        }).eq("id", data.user_id).execute()

        return {"success": True, "total_points": current + data.points}
    except Exception as e:
        print(f"Puan ekleme hatasi: {e}")
        return {"success": False}

@router.get("/points/{user_id}")
async def get_points(user_id: str):
    try:
        supabase = get_supabase()
        profile = supabase.table("profiles").select("lens_points").eq("id", user_id).execute()
        points = profile.data[0].get("lens_points", 0) if profile.data else 0
        return {"points": points}
    except:
        return {"points": 0}

@router.get("/list")
async def get_feedback(secret: str = ""):
    if secret != os.getenv("ADMIN_SECRET", "admin123"):
        raise HTTPException(status_code=403)
    try:
        supabase = get_supabase()
        res = supabase.table("feedback").select("*").order("created_at", desc=True).limit(100).execute()
        return {"feedback": res.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/bot")
async def bot_chat(data: BotRequest):
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        return {"reply": "AI servisi yapılandırılmamış."}

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1000,
            system=data.system,
            messages=data.messages
        )
        return {"reply": response.content[0].text}
    except anthropic.AuthenticationError:
        return {"reply": "API anahtarı geçersiz. Lütfen yönetici ile iletişime geçin."}
    except anthropic.BadRequestError as e:
        print(f"Anthropic BadRequest: {e}")
        return {"reply": "Şu an yoğunluk var, biraz sonra tekrar dene! 🙏"}
    except Exception as e:
        print(f"Bot hatasi: {e}")
        return {"reply": "Bağlantı hatası. Lütfen tekrar deneyin."}
