import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { useTranslation } from 'react-i18next'

const API = import.meta.env.VITE_API_URL || 'https://amazenlens-production.up.railway.app'

const BOT_SYSTEM = `Sen AmazenLens'in AI asistanısın. AmazenLens, Türk Amazon satıcıları için geliştirilmiş bir araştırma platformudur.

Bildiğin konular:
- AmazenLens özellikleri: Niş Skoru, Love/Hate analizi, Euro Flips arbitraj, Pan-EU FBA kar hesabı, Unavailable Scanner, Türk tedarikçi modülü, Quick Picks
- Amazon FBA: fulfillment, BSR, Buy Box, PPC, ürün araştırması, kategori analizi
- Niş skoru metodolojisi: 100 puanlık sistem, 4 boyut (Hacim/Lojistik/Rekabet/Karlılık), BSR power-law, RVI, Trend skoru, 3-Prong testi
- Fiyatlandırma: Free (5 arama/gün), Starter $24/ay (50 arama), Pro $49/ay (200 arama), Agency $99/ay (sınırsız)
- 14 günlük ücretsiz Pro deneme var

Kısa, net ve yardımcı cevaplar ver. Türkçe konuş.`

const QUICK_QUESTIONS = [
  'Niş skoru nasıl hesaplanıyor?',
  'Euro Flips nedir?',
  'Hangi plan bana uyar?',
  'FBA vs FBM farkı nedir?',
  'Unavailable Scanner ne işe yarar?',
]

const POINT_ACTIONS = {
  feedback_submit: 50,
  bug_report: 200,
  nps_score: 20,
  vote: 5,
}

export default function FeedbackPage() {
  const { t } = useTranslation()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [activeTab, setActiveTab] = useState('feature')
  const [feedbackText, setFeedbackText] = useState('')
  const [npsScore, setNpsScore] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [points, setPoints] = useState(user.lens_points || 0)
  const [pointAnimation, setPointAnimation] = useState(null)
  const [votes, setVotes] = useState({ 1: 47, 2: 38, 3: 29, 4: 24, 5: 19 })
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Merhaba! AmazenLens hakkında sorularınızı yanıtlamak için buradayım. Size nasıl yardımcı olabilirim?' }
  ])
  const [botInput, setBotInput] = useState('')
  const [botLoading, setBotLoading] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Supabase'den gerçek toplam lens puanı çek
  useEffect(() => {
    if (!user.id) return
    axios.get(`${API}/api/feedback/points/${user.id}`)
      .then(res => { if (res.data?.points !== undefined) setPoints(res.data.points) })
      .catch(() => {})
  }, [])

  const addPoints = (action, amount) => {
    setPoints(prev => prev + amount)
    setPointAnimation(`+${amount} Lens Puanı`)
    setTimeout(() => setPointAnimation(null), 2500)
    if (user.id) {
      axios.post(`${API}/api/feedback/add-points`, {
        user_id: user.id,
        action,
        points: amount
      }).catch(() => {})
    }
  }

  const handleFeedbackSubmit = async () => {
    if (!feedbackText.trim()) return
    try {
      await axios.post(`${API}/api/feedback/submit`, {
        user_id: user.id || 'guest',
        type: activeTab,
        text: feedbackText,
        nps_score: npsScore,
      })
    } catch {}
    setSubmitted(true)
    addPoints('feedback_submit', activeTab === 'bug' ? POINT_ACTIONS.bug_report : POINT_ACTIONS.feedback_submit)
    if (npsScore) addPoints('nps_score', POINT_ACTIONS.nps_score)
    setTimeout(() => { setSubmitted(false); setFeedbackText(''); setNpsScore(null) }, 3000)
  }

  const handleVote = (id) => {
    setVotes(prev => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
    addPoints('vote', POINT_ACTIONS.vote)
  }

  const sendBotMessage = async (text) => {
    if (!text.trim()) return
    const userMsg = { role: 'user', content: text }
    const updatedMessages = [...messages, userMsg]
    setMessages(updatedMessages)
    setBotInput('')
    setBotLoading(true)

    try {
      const res = await axios.post(`${API}/api/feedback/bot`, {
        system: BOT_SYSTEM,
        messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
      })
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Bağlantı hatası. Lütfen tekrar deneyin.' }])
    } finally {
      setBotLoading(false)
    }
  }

  const POPULAR_REQUESTS = [
    { id: 1, text: 'Chrome eklentisi ekleyin', tag: 'Özellik', color: '#0071e3' },
    { id: 2, text: 'Trendyol → Amazon arbitraj modülü', tag: 'Özellik', color: '#0071e3' },
    { id: 3, text: 'Mobil uygulama', tag: 'Özellik', color: '#0071e3' },
    { id: 4, text: 'Toplu niş skoru export (Excel)', tag: 'İyileştirme', color: '#ff9f0a' },
    { id: 5, text: 'Favori ürün listesi', tag: 'Özellik', color: '#0071e3' },
  ]

  const levelName = points < 500 ? 'Yeni Üye' : points < 2000 ? 'Araştırmacı' : points < 5000 ? 'Niş Avcısı' : 'Uzman'
  const levelColor = points < 500 ? '#8e8e93' : points < 2000 ? '#0071e3' : points < 5000 ? '#ff9f0a' : '#af52de'

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", maxWidth: '960px' }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pointPop{0%{opacity:0;transform:translateY(0) scale(0.8)}30%{opacity:1;transform:translateY(-20px) scale(1.1)}100%{opacity:0;transform:translateY(-50px) scale(1)}}
        .tab-btn{padding:8px 16px;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:500;font-family:inherit;transition:all 0.15s}
        .msg-bubble{max-width:80%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.5;animation:fadeUp 0.2s ease}
      `}</style>

      {pointAnimation && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#1d1d1f', color: '#ffd60a', padding: '10px 18px', borderRadius: '20px', fontSize: '14px', fontWeight: '600', zIndex: 9999, animation: 'pointPop 2.5s ease forwards' }}>
          🪙 {pointAnimation}
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '22px', fontWeight: '600', color: '#1d1d1f', letterSpacing: '-0.4px', marginBottom: '4px' }}>
          {t('feedback.title')}
        </div>
        <div style={{ fontSize: '13px', color: '#8e8e93' }}>
          {t('feedback.subtitle')}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '16px' }}>

        {/* Sol — Feedback */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Lens Puan Kartı */}
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: levelColor + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🪙</div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '600', color: '#1d1d1f' }}>{points.toLocaleString()}</div>
                <div style={{ fontSize: '12px', color: '#8e8e93' }}>{t('feedback.lens_points')} · <span style={{ color: levelColor, fontWeight: '500' }}>{levelName}</span></div>
              </div>
            </div>
            <div style={{ textAlign: 'right', fontSize: '12px', color: '#8e8e93' }}>
              <div>{t('feedback.send_feedback')} <span style={{ color: '#34c759', fontWeight: '500' }}>+50</span></div>
              <div>{t('feedback.bug_report')} <span style={{ color: '#34c759', fontWeight: '500' }}>+200</span></div>
              <div>{t('feedback.nps_score')} <span style={{ color: '#34c759', fontWeight: '500' }}>+20</span></div>
            </div>
          </div>

          {/* Feedback Formu */}
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '24px', animation: 'fadeUp 0.3s ease' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>🎉</div>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#1a7f37', marginBottom: '4px' }}>{t('feedback.thanks_title')}</div>
                <div style={{ fontSize: '13px', color: '#8e8e93' }}>{t('feedback.thanks_desc')}</div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
                  {[
                    { key: 'feature', label: `💡 ${t('feedback.tab_feature')}`, color: '#0071e3' },
                    { key: 'bug', label: `🐛 ${t('feedback.tab_bug')}`, color: '#ff3b30' },
                    { key: 'general', label: `💬 ${t('feedback.tab_general')}`, color: '#8e8e93' },
                  ].map(tab => (
                    <button key={tab.key} className="tab-btn" onClick={() => setActiveTab(tab.key)}
                      style={{ background: activeTab === tab.key ? tab.color + '15' : '#f5f5f7', color: activeTab === tab.key ? tab.color : '#8e8e93', border: activeTab === tab.key ? `0.5px solid ${tab.color}40` : '0.5px solid transparent' }}>
                      {tab.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                  placeholder={
                    activeTab === 'feature' ? t('feedback.placeholder_feature') :
                    activeTab === 'bug' ? t('feedback.placeholder_bug') :
                    t('feedback.placeholder_general')
                  }
                  rows={5}
                  style={{ width: '100%', padding: '12px', border: '0.5px solid #d2d2d7', borderRadius: '9px', fontSize: '13px', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box', background: '#f5f5f7', lineHeight: '1.6' }}
                />

                <div style={{ marginTop: '16px', marginBottom: '18px' }}>
                  <div style={{ fontSize: '12px', color: '#8e8e93', marginBottom: '8px' }}>{t('feedback.nps_label')}</div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1,2,3,4,5,6,7,8,9,10].map(n => (
                      <button key={n} onClick={() => setNpsScore(n)}
                        style={{ flex: 1, padding: '7px 0', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', fontFamily: 'inherit', background: npsScore === n ? (n >= 9 ? '#34c759' : n >= 7 ? '#ff9f0a' : '#ff3b30') : '#f5f5f7', color: npsScore === n ? 'white' : '#8e8e93', transition: 'all 0.15s' }}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#aeaeb2' }}>
                    <span>{t('feedback.nps_low')}</span><span>{t('feedback.nps_high')}</span>
                  </div>
                </div>

                <button onClick={handleFeedbackSubmit} disabled={!feedbackText.trim()}
                  style={{ width: '100%', padding: '11px', background: feedbackText.trim() ? '#0071e3' : '#d2d2d7', color: 'white', border: 'none', borderRadius: '9px', fontSize: '13px', fontWeight: '500', cursor: feedbackText.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                  {t('feedback.submit_btn_prefix')} {activeTab === 'bug' ? '200' : '50'} {t('feedback.submit_btn_suffix')} 🪙
                </button>
              </>
            )}
          </div>

          {/* Popüler İstekler */}
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', padding: '20px' }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#1d1d1f', marginBottom: '14px' }}>🔥 {t('feedback.popular_title')}</div>
            {POPULAR_REQUESTS.map(req => (
              <div key={req.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '11px 0', borderBottom: req.id < POPULAR_REQUESTS.length ? '0.5px solid #f5f5f7' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: '#1d1d1f', marginBottom: '3px' }}>{req.text}</div>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: req.color + '15', color: req.color, fontWeight: '500' }}>{req.tag}</span>
                </div>
                <button onClick={() => handleVote(req.id)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', padding: '8px 14px', border: '0.5px solid #d2d2d7', borderRadius: '8px', background: 'white', cursor: 'pointer', minWidth: '50px' }}>
                  <span style={{ fontSize: '14px' }}>▲</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#1d1d1f' }}>{votes[req.id] || 0}</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ — AI Bot */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ background: 'white', borderRadius: '12px', border: '0.5px solid #e5e5ea', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '600px' }}>
            <div style={{ padding: '14px 16px', borderBottom: '0.5px solid #f5f5f7', display: 'flex', alignItems: 'center', gap: '10px', background: '#1d1d1f' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0071e3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>🤖</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '500', color: 'white' }}>{t('feedback.bot_title')}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{t('feedback.bot_powered')}</div>
              </div>
              <div style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: '#34c759' }}></div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div className="msg-bubble" style={{
                    background: msg.role === 'user' ? '#0071e3' : '#f5f5f7',
                    color: msg.role === 'user' ? 'white' : '#1d1d1f',
                    borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {botLoading && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: '#f5f5f7', borderRadius: '12px 12px 12px 2px', padding: '12px 16px', display: 'flex', gap: '4px' }}>
                    {[0,1,2].map(i => (
                      <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#aeaeb2', animation: `spin 1s ease-in-out ${i * 0.2}s infinite` }}></div>
                    ))}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {messages.length <= 1 && (
              <div style={{ padding: '0 14px 10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {QUICK_QUESTIONS.map(q => (
                  <button key={q} onClick={() => sendBotMessage(q)}
                    style={{ padding: '5px 10px', border: '0.5px solid #d2d2d7', borderRadius: '20px', background: 'white', fontSize: '11px', color: '#3c3c43', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div style={{ padding: '12px', borderTop: '0.5px solid #f5f5f7', display: 'flex', gap: '8px' }}>
              <input
                value={botInput}
                onChange={e => setBotInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendBotMessage(botInput)}
                placeholder={t('feedback.ask_placeholder')}
                style={{ flex: 1, padding: '9px 12px', border: '0.5px solid #d2d2d7', borderRadius: '9px', fontSize: '13px', fontFamily: 'inherit', outline: 'none', background: '#f5f5f7' }}
              />
              <button onClick={() => sendBotMessage(botInput)} disabled={!botInput.trim() || botLoading}
                style={{ width: '36px', height: '36px', background: botInput.trim() ? '#0071e3' : '#d2d2d7', border: 'none', borderRadius: '9px', cursor: botInput.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="14" height="14" fill="none" stroke="white" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
