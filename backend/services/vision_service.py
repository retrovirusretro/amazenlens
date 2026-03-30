import os
import json
import httpx
import anthropic

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

PROMPT = """You are an expert Amazon product listing analyst. Analyze this product image and return ONLY valid JSON with this exact structure:
{
  "colors": ["color1", "color2"],
  "material": "estimated material/fabric",
  "size_estimate": "S/M/L or dimensions estimate from visual cues",
  "packaging_score": 0-100,
  "packaging_notes": "brief note on packaging quality",
  "photo_quality_score": 0-100,
  "photo_notes": "brief note on photo quality (background, lighting, angle)",
  "tags": ["tag1", "tag2", "tag3"],
  "listing_tips": ["tip1", "tip2"],
  "overall_score": 0-100,
  "summary": "one sentence description"
}
Return ONLY the JSON, no markdown, no explanation."""

async def analyze_product_image(image_url: str) -> dict:
    # Download image bytes
    async with httpx.AsyncClient(verify=False, timeout=20) as http:
        resp = await http.get(image_url)
        resp.raise_for_status()
        image_bytes = resp.content
        media_type = resp.headers.get("content-type", "image/jpeg").split(";")[0]

    import base64
    img_b64 = base64.standard_b64encode(image_bytes).decode()

    msg = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": img_b64,
                    }
                },
                {"type": "text", "text": PROMPT}
            ]
        }]
    )

    text = msg.content[0].text.strip()
    # Sanitize if wrapped in code blocks
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    return json.loads(text)
