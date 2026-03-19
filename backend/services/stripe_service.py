import os
from dotenv import load_dotenv

load_dotenv()

import stripe
from stripe import checkout, billing_portal, Webhook, Subscription

# .env'den oku — asla hardcode etme!
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
if not stripe.api_key:
    raise RuntimeError("STRIPE_SECRET_KEY .env dosyasında tanımlı değil!")

PRICE_IDS = {
    "starter": os.getenv("STRIPE_STARTER_PRICE_ID", "price_1TCGF7BaoW9Pk2K1C4qhaByP"),
    "pro":     os.getenv("STRIPE_PRO_PRICE_ID",     "price_1TCGFkBaoW9Pk2K1musZYj5k"),
    "agency":  os.getenv("STRIPE_AGENCY_PRICE_ID",  "price_1TCGGDBaoW9Pk2K1aGJ4E5GH"),
}

PLAN_LIMITS = {
    "free":    {"searches_per_day": 5,   "label": "Free"},
    "trial":   {"searches_per_day": 200, "label": "Trial"},
    "starter": {"searches_per_day": 50,  "label": "Starter"},
    "pro":     {"searches_per_day": 200, "label": "Pro"},
    "agency":  {"searches_per_day": -1,  "label": "Agency"},
}

def create_checkout_session(plan: str, user_email: str, success_url: str, cancel_url: str) -> dict:
    price_id = PRICE_IDS.get(plan)
    if not price_id:
        raise ValueError(f"Gecersiz plan veya price_id bulunamadi: {plan}")

    session = checkout.Session.create(
        payment_method_types=["card"],
        mode="subscription",
        customer_email=user_email,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url + "&session_id={CHECKOUT_SESSION_ID}",
        cancel_url=cancel_url,
        metadata={"plan": plan, "user_email": user_email},
        subscription_data={
            "trial_period_days": 7,
            "metadata": {"plan": plan, "user_email": user_email}
        }
    )
    return {"checkout_url": session.url, "session_id": session.id}

def create_portal_session(customer_id: str, return_url: str) -> dict:
    session = billing_portal.Session.create(
        customer=customer_id,
        return_url=return_url,
    )
    return {"portal_url": session.url}

def get_subscription(subscription_id: str) -> dict:
    sub = Subscription.retrieve(subscription_id)
    return {
        "id": sub.id,
        "status": sub.status,
        "plan": sub.metadata.get("plan", "starter"),
        "current_period_end": sub.current_period_end,
        "cancel_at_period_end": sub.cancel_at_period_end,
    }

def handle_webhook(payload: bytes, sig_header: str) -> dict:
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")

    if webhook_secret:
        try:
            event = Webhook.construct_event(payload, sig_header, webhook_secret)
        except stripe.error.SignatureVerificationError:
            raise ValueError("Webhook imza dogrulamasi basarisiz")
    else:
        import json
        event = json.loads(payload)

    event_type = event.get("type", "")
    data = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        return {
            "event": "subscription_created",
            "user_email": data.get("customer_email"),
            "plan": data.get("metadata", {}).get("plan"),
            "customer_id": data.get("customer"),
            "subscription_id": data.get("subscription"),
        }
    elif event_type == "customer.subscription.updated":
        return {
            "event": "subscription_updated",
            "subscription_id": data.get("id"),
            "status": data.get("status"),
            "plan": data.get("metadata", {}).get("plan"),
        }
    elif event_type == "customer.subscription.deleted":
        return {
            "event": "subscription_cancelled",
            "subscription_id": data.get("id"),
            "customer_id": data.get("customer"),
        }
    elif event_type == "invoice.payment_failed":
        return {
            "event": "payment_failed",
            "customer_id": data.get("customer"),
            "subscription_id": data.get("subscription"),
        }

    return {"event": "ignored", "type": event_type}
