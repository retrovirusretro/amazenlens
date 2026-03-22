import os
import json
import asyncio
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

GEMINI_AVAILABLE = False
client = None

# google-genai (yeni) veya google-generativeai (eski) — ikisini de dene
try:
    from google import genai
    from google.genai import types
    if GEMINI_API_KEY:
        client = genai.Client(api_key=GEMINI_API_KEY)
        GEMINI_AVAILABLE = True
        print(f"✅ Gemini (google-genai) configured: {GEMINI_API_KEY[:8]}...")
    else:
        print("⚠️ GEMINI_API_KEY not found — using mock")
except ImportError:
    try:
        import google.generativeai as genai_legacy
        if GEMINI_API_KEY:
            genai_legacy.configure(api_key=GEMINI_API_KEY)
            GEMINI_AVAILABLE = True
            client = genai_legacy
            print(f"✅ Gemini (generativeai legacy) configured: {GEMINI_API_KEY[:8]}...")
        else:
            print("⚠️ GEMINI_API_KEY not found — using mock")
    except ImportError:
        print("⚠️ No Gemini library found — using mock")
except Exception as e:
    print(f"⚠️ Gemini init error: {e} — using mock")

FLASH_MODEL = "gemini-2.5-flash"
FLASH_LITE_MODEL = "gemini-2.5-flash-lite-preview-06-17"


def _parse_json(text: str):
    text = text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        text = "\n".join(lines[1:-1])
    return json.loads(text.strip())


# ─── 1. BUYER INTENT ─────────────────────────────────────────────────────────
async def analyze_buyer_intent(keyword: str, locale: str = "en") -> dict:
    if not GEMINI_AVAILABLE:
        return _mock_buyer_intent(keyword)

    prompt = f"""Analyze this Amazon search keyword for buyer intent.
Keyword: "{keyword}"
Locale: {locale}

Return JSON only, no markdown:
{{
  "intent": "transactional|informational|navigational",
  "intent_score": 0-100,
  "buyer_stage": "awareness|consideration|decision",
  "competition_level": "low|medium|high",
  "emotions": ["urgency", "value-seeking"],
  "rufus_ready": true,
  "suggested_title_words": ["word1", "word2", "word3"],
  "long_tail_ideas": ["variant1", "variant2", "variant3", "variant4", "variant5"],
  "negative_keywords": ["neg1", "neg2"],
  "summary": "1 sentence insight in {locale} language"
}}"""

    try:
        response = await client.aio.models.generate_content(
            model=FLASH_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0.1,
                max_output_tokens=800
            )
        )
        text = response.text.strip()
        print(f"🔍 Gemini raw response: {text[:200]}")
        # JSON bloğunu çıkar
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        # { ile başlayan kısmı bul
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0:
            text = text[start:end]
        data = json.loads(text)
        data["keyword"] = keyword
        data["model"] = FLASH_MODEL
        return data
    except Exception as e:
        print(f"Gemini buyer intent error: {e}")
        return _mock_buyer_intent(keyword)


# ─── 2. LİSTİNG OPTİMİZASYONU ────────────────────────────────────────────────
async def optimize_listing(
    title: str,
    keywords: list,
    category: str = "General",
    locale: str = "en",
    marketplace: str = "Amazon.com"
) -> dict:
    if not GEMINI_AVAILABLE:
        return {"error": "Gemini not configured", "original_title": title}

    kw_str = ", ".join(keywords[:20])
    prompt = f"""You are an Amazon listing optimization expert.
Marketplace: {marketplace} | Language: {locale} | Category: {category}

Current title: "{title}"
Target keywords: {kw_str}

Return JSON only, no markdown:
{{
  "optimized_title": "keyword-rich title max 200 chars",
  "bullet_points": [
    "BENEFIT: Detail point 1",
    "BENEFIT: Detail point 2",
    "BENEFIT: Detail point 3",
    "BENEFIT: Detail point 4",
    "BENEFIT: Detail point 5"
  ],
  "description": "150-200 word compelling description",
  "backend_keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "score_before": 40,
  "score_after": 85,
  "improvements": ["improvement1", "improvement2", "improvement3"]
}}"""

    try:
        response = await client.aio.models.generate_content(
            model=FLASH_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.2,
                max_output_tokens=1500
            )
        )
        data = json.loads(response.text)
        data["model"] = FLASH_MODEL
        data["original_title"] = title
        return data
    except Exception as e:
        print(f"Gemini listing error: {e}")
        return {"error": str(e), "original_title": title}


# ─── 3. BULK KEYWORD SKORU ───────────────────────────────────────────────────
async def bulk_keyword_score(keywords: list) -> list:
    if not keywords:
        return []
    if not GEMINI_AVAILABLE:
        return [{"keyword": kw, "score": 50, "intent": "mixed",
                 "competition": "med", "trend": "stable"} for kw in keywords]

    kw_list = "\n".join([f"{i+1}. {kw}" for i, kw in enumerate(keywords[:30])])
    prompt = f"""Rate each Amazon keyword for FBA product research.
Return JSON array only, no markdown:
[{{"keyword":"...", "score":0-100, "intent":"buy|research|browse", "competition":"low|med|high", "trend":"rising|stable|falling"}}]

Keywords:
{kw_list}"""

    try:
        response = await client.aio.models.generate_content(
            model=FLASH_LITE_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0,
                max_output_tokens=2000
            )
        )
        result = json.loads(response.text)
        if isinstance(result, list):
            return result
        for v in result.values():
            if isinstance(v, list):
                return v
        return []
    except Exception as e:
        print(f"Gemini bulk error: {e}")
        return [{"keyword": kw, "score": 50, "intent": "mixed",
                 "competition": "med", "trend": "stable"} for kw in keywords]


# ─── 4. QUERY-PRODUCT ALAKA ──────────────────────────────────────────────────
async def score_query_relevance(query: str, product_title: str, category: str = "General") -> dict:
    if not GEMINI_AVAILABLE:
        return {"relevance_score": 0.5, "intent_match": "partial",
                "reasoning": "Gemini not configured", "conversion_potential": "medium"}

    prompt = f"""Amazon search expert. Evaluate query-product relevance.

Examples:
"yoga mat thick" + "Non-slip yoga mat 6mm" = 0.95
"yoga mat thick" + "Yoga blocks set" = 0.40
"yoga mat thick" + "Gym water bottle" = 0.05

Query: "{query}"
Product: "{product_title}"
Category: "{category}"

JSON only: {{"relevance_score": 0.0, "intent_match": "exact|partial|indirect|none", "reasoning": "brief", "conversion_potential": "high|medium|low"}}"""

    try:
        response = await client.aio.models.generate_content(
            model=FLASH_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.0,
                max_output_tokens=300
            )
        )
        return json.loads(response.text)
    except Exception as e:
        print(f"Gemini relevance error: {e}")
        return {"relevance_score": 0.5, "intent_match": "partial",
                "reasoning": "error", "conversion_potential": "medium"}


# ─── Mock ─────────────────────────────────────────────────────────────────────
def _mock_buyer_intent(keyword: str) -> dict:
    buyer_words = ["buy", "best", "cheap", "set", "kit", "pack", "for", "with"]
    is_transactional = any(w in keyword.lower() for w in buyer_words)
    return {
        "keyword": keyword,
        "intent": "transactional" if is_transactional else "mixed",
        "intent_score": 75 if is_transactional else 50,
        "buyer_stage": "decision" if is_transactional else "consideration",
        "competition_level": "medium",
        "emotions": ["value-seeking"],
        "rufus_ready": True,
        "suggested_title_words": keyword.split()[:3],
        "long_tail_ideas": [
            f"{keyword} for beginners", f"best {keyword}",
            f"{keyword} set", f"{keyword} professional", f"cheap {keyword}",
        ],
        "negative_keywords": ["free", "diy", "how to"],
        "summary": "Mixed intent keyword with moderate competition.",
        "model": "mock"
    }
