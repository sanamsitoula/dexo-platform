/**
 * scripts/seed/visual-templates/seed-visual-templates.ts
 *
 * Core data module for the visual template seed.
 * Called by index.ts — also exported for use in tests or admin scripts.
 *
 * Each template entry maps 1:1 to a BusinessTypeTemplate row identified
 * by its unique domainType field. Only visual/UX fields are set here;
 * business logic fields (features, onboardingSteps) are intentionally
 * minimal so this seed doesn't conflict with 01-domain-templates.ts.
 *
 * VISUAL FIELD GUIDE
 * ──────────────────
 * websiteSections[key].variant  →  React component variant name
 *                                  (maps to /apps/tenant-website/components/sections/variants/)
 * websiteSections[key].style    →  CSS modifier class applied to that variant
 *                                  (maps to /apps/tenant-website/styles/section-modifiers.css)
 * dashboardLayout.widgets[].style → dashboard widget card style token
 *                                  (maps to /apps/tenant-admin/components/widgets/)
 *
 * ASSET PATHS
 * ───────────
 * heroImage/heroVideo paths are MinIO object keys under the
 * /templates/ prefix. Actual files must be uploaded separately.
 * Use the placeholder paths as-is until assets are ready.
 */

import { PrismaClient } from '@prisma/client'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SectionConfig {
  enabled: boolean
  variant?: string
  style?: string
  label?: string
  text?: string
  items?: string[]
}

interface WebsiteSections {
  [sectionKey: string]: SectionConfig
}

interface DashboardWidget {
  id: string
  col: number
  row: number
  w: number
  h: number
  style: string
}

interface VisualTemplateInput {
  /** Must match an existing DomainType enum value */
  domainType: string
  /** Human-readable name for this visual theme */
  themeName: string
  /** Short description of the visual direction */
  themeDescription: string
  tagline: string
  heroImage?: string
  heroVideo?: string
  colorPrimary: string
  colorAccent: string
  colorBg: string
  /** Secondary background, used for section alternation */
  colorSurface?: string
  fontHeading: string
  fontBody: string
  websiteSections: WebsiteSections
  dashboardWidgetStyles: DashboardWidget[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Template definitions — 12 domain types
// ─────────────────────────────────────────────────────────────────────────────

const visualTemplates: VisualTemplateInput[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. FITNESS_CENTER — "Pulse 3D / Apex Pulse"
  //    Dark mode · neon accents · glassmorphism UI · video hero
  //    Inspired by: Motionsites.ai Immersive Ocean / Apex Pulse
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domainType:       'FITNESS_CENTER',
    themeName:        'Pulse 3D',
    themeDescription: 'High-energy dark mode with neon accents, glassmorphism cards, and a 3D video hero.',
    tagline:          'Transform your limits. Train in the future.',
    heroVideo:        '/templates/fitness/hero-3d-dark.mp4',
    heroImage:        '/templates/fitness/hero-3d-poster.jpg',
    colorPrimary:     '#FF4500',   // Neon orange
    colorAccent:      '#00F0FF',   // Cyan
    colorBg:          '#0A0A0A',   // Near-black
    colorSurface:     '#111827',   // Elevated card bg
    fontHeading:      'Space Grotesk',
    fontBody:         'Inter',
    websiteSections: {
      hero:         { enabled: true,  variant: 'video-bg-3d',         style: 'glassmorphism-cta'  },
      stats:        { enabled: true,  variant: 'animated-counters',   style: 'neon-border',
                      items: ['Active Members', 'Expert Trainers', 'Weekly Classes', 'Locations'] },
      services:     { enabled: true,  variant: '3d-tilt-cards',       style: 'neon-edge',         label: 'Our Programs'    },
      trainers:     { enabled: true,  variant: 'glass-cards',         style: 'hover-glow',        label: 'Elite Coaches'   },
      schedule:     { enabled: true,  variant: 'interactive-timeline',style: 'dark-surface'                                },
      pricing:      { enabled: true,  variant: 'holographic-tiers',   style: 'neon-highlight'                              },
      testimonials: { enabled: true,  variant: 'video-reviews',       style: 'dark-glass'                                  },
      gallery:      { enabled: true,  variant: 'masonry-parallax',    style: 'dark-overlay'                                },
      contact:      { enabled: true,  variant: 'split-screen-map',    style: 'dark-surface'                                },
      cta:          { enabled: true,  variant: 'glowing-button',      text: 'Start Your Free Trial'                        },
    },
    dashboardWidgetStyles: [
      { id: 'active-members',    col: 1, row: 1, w: 2, h: 1, style: 'neon-chart'    },
      { id: 'todays-classes',    col: 3, row: 1, w: 2, h: 1, style: 'glass-card'    },
      { id: 'revenue-chart',     col: 1, row: 2, w: 4, h: 2, style: 'area-gradient' },
      { id: 'upcoming-renewals', col: 1, row: 4, w: 2, h: 2, style: 'pulse-list'    },
      { id: 'trainer-schedule',  col: 3, row: 4, w: 2, h: 2, style: 'timeline'      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. RESTAURANT_AND_CAFE — "Appetite / Warm Bistro"
  //    Rich dark warm tones · cinematic food photography · live order flow
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domainType:       'RESTAURANT_AND_CAFE',
    themeName:        'Warm Bistro',
    themeDescription: 'Cinematic food photography, full-bleed warm-toned hero, and immersive menu experience.',
    tagline:          'Every plate tells a story.',
    heroVideo:        '/templates/restaurant/hero-warmtones.mp4',
    heroImage:        '/templates/restaurant/hero-warmtones.jpg',
    colorPrimary:     '#C0392B',   // Deep red
    colorAccent:      '#E67E22',   // Amber
    colorBg:          '#1A0A00',   // Dark warm brown
    colorSurface:     '#2C1500',   // Elevated surface
    fontHeading:      'Playfair Display',
    fontBody:         'Lato',
    websiteSections: {
      hero:        { enabled: true,  variant: 'full-bleed-video',   style: 'overlay-warm'                              },
      menu:        { enabled: true,  variant: 'tabbed-menu-grid',   style: 'warm-surface',  label: 'Our Menu'         },
      specials:    { enabled: true,  variant: 'highlight-carousel', style: 'amber-accent',  label: "Today's Specials" },
      reservation: { enabled: true,  variant: 'inline-date-picker', style: 'warm-glass'                               },
      story:       { enabled: true,  variant: 'split-media',        style: 'warm-overlay',  label: 'Our Story'        },
      gallery:     { enabled: true,  variant: 'masonry-parallax',   style: 'warm-overlay'                             },
      reviews:     { enabled: true,  variant: 'elegant-carousel',   style: 'dark-warm'                                },
      contact:     { enabled: true,  variant: 'split-screen-map',   style: 'dark-surface'                             },
      cta:         { enabled: true,  variant: 'solid-primary',      text: 'Reserve a Table'                           },
    },
    dashboardWidgetStyles: [
      { id: 'todays-reservations', col: 1, row: 1, w: 2, h: 1, style: 'warm-card'    },
      { id: 'active-orders',       col: 3, row: 1, w: 2, h: 1, style: 'badge-count'  },
      { id: 'revenue-chart',       col: 1, row: 2, w: 4, h: 2, style: 'area-gradient'},
      { id: 'table-status',        col: 1, row: 4, w: 2, h: 2, style: 'grid-map'     },
      { id: 'popular-items',       col: 3, row: 4, w: 2, h: 2, style: 'ranked-list'  },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ECOMMERCE — "Luxury Glassmorphism"
  //    Elegant minimalist · gold accents · 3D product rotations · parallax
  //    Inspired by: Motionsites.ai Luxury Ecommerce / Bloom
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domainType:       'ECOMMERCE',
    themeName:        'Luxury Glass',
    themeDescription: 'Minimalist elegance with glassmorphism product cards, gold accents, and smooth parallax.',
    tagline:          'Curated excellence, delivered to your door.',
    heroImage:        '/templates/ecommerce/hero-luxury.jpg',
    colorPrimary:     '#1A1A1A',   // Near-black
    colorAccent:      '#D4AF37',   // Gold
    colorBg:          '#F8F9FA',   // Off-white
    colorSurface:     '#FFFFFF',   // White
    fontHeading:      'Playfair Display',
    fontBody:         'Lato',
    websiteSections: {
      hero:               { enabled: true,  variant: 'parallax-product',   style: 'minimalist'                                     },
      featuredCategories: { enabled: true,  variant: 'glass-grid',         style: 'gold-border',   label: 'Shop by Category'      },
      bestSellers:        { enabled: true,  variant: 'horizontal-scroll',  style: 'product-hover', label: 'Best Sellers'          },
      newArrivals:        { enabled: true,  variant: 'masonry-parallax',   style: 'light-overlay', label: 'New Arrivals'          },
      brandStory:         { enabled: true,  variant: 'split-media',        style: 'minimal-type',  label: 'Our Craft'             },
      reviews:            { enabled: true,  variant: 'elegant-carousel',   style: 'gold-stars'                                    },
      newsletter:         { enabled: true,  variant: 'inline-glass',       style: 'gold-border'                                   },
      footer:             { enabled: true,  variant: 'mega-footer',        style: 'dark-minimal'                                  },
      cta:                { enabled: true,  variant: 'solid-accent',       text: 'Shop the Collection'                            },
    },
    dashboardWidgetStyles: [
      { id: 'total-sales',   col: 1, row: 1, w: 2, h: 1, style: 'gold-accent'  },
      { id: 'top-products',  col: 3, row: 1, w: 2, h: 1, style: 'clean-list'   },
      { id: 'sales-trend',   col: 1, row: 2, w: 4, h: 2, style: 'smooth-line'  },
      { id: 'low-stock',     col: 1, row: 4, w: 2, h: 2, style: 'alert-card'   },
      { id: 'recent-orders', col: 3, row: 4, w: 2, h: 2, style: 'table-glass'  },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. HEALTHCARE_CLINIC — "Clarity Core / Bio-Digital"
  //    Trust-building · clean white + medical blue · soft gradients
  //    Inspired by: Motionsites.ai Clarity Core / Wellness Hero
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domainType:       'HEALTHCARE_CLINIC',
    themeName:        'Clarity Core',
    themeDescription: 'Trust-building white and medical blue with soft gradients and interactive scheduling.',
    tagline:          'Advanced care, compassionate touch.',
    heroImage:        '/templates/healthcare/hero-clarity.jpg',
    colorPrimary:     '#0077B6',   // Medical blue
    colorAccent:      '#90E0EF',   // Soft cyan
    colorBg:          '#FFFFFF',
    colorSurface:     '#F0F8FF',   // Alice blue
    fontHeading:      'Plus Jakarta Sans',
    fontBody:         'Open Sans',
    websiteSections: {
      hero:         { enabled: true,  variant: 'trust-builder',         style: 'soft-gradient'                                     },
      services:     { enabled: true,  variant: 'icon-grid',             style: 'blue-card',     label: 'Our Specialties'          },
      doctors:      { enabled: true,  variant: 'team-cards',            style: 'professional',  label: 'Meet Our Specialists'     },
      booking:      { enabled: true,  variant: 'interactive-scheduler', style: 'clean-blue',    label: 'Book an Appointment'      },
      stats:        { enabled: true,  variant: 'animated-counters',     style: 'blue-accent',
                      items: ['Patients Served', 'Specialists', 'Years of Care', 'Success Rate'] },
      testimonials: { enabled: true,  variant: 'patient-stories',       style: 'soft-card'                                        },
      insurance:    { enabled: true,  variant: 'logo-carousel',         style: 'light-surface', label: 'Accepted Insurance'       },
      contact:      { enabled: true,  variant: 'map-and-info',          style: 'clean-split'                                      },
      cta:          { enabled: true,  variant: 'solid-primary',         text: 'Emergency? Call Now'                               },
    },
    dashboardWidgetStyles: [
      { id: 'todays-appointments', col: 1, row: 1, w: 2, h: 1, style: 'clean-card'  },
      { id: 'patient-count',       col: 3, row: 1, w: 2, h: 1, style: 'blue-accent' },
      { id: 'revenue-chart',       col: 1, row: 2, w: 4, h: 2, style: 'bar-chart'   },
      { id: 'upcoming-procedures', col: 1, row: 4, w: 2, h: 2, style: 'timeline'    },
      { id: 'staff-schedule',      col: 3, row: 4, w: 2, h: 2, style: 'calendar'    },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. SALON_AND_SPA — "Organic Odyssey / Luxury Botanical"
  //    Zen · organic · soft natural lighting · botanical elements
  //    Inspired by: Motionsites.ai Organic Odyssey / Bloom
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domainType:       'SALON_AND_SPA',
    themeName:        'Luxury Botanical',
    themeDescription: 'Zen organic aesthetic with soft natural lighting, botanical motifs, and elegant serif typography.',
    tagline:          'Elevate your senses. Restore your glow.',
    heroImage:        '/templates/salon/hero-botanical.jpg',
    colorPrimary:     '#5C4033',   // Warm brown
    colorAccent:      '#A8D5A2',   // Sage green
    colorBg:          '#FAF7F2',   // Warm cream
    colorSurface:     '#F0E8DC',   // Linen
    fontHeading:      'Cormorant Garamond',
    fontBody:         'Nunito Sans',
    websiteSections: {
      hero:         { enabled: true,  variant: 'cinematic-fade',      style: 'soft-botanical'                                   },
      services:     { enabled: true,  variant: 'elegant-icon-cards',  style: 'earthy-border', label: 'Our Treatments'         },
      stylists:     { enabled: true,  variant: 'portrait-cards',      style: 'soft-shadow',   label: 'Our Experts'            },
      booking:      { enabled: true,  variant: 'inline-calendar',     style: 'earthy-glass',  label: 'Book a Session'         },
      gallery:      { enabled: true,  variant: 'soft-masonry',        style: 'cream-overlay'                                  },
      testimonials: { enabled: true,  variant: 'elegant-carousel',    style: 'earthy-card'                                    },
      products:     { enabled: true,  variant: 'glass-grid',          style: 'sage-border',   label: 'Retail Products'        },
      contact:      { enabled: true,  variant: 'map-and-info',        style: 'warm-split'                                     },
      cta:          { enabled: true,  variant: 'outline-earthy',      text: 'Book Your Experience'                            },
    },
    dashboardWidgetStyles: [
      { id: 'todays-bookings',   col: 1, row: 1, w: 2, h: 1, style: 'earthy-card'    },
      { id: 'staff-utilization', col: 3, row: 1, w: 2, h: 1, style: 'soft-progress'  },
      { id: 'revenue-chart',     col: 1, row: 2, w: 4, h: 2, style: 'smooth-line'    },
      { id: 'service-breakdown', col: 1, row: 4, w: 2, h: 2, style: 'donut-chart'    },
      { id: 'upcoming-bookings', col: 3, row: 4, w: 2, h: 2, style: 'timeline'       },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. HOTEL_AND_HOSPITALITY — "Aetheris Voyage / Scenic Travel"
  //    Luxurious · full-screen video · parallax · golden palette
  //    Inspired by: Motionsites.ai Yacht Club / Aetheris Voyage
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domainType:       'HOTEL_AND_HOSPITALITY',
    themeName:        'Aetheris Voyage',
    themeDescription: 'Immersive cinematic luxury with full-screen video tours, parallax imagery, and gold accents.',
    tagline:          'Where every stay becomes a story.',
    heroVideo:        '/templates/hotel/hero-cinematic.mp4',
    heroImage:        '/templates/hotel/hero-cinematic-poster.jpg',
    colorPrimary:     '#1C1C1E',   // Near-black
    colorAccent:      '#C9A84C',   // Warm gold
    colorBg:          '#F5F0E8',   // Antique white
    colorSurface:     '#EDE8DE',   // Linen
    fontHeading:      'Cormorant Garamond',
    fontBody:         'Raleway',
    websiteSections: {
      hero:         { enabled: true,  variant: 'fullscreen-video',   style: 'cinematic-overlay'                              },
      rooms:        { enabled: true,  variant: '3d-tilt-cards',      style: 'gold-border',    label: 'Rooms & Suites'       },
      amenities:    { enabled: true,  variant: 'icon-grid',          style: 'elegant-dark',   label: 'Hotel Amenities'      },
      booking:      { enabled: true,  variant: 'date-range-picker',  style: 'gold-accent',    label: 'Check Availability'   },
      gallery:      { enabled: true,  variant: 'immersive-lightbox', style: 'dark-overlay'                                  },
      dining:       { enabled: true,  variant: 'split-media',        style: 'warm-luxury',    label: 'Dining & Bar'         },
      testimonials: { enabled: true,  variant: 'elegant-carousel',   style: 'gold-card'                                     },
      location:     { enabled: true,  variant: 'split-screen-map',   style: 'dark-surface',   label: 'Find Us'              },
      cta:          { enabled: true,  variant: 'gold-shimmer',       text: 'Reserve Your Stay'                              },
    },
    dashboardWidgetStyles: [
      { id: 'occupancy-rate',    col: 1, row: 1, w: 2, h: 1, style: 'gold-accent'   },
      { id: 'todays-checkins',   col: 3, row: 1, w: 2, h: 1, style: 'clean-card'    },
      { id: 'revenue-chart',     col: 1, row: 2, w: 4, h: 2, style: 'area-gradient' },
      { id: 'room-status-grid',  col: 1, row: 4, w: 2, h: 2, style: 'color-grid'    },
      { id: 'upcoming-checkins', col: 3, row: 4, w: 2, h: 2, style: 'timeline'      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. SCHOOL_AND_EDUCATION — "Bright Academy"
  //    Vibrant · clean · course-driven · student-forward
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domainType:       'SCHOOL_AND_EDUCATION',
    themeName:        'Bright Academy',
    themeDescription: 'Vibrant academic theme built around course discovery, enrollment, and student progress.',
    tagline:          'Empowering minds, building futures.',
    heroImage:        '/templates/school/hero-campus.jpg',
    colorPrimary:     '#1565C0',   // Royal blue
    colorAccent:      '#FFC107',   // Amber yellow
    colorBg:          '#FAFAFA',
    colorSurface:     '#FFFFFF',
    fontHeading:      'Plus Jakarta Sans',
    fontBody:         'Open Sans',
    websiteSections: {
      hero:         { enabled: true,  variant: 'split-media',        style: 'vibrant-blue'                                   },
      programs:     { enabled: true,  variant: 'tabbed-card-grid',   style: 'blue-card',     label: 'Our Programs'         },
      faculty:      { enabled: true,  variant: 'team-cards',         style: 'professional',  label: 'Meet the Faculty'     },
      stats:        { enabled: true,  variant: 'animated-counters',  style: 'blue-accent',
                      items: ['Students Enrolled', 'Courses Offered', 'Faculty Members', 'Graduates'] },
      admissions:   { enabled: true,  variant: 'step-flow',          style: 'numbered-blue', label: 'How to Apply'         },
      events:       { enabled: true,  variant: 'event-calendar',     style: 'clean-card',    label: 'Upcoming Events'      },
      testimonials: { enabled: true,  variant: 'student-stories',    style: 'soft-card'                                     },
      contact:      { enabled: true,  variant: 'split-screen-map',   style: 'clean-split'                                   },
      cta:          { enabled: true,  variant: 'solid-primary',      text: 'Apply Now'                                      },
    },
    dashboardWidgetStyles: [
      { id: 'enrolled-students', col: 1, row: 1, w: 2, h: 1, style: 'blue-accent'  },
      { id: 'todays-classes',    col: 3, row: 1, w: 2, h: 1, style: 'clean-card'   },
      { id: 'attendance-chart',  col: 1, row: 2, w: 4, h: 2, style: 'bar-chart'    },
      { id: 'upcoming-exams',    col: 1, row: 4, w: 2, h: 2, style: 'timeline'     },
      { id: 'fee-collection',    col: 3, row: 4, w: 2, h: 2, style: 'donut-chart'  },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. COACHING_INSTITUTE — "Mentor Pro / Dark Neon"
  //    Personal-brand-driven · course-sell focused · dark purple neon
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domainType:       'COACHING_INSTITUTE',
    themeName:        'Mentor Pro',
    themeDescription: 'Personal-brand-forward dark theme with neon purple, video reviews, and course selling.',
    tagline:          'Learn from the best. Become your best.',
    heroVideo:        '/templates/coaching/hero-mentor.mp4',
    heroImage:        '/templates/coaching/hero-mentor-poster.jpg',
    colorPrimary:     '#6C3483',   // Deep purple
    colorAccent:      '#F39C12',   // Amber
    colorBg:          '#0E0E16',   // Near-black purple
    colorSurface:     '#1A1A2E',   // Elevated dark
    fontHeading:      'Space Grotesk',
    fontBody:         'Inter',
    websiteSections: {
      hero:         { enabled: true,  variant: 'video-bg-3d',         style: 'purple-glow'                                    },
      courses:      { enabled: true,  variant: '3d-tilt-cards',       style: 'purple-edge',   label: 'Featured Courses'     },
      mentors:      { enabled: true,  variant: 'glass-cards',         style: 'purple-glass',  label: 'Our Mentors'          },
      stats:        { enabled: true,  variant: 'animated-counters',   style: 'neon-border',
                      items: ['Students', 'Courses', 'Mentors', 'Completion Rate'] },
      liveClasses:  { enabled: true,  variant: 'interactive-timeline',style: 'dark-surface',  label: 'Live Schedule'        },
      pricing:      { enabled: true,  variant: 'holographic-tiers',   style: 'purple-glow'                                   },
      testimonials: { enabled: true,  variant: 'video-reviews',       style: 'dark-glass'                                    },
      contact:      { enabled: true,  variant: 'split-screen-map',    style: 'dark-surface'                                  },
      cta:          { enabled: true,  variant: 'glowing-button',      text: 'Enroll Today'                                   },
    },
    dashboardWidgetStyles: [
      { id: 'active-students',    col: 1, row: 1, w: 2, h: 1, style: 'purple-glow'  },
      { id: 'live-sessions',      col: 3, row: 1, w: 2, h: 1, style: 'glass-card'   },
      { id: 'revenue-chart',      col: 1, row: 2, w: 4, h: 2, style: 'area-gradient' },
      { id: 'course-performance', col: 1, row: 4, w: 2, h: 2, style: 'bar-chart'    },
      { id: 'upcoming-batches',   col: 3, row: 4, w: 2, h: 2, style: 'timeline'     },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. LOGISTICS_AND_DELIVERY — "Command Grid / Cyberpunk Logistics"
  //    Dark mode · cyan data lines · fleet tracking aesthetic
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domainType:       'LOGISTICS_AND_DELIVERY',
    themeName:        'Command Grid',
    themeDescription: 'Futuristic dark-mode logistics theme with cyan grid overlays and real-time tracking UI.',
    tagline:          'Speed. Precision. Delivered.',
    heroVideo:        '/templates/logistics/hero-fleet.mp4',
    heroImage:        '/templates/logistics/hero-fleet-poster.jpg',
    colorPrimary:     '#0D1B2A',   // Deep navy
    colorAccent:      '#00E5FF',   // Cyan
    colorBg:          '#060D14',   // Near-black blue
    colorSurface:     '#0D1F30',   // Elevated dark navy
    fontHeading:      'Space Grotesk',
    fontBody:         'Inter',
    websiteSections: {
      hero:        { enabled: true,  variant: 'video-bg-3d',         style: 'cyan-grid'                                    },
      services:    { enabled: true,  variant: '3d-tilt-cards',       style: 'cyan-edge',    label: 'Our Services'         },
      tracking:    { enabled: true,  variant: 'live-map-embed',      style: 'dark-map',     label: 'Track Your Shipment' },
      stats:       { enabled: true,  variant: 'animated-counters',   style: 'neon-border',
                     items: ['Deliveries Completed', 'Fleet Vehicles', 'Cities Covered', 'On-Time Rate'] },
      coverage:    { enabled: true,  variant: 'interactive-map',     style: 'cyan-overlay', label: 'Coverage Area'       },
      pricing:     { enabled: true,  variant: 'clean-table-tiers',   style: 'dark-glass',   label: 'Shipping Rates'      },
      partners:    { enabled: true,  variant: 'logo-carousel',       style: 'dark-surface', label: 'Trusted Partners'    },
      contact:     { enabled: true,  variant: 'split-screen-map',    style: 'dark-surface'                               },
      cta:         { enabled: true,  variant: 'glowing-button',      text: 'Get a Quote'                                  },
    },
    dashboardWidgetStyles: [
      { id: 'active-deliveries',  col: 1, row: 1, w: 2, h: 1, style: 'cyan-pulse'  },
      { id: 'fleet-status',       col: 3, row: 1, w: 2, h: 1, style: 'glass-card'  },
      { id: 'delivery-map',       col: 1, row: 2, w: 4, h: 2, style: 'dark-map'    },
      { id: 'revenue-chart',      col: 1, row: 4, w: 2, h: 2, style: 'neon-chart'  },
      { id: 'pending-dispatches', col: 3, row: 4, w: 2, h: 2, style: 'pulse-list'  },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. TAILOR_SHOP — "Artisan Atelier / Stitch & Thread"
  //     Craft-forward · warm neutrals · measurement-flow UX
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domainType:       'TAILOR_SHOP',
    themeName:        'Artisan Atelier',
    themeDescription: 'Craft-forward warm aesthetic highlighting custom measurement flows, fabric selection, and handmade quality.',
    tagline:          'Crafted for you. Worn for life.',
    heroImage:        '/templates/tailor/hero-atelier.jpg',
    colorPrimary:     '#3E2723',   // Dark brown
    colorAccent:      '#BF9B6B',   // Tan gold
    colorBg:          '#FDF6EC',   // Warm white
    colorSurface:     '#F5EAD8',   // Linen
    fontHeading:      'Cormorant Garamond',
    fontBody:         'Nunito Sans',
    websiteSections: {
      hero:         { enabled: true,  variant: 'cinematic-fade',      style: 'warm-atelier'                                    },
      services:     { enabled: true,  variant: 'elegant-icon-cards',  style: 'tan-border',   label: 'What We Craft'          },
      process:      { enabled: true,  variant: 'step-flow',           style: 'numbered-tan', label: 'How It Works'           },
      fabrics:      { enabled: true,  variant: 'glass-grid',          style: 'warm-glass',   label: 'Fabric Collection'      },
      gallery:      { enabled: true,  variant: 'soft-masonry',        style: 'warm-overlay', label: 'Our Work'               },
      testimonials: { enabled: true,  variant: 'elegant-carousel',    style: 'warm-card'                                      },
      booking:      { enabled: true,  variant: 'inline-calendar',     style: 'tan-glass',    label: 'Book a Fitting'         },
      contact:      { enabled: true,  variant: 'map-and-info',        style: 'warm-split'                                     },
      cta:          { enabled: true,  variant: 'outline-earthy',      text: 'Book a Fitting'                                  },
    },
    dashboardWidgetStyles: [
      { id: 'active-orders',   col: 1, row: 1, w: 2, h: 1, style: 'earthy-card' },
      { id: 'fittings-today',  col: 3, row: 1, w: 2, h: 1, style: 'clean-card'  },
      { id: 'order-pipeline',  col: 1, row: 2, w: 4, h: 2, style: 'kanban-lite' },
      { id: 'fabric-stock',    col: 1, row: 4, w: 2, h: 2, style: 'alert-card'  },
      { id: 'revenue-chart',   col: 3, row: 4, w: 2, h: 2, style: 'smooth-line' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 11. NGO — "Impact / Mission Driven"
  //     Cause-forward · donation-optimized · accessible · story-led
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domainType:       'NGO',
    themeName:        'Impact',
    themeDescription: 'Cause-forward accessible theme optimized for donations, volunteer recruitment, and impact storytelling.',
    tagline:          'Together, we make change happen.',
    heroImage:        '/templates/ngo/hero-impact.jpg',
    colorPrimary:     '#1B5E20',   // Forest green
    colorAccent:      '#FF7043',   // Warm orange
    colorBg:          '#FFFFFF',
    colorSurface:     '#F1F8E9',   // Light green tint
    fontHeading:      'Plus Jakarta Sans',
    fontBody:         'Open Sans',
    websiteSections: {
      hero:         { enabled: true,  variant: 'impact-split',       style: 'cause-overlay'                                    },
      mission:      { enabled: true,  variant: 'split-media',        style: 'green-tint',    label: 'Our Mission'            },
      programs:     { enabled: true,  variant: 'icon-grid',          style: 'green-card',    label: 'Our Programs'           },
      impact:       { enabled: true,  variant: 'animated-counters',  style: 'green-accent',
                      items: ['Beneficiaries Reached', 'Active Volunteers', 'Projects Completed', 'Years Active'] },
      donate:       { enabled: true,  variant: 'donation-widget',    style: 'orange-cta',    label: 'Make a Difference'      },
      stories:      { enabled: true,  variant: 'story-cards',        style: 'warm-overlay',  label: 'Impact Stories'         },
      volunteers:   { enabled: true,  variant: 'team-cards',         style: 'light-card',    label: 'Our Team'               },
      partners:     { enabled: true,  variant: 'logo-carousel',      style: 'light-surface', label: 'Our Partners'           },
      contact:      { enabled: true,  variant: 'map-and-info',       style: 'clean-split'                                     },
      cta:          { enabled: true,  variant: 'solid-accent',       text: 'Donate Now'                                       },
    },
    dashboardWidgetStyles: [
      { id: 'total-donations',   col: 1, row: 1, w: 2, h: 1, style: 'green-accent'  },
      { id: 'active-volunteers', col: 3, row: 1, w: 2, h: 1, style: 'clean-card'    },
      { id: 'donation-trend',    col: 1, row: 2, w: 4, h: 2, style: 'area-gradient' },
      { id: 'program-spend',     col: 1, row: 4, w: 2, h: 2, style: 'donut-chart'   },
      { id: 'upcoming-events',   col: 3, row: 4, w: 2, h: 2, style: 'timeline'      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 12. SME_CORPORATE — "Neon Logic / Modern Agency"
  //     Bold · tech-forward · kinetic typography · interactive cursor
  //     Inspired by: Motionsites.ai Neon Logic / Liquid Glass
  // ═══════════════════════════════════════════════════════════════════════════
  {
    domainType:       'SME_CORPORATE',
    themeName:        'Neon Logic',
    themeDescription: 'Bold innovation-forward corporate theme with kinetic typography, glitch reveals, and interactive UI.',
    tagline:          'Bold ideas. Relentless execution.',
    heroImage:        '/templates/sme/hero-agency.jpg',
    colorPrimary:     '#0A0A0A',   // Near-black
    colorAccent:      '#7B2FFF',   // Electric purple
    colorBg:          '#F0F0F5',   // Cool off-white
    colorSurface:     '#FFFFFF',
    fontHeading:      'Space Grotesk',
    fontBody:         'Inter',
    websiteSections: {
      hero:         { enabled: true,  variant: 'split-kinetic',       style: 'bold-reveal'                                     },
      services:     { enabled: true,  variant: '3d-tilt-cards',       style: 'purple-edge',  label: 'What We Do'             },
      about:        { enabled: true,  variant: 'split-media',         style: 'bold-type',    label: 'About Us'               },
      stats:        { enabled: true,  variant: 'animated-counters',   style: 'dark-bold',
                      items: ['Happy Clients', 'Projects Delivered', 'Team Members', 'Years in Business'] },
      team:         { enabled: true,  variant: 'glass-cards',         style: 'purple-glass', label: 'Our Team'               },
      portfolio:    { enabled: true,  variant: 'masonry-parallax',    style: 'dark-overlay', label: 'Our Work'               },
      testimonials: { enabled: true,  variant: 'elegant-carousel',    style: 'light-card'                                     },
      contact:      { enabled: true,  variant: 'split-screen-map',    style: 'clean-split'                                    },
      cta:          { enabled: true,  variant: 'glowing-button',      text: 'Start a Project'                                 },
    },
    dashboardWidgetStyles: [
      { id: 'active-projects', col: 1, row: 1, w: 2, h: 1, style: 'purple-glow'   },
      { id: 'open-leads',      col: 3, row: 1, w: 2, h: 1, style: 'glass-card'    },
      { id: 'revenue-chart',   col: 1, row: 2, w: 4, h: 2, style: 'area-gradient' },
      { id: 'task-board',      col: 1, row: 4, w: 2, h: 2, style: 'kanban-lite'   },
      { id: 'team-activity',   col: 3, row: 4, w: 2, h: 2, style: 'activity-feed' },
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Seed function
// ─────────────────────────────────────────────────────────────────────────────

export async function seedVisualTemplates(prisma: PrismaClient): Promise<void> {
  console.log(`  Upserting ${visualTemplates.length} visual templates...\n`)

  const results = { created: 0, updated: 0, failed: 0 }

  for (const vt of visualTemplates) {
    const {
      domainType,
      themeName,
      themeDescription,
      tagline,
      heroImage,
      heroVideo,
      colorPrimary,
      colorAccent,
      colorBg,
      colorSurface,
      fontHeading,
      fontBody,
      websiteSections,
      dashboardWidgetStyles,
    } = vt

    // Merge dashboard widget styles back into the full dashboardLayout shape
    // that BusinessTypeTemplate.dashboardLayout expects.
    const dashboardLayout = { widgets: dashboardWidgetStyles }

    // We surface colorSurface and heroVideo inside websiteSections meta
    // so the frontend can read them without a schema change right now.
    const enrichedSections = {
      ...websiteSections,
      _meta: {
        themeName,
        themeDescription,
        heroVideo: heroVideo ?? null,
        colorSurface: colorSurface ?? null,
      },
    }

    try {
      const existing = await prisma.businessTypeTemplate.findUnique({
        where: { domainType: domainType as any },
        select: { id: true },
      })

      await prisma.businessTypeTemplate.upsert({
        where:  { domainType: domainType as any },
        create: {
          domainType:     domainType as any,
          name:           themeName,
          description:    themeDescription,
          tagline,
          heroImage:      heroImage ?? null,
          colorPrimary,
          colorAccent,
          colorBg,
          fontHeading,
          fontBody,
          websiteSections:  enrichedSections as any,
          dashboardLayout:  dashboardLayout as any,
          // Fields required by schema but owned by 01-domain-templates.ts.
          // Set safe defaults so this seed can also run on a blank DB.
          onboardingSteps: [],
          features:        {},
        },
        update: {
          // Only update visual fields — never overwrite business logic fields
          // that 01-domain-templates.ts owns (onboardingSteps, features).
          name:            themeName,
          description:     themeDescription,
          tagline,
          heroImage:       heroImage ?? null,
          colorPrimary,
          colorAccent,
          colorBg,
          fontHeading,
          fontBody,
          websiteSections: enrichedSections as any,
          dashboardLayout: dashboardLayout as any,
        },
      })

      const action = existing ? 'updated' : 'created'
      results[action]++
      console.log(`    ✅  ${domainType.padEnd(30)} [${action}]  theme: "${themeName}"`)
    } catch (err) {
      results.failed++
      console.error(`    ❌  ${domainType}  →  ${(err as Error).message}`)
    }
  }

  console.log('')
  console.log(`  Summary: ${results.created} created · ${results.updated} updated · ${results.failed} failed`)
}
