import { supabase } from './api'

/**
 * AmazenLens Event Tracker
 * Kullanıcı davranışlarını Supabase'e kaydeder
 */

const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}')
  } catch {
    return {}
  }
}

export const track = async (eventType, data = {}) => {
  try {
    const user = getUser()
    const userId = user?.id || user?.email || 'guest'

    await supabase.from('user_events').insert({
      user_id: userId,
      event_type: eventType,
      data: {
        ...data,
        url: window.location.pathname,
        timestamp: new Date().toISOString(),
      }
    })
  } catch (err) {
    // Sessizce hata yut — tracking hiçbir zaman uygulamayı bozmamalı
    console.debug('Track error:', err)
  }
}

// Hazır event sabitleri
export const Events = {
  KEYWORD_SEARCH:   'keyword_search',
  PRODUCT_VIEW:     'product_view',
  NICHE_SCORE_VIEW: 'niche_score_view',
  SOURCING_VIEW:    'sourcing_view',
  BULK_UPLOAD:      'bulk_upload',
  PRICING_VIEW:     'pricing_view',
  CHECKOUT_START:   'checkout_start',
  FEEDBACK_SUBMIT:  'feedback_submit',
  BLOG_VIEW:        'blog_view',
}
