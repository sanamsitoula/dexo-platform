'use client'

import { DesignTemplate, DesignTokens } from '@/lib/design-templates'

interface Props {
  template: DesignTemplate
  colors: DesignTokens['colors']
  siteTitle: string
  tagline: string
  logo: string
  menuItems: string[]
  aboutText: string
  contact: { email: string; phone: string; address: string }
  socials: Record<string, string>
  footer: { tagline: string; copyright: string }
  hideDexoBranding?: boolean
}

const SOCIAL_ICONS: Record<string, { icon: string; color: string }> = {
  facebook: { icon: '📘', color: '#1877F2' },
  instagram: { icon: '📸', color: '#E1306C' },
  twitter: { icon: '🐦', color: '#1DA1F2' },
  linkedin: { icon: '💼', color: '#0A66C2' },
  youtube: { icon: '📺', color: '#FF0000' },
  tiktok: { icon: '🎵', color: '#000000' },
  whatsapp: { icon: '💬', color: '#25D366' },
  telegram: { icon: '✈️', color: '#0088CC' },
}

export default function TenantWebsiteMockup({
  template,
  colors,
  siteTitle,
  tagline,
  logo,
  menuItems,
  aboutText,
  contact,
  socials,
  footer,
  hideDexoBranding = false,
}: Props) {
  const tokens = template.tokens
  const activeSocials = Object.entries(socials).filter(([_, v]) => v && v.trim())

  // Card style switch
  const cardClass =
    template.cardStyle === 'flat'
      ? 'border'
      : template.cardStyle === 'elevated'
      ? 'shadow-lg'
      : template.cardStyle === 'outlined'
      ? 'border-2'
      : 'border backdrop-blur-md'

  const cardStyle: React.CSSProperties = {
    background: template.cardStyle === 'glassmorphism' ? 'rgba(255,255,255,0.6)' : colors.surface,
    borderColor: template.cardStyle === 'outlined' || template.cardStyle === 'flat' ? colors.border : 'transparent',
    borderRadius: tokens.layout.borderRadius,
  }

  return (
    <div
      className="font-sans"
      style={{
        background: colors.background,
        color: colors.text,
        fontFamily: tokens.typography.fontFamily,
      }}
    >
      {/* Top navigation bar */}
      <nav
        className="flex items-center justify-between px-6 py-3"
        style={{
          background: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
        }}
      >
        <div className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt={siteTitle} className="h-8" style={{ borderRadius: tokens.layout.borderRadius }} />
          ) : (
            <div
              className="w-8 h-8 flex items-center justify-center text-white font-bold"
              style={{ background: colors.primary, borderRadius: tokens.layout.borderRadius }}
            >
              {siteTitle.charAt(0).toUpperCase() || 'B'}
            </div>
          )}
          <div>
            <p className="text-sm font-bold leading-tight" style={{ color: colors.text, fontFamily: tokens.typography.fontFamilyHeading }}>
              {siteTitle || 'Your Brand'}
            </p>
            {tagline && <p className="text-[10px] leading-tight" style={{ color: colors.textMuted }}>{tagline}</p>}
          </div>
        </div>
        <div className="hidden md:flex items-center gap-4 text-xs" style={{ color: colors.text }}>
          {(menuItems.length > 0 ? menuItems : ['Home', 'About', 'Contact']).slice(0, 6).map((m, i) => (
            <span
              key={i}
              className="cursor-pointer"
              style={{ color: i === 0 ? colors.primary : colors.text, fontWeight: i === 0 ? 600 : 400 }}
            >
              {m}
            </span>
          ))}
        </div>
        <button
          className="px-3 py-1 text-xs font-semibold text-white"
          style={{ background: colors.primary, borderRadius: tokens.layout.borderRadius }}
        >
          Get Started
        </button>
      </nav>

      {/* Hero */}
      <section
        className="relative px-6 py-12"
        style={{
          background: tokens.previewGradient || `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
          color: colors.textInverse,
          minHeight: 220,
        }}
      >
        {template.heroLayout === 'split' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center max-w-4xl mx-auto">
            <div>
              <p className="text-xs uppercase tracking-widest opacity-80 mb-2">Welcome to</p>
              <h1
                className="text-3xl font-bold mb-3"
                style={{ fontFamily: tokens.typography.fontFamilyHeading, fontWeight: tokens.typography.headingWeight as any }}
              >
                {siteTitle || 'Your Brand'}
              </h1>
              {tagline && <p className="text-sm opacity-90 mb-4">{tagline}</p>}
              <button className="px-5 py-2 text-sm font-semibold" style={{ background: colors.surface, color: colors.primary, borderRadius: tokens.layout.borderRadius }}>
                Learn more →
              </button>
            </div>
            <div
              className="hidden md:block h-32"
              style={{ background: 'rgba(255,255,255,0.2)', borderRadius: tokens.layout.borderRadiusLg }}
            />
          </div>
        ) : template.heroLayout === 'side-image' ? (
          <div className="flex max-w-4xl mx-auto gap-4 items-center">
            <div className="flex-1">
              <h1
                className="text-3xl font-bold mb-2"
                style={{ fontFamily: tokens.typography.fontFamilyHeading }}
              >
                {siteTitle || 'Your Brand'}
              </h1>
              {tagline && <p className="text-sm opacity-90">{tagline}</p>}
            </div>
            <div
              className="w-32 h-32 flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.2)', borderRadius: tokens.layout.borderRadiusLg }}
            />
          </div>
        ) : (
          <div className="text-center max-w-3xl mx-auto">
            <div className="text-5xl mb-3">{template.thumbnail}</div>
            <h1
              className="text-3xl md:text-4xl font-bold mb-3"
              style={{ fontFamily: tokens.typography.fontFamilyHeading, fontWeight: tokens.typography.headingWeight as any }}
            >
              {siteTitle || 'Your Brand'}
            </h1>
            {tagline && <p className="text-base opacity-90 mb-4 max-w-xl mx-auto">{tagline}</p>}
            <div className="flex justify-center gap-2">
              <button className="px-5 py-2 text-sm font-semibold" style={{ background: colors.surface, color: colors.primary, borderRadius: tokens.layout.borderRadius }}>
                Get Started
              </button>
              <button
                className="px-5 py-2 text-sm font-semibold border-2"
                style={{ borderColor: colors.surface, color: colors.surface, background: 'transparent', borderRadius: tokens.layout.borderRadius }}
              >
                Learn More
              </button>
            </div>
          </div>
        )}
      </section>

      {/* About section (only if aboutText provided) */}
      {aboutText && (
        <section className="px-6 py-8 max-w-4xl mx-auto">
          <h2
            className="text-xl font-bold mb-3"
            style={{ color: colors.text, fontFamily: tokens.typography.fontFamilyHeading }}
          >
            About us
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: colors.textMuted }}>{aboutText}</p>
        </section>
      )}

      {/* Feature / Service cards */}
      <section className="px-6 py-8" style={{ background: colors.surfaceAlt }}>
        <div className="max-w-4xl mx-auto">
          <h2
            className="text-xl font-bold mb-4 text-center"
            style={{ color: colors.text, fontFamily: tokens.typography.fontFamilyHeading }}
          >
            What we offer
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { icon: '⭐', title: 'Quality service' },
              { icon: '🤝', title: 'Trusted by many' },
              { icon: '🚀', title: 'Fast & reliable' },
            ].map((card, i) => (
              <div
                key={i}
                className={`p-4 ${cardClass}`}
                style={cardStyle}
              >
                <div className="text-3xl mb-2">{card.icon}</div>
                <h3
                  className="text-sm font-semibold mb-1"
                  style={{ color: colors.text, fontFamily: tokens.typography.fontFamilyHeading }}
                >
                  {card.title}
                </h3>
                <p className="text-xs" style={{ color: colors.textMuted }}>
                  Sample description for the feature. The real content lives in your tenant dashboard.
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact section (only if contact provided) */}
      {(contact.email || contact.phone || contact.address) && (
        <section className="px-6 py-8 max-w-4xl mx-auto">
          <h2
            className="text-xl font-bold mb-3 text-center"
            style={{ color: colors.text, fontFamily: tokens.typography.fontFamilyHeading }}
          >
            Get in touch
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {contact.email && (
              <div className="p-3 text-center" style={{ background: colors.surface, borderRadius: tokens.layout.borderRadius, border: `1px solid ${colors.border}` }}>
                <p className="text-2xl mb-1">📧</p>
                <p className="text-xs font-semibold" style={{ color: colors.text }}>Email</p>
                <p className="text-xs" style={{ color: colors.textMuted }}>{contact.email}</p>
              </div>
            )}
            {contact.phone && (
              <div className="p-3 text-center" style={{ background: colors.surface, borderRadius: tokens.layout.borderRadius, border: `1px solid ${colors.border}` }}>
                <p className="text-2xl mb-1">📞</p>
                <p className="text-xs font-semibold" style={{ color: colors.text }}>Phone</p>
                <p className="text-xs" style={{ color: colors.textMuted }}>{contact.phone}</p>
              </div>
            )}
            {contact.address && (
              <div className="p-3 text-center" style={{ background: colors.surface, borderRadius: tokens.layout.borderRadius, border: `1px solid ${colors.border}` }}>
                <p className="text-2xl mb-1">📍</p>
                <p className="text-xs font-semibold" style={{ color: colors.text }}>Address</p>
                <p className="text-xs" style={{ color: colors.textMuted }}>{contact.address}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer with socials */}
      <footer
        className="px-6 py-6"
        style={{ background: colors.secondary, color: colors.textInverse }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                {logo ? (
                  <img src={logo} alt={siteTitle} className="h-6 bg-white rounded p-0.5" />
                ) : (
                  <div
                    className="w-6 h-6 flex items-center justify-center text-xs font-bold"
                    style={{ background: colors.accent, borderRadius: tokens.layout.borderRadius }}
                  >
                    {(siteTitle || 'B').charAt(0).toUpperCase()}
                  </div>
                )}
                <p className="text-sm font-bold">{siteTitle || 'Your Brand'}</p>
              </div>
              {footer.tagline && <p className="text-xs opacity-80 max-w-md">{footer.tagline}</p>}
            </div>

            {/* Social network icons */}
            {activeSocials.length > 0 && (
              <div className="flex items-center gap-2">
                {activeSocials.map(([key, url]) => {
                  const meta = SOCIAL_ICONS[key] || { icon: '🔗', color: colors.accent }
                  return (
                    <span
                      key={key}
                      title={`${key}: ${url}`}
                      className="w-8 h-8 flex items-center justify-center text-base"
                      style={{ background: meta.color, borderRadius: tokens.layout.borderRadius }}
                    >
                      {meta.icon}
                    </span>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer menu */}
          {menuItems.length > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20 flex flex-wrap gap-3 text-xs opacity-80">
              {menuItems.map((m, i) => (
                <span key={i} className="cursor-pointer">{m}</span>
              ))}
            </div>
          )}

          {/* Copyright + Dexo branding */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs opacity-70">
            <p>{footer.copyright || `© ${new Date().getFullYear()} ${siteTitle || name || 'Your Brand'}. All rights reserved.`}</p>
            <p className="text-[10px]">
              {hideDexoBranding ? '' : 'Powered by Dexo'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
