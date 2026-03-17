import anthropic
import os
import json
import math
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

LANG_PROMPTS = {
    "tr": "Türkçe olarak yaz. Tüm kelimeler, örnekler ve özet Türkçe olsun.",
    "en": "Write in English. All words, examples and summary must be in English.",
    "de": "Schreibe auf Deutsch. Alle Wörter, Beispiele und die Zusammenfassung müssen auf Deutsch sein.",
    "fr": "Écris en français. Tous les mots, exemples et le résumé doivent être en français.",
}

async def analyze_reviews(asin: str, reviews: list, title: str = "", lang: str = "tr") -> dict:
    if not reviews or len(reviews) == 0:
        return get_mock_analysis(asin, title, lang)

    try:
        reviews_text = "\n".join([
            f"- Rating: {r.get('rating', '?')}/5 | {r.get('text', r.get('body', ''))[:200]}"
            for r in reviews[:50]
        ])

        lang_instruction = LANG_PROMPTS.get(lang, LANG_PROMPTS["tr"])

        prompt = f"""Analyze these Amazon product reviews and return JSON only.

Product: {title or asin}
Language instruction: {lang_instruction}

Reviews:
{reviews_text}

Return ONLY this JSON (no markdown, no explanation):
{{
  "love": [
    {{"word": "keyword/phrase", "count": estimated_count, "example": "example sentence"}}
  ],
  "hate": [
    {{"word": "keyword/phrase", "count": estimated_count, "example": "example sentence"}}
  ],
  "summary": "2-3 sentence summary",
  "sentiment_score": 0_to_100,
  "total_reviews_analyzed": number,
  "mock": false
}}

Rules:
- love: min 5, max 8 items
- hate: min 3, max 6 items
- {lang_instruction}
- Return ONLY valid JSON"""

        message = client.messages.create(
            model="claude-opus-4-5",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )

        response_text = message.content[0].text.strip()
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]

        result = json.loads(response_text)
        result["mock"] = False
        result["lang"] = lang
        return result

    except Exception as e:
        print(f"Review analyzer error: {e}")
        return get_mock_analysis(asin, title, lang)


def get_mock_analysis(asin: str, title: str = "", lang: str = "tr") -> dict:
    seed = sum(ord(c) for c in asin)
    offset = int(abs(math.sin(seed)) * 20)

    mock_data = {
        "tr": {
            "love": [
                {"word": "dayanıklı", "count": 127, "example": "Çok dayanıklı, 2 yıldır kullanıyorum"},
                {"word": "kolay kullanım", "count": 98, "example": "Kullanımı çok kolay, herkese tavsiye ederim"},
                {"word": "kaliteli malzeme", "count": 89, "example": "Fiyatına göre kalitesi gerçekten çok iyi"},
                {"word": "hızlı kargo", "count": 76, "example": "2 günde geldi, paketleme mükemmeldi"},
                {"word": "şık tasarım", "count": 64, "example": "Görünüşü çok şık, odaya yakışıyor"},
                {"word": "değer fiyat", "count": 58, "example": "Paranın tam karşılığını veriyor"},
            ],
            "hate": [
                {"word": "renk farklı", "count": 45, "example": "Fotoğraftaki renkten farklı geldi"},
                {"word": "beklenenden küçük", "count": 38, "example": "Düşündüğümden daha küçük, ölçülere dikkat edin"},
                {"word": "plastik koku", "count": 29, "example": "İlk günlerde plastik kokusu çok rahatsız etti"},
                {"word": "kayıyor", "count": 24, "example": "Alt kısım kayıyor, zemine yapışmıyor"},
            ],
            "summary": "Müşteriler ürünün dayanıklılığından memnun. Ana şikayet renk uyumsuzluğu ve boyut.",
        },
        "en": {
            "love": [
                {"word": "durable", "count": 127, "example": "Very durable, been using for 2 years with no issues"},
                {"word": "easy to use", "count": 98, "example": "So easy to use, highly recommend"},
                {"word": "great quality", "count": 89, "example": "Great quality for the price"},
                {"word": "fast shipping", "count": 76, "example": "Arrived in 2 days, excellent packaging"},
                {"word": "stylish design", "count": 64, "example": "Looks great, fits perfectly"},
                {"word": "value for money", "count": 58, "example": "Absolutely worth every penny"},
            ],
            "hate": [
                {"word": "color different", "count": 45, "example": "Color looks different from photos"},
                {"word": "smaller than expected", "count": 38, "example": "Much smaller than expected, check measurements"},
                {"word": "plastic smell", "count": 29, "example": "Strong plastic smell for first few days"},
                {"word": "slippery", "count": 24, "example": "Bottom slides around, doesn't stay in place"},
            ],
            "summary": "Customers are satisfied with durability and ease of use. Main complaints are color mismatch and smaller size than expected.",
        },
        "de": {
            "love": [
                {"word": "langlebig", "count": 127, "example": "Sehr langlebig, seit 2 Jahren ohne Probleme"},
                {"word": "einfache Bedienung", "count": 98, "example": "Sehr einfach zu bedienen, empfehle ich sehr"},
                {"word": "gute Qualität", "count": 89, "example": "Tolle Qualität für den Preis"},
                {"word": "schneller Versand", "count": 76, "example": "In 2 Tagen geliefert, perfekte Verpackung"},
                {"word": "schickes Design", "count": 64, "example": "Sieht toll aus, passt perfekt"},
                {"word": "preiswert", "count": 58, "example": "Absolut jeden Cent wert"},
            ],
            "hate": [
                {"word": "Farbe abweichend", "count": 45, "example": "Farbe sieht anders aus als auf Fotos"},
                {"word": "kleiner als erwartet", "count": 38, "example": "Viel kleiner als gedacht, Maße prüfen"},
                {"word": "Plastikgeruch", "count": 29, "example": "Starker Plastikgeruch in den ersten Tagen"},
                {"word": "rutscht", "count": 24, "example": "Unterseite rutscht, hält nicht stand"},
            ],
            "summary": "Kunden sind zufrieden mit Haltbarkeit. Hauptbeschwerden sind Farbabweichungen und kleinere Größe.",
        },
        "fr": {
            "love": [
                {"word": "durable", "count": 127, "example": "Très durable, utilisé depuis 2 ans sans problème"},
                {"word": "facile à utiliser", "count": 98, "example": "Très facile à utiliser, je le recommande"},
                {"word": "bonne qualité", "count": 89, "example": "Excellente qualité pour le prix"},
                {"word": "livraison rapide", "count": 76, "example": "Livré en 2 jours, emballage parfait"},
                {"word": "design élégant", "count": 64, "example": "Très beau, s'intègre parfaitement"},
                {"word": "rapport qualité-prix", "count": 58, "example": "Vraiment vaut chaque centime"},
            ],
            "hate": [
                {"word": "couleur différente", "count": 45, "example": "La couleur est différente des photos"},
                {"word": "plus petit qu'attendu", "count": 38, "example": "Beaucoup plus petit que prévu"},
                {"word": "odeur plastique", "count": 29, "example": "Forte odeur de plastique les premiers jours"},
                {"word": "glisse", "count": 24, "example": "Le dessous glisse, ne reste pas en place"},
            ],
            "summary": "Les clients sont satisfaits de la durabilité. Plaintes principales: couleur et taille.",
        }
    }

    data = mock_data.get(lang, mock_data["tr"])

    love = [{"word": i["word"], "count": i["count"] + offset, "example": i["example"]} for i in data["love"]]
    hate = [{"word": i["word"], "count": i["count"] + offset // 2, "example": i["example"]} for i in data["hate"]]

    return {
        "love": love,
        "hate": hate,
        "summary": data["summary"],
        "sentiment_score": 65 + (seed % 25),
        "total_reviews_analyzed": 200 + (seed % 300),
        "mock": True,
        "lang": lang
    }
