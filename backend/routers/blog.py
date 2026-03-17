from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
from database.supabase import get_supabase

router = APIRouter(prefix="/api/blog", tags=["Blog"])

class BlogPostCreate(BaseModel):
    title_tr: str
    title_en: Optional[str] = None
    slug: str
    summary_tr: Optional[str] = None
    summary_en: Optional[str] = None
    content_tr: Optional[str] = None
    content_en: Optional[str] = None
    cover_image: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = []
    author: Optional[str] = "AmazenLens"
    published: Optional[bool] = False
    featured: Optional[bool] = False
    read_time: Optional[int] = 5

@router.get("/posts")
async def get_posts(
    lang: str = Query("tr"),
    category: Optional[str] = None,
    featured: Optional[bool] = None,
    limit: int = Query(10),
    offset: int = Query(0)
):
    try:
        supabase = get_supabase()
        query = supabase.table("blog_posts").select("*").eq("published", True)
        if category:
            query = query.eq("category", category)
        if featured is not None:
            query = query.eq("featured", featured)
        query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
        result = query.execute()
        return {"posts": result.data, "total": len(result.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/posts/{slug}")
async def get_post(slug: str):
    try:
        supabase = get_supabase()
        result = supabase.table("blog_posts").select("*").eq("slug", slug).eq("published", True).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Makale bulunamadı")
        post = result.data[0]
        # View count artır
        supabase.table("blog_posts").update({"view_count": post["view_count"] + 1}).eq("slug", slug).execute()
        return post
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/posts")
async def create_post(post: BlogPostCreate):
    try:
        supabase = get_supabase()
        result = supabase.table("blog_posts").insert(post.dict()).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/posts/{slug}")
async def update_post(slug: str, post: BlogPostCreate):
    try:
        supabase = get_supabase()
        result = supabase.table("blog_posts").update(post.dict()).eq("slug", slug).execute()
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/posts/{slug}")
async def delete_post(slug: str):
    try:
        supabase = get_supabase()
        supabase.table("blog_posts").delete().eq("slug", slug).execute()
        return {"message": "Makale silindi"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/categories")
async def get_categories():
    try:
        supabase = get_supabase()
        result = supabase.table("blog_posts").select("category").eq("published", True).execute()
        categories = list(set([p["category"] for p in result.data if p["category"]]))
        return {"categories": categories}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    