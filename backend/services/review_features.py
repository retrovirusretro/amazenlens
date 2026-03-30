"""
Review Feature Extractor — spaCy NLP
Review listesinden ürüne özgü özellik/şikayet/övgü çıkarır.

spaCy modelleri (Railway'de ilk çalışmada indirilir):
  python -m spacy download en_core_web_sm
  python -m spacy download de_core_news_sm
  python -m spacy download fr_core_news_sm
"""
import os
from collections import Counter
from typing import Optional

# spaCy lazy load — tüm modeller import sırasında yüklenmesin
_nlp_cache: dict = {}

SPACY_MODELS = {
    "en": "en_core_web_sm",
    "de": "de_core_news_sm",
    "fr": "fr_core_news_sm",
    "tr": "en_core_web_sm",   # Türkçe model yoksa İngilizce kullan
}

# Yoksay — Amazon review boilerplate kelimeleri
STOPWORDS_EXTRA = {
    "product", "item", "amazon", "order", "buy", "purchase", "seller",
    "star", "review", "rating", "recommend", "use", "used", "using",
    "great", "good", "bad", "okay", "nice", "love", "hate", "like",
    "thing", "lot", "bit", "way", "time", "day", "month", "week",
}


def _get_nlp(lang: str = "en"):
    """spaCy modelini lazy load et"""
    model_name = SPACY_MODELS.get(lang, "en_core_web_sm")
    if model_name in _nlp_cache:
        return _nlp_cache[model_name]
    try:
        import spacy
        nlp = spacy.load(model_name)
        _nlp_cache[model_name] = nlp
        return nlp
    except OSError:
        try:
            # Model yüklü değilse indir
            import spacy
            from spacy.cli import download
            download(model_name)
            nlp = spacy.load(model_name)
            _nlp_cache[model_name] = nlp
            return nlp
        except Exception as e:
            print(f"⚠️ spaCy model '{model_name}' yüklenemedi: {e}")
            return None


def extract_features(reviews: list, lang: str = "en", top_n: int = 15) -> dict:
    """
    Review listesinden:
    - product_features: sık geçen ürün özellikleri (noun phrases)
    - complaints: negatif bağlamda geçen özellikler
    - praises: pozitif bağlamda geçen özellikler
    - opportunity_keywords: rakip listelerde eksik, müşterilerin talep ettiği

    reviews: [{"text": "...", "rating": 4.5}, ...]
    """
    if not reviews:
        return _empty_result()

    nlp = _get_nlp(lang)
    if nlp is None:
        return _fallback_extract(reviews, top_n)

    texts_pos, texts_neg = [], []
    for r in reviews[:100]:
        text = r.get("text", r.get("body", "")) if isinstance(r, dict) else str(r)
        rating = r.get("rating", 3.0) if isinstance(r, dict) else 3.0
        try:
            rating = float(rating)
        except Exception:
            rating = 3.0
        if text:
            if rating >= 4.0:
                texts_pos.append(text)
            elif rating <= 2.0:
                texts_neg.append(text)

    all_texts = texts_pos + texts_neg

    # Noun phrase extraction
    feature_counter = Counter()
    praise_counter = Counter()
    complaint_counter = Counter()

    POSITIVE_DEPS = {"nsubj", "dobj", "pobj", "attr"}
    NEGATIVE_TRIGGERS = {"not", "no", "never", "poor", "bad", "worst", "broken",
                         "disappointed", "terrible", "awful", "doesn't", "didn't",
                         "don't", "won't", "can't", "cannot"}

    for text in all_texts[:80]:
        try:
            doc = nlp(text[:500])
            for chunk in doc.noun_chunks:
                phrase = chunk.root.lemma_.lower()
                if (len(phrase) > 2
                        and phrase not in STOPWORDS_EXTRA
                        and not phrase.isdigit()
                        and chunk.root.pos_ in {"NOUN", "PROPN"}):
                    feature_counter[phrase] += 1

                    # Negatif bağlam kontrolü
                    context_tokens = {t.lower_ for t in doc[max(0, chunk.start-3):chunk.end+2]}
                    if context_tokens & NEGATIVE_TRIGGERS:
                        complaint_counter[phrase] += 1
                    else:
                        # Ürün pozitif context
                        pass

            # Positif/negatif ayrımı için rating tabanlı yaklaşım
            is_positive = text in texts_pos
            for chunk in doc.noun_chunks:
                phrase = chunk.root.lemma_.lower()
                if len(phrase) > 2 and phrase not in STOPWORDS_EXTRA:
                    if is_positive:
                        praise_counter[phrase] += 1
                    else:
                        complaint_counter[phrase] += 1

        except Exception:
            continue

    # En çok geçen özellikler
    features = [{"feature": k, "mentions": v} for k, v in feature_counter.most_common(top_n)]
    praises = [{"feature": k, "mentions": v} for k, v in praise_counter.most_common(8)]
    complaints = [{"feature": k, "mentions": v} for k, v in complaint_counter.most_common(8)]

    # Opportunity: complaints'te var ama praises'te yok → müşteri talep ediyor
    praise_set = {p["feature"] for p in praises}
    opportunities = [c for c in complaints if c["feature"] not in praise_set][:5]

    return {
        "product_features": features,
        "praises": praises,
        "complaints": complaints,
        "opportunities": opportunities,
        "total_reviews_analyzed": len(reviews),
        "positive_reviews": len(texts_pos),
        "negative_reviews": len(texts_neg),
        "spacy_model": SPACY_MODELS.get(lang, "en_core_web_sm"),
        "mock": False,
    }


def _fallback_extract(reviews: list, top_n: int = 15) -> dict:
    """spaCy yüklenemezsee basit word frequency ile çalış"""
    word_counter = Counter()
    for r in reviews[:100]:
        text = r.get("text", r.get("body", "")) if isinstance(r, dict) else str(r)
        for word in text.lower().split():
            word = word.strip(".,!?\"'()")
            if len(word) > 4 and word not in STOPWORDS_EXTRA:
                word_counter[word] += 1
    features = [{"feature": k, "mentions": v} for k, v in word_counter.most_common(top_n)]
    return {
        "product_features": features,
        "praises": [], "complaints": [], "opportunities": [],
        "total_reviews_analyzed": len(reviews),
        "positive_reviews": 0, "negative_reviews": 0,
        "spacy_model": "fallback_wordfreq", "mock": False,
    }


def _empty_result() -> dict:
    return {
        "product_features": [], "praises": [], "complaints": [], "opportunities": [],
        "total_reviews_analyzed": 0, "positive_reviews": 0, "negative_reviews": 0,
        "spacy_model": "none", "mock": True,
    }
