import anthropic
import os
import json
from dotenv import load_dotenv

load_dotenv()

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MOCK_REVIEWS = {
    "love": [
        {"word": "dayanıklı", "count": 127, "example": "Çok dayanıklı, 2 yıldır kullanıyorum"},
        {"word": "kolay kullanım", "count": 98, "example": "Kullanımı çok kolay, herkese tavsiye ederim"},
        {"word": "kaliteli", "count": 89, "example": "Fiyatına göre kalitesi çok iyi"},
        {"word": "hızlı kargo", "count": 76, "example": "2 günde geldi, paketleme mükemmeldi"},
        {"word": "şık tasarım", "count": 64, "example": "Görünüşü çok şık, mutfağa yakışıyor"},
        {"word": "değer fiyat", "count": 58, "example": "Paranın tam karşılığını veriyor"},
    ],
    "hate": [
        {"word": "renk farklı", "count": 45, "example": "Fotoğraftaki renkten farklı geldi"},
        {"word": "küçük", "count": 38, "example": "Düşündüğümden daha küçük, aldatıcı"},
        {"word": "koku", "count": 29, "example": "İlk günlerde plastik kokusu çok rahatsız etti"},
        {"word": "tutmıyor", "count": 24, "example": "Kayıyor, zemine yapışmıyor"},
        {"word": "boya çıkıyor", "count": 18, "example": "Birkaç yıkamadan sonra boya aktı"},
    ],
    "summary": "Müşteriler genel olarak ürünün dayanıklılığından ve kullanım kolaylığından memnun. Ana şikayet renk uyumsuzluğu ve boyutun beklentiden küçük olması.",
    "sentiment_score": 72,
    "total_reviews_analyzed": 486,
    "mock": True
}

async def analyze_reviews(asin: str, reviews: list, title: str = "") -> dict:
    """Claude API ile yorumları analiz et - Love/Hate bulutu oluştur"""
    
    if not reviews or len(reviews) == 0:
        return get_mock_analysis(asin, title)
    
    try:
        reviews_text = "\n".join([
            f"- Puan: {r.get('rating', '?')}/5 | {r.get('text', r.get('body', ''))[:200]}"
            for r in reviews[:50]
        ])
        
        prompt = f"""Amazon ürün yorumlarını analiz et ve JSON formatında yanıt ver.

Ürün: {title or asin}

Yorumlar:
{reviews_text}

Şu formatta JSON döndür (başka hiçbir şey yazma):
{{
  "love": [
    {{"word": "kelime/ifade", "count": tahmini_yorum_sayısı, "example": "örnek yorum cümlesi"}}
  ],
  "hate": [
    {{"word": "kelime/ifade", "count": tahmini_yorum_sayısı, "example": "örnek yorum cümlesi"}}
  ],
  "summary": "2-3 cümlelik genel özet Türkçe",
  "sentiment_score": 0-100_arasi_genel_memnuniyet_skoru,
  "total_reviews_analyzed": analiz_edilen_yorum_sayısı,
  "mock": false
}}

Kurallar:
- love listesinde en az 5, en fazla 8 madde olsun
- hate listesinde en az 3, en fazla 6 madde olsun  
- Türkçe yorum varsa Türkçe, İngilizce varsa Türkçeye çevirerek yaz
- count değeri o konudan bahseden tahmini yorum sayısı olsun
- Sadece JSON döndür, markdown veya açıklama ekleme"""

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
        return result
        
    except Exception as e:
        print(f"Review analyzer error: {e}")
        return get_mock_analysis(asin, title)


def get_mock_analysis(asin: str, title: str = "") -> dict:
    """Mock analiz - API yokken veya hata olunca"""
    seed = sum(ord(c) for c in asin)
    
    love_words = [
        ("dayanıklı", 127), ("kolay kullanım", 98), ("kaliteli", 89),
        ("hızlı kargo", 76), ("şık tasarım", 64), ("değer fiyat", 58),
        ("sağlam", 52), ("mükemmel", 44)
    ]
    hate_words = [
        ("renk farklı", 45), ("küçük", 38), ("koku var", 29),
        ("kayıyor", 24), ("boya çıkıyor", 18), ("kırılgan", 14)
    ]
    
    import random
    random.seed(seed)
    random.shuffle(love_words)
    random.shuffle(hate_words)
    
    return {
        "love": [
            {"word": w, "count": c + random.randint(-10, 10), 
             "example": f"Bu ürün gerçekten {w}, çok memnunum!"}
            for w, c in love_words[:6]
        ],
        "hate": [
            {"word": w, "count": c + random.randint(-5, 5),
             "example": f"Maalesef {w} sorunu yaşadım."}
            for w, c in hate_words[:4]
        ],
        "summary": f"Müşteriler genel olarak ürünün kalitesinden ve kullanım kolaylığından memnun. Ana şikayet boyut ve renk konusunda.",
        "sentiment_score": 65 + (seed % 25),
        "total_reviews_analyzed": 200 + (seed % 300),
        "mock": True
    }
