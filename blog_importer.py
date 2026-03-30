"""
AmazenLens Blog Toplu Yukleme Scripti
--------------------------------------
Klasordeki tum .docx dosyalarini okur ve Supabase blog_posts tablosuna ekler.

Kullanim:
    python blog_importer.py --folder ./blog_dosyalari --dry-run   # once onizle
    python blog_importer.py --folder ./blog_dosyalari             # gercek yukleme

Gereksinimler:
    pip install python-docx supabase python-dotenv
"""

import os
import re
import sys
import argparse
from datetime import datetime
from pathlib import Path

# --- Bagimliliklari kontrol et ---
try:
    from docx import Document
except ImportError:
    print("Hata: python-docx yuklu degil.")
    print("Calistir: pip install python-docx")
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print("Hata: supabase yuklu degil.")
    print("Calistir: pip install supabase")
    sys.exit(1)

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass


# --- Yardimci Fonksiyonlar ---

def slugify(text: str) -> str:
    """Baslik -> URL slug donusumu"""
    tr_map = str.maketrans(
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "0123456789 "
        "cCgGiIsS",
        "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
        "0123456789-"
        "cCgGiIsS"
    )
    # Turkce karakter donusumu
    replacements = {
        'a': 'a', 'A': 'A',
        'c': 'c', 'C': 'C',
        'g': 'g', 'G': 'G',
        'i': 'i', 'I': 'I',
        'o': 'o', 'O': 'O',
        's': 's', 'S': 'S',
        'u': 'u', 'U': 'U',
    }
    
    text = text.lower().strip()
    # Turkce karakterleri degistir
    text = text.replace('a', 'a').replace('e', 'e')
    text = re.sub(r'[^\w\s-]', '', text, flags=re.UNICODE)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text


def turkce_slugify(text: str) -> str:
    """Turkce karakterleri ASCII'ye cevir ve slug olustur"""
    replacements = {
        'a': 'a', 'A': 'A',
        'c': 'c', 'C': 'C',
        'g': 'g', 'G': 'G',
        'i': 'i', 'I': 'I',
        'o': 'o', 'O': 'O',
        's': 's', 'S': 'S',
        'u': 'u', 'U': 'U',
    }
    for tr_char, en_char in replacements.items():
        text = text.replace(tr_char, en_char)
    
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text


def estimate_read_time(text: str) -> int:
    """Okuma suresi tahmini (dakika) - ortalama 200 kelime/dk"""
    words = len(text.split())
    return max(1, round(words / 200))


def extract_docx(filepath: str) -> dict:
    """
    Word dosyasini oku ve blog post icerigi cikar.
    
    Beklenen yapi:
    - Ilk paragraf: Baslik (buyuk font veya bold)
    - Ikinci paragraf: Ozet/summary (opsiyonel)
    - Geri kalan: Icerik
    """
    doc = Document(filepath)
    
    paragraphs = []
    for para in doc.paragraphs:
        text = para.text.strip()
        if text:
            try:
                style_name = para.style.name if para.style else 'Normal'
            except Exception:
                style_name = 'Normal'
            try:
                is_bold = any(run.bold for run in para.runs if run.text.strip())
            except Exception:
                is_bold = False
            paragraphs.append({
                'text': text,
                'style': style_name,
                'bold': is_bold,
            })
    
    if not paragraphs:
        return None
    
    # Baslik: ilk paragraf
    title = paragraphs[0]['text']
    
    # Ozet: ikinci paragraf (kisa ise)
    summary = ''
    content_start = 1
    if len(paragraphs) > 1:
        second = paragraphs[1]['text']
        if len(second) < 300 and not second.endswith(':'):
            summary = second
            content_start = 2
    
    # Icerik: geri kalan paragraflar
    content_parts = []
    for para in paragraphs[content_start:]:
        content_parts.append(para['text'])
    
    content = '\n\n'.join(content_parts)
    
    # Dosya adinden kategori tahmini
    filename = Path(filepath).stem.lower()
    category = 'Rehber'
    if any(w in filename for w in ['amazon', 'fba', 'satis', 'satici']):
        category = 'Amazon'
    elif any(w in filename for w in ['keyword', 'anahtar', 'seo']):
        category = 'SEO & Keywords'
    elif any(w in filename for w in ['tedarik', 'alibaba', 'urun']):
        category = 'Urun Arastirma'
    elif any(w in filename for w in ['analiz', 'nis', 'pazar']):
        category = 'Pazar Analizi'
    elif any(w in filename for w in ['yapay', 'ai', 'zeka']):
        category = 'Arac & Teknoloji'
    
    slug = turkce_slugify(title)
    
    return {
        'title_tr': title,
        'title_en': '',
        'slug': slug,
        'summary_tr': summary,
        'summary_en': '',
        'content_tr': content,
        'content_en': '',
        'cover_image': None,
        'category': category,
        'tags': [],
        'author': 'AmazenLens',
        'published': False,   # once taslak olarak ekle
        'featured': False,
        'read_time': estimate_read_time(content),
        'view_count': 0,
    }


def print_preview(post: dict, filename: str):
    """On izleme ciktisi"""
    print(f"\n{'='*60}")
    print(f"Dosya: {filename}")
    print(f"Baslik: {post['title_tr'][:80]}")
    print(f"Slug: {post['slug']}")
    print(f"Kategori: {post['category']}")
    print(f"Okuma suresi: {post['read_time']} dk")
    print(f"Ozet: {post['summary_tr'][:100] if post['summary_tr'] else '(yok)'}")
    print(f"Icerik uzunlugu: {len(post['content_tr'])} karakter")
    print(f"Durum: Taslak (published=False)")


def main():
    parser = argparse.ArgumentParser(description='AmazenLens Blog Toplu Yukleme')
    parser.add_argument('--folder', required=True, help='Word dosyalarinin bulundugu klasor')
    parser.add_argument('--dry-run', action='store_true', help='Gercekten yuklemeden onizle')
    parser.add_argument('--published', action='store_true', help='Direkt yayinla (varsayilan: taslak)')
    parser.add_argument('--category', help='Tum dosyalar icin kategori belirle')
    args = parser.parse_args()

    # Klasoru kontrol et
    folder = Path(args.folder)
    if not folder.exists():
        print(f"Hata: Klasor bulunamadi: {folder}")
        sys.exit(1)
    
    # .docx dosyalarini bul
    docx_files = list(folder.glob('*.docx'))
    if not docx_files:
        print(f"Hata: {folder} klasorunde .docx dosyasi bulunamadi")
        sys.exit(1)
    
    print(f"\n{len(docx_files)} Word dosyasi bulundu")
    
    # Supabase baglantisi — dry-run'da da kontrol et ama baglanma
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')
    
    sb = None
    if not args.dry_run:
        if not url or not key:
            # .env dosyasini oku
            env_file = Path('.env')
            if not env_file.exists():
                env_file = Path('../.env')
            if env_file.exists():
                for line in env_file.read_text().splitlines():
                    if '=' in line and not line.startswith('#'):
                        k, v = line.split('=', 1)
                        os.environ[k.strip()] = v.strip()
                url = os.getenv('SUPABASE_URL')
                key = os.getenv('SUPABASE_SERVICE_KEY') or os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('SUPABASE_ANON_KEY')
        
        if not url or not key:
            print("Hata: Supabase bilgileri bulunamadi")
            print("Cozum: .env dosyanda su satirlar olmali:")
            print("  SUPABASE_URL=https://mnpwuaupqkkgdoryfqlr.supabase.co")
            print("  SUPABASE_SERVICE_KEY=eyJ...")
            sys.exit(1)
        
        sb = create_client(url, key)
        print("Supabase baglantisi kuruldu")
    
    # Dosyalari isle
    success = 0
    errors = 0
    skipped = 0
    
    for docx_file in sorted(docx_files):
        print(f"\nIsleniyor: {docx_file.name}")
        
        try:
            post = extract_docx(str(docx_file))
            
            if not post:
                print(f"  ATLANDI: Icerik bos")
                skipped += 1
                continue
            
            if not post['title_tr'] or len(post['title_tr']) < 3:
                print(f"  ATLANDI: Baslik cok kisa")
                skipped += 1
                continue
            
            # Kategori override
            if args.category:
                post['category'] = args.category
            
            # Yayinlama durumu
            if args.published:
                post['published'] = True
            
            if args.dry_run:
                print_preview(post, docx_file.name)
                success += 1
            else:
                # Supabase'e ekle
                # Once slug cakismasi var mi kontrol et
                if not sb:
                    print("  HATA: Supabase baglantisi yok")
                    errors += 1
                    continue
                existing = sb.table('blog_posts').select('id').eq('slug', post['slug']).execute()
                if existing.data:
                    # Slug'a dosya adini ekle
                    post['slug'] = post['slug'] + '-' + str(int(datetime.now().timestamp()))[-4:]
                    print(f"  Slug cakismasi, yeni slug: {post['slug']}")
                
                if not sb:
                    print("  HATA: Supabase baglantisi yok")
                    errors += 1
                    continue
                result = sb.table('blog_posts').insert(post).execute()
                
                if result.data:
                    print(f"  BASARILI: {post['title_tr'][:60]}")
                    print(f"  Slug: {post['slug']}")
                    print(f"  ID: {result.data[0]['id']}")
                    success += 1
                else:
                    print(f"  HATA: Veri donmedi")
                    errors += 1
                    
        except Exception as e:
            print(f"  HATA: {e}")
            errors += 1
    
    # Ozet
    print(f"\n{'='*60}")
    print(f"TAMAMLANDI")
    print(f"  Basarili: {success}")
    print(f"  Atlandi:  {skipped}")
    print(f"  Hata:     {errors}")
    
    if args.dry_run:
        print(f"\nNOT: Bu bir on izlemeydi. Gercek yukleme icin --dry-run olmadan calistir")
    else:
        print(f"\nBlog admin panelinde taslak olarak gorebilirsin:")
        print(f"  https://amazenlens.com/app/blog-admin")


if __name__ == '__main__':
    main()
