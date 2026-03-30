"""
DeepSeek V3 — Batch keyword analizi için ucuz LLM
Claude'dan ~20x daha ucuz: $0.14/1M input, $0.28/1M output
OpenAI SDK uyumlu — sadece base_url farklı

⚠️ GİZLİLİK: Kullanıcı kimlik verisi GÖNDERİLMEZ — sadece genel keyword/içerik
"""
import os
import json

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_AVAILABLE = False
_client = None

try:
    from openai import AsyncOpenAI
    if DEEPSEEK_API_KEY:
        _client = AsyncOpenAI(
            api_key=DEEPSEEK_API_KEY,
            base_url="https://api.deepseek.com"
        )
        DEEPSEEK_AVAILABLE = True
        print(f"✅ DeepSeek configured: {DEEPSEEK_API_KEY[:8]}...")
    else:
        print("⚠️ DEEPSEEK_API_KEY not found — using mock")
except ImportError:
    print("⚠️ openai package not found — pip install openai")
except Exception as e:
    print(f"⚠️ DeepSeek init error: {e}")


async def batch_keyword_score(keywords: list[str]) -> list[dict]:
    """
    50 keyword'ü tek API call ile işle — DeepSeek V3.
    Gemini Flash-Lite dolu olduğunda ya da 50+ keyword için kullan.
    """
    if not keywords:
        return []

    if not DEEPSEEK_AVAILABLE:
        return [{"keyword": kw, "score": 50, "intent": "mixed",
                 "competition": "med", "trend": "stable", "model": "mock"} for kw in keywords]

    kw_list = "\n".join([f"{i+1}. {kw}" for i, kw in enumerate(keywords[:50])])

    try:
        resp = await _client.chat.completions.create(
            model="deepseek-chat",
            messages=[{
                "role": "user",
                "content": f"""Rate each Amazon keyword for FBA research.
Return JSON: {{"results": [{{"keyword":"...", "score":0-100, "intent":"buy|research|browse", "competition":"low|med|high", "trend":"rising|stable|falling"}}]}}

Keywords:
{kw_list}"""
            }],
            response_format={"type": "json_object"},
            temperature=0,
            max_tokens=3000
        )
        data = json.loads(resp.choices[0].message.content)
        results = data.get("results", data.get("keywords", []))
        for r in results:
            r["model"] = "deepseek-chat"
        return results
    except Exception as e:
        print(f"DeepSeek batch error: {e}")
        return [{"keyword": kw, "score": 50, "intent": "mixed",
                 "competition": "med", "trend": "stable", "model": "mock"} for kw in keywords]


async def generate_product_description(title: str, keywords: list[str], locale: str = "en") -> dict:
    """
    Ürün açıklaması oluştur — Türkçe dahil çok dilli.
    DeepSeek V3 Türkçe içerik üretiminde güçlü.
    """
    if not DEEPSEEK_AVAILABLE:
        return {"description": f"High-quality {title}. Perfect for everyday use.", "model": "mock"}

    kw_str = ", ".join(keywords[:10])
    try:
        resp = await _client.chat.completions.create(
            model="deepseek-chat",
            messages=[{
                "role": "user",
                "content": f"""Write an Amazon product description.
Language: {locale}
Product: {title}
Keywords to include: {kw_str}

Return JSON: {{"description": "150-200 word description", "bullet_points": ["point1","point2","point3"]}}"""
            }],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=800
        )
        data = json.loads(resp.choices[0].message.content)
        data["model"] = "deepseek-chat"
        return data
    except Exception as e:
        print(f"DeepSeek description error: {e}")
        return {"description": f"Premium {title}.", "bullet_points": [], "model": "mock"}
