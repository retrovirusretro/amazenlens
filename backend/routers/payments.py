from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv
from pathlib import Path
from services.stripe_service import (
    create_checkout_session,
    create_portal_session,
    get_subscription,
    handle_webhook,
    PLAN_LIMITS
)
from database.supabase import supabase
import os

load_dotenv(Path(__file__).parent.parent / ".env")

router = APIRouter(prefix="/api/payments", tags=["Payments"])

def get_frontend_url():
    url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    return url

class CheckoutRequest(BaseModel):
    plan: str
    user_email: str

class PortalRequest(BaseModel):
    customer_id: str

# ─── Checkout ────────────────────────────────────────────────────

@router.post("/create-checkout")
async def create_checkout(req: CheckoutRequest):
    if req.plan not in ["starter", "pro", "agency"]:
        raise HTTPException(status_code=400, detail="Geçersiz plan")

    try:
        result = create_checkout_session(
            plan=req.plan,
            user_email=req.user_email,
            success_url=f"{get_frontend_url()}/app/dashboard?upgrade=success",
            cancel_url=f"{get_frontend_url()}/app/pricing",
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Müşteri Portalı ─────────────────────────────────────────────

@router.post("/create-portal")
async def create_portal(req: PortalRequest):
    try:
        result = create_portal_session(
            customer_id=req.customer_id,
            return_url=f"{get_frontend_url()}/app/dashboard",
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─── Webhook ─────────────────────────────────────────────────────

@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="stripe-signature")
):
    payload = await request.body()

    try:
        event = handle_webhook(payload, stripe_signature or "")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        if event["event"] == "subscription_created":
            user_email = event.get("user_email")
            plan = event.get("plan")
            customer_id = event.get("customer_id")
            subscription_id = event.get("subscription_id")

            if user_email and plan:
                # Önce mevcut profili bul
                existing = supabase.table("profiles").select("id").eq("email", user_email).execute()

                if existing.data:
                    # Kayıt var → sadece güncelle
                    supabase.table("profiles").update({
                        "plan": plan,
                        "stripe_customer_id": customer_id,
                        "stripe_subscription_id": subscription_id,
                        "subscription_status": "active",
                        "searches_per_day": PLAN_LIMITS.get(plan, {}).get("searches_per_day", 5)
                    }).eq("email", user_email).execute()
                    print(f"✅ Plan güncellendi: {user_email} → {plan}")
                else:
                    print(f"⚠️ Profil bulunamadı: {user_email}")

        elif event["event"] == "subscription_updated":
            subscription_id = event.get("subscription_id")
            status = event.get("status")
            plan = event.get("plan")
            if subscription_id:
                update_data = {"subscription_status": status}
                if plan:
                    update_data["plan"] = plan
                    update_data["searches_per_day"] = PLAN_LIMITS.get(plan, {}).get("searches_per_day", 5)
                supabase.table("profiles").update(update_data).eq("stripe_subscription_id", subscription_id).execute()

        elif event["event"] == "subscription_cancelled":
            subscription_id = event.get("subscription_id")
            if subscription_id:
                supabase.table("profiles").update({
                    "plan": "free",
                    "searches_per_day": 5,
                    "subscription_status": "cancelled",
                }).eq("stripe_subscription_id", subscription_id).execute()
                print(f"✅ Abonelik iptal edildi: {subscription_id}")

        elif event["event"] == "payment_failed":
            customer_id = event.get("customer_id")
            if customer_id:
                supabase.table("profiles").update({
                    "subscription_status": "past_due",
                }).eq("stripe_customer_id", customer_id).execute()

    except Exception as e:
        print(f"Supabase güncelleme hatası: {e}")

    return JSONResponse({"received": True, "event": event["event"]})

# ─── Plan Bilgisi ─────────────────────────────────────────────────

@router.get("/plans")
async def get_plans():
    return {
        "plans": [
            {
                "id": "free", "name": "Free", "price": 0,
                "currency": "USD", "period": "ay", "searches_per_day": 5,
                "features": ["5 arama/gün", "Temel özellikler", "Niş skoru"],
                "cta": "Ücretsiz Başla", "highlighted": False,
            },
            {
                "id": "starter", "name": "Starter", "price": 19,
                "currency": "USD", "period": "ay", "searches_per_day": 50,
                "features": ["50 arama/gün", "Tüm Faz 1 özellikleri", "Love/Hate analizi", "Euro Flips arbitraj", "Email destek"],
                "cta": "Starter Başla", "highlighted": False,
            },
            {
                "id": "pro", "name": "Pro", "price": 49,
                "currency": "USD", "period": "ay", "searches_per_day": 200,
                "features": ["200 arama/gün", "Tüm özellikler", "Pan-EU kar hesabı", "DHgate + Türk tedarikçi", "Öncelikli destek"],
                "cta": "Pro Başla", "highlighted": True,
            },
            {
                "id": "agency", "name": "Agency", "price": 99,
                "currency": "USD", "period": "ay", "searches_per_day": -1,
                "features": ["Sınırsız arama", "Tüm özellikler", "API erişimi", "Dedicated destek", "White-label hazırlık"],
                "cta": "Agency Başla", "highlighted": False,
            },
        ]
    }

@router.get("/subscription/{user_email}")
async def get_user_subscription(user_email: str):
    try:
        res = supabase.table("profiles").select(
            "plan, stripe_customer_id, stripe_subscription_id, searches_per_day, subscription_status"
        ).eq("email", user_email).single().execute()

        if res.data:
            return res.data
        return {"plan": "free", "searches_per_day": 5}
    except Exception:
        return {"plan": "free", "searches_per_day": 5}
