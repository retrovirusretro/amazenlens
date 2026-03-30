"""
AmazenLens AI Router — Akıllı model yönlendirme
Maliyet-kalite dengesi için otomatik provider seçimi + fallback zinciri:
  Gemini Flash → OpenRouter Llama → Claude (son çare)
"""
import os
import json
import httpx

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")


async def smart_complete(prompt: str, task: str = "general", json_mode: bool = False) -> str:
    """
    Göreve göre en uygun modeli seç, başarısız olursa fallback yap.

    task seçenekleri:
      buyer_intent  → Gemini 2.5 Flash (ücretsiz)
      bulk_score    → Gemini Flash-Lite (ücretsiz, 1000/gün)
      listing       → Gemini 2.5 Flash (ücretsiz)
      batch_keyword → DeepSeek (çok ucuz)
      general       → OpenRouter Llama 4 Scout (ücretsiz)
    """
    provider_order = {
        "buyer_intent":  [("gemini", "gemini-2.5-flash"), ("openrouter", "meta-llama/llama-4-scout:free")],
        "bulk_score":    [("gemini", "gemini-2.5-flash-lite-preview-06-17"), ("openrouter", "meta-llama/llama-4-scout:free")],
        "listing":       [("gemini", "gemini-2.5-flash"), ("openrouter", "meta-llama/llama-4-scout:free")],
        "batch_keyword": [("deepseek", "deepseek-chat"), ("gemini", "gemini-2.5-flash-lite-preview-06-17")],
        "general":       [("openrouter", "meta-llama/llama-4-scout:free"), ("gemini", "gemini-2.5-flash")],
    }

    providers = provider_order.get(task, provider_order["general"])

    for provider, model in providers:
        try:
            if provider == "gemini":
                result = await _gemini_call(prompt, model, json_mode)
            elif provider == "openrouter":
                result = await _openrouter_call(prompt, model)
            elif provider == "deepseek":
                result = await _deepseek_call(prompt, model, json_mode)
            else:
                continue

            if result:
                return result
        except Exception as e:
            print(f"AI Router: {provider}/{model} failed — {e}")
            continue

    return ""


async def _gemini_call(prompt: str, model: str, json_mode: bool = False) -> str:
    from services.gemini_service import client, GEMINI_AVAILABLE
    if not GEMINI_AVAILABLE or not client:
        raise Exception("Gemini not available")

    from google.genai import types
    config = types.GenerateContentConfig(temperature=0.1, max_output_tokens=1000)
    if json_mode:
        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
            max_output_tokens=1000
        )

    response = await client.aio.models.generate_content(
        model=model, contents=prompt, config=config
    )
    return response.text


async def _openrouter_call(prompt: str, model: str = "meta-llama/llama-4-scout:free") -> str:
    if not OPENROUTER_API_KEY:
        raise Exception("OPENROUTER_API_KEY not set")

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "HTTP-Referer": "https://amazenlens.com",
                "X-Title": "AmazenLens",
            },
            json={
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
            }
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]


async def _deepseek_call(prompt: str, model: str = "deepseek-chat", json_mode: bool = False) -> str:
    from services.deepseek_service import _client, DEEPSEEK_AVAILABLE
    if not DEEPSEEK_AVAILABLE or not _client:
        raise Exception("DeepSeek not available")

    kwargs = {"temperature": 0, "max_tokens": 1000}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}

    resp = await _client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        **kwargs
    )
    return resp.choices[0].message.content


async def openrouter_niche_report(keyword: str, locale: str = "en") -> dict:
    """
    OpenRouter Llama 4 Scout ile niş analiz raporu.
    Claude kredisinden tasarruf etmek için.
    """
    prompt = f"""You are an Amazon FBA expert. Analyze this niche keyword.
Keyword: "{keyword}"
Language for response: {locale}

Return JSON only:
{{
  "niche_summary": "2-3 sentence overview",
  "opportunity_score": 0-100,
  "competition_level": "low|medium|high",
  "key_opportunities": ["opp1", "opp2", "opp3"],
  "key_risks": ["risk1", "risk2"],
  "recommended_price_range": {{"min": 0, "max": 0}},
  "target_keywords": ["kw1", "kw2", "kw3", "kw4", "kw5"],
  "seasonal": true,
  "best_entry_strategy": "brief strategy"
}}"""

    try:
        raw = await _openrouter_call(prompt)
        # JSON extract
        start = raw.find("{")
        end = raw.rfind("}") + 1
        if start >= 0:
            return json.loads(raw[start:end])
    except Exception as e:
        print(f"OpenRouter niche report error: {e}")

    return {
        "niche_summary": f"Analysis for {keyword}",
        "opportunity_score": 50,
        "competition_level": "medium",
        "key_opportunities": [],
        "key_risks": [],
        "model": "mock"
    }
