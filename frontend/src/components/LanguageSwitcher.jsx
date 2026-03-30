import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const LANGUAGES = [
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
]

export default function LanguageSwitcher({ dark = false }) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)

  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0]

  const handleChange = (code) => {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: '6px',
          padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
          border: dark ? '1px solid rgba(255,255,255,0.2)' : '0.5px solid #e4e4e7',
          background: dark ? 'rgba(255,255,255,0.08)' : 'white',
          color: dark ? 'white' : '#09090b',
          fontSize: '13px', fontWeight: '500', fontFamily: 'inherit',
          backdropFilter: 'blur(10px)',
        }}
      >
        <span>{current.flag}</span>
        <span>{current.code.toUpperCase()}</span>
        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
          style={{ opacity: 0.6, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 98 }} />

          {/* Dropdown */}
          <div style={{
            position: 'absolute', top: '38px', right: 0, zIndex: 99,
            background: 'white', border: '0.5px solid #e4e4e7',
            borderRadius: '12px', padding: '6px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
            minWidth: '160px',
          }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleChange(lang.code)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '8px 12px', borderRadius: '8px', cursor: 'pointer',
                  border: 'none', fontFamily: 'inherit', fontSize: '13px', fontWeight: '500',
                  background: i18n.language === lang.code ? '#f4f4f5' : 'transparent',
                  color: i18n.language === lang.code ? '#09090b' : '#52525b',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '16px' }}>{lang.flag}</span>
                <span>{lang.label}</span>
                {i18n.language === lang.code && (
                  <span style={{ marginLeft: 'auto', color: '#6366f1', fontSize: '12px' }}>✓</span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
