// Merkezi fiyat sabitler — burası değişince her yer güncellenir
export const PLANS = {
  free:    { name: 'Free',    price: 0,  searches: 5 },
  starter: { name: 'Starter', price: 24, searches: 50 },
  pro:     { name: 'Pro',     price: 49, searches: 200 },
  agency:  { name: 'Agency',  price: 99, searches: -1 },
}

export const STARTER_PRICE = PLANS.starter.price   // 24
export const PRO_PRICE     = PLANS.pro.price        // 49
export const AGENCY_PRICE  = PLANS.agency.price     // 99
