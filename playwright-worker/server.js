/**
 * AmazenLens Playwright Worker
 * Trendyol, Akakçe, DHgate scraping servisi
 *
 * ENV:
 *   PORT            = 3001 (Railway otomatik set eder)
 *   WORKER_SECRET   = amazenlens-worker-secret
 */

const express = require('express')
const { chromium } = require('playwright')

const app = express()
app.use(express.json())

const PORT = process.env.PORT || 3001
const WORKER_SECRET = process.env.WORKER_SECRET || 'amazenlens-worker-secret'

// ─── Singleton Browser ────────────────────────────────────────────────────────
let browser = null

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    console.log('[Browser] Launching Chromium...')
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-zygote',
        '--single-process',
      ],
    })
    console.log('[Browser] Ready ✅')
  }
  return browser
}

async function newPage(b) {
  const page = await b.newPage()
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  })
  await page.setViewportSize({ width: 1366, height: 768 })
  // Gerçek kullanıcı gibi görün
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
  })
  return page
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
  })
})

// ─── Trendyol Search ─────────────────────────────────────────────────────────
/**
 * POST /scrape/trendyol
 * Body: { keyword, max_results, secret }
 * Returns: { results: [{title, price, price_try, url, image, seller, rating, reviews_count}], count, source }
 */
app.post('/scrape/trendyol', auth, async (req, res) => {
  const { keyword, max_results = 20 } = req.body
  if (!keyword) return res.status(400).json({ error: 'keyword gerekli' })

  const b = await getBrowser()
  const page = await newPage(b)
  const products = []

  try {
    console.log(`[Trendyol] Aranan: "${keyword}"`)

    // Trendyol API yanıtlarını yakala (DOM scraping'den daha güvenilir)
    page.on('response', async (response) => {
      try {
        const url = response.url()
        if (
          url.includes('searchgw-service') &&
          url.includes('filter') &&
          response.status() === 200
        ) {
          const ct = response.headers()['content-type'] || ''
          if (!ct.includes('json')) return

          const json = await response.json().catch(() => null)
          if (!json) return

          // Trendyol API yapısı: result.products veya products
          const rawProducts = json?.result?.products || json?.products || []
          for (const p of rawProducts) {
            if (products.length >= max_results) break
            const priceRaw = p.price?.discountedPrice?.value || p.price?.originalPrice?.value || 0
            products.push({
              title: p.name || p.title || '',
              price_try: priceRaw,
              price: +(priceRaw / 32.5).toFixed(2), // TRY → USD yaklaşık
              url: `https://www.trendyol.com${p.url || ''}`,
              image: p.images?.[0] || p.imageUrl || '',
              seller: p.merchantName || p.brand?.name || '',
              rating: p.ratingScore || 0,
              reviews_count: p.reviewCount || 0,
              in_stock: true,
              source: 'trendyol',
            })
          }
        }
      } catch (_) {}
    })

    const searchUrl = `https://www.trendyol.com/sr?q=${encodeURIComponent(keyword)}&pi=1`
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 })

    // API yakalanmadıysa DOM fallback
    if (products.length === 0) {
      console.log('[Trendyol] API yakalanamadı, DOM fallback...')
      await page.waitForSelector('[data-id], .p-card-wrppr', { timeout: 10000 }).catch(() => {})

      const domProducts = await page.evaluate((max) => {
        const cards = document.querySelectorAll('.p-card-wrppr, [class*="product-card"]')
        const result = []
        for (let i = 0; i < Math.min(cards.length, max); i++) {
          const card = cards[i]
          const titleEl = card.querySelector('.prdct-desc-cntnr-ttl, [class*="product-title"]')
          const priceEl = card.querySelector('.prc-box-dscntd, .prc-box-sllng, [class*="price"]')
          const imgEl = card.querySelector('img')
          const linkEl = card.querySelector('a')
          const priceText = priceEl?.textContent?.replace(/[^\d,]/g, '').replace(',', '.') || '0'
          const priceTRY = parseFloat(priceText) || 0
          result.push({
            title: titleEl?.textContent?.trim() || '',
            price_try: priceTRY,
            price: +(priceTRY / 32.5).toFixed(2),
            url: linkEl?.href || '',
            image: imgEl?.src || '',
            seller: '',
            rating: 0,
            reviews_count: 0,
            in_stock: true,
            source: 'trendyol',
          })
        }
        return result
      }, max_results)

      products.push(...domProducts)
    }

    console.log(`[Trendyol] ${products.length} ürün bulundu`)
    res.json({ results: products, count: products.length, source: 'trendyol', mock: false })
  } catch (err) {
    console.error(`[Trendyol] Hata: ${err.message}`)
    res.status(500).json({ error: err.message, results: [], count: 0, source: 'trendyol' })
  } finally {
    await page.close()
  }
})

// ─── Akakçe Search ────────────────────────────────────────────────────────────
/**
 * POST /scrape/akakce
 * Body: { keyword, max_results, secret }
 * Returns: { results: [{title, price, price_try, url, image, shop}], count, source }
 */
app.post('/scrape/akakce', auth, async (req, res) => {
  const { keyword, max_results = 20 } = req.body
  if (!keyword) return res.status(400).json({ error: 'keyword gerekli' })

  const b = await getBrowser()
  const page = await newPage(b)

  try {
    console.log(`[Akakce] Aranan: "${keyword}"`)
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
    await page.close()
  }
})

// ─── DHgate Search ────────────────────────────────────────────────────────────
/**
 * POST /scrape/dhgate
 * Body: { keyword, max_results, secret }
 */
app.post('/scrape/dhgate', auth, async (req, res) => {
  const { keyword, max_results = 20 } = req.body
  if (!keyword) return res.status(400).json({ error: 'keyword gerekli' })

  const b = await getBrowser()
  const page = await newPage(b)

  try {
    console.log(`[DHgate] Aranan: "${keyword}"`)
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
    await page.close()
  }
})

// ─── Hepsiburada Search ───────────────────────────────────────────────────────
app.post('/scrape/hepsiburada', auth, async (req, res) => {
  const { keyword, max_results = 20 } = req.body
  if (!keyword) return res.status(400).json({ error: 'keyword gerekli' })

  const b = await getBrowser()
  const page = await newPage(b)

  try {
    console.log(`[Hepsiburada] Aranan: "${keyword}"`)
    const searchUrl = `https://www.hepsiburada.com/ara?q=${encodeURIComponent(keyword)}`
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(1000)

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
    await page.close()
  }
})

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✅ Playwright Worker → http://localhost:${PORT}`)
  console.log(`   Endpoints: /health, /scrape/trendyol, /scrape/akakce, /scrape/dhgate, /scrape/hepsiburada`)
  // Browser'ı önceden ısıt
  await getBrowser().catch(console.error)
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] SIGTERM — kapatılıyor...')
  if (browser) await browser.close()
  process.exit(0)
})
