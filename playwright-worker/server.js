/**
 * AmazenLens Playwright Worker
 * Trendyol, Akakçe, Alibaba, DHgate, Hepsiburada scraping servisi
 *
 * ENV:
 *   PORT            = 3001 (Railway otomatik set eder)
 *   WORKER_SECRET   = sizin-sifreniz
 *   SCRAPERAPI_KEY  = scraperapi api key (Trendyol + Alibaba için)
 */

const express = require('express')
const { chromium } = require('playwright')
const https = require('https')

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3001
const WORKER_SECRET = process.env.WORKER_SECRET || 'amazenlens-worker-secret'
const SCRAPERAPI_KEY = process.env.SCRAPERAPI_KEY || ''

// ─── Singleton Browser ────────────────────────────────────────────────────────
let browser = null

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    console.log('[Browser] Launching Chromium...')
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    })
    console.log('[Browser] Ready ✅')
  }
  return browser
}

async function newPage() {
  const b = await getBrowser()
  const context = await b.newContext({
    viewport: { width: 1366, height: 768 },
    extraHTTPHeaders: {
      'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  })
  const page = await context.newPage()
  return page
}

async function closePage(page) {
  try {
    if (page) await page.context().close()
  } catch (_) {}
}

// ─── ScraperAPI REST — Cloudflare bypass (Trendyol + Alibaba) ─────────────────
// Node built-in https modülü — fetch() yerine, her Node versiyonunda çalışır
function fetchRendered(url, countryCode = 'tr') {
  return new Promise((resolve, reject) => {
    if (!SCRAPERAPI_KEY) return reject(new Error('SCRAPERAPI_KEY tanımlı değil'))
    const params = new URLSearchParams({ api_key: SCRAPERAPI_KEY, url, render: 'true' })
    if (countryCode) params.set('country_code', countryCode)
    const apiUrl = `https://api.scraperapi.com/?${params}`
    console.log(`[ScraperAPI] Fetching: ${url.substring(0, 80)}...`)
    const req = https.get(apiUrl, (res) => {
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`ScraperAPI ${res.statusCode}`))
      }
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => {
        const html = Buffer.concat(chunks).toString()
        console.log(`[ScraperAPI] ${html.length} bytes alındı`)
        resolve(html)
      })
    })
    req.setTimeout(55000, () => { req.destroy(); reject(new Error('ScraperAPI 55s timeout')) })
    req.on('error', reject)
  })
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────
function auth(req, res, next) {
  const secret = req.body?.secret || req.query?.secret || req.headers['x-worker-secret']
  if (secret !== WORKER_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// ─── Health ───────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    browser: browser?.isConnected() ? 'connected' : 'not_started',
    uptime: Math.floor(process.uptime()),
    scraperapi: SCRAPERAPI_KEY ? 'configured' : 'missing',
  })
})

// ─── Debug ────────────────────────────────────────────────────────────────────
app.post('/debug/trendyol', auth, async (req, res) => {
  const { keyword = 'yoga mat' } = req.body
  let page

  try {
    const searchUrl = `https://www.trendyol.com/sr?q=${encodeURIComponent(keyword)}&pi=1`
    const html = await fetchRendered(searchUrl, 'tr')

    page = await newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 })

    const info = await page.evaluate(() => ({
      title: document.title,
      url: location.href,
      bodyText: document.body?.innerText?.substring(0, 300),
      cardCount: document.querySelectorAll('.p-card-wrppr, [data-testid="product-card"], [class*="ProductCard"], [class*="product-card"]').length,
      allClasses: [...new Set([...document.querySelectorAll('*')].map(e => e.className).filter(c => typeof c === 'string' && c.length > 3 && c.includes('card')).slice(0, 20))],
    }))

    res.json({ info, htmlSize: html.length })
  } catch (err) {
    console.error(`[Debug] Hata: ${err.message}`)
    res.status(500).json({ error: err.message })
  } finally {
    await closePage(page)
  }
})

// ─── Trendyol Search ─────────────────────────────────────────────────────────
app.post('/scrape/trendyol', auth, async (req, res) => {
  const { keyword, max_results = 20 } = req.body
  if (!keyword) return res.status(400).json({ error: 'keyword gerekli' })

  let page

  try {
    console.log(`[Trendyol] Aranan: "${keyword}"`)
    const searchUrl = `https://www.trendyol.com/sr?q=${encodeURIComponent(keyword)}&pi=1`
    const html = await fetchRendered(searchUrl, 'tr')

    page = await newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 })

    const products = await page.evaluate((max) => {
      const selectors = [
        '.p-card-wrppr',
        '[data-testid="product-card"]',
        '[class*="ProductCard"]',
        '[class*="product-card"]',
        'article[class*="card"]',
      ]
      let cards = []
      for (const sel of selectors) {
        cards = [...document.querySelectorAll(sel)]
        if (cards.length > 0) break
      }

      return cards.slice(0, max).map((card) => {
        const linkEl = card.querySelector('a[href*="/p-"], a[href*="-p-"]') || card.querySelector('a')
        const titleEl = card.querySelector('[class*="title"], [class*="name"], h3')
        const priceEl = card.querySelector('[class*="prc"], [class*="price"], [class*="Price"]')
        const imgEl = card.querySelector('img')
        const ratingEl = card.querySelector('[class*="rating"], [class*="star"]')
        const priceText = (priceEl?.textContent || '').replace(/[^\d,]/g, '').replace(',', '.')
        const priceTRY = parseFloat(priceText) || 0
        return {
          title: (titleEl?.textContent || '').trim(),
          price_try: priceTRY,
          price: +(priceTRY / 32.5).toFixed(2),
          url: linkEl?.href || '',
          image: imgEl?.src || imgEl?.dataset?.src || '',
          seller: '',
          rating: parseFloat(ratingEl?.textContent) || 0,
          reviews_count: 0,
          in_stock: true,
          source: 'trendyol',
        }
      }).filter(p => p.title || p.url)
    }, max_results)

    console.log(`[Trendyol] ${products.length} ürün bulundu`)
    res.json({ results: products, count: products.length, source: 'trendyol', mock: false })
  } catch (err) {
    console.error(`[Trendyol] Hata: ${err.message}`)
    res.status(500).json({ error: err.message, results: [], count: 0, source: 'trendyol' })
  } finally {
    await closePage(page)
  }
})

// ─── Alibaba Search ──────────────────────────────────────────────────────────
app.post('/scrape/alibaba', auth, async (req, res) => {
  const { keyword, max_results = 20 } = req.body
  if (!keyword) return res.status(400).json({ error: 'keyword gerekli' })

  let page

  try {
    console.log(`[Alibaba] Aranan: "${keyword}"`)
    const searchUrl = `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(keyword)}&IndexArea=product_en&viewtype=G`
    const html = await fetchRendered(searchUrl, 'us')

    page = await newPage()
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 })

    const products = await page.evaluate((max) => {
      const selectors = [
        '.search-card-e-wrap',
        '[class*="offer-list-item"]',
        '[class*="SearchCard"]',
        '[data-content="offerlist"] > div',
        '.list-no-v2-outter',
      ]
      let cards = []
      for (const sel of selectors) {
        cards = [...document.querySelectorAll(sel)]
        if (cards.length > 0) break
      }

      return cards.slice(0, max).map((card) => {
        const titleEl = card.querySelector('h2, [class*="title"], .search-card-e-title')
        const priceEl = card.querySelector('[class*="price"], .search-card-e-price-main')
        const imgEl = card.querySelector('img')
        const linkEl = card.querySelector('a[href*="product"], a[href*="detail"]') || card.querySelector('a')
        const supplierEl = card.querySelector('[class*="company"], [class*="supplier"], .search-card-e-company')
        const moqEl = card.querySelector('[class*="moq"], [class*="min-order"]')
        const priceText = (priceEl?.textContent || '').replace(/[^\d.-]/g, '').split('-')[0]
        return {
          title: (titleEl?.textContent || '').trim().substring(0, 120),
          price: parseFloat(priceText) || 0,
          price_max: 0,
          url: linkEl?.href || '',
          image: imgEl?.src || imgEl?.dataset?.src || '',
          supplier: (supplierEl?.textContent || '').trim(),
          moq: (moqEl?.textContent || '1').trim(),
          country: 'CN',
          source: 'alibaba',
        }
      }).filter(p => p.title || p.url)
    }, max_results)

    console.log(`[Alibaba] ${products.length} ürün bulundu`)
    res.json({ results: products, count: products.length, source: 'alibaba', mock: false })
  } catch (err) {
    console.error(`[Alibaba] Hata: ${err.message}`)
    res.status(500).json({ error: err.message, results: [], count: 0, source: 'alibaba' })
  } finally {
    await closePage(page)
  }
})

// ─── Akakçe Search ────────────────────────────────────────────────────────────
app.post('/scrape/akakce', auth, async (req, res) => {
  const { keyword, max_results = 20 } = req.body
  if (!keyword) return res.status(400).json({ error: 'keyword gerekli' })

  let page

  try {
    console.log(`[Akakce] Aranan: "${keyword}"`)
    page = await newPage()
    const searchUrl = `https://www.akakce.com/pg/?q=${encodeURIComponent(keyword)}`
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 25000 })
    await page.waitForTimeout(1500)

    const products = await page.evaluate((max) => {
      const items = document.querySelectorAll('li[class*="w"], .w.cf, [class*="product"]')
      const result = []
      items.forEach((item) => {
        if (result.length >= max) return
        const titleEl = item.querySelector('h3, [class*="product_name"], [class*="prd_name"]')
        const priceEl = item.querySelector('[class*="pt_v"], [class*="price"], em')
        const imgEl = item.querySelector('img')
        const linkEl = item.querySelector('a[href*="urun"], a[href*="akakce"]')
        const shopEl = item.querySelector('[class*="merchant"], [class*="shop"]')
        const priceText = priceEl?.textContent?.replace(/[^\d,.]/g, '').replace(',', '.') || '0'
        const priceTRY = parseFloat(priceText) || 0
        if (!titleEl && !priceTRY) return
        result.push({
          title: titleEl?.textContent?.trim() || '',
          price_try: priceTRY,
          price: +(priceTRY / 32.5).toFixed(2),
          url: linkEl?.href || '',
          image: imgEl?.src || '',
          shop: shopEl?.textContent?.trim() || '',
          source: 'akakce',
        })
      })
      return result
    }, max_results)

    console.log(`[Akakce] ${products.length} ürün`)
    res.json({ results: products, count: products.length, source: 'akakce', mock: false })
  } catch (err) {
    console.error(`[Akakce] Hata: ${err.message}`)
    res.status(500).json({ error: err.message, results: [], count: 0, source: 'akakce' })
  } finally {
    await closePage(page)
  }
})

// ─── DHgate Search ────────────────────────────────────────────────────────────
app.post('/scrape/dhgate', auth, async (req, res) => {
  const { keyword, max_results = 20 } = req.body
  if (!keyword) return res.status(400).json({ error: 'keyword gerekli' })

  let page

  try {
    console.log(`[DHgate] Aranan: "${keyword}"`)
    page = await newPage()
    const searchUrl = `https://www.dhgate.com/wholesale/search.do?act=search&searchkey=${encodeURIComponent(keyword)}`
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    const products = await page.evaluate((max) => {
      const cards = document.querySelectorAll('.stagger-item, [class*="product-item"], .dhgate-list-item')
      const result = []
      cards.forEach((card) => {
        if (result.length >= max) return
        const titleEl = card.querySelector('[class*="title"], h3, .pro-name')
        const priceEl = card.querySelector('[class*="price"], .price-text')
        const imgEl = card.querySelector('img')
        const linkEl = card.querySelector('a')
        const moqEl = card.querySelector('[class*="moq"], [class*="min"]')
        const priceText = priceEl?.textContent?.replace(/[^\d.]/g, '') || '0'
        const price = parseFloat(priceText) || 0
        if (!titleEl || !price) return
        result.push({
          title: titleEl?.textContent?.trim() || '',
          price,
          url: linkEl?.href || '',
          image: imgEl?.src || '',
          moq: moqEl?.textContent?.trim() || '1',
          source: 'dhgate',
        })
      })
      return result
    }, max_results)

    console.log(`[DHgate] ${products.length} ürün`)
    res.json({ results: products, count: products.length, source: 'dhgate', mock: false })
  } catch (err) {
    console.error(`[DHgate] Hata: ${err.message}`)
    res.status(500).json({ error: err.message, results: [], count: 0, source: 'dhgate' })
  } finally {
    await closePage(page)
  }
})

// ─── Hepsiburada Search ───────────────────────────────────────────────────────
app.post('/scrape/hepsiburada', auth, async (req, res) => {
  const { keyword, max_results = 20 } = req.body
  if (!keyword) return res.status(400).json({ error: 'keyword gerekli' })

  let page

  try {
    console.log(`[Hepsiburada] Aranan: "${keyword}"`)
    page = await newPage()
    const searchUrl = `https://www.hepsiburada.com/ara?q=${encodeURIComponent(keyword)}`
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)

    const products = await page.evaluate((max) => {
      const cards = document.querySelectorAll('[data-test-id="product-card"], [class*="productCard"]')
      const result = []
      cards.forEach((card) => {
        if (result.length >= max) return
        const titleEl = card.querySelector('[data-test-id="product-card-name"], h3')
        const priceEl = card.querySelector('[data-test-id="price-current"], [class*="price"]')
        const imgEl = card.querySelector('img')
        const linkEl = card.querySelector('a')
        const priceText = priceEl?.textContent?.replace(/[^\d,.]/g, '').replace(',', '.') || '0'
        const priceTRY = parseFloat(priceText) || 0
        if (!titleEl) return
        result.push({
          title: titleEl?.textContent?.trim() || '',
          price_try: priceTRY,
          price: +(priceTRY / 32.5).toFixed(2),
          url: linkEl?.href || '',
          image: imgEl?.src || '',
          source: 'hepsiburada',
        })
      })
      return result
    }, max_results)

    console.log(`[Hepsiburada] ${products.length} ürün`)
    res.json({ results: products, count: products.length, source: 'hepsiburada', mock: false })
  } catch (err) {
    console.error(`[Hepsiburada] Hata: ${err.message}`)
    res.status(500).json({ error: err.message, results: [], count: 0, source: 'hepsiburada' })
  } finally {
    await closePage(page)
  }
})

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✅ Playwright Worker → http://localhost:${PORT}`)
  console.log(`   Endpoints: /health, /scrape/trendyol, /scrape/akakce, /scrape/dhgate, /scrape/hepsiburada`)
  console.log(`   ScraperAPI: ${SCRAPERAPI_KEY ? '✅ configured' : '❌ missing'}`)
  await getBrowser().catch(console.error)
})

process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM — kapatılıyor...')
  if (browser) await browser.close()
  process.exit(0)
})
