'use client'

import { DesignTemplate } from '@/lib/design-templates'

interface DesignTemplatePreviewProps {
  template: DesignTemplate
  size?: 'sm' | 'md' | 'lg'
  showDetails?: boolean
  onClick?: () => void
  selected?: boolean
}

export default function DesignTemplatePreview({ template, size = 'md', showDetails = true, onClick, selected }: DesignTemplatePreviewProps) {
  const { tokens, name, thumbnail, tagline, personality, heroLayout, cardStyle, mode, features, description } = template

  const heightClass = size === 'sm' ? 'h-40' : size === 'lg' ? 'h-72' : 'h-56'
  const headerHeight = size === 'sm' ? 'h-6' : size === 'lg' ? 'h-12' : 'h-8'

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
        selected ? 'border-indigo-500 ring-4 ring-indigo-200 shadow-xl' : 'border-gray-200 hover:border-indigo-300 hover:shadow-md'
      }`}
    >
      {/* Mockup Preview */}
      <div
        className={`${heightClass} relative overflow-hidden`}
        style={{
          background: tokens.tokens ? tokens.tokens.colors.background : tokens.colors.background,
        }}
      >
        {/* Mock browser chrome */}
        <div
          className={`${headerHeight} flex items-center px-2 gap-1`}
          style={{ background: tokens.colors.surface, borderBottom: `1px solid ${tokens.colors.border}` }}
        >
          <div className="w-2 h-2 rounded-full" style={{ background: tokens.colors.danger || '#EF4444' }}></div>
          <div className="w-2 h-2 rounded-full" style={{ background: tokens.colors.warning || '#F59E0B' }}></div>
          <div className="w-2 h-2 rounded-full" style={{ background: tokens.colors.success || '#10B981' }}></div>
          <div
            className="flex-1 mx-3 h-3 rounded text-[8px] flex items-center px-2"
            style={{ background: tokens.colors.background, color: tokens.colors.textMuted }}
          >
            {template.name.toLowerCase().replace(/\s+/g, '')}.onedexo.com
          </div>
        </div>

        {/* Hero mockup */}
        <div
          className="absolute inset-0 top-8 flex items-center justify-center"
          style={{ background: tokens.previewGradient }}
        >
          {heroLayout === 'centered' && (
            <div className="text-center px-3">
              <div className="text-2xl mb-1">{thumbnail}</div>
              <div
                className="text-[10px] font-bold leading-tight"
                style={{ color: tokens.colors.textInverse, fontFamily: tokens.typography.fontFamilyHeading }}
              >
                {name}
              </div>
              <div
                className="text-[7px] opacity-90 mt-0.5"
                style={{ color: tokens.colors.textInverse }}
              >
                {tagline}
              </div>
            </div>
          )}
          {heroLayout === 'split' && (
            <div className="flex items-center w-full h-full px-3">
              <div className="flex-1">
                <div className="text-lg">{thumbnail}</div>
                <div
                  className="text-[9px] font-bold leading-tight"
                  style={{ color: tokens.colors.textInverse, fontFamily: tokens.typography.fontFamilyHeading }}
                >
                  {name}
                </div>
                <div
                  className="text-[6px] opacity-80"
                  style={{ color: tokens.colors.textInverse }}
                >
                  {tagline}
                </div>
              </div>
              <div
                className="w-12 h-12 rounded"
                style={{
                  background: tokens.colors.surface,
                  border: `1px solid ${tokens.colors.border}`,
                  opacity: 0.5,
                }}
              ></div>
            </div>
          )}
          {(heroLayout === 'full-width' || heroLayout === 'video-bg' || heroLayout === 'gradient') && (
            <div className="text-center px-3">
              <div className="text-3xl mb-1">{thumbnail}</div>
              <div
                className="text-xs font-extrabold leading-tight"
                style={{ color: tokens.colors.textInverse, fontFamily: tokens.typography.fontFamilyHeading }}
              >
                {name}
              </div>
            </div>
          )}
          {heroLayout === 'side-image' && (
            <div className="flex w-full h-full">
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xl">{thumbnail}</div>
                  <div
                    className="text-[8px] font-bold"
                    style={{ color: tokens.colors.textInverse }}
                  >
                    {name}
                  </div>
                </div>
              </div>
              <div className="w-12 h-full" style={{ background: 'rgba(255,255,255,0.3)' }}></div>
            </div>
          )}

          {/* Mock cards overlay (for visual interest) */}
          {(cardStyle === 'elevated' || cardStyle === 'glassmorphism') && (
            <div className="absolute bottom-2 left-2 right-2 flex gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex-1 h-4 rounded"
                  style={{
                    background: cardStyle === 'glassmorphism' ? 'rgba(255,255,255,0.25)' : tokens.colors.surface,
                    border: `1px solid ${tokens.colors.border}`,
                    backdropFilter: cardStyle === 'glassmorphism' ? 'blur(8px)' : 'none',
                  }}
                ></div>
              ))}
            </div>
          )}
        </div>

        {/* Mode badge */}
        <div className="absolute top-2 right-2">
          <span
            className="px-2 py-0.5 text-[9px] font-bold rounded uppercase"
            style={{
              background: mode === 'dark' ? '#000' : tokens.colors.surface,
              color: mode === 'dark' ? '#FFF' : tokens.colors.text,
              border: `1px solid ${tokens.colors.border}`,
            }}
          >
            {mode === 'both' ? '☀ 🌙' : mode === 'dark' ? '🌙' : '☀'}
          </span>
        </div>

        {/* Selected checkmark */}
        {selected && (
          <div className="absolute top-2 left-2 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">✓</span>
          </div>
        )}
      </div>

      {/* Details */}
      {showDetails && (
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-base font-bold text-gray-900">{name}</h3>
              <p className="text-xs text-gray-600 mt-0.5">{tagline}</p>
            </div>
            <span className="text-2xl">{thumbnail}</span>
          </div>
          <p className="text-xs text-gray-700 mb-3 line-clamp-2">{description}</p>

          {/* Style tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded">
              {personality}
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
              {heroLayout}
            </span>
            <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-700 rounded">
              {cardStyle}
            </span>
          </div>

          {/* Color palette swatch */}
          <div className="flex items-center gap-1 mt-2">
            <div className="w-5 h-5 rounded shadow-sm" style={{ background: tokens.colors.primary }} title="Primary"></div>
            <div className="w-5 h-5 rounded shadow-sm" style={{ background: tokens.colors.secondary }} title="Secondary"></div>
            <div className="w-5 h-5 rounded shadow-sm" style={{ background: tokens.colors.accent }} title="Accent"></div>
            <div className="w-5 h-5 rounded shadow-sm border border-gray-200" style={{ background: tokens.colors.background }} title="Background"></div>
            <div className="w-5 h-5 rounded shadow-sm border border-gray-200" style={{ background: tokens.colors.surface }} title="Surface"></div>
            <span className="text-[10px] text-gray-500 ml-1">+</span>
          </div>
        </div>
      )}
    </div>
  )
}
