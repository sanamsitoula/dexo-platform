'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { tenantsApi, domainsApi, authApi } from '@/lib/api'
import { getTemplatesForDomain, DEFAULT_TEMPLATE_IDS, DesignTemplate, DesignTokens } from '@/lib/design-templates'
import DesignTemplatePreview from '@/components/DesignTemplatePreview'
import TenantWebsiteMockup from '@/components/TenantWebsiteMockup'

const DOMAIN_CATALOG = [
  {
    code: 'FITNESS_CENTER',
    name: 'Fitness Center',
    description: 'Gym and fitness center management with memberships, trainers, and workout tracking',
    icon: '💪',
    primaryColor: '#FF6B35',
    theme: 'fitness-pro',
    modules: ['Memberships', 'Trainer Scheduling', 'Attendance', 'Workout Plans', 'Nutrition Plans', 'POS Billing'],
    defaultMenu: ['Home', 'Classes', 'Trainers', 'Memberships', 'Schedule', 'Contact'],
  },
  {
    code: 'SALON_AND_SPA',
    name: 'Salon & Spa',
    description: 'Beauty salon and wellness services with appointments and customer loyalty',
    icon: '💇',
    primaryColor: '#A855F7',
    theme: 'beauty-salon',
    modules: ['Appointments', 'Service Catalog', 'Customer CRM', 'Loyalty', 'POS', 'Billing'],
    defaultMenu: ['Home', 'Services', 'Stylists', 'Appointments', 'Gallery', 'Contact'],
  },
  {
    code: 'SCHOOL_AND_EDUCATION',
    name: 'School & Education',
    description: 'Educational institution management with students, classes, exams, and fees',
    icon: '📚',
    primaryColor: '#2563EB',
    theme: 'edu-smart',
    modules: ['Students', 'Teachers', 'Classes', 'Exams', 'Fee Management', 'Report Cards'],
    defaultMenu: ['Home', 'Admissions', 'Academics', 'Faculty', 'Events', 'Contact'],
  },
  {
    code: 'COACHING_INSTITUTE',
    name: 'Coaching Institute',
    description: 'Educational coaching centers with batch management and online classes',
    icon: '🎓',
    primaryColor: '#059669',
    theme: 'coach-academy',
    modules: ['Batches', 'Courses', 'Attendance', 'Tests', 'Live Classes', 'Fee Collection'],
    defaultMenu: ['Home', 'Courses', 'Batches', 'Results', 'Faculty', 'Contact'],
  },
  {
    code: 'RESTAURANT_AND_CAFE',
    name: 'Restaurant & Cafe',
    description: 'Food service management with POS, kitchen, and reservations',
    icon: '🍕',
    primaryColor: '#DC2626',
    theme: 'foodie-hub',
    modules: ['POS', 'Reservations', 'Kitchen Display', 'Orders', 'Inventory', 'Menu Management'],
    defaultMenu: ['Home', 'Menu', 'Reservations', 'Order Online', 'Gallery', 'Contact'],
  },
  {
    code: 'HOTEL_AND_HOSPITALITY',
    name: 'Hotel & Hospitality',
    description: 'Hotel and accommodation management with bookings and housekeeping',
    icon: '🏨',
    primaryColor: '#B45309',
    theme: 'stay-hotel',
    modules: ['Room Booking', 'Housekeeping', 'Guest CRM', 'Restaurant POS', 'Events', 'Billing'],
    defaultMenu: ['Home', 'Rooms', 'Amenities', 'Dining', 'Events', 'Contact'],
  },
  {
    code: 'HEALTHCARE_CLINIC',
    name: 'Healthcare Clinic',
    description: 'Medical clinic management with patients, doctors, and prescriptions',
    icon: '🏥',
    primaryColor: '#0284C7',
    theme: 'medic-health',
    modules: ['Patients', 'Doctors', 'Appointments', 'Prescriptions', 'Lab Reports', 'Billing'],
    defaultMenu: ['Home', 'Services', 'Doctors', 'Appointments', 'Patient Portal', 'Contact'],
  },
  {
    code: 'ECOMMERCE',
    name: 'Ecommerce',
    description: 'Online store management with products, orders, and shipping',
    icon: '🛒',
    primaryColor: '#7C3AED',
    theme: 'shop-commerce',
    modules: ['Products', 'Orders', 'Inventory', 'Shipping', 'Reviews', 'Marketing'],
    defaultMenu: ['Home', 'Shop', 'Categories', 'Deals', 'Cart', 'Contact'],
  },
  {
    code: 'LOGISTICS_AND_DELIVERY',
    name: 'Logistics & Delivery',
    description: 'Shipping and delivery management with tracking and fleet management',
    icon: '🚚',
    primaryColor: '#0891B2',
    theme: 'logi-track',
    modules: ['Shipments', 'Tracking', 'Fleet', 'Delivery Agents', 'Warehouses', 'Reports'],
    defaultMenu: ['Home', 'Track Shipment', 'Services', 'Coverage', 'For Business', 'Contact'],
  },
  {
    code: 'TAILOR_SHOP',
    name: 'Tailor Shop',
    description: 'Custom tailoring business with measurements, fabrics, and order tracking',
    icon: '✂️',
    primaryColor: '#DB2777',
    theme: 'style-tailor',
    modules: ['Measurements', 'Fabrics', 'Orders', 'Production Tracking', 'Delivery', 'Billing'],
    defaultMenu: ['Home', 'Services', 'Fabrics', 'Order Tracking', 'Gallery', 'Contact'],
  },
  {
    code: 'NGO',
    name: 'NGO',
    description: 'Non-profit organization management with donors, programs, and beneficiaries',
    icon: '🤝',
    primaryColor: '#10B981',
    theme: 'care-nonprofit',
    modules: ['Donors', 'Programs', 'Beneficiaries', 'Grants', 'Campaigns', 'Reports'],
    defaultMenu: ['Home', 'About', 'Programs', 'Donate', 'Volunteer', 'Contact'],
  },
  {
    code: 'SME_CORPORATE',
    name: 'SME Corporate',
    description: 'Corporate and SME management with HR, finance, and projects',
    icon: '🏢',
    primaryColor: '#64748B',
    theme: 'biz-corporate',
    modules: ['HR', 'Projects', 'Finance', 'Inventory', 'Sales', 'Reports'],
    defaultMenu: ['Home', 'About', 'Services', 'Team', 'Portfolio', 'Contact'],
  },
]

const STEPS = [
  { num: 1, label: 'Choose Domain' },
  { num: 2, label: 'Design Template' },
  { num: 3, label: 'Brand & Content' },
  { num: 4, label: 'Subdomain' },
  { num: 5, label: 'Review & Create' },
]

// Color field metadata for the brand step
const COLOR_FIELDS: { key: keyof DesignTokens['colors']; label: string; group: 'brand' | 'surface' | 'text' | 'state' }[] = [
  { key: 'primary', label: 'Primary', group: 'brand' },
  { key: 'primaryDark', label: 'Primary Dark', group: 'brand' },
  { key: 'primaryLight', label: 'Primary Light', group: 'brand' },
  { key: 'secondary', label: 'Secondary', group: 'brand' },
  { key: 'secondaryDark', label: 'Secondary Dark', group: 'brand' },
  { key: 'accent', label: 'Accent', group: 'brand' },
  { key: 'background', label: 'Background', group: 'surface' },
  { key: 'surface', label: 'Surface', group: 'surface' },
  { key: 'surfaceAlt', label: 'Surface Alt', group: 'surface' },
  { key: 'border', label: 'Border', group: 'surface' },
  { key: 'text', label: 'Text', group: 'text' },
  { key: 'textMuted', label: 'Text Muted', group: 'text' },
  { key: 'textInverse', label: 'Text Inverse', group: 'text' },
  { key: 'success', label: 'Success', group: 'state' },
  { key: 'warning', label: 'Warning', group: 'state' },
  { key: 'danger', label: 'Danger', group: 'state' },
]

const SOCIAL_NETWORKS = [
  { key: 'facebook', label: 'Facebook', icon: '📘', placeholder: 'https://facebook.com/yourpage' },
  { key: 'instagram', label: 'Instagram', icon: '📸', placeholder: 'https://instagram.com/yourpage' },
  { key: 'twitter', label: 'Twitter / X', icon: '🐦', placeholder: 'https://twitter.com/yourhandle' },
  { key: 'linkedin', label: 'LinkedIn', icon: '💼', placeholder: 'https://linkedin.com/company/yourco' },
  { key: 'youtube', label: 'YouTube', icon: '📺', placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'tiktok', label: 'TikTok', icon: '🎵', placeholder: 'https://tiktok.com/@yourhandle' },
  { key: 'whatsapp', label: 'WhatsApp', icon: '💬', placeholder: 'https://wa.me/9779800000000' },
  { key: 'telegram', label: 'Telegram', icon: '✈️', placeholder: 'https://t.me/yourhandle' },
]

export default function NewTenantPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [domainType, setDomainType] = useState<string>('')
  const [theme, setTheme] = useState<string>('')
  const [designTemplateId, setDesignTemplateId] = useState<string>('')

  // Brand
  const [logo, setLogo] = useState<string>('')
  const [favicon, setFavicon] = useState<string>('')
  const [primaryColor, setPrimaryColor] = useState<string>('#4f46e5')
  const [secondaryColor, setSecondaryColor] = useState<string>('#7c3aed')
  const [siteTitle, setSiteTitle] = useState<string>('')
  const [tagline, setTagline] = useState<string>('')
  const [hideDexoBranding, setHideDexoBranding] = useState(false)

  // All template colors (editable, sourced from selected design template)
  const [colors, setColors] = useState<DesignTokens['colors'] | null>(null)

  // Content
  const [menuItems, setMenuItems] = useState<string[]>([])
  const [contactEmail, setContactEmail] = useState<string>('')
  const [contactPhone, setContactPhone] = useState<string>('')
  const [contactAddress, setContactAddress] = useState<string>('')
  const [aboutText, setAboutText] = useState<string>('')

  // Footer
  const [footerTagline, setFooterTagline] = useState<string>('')
  const [footerCopyright, setFooterCopyright] = useState<string>('')

  // Social networks
  const [socials, setSocials] = useState<Record<string, string>>({})

  // Subdomain
  const [name, setName] = useState('')
  const [subdomain, setSubdomain] = useState('')
  const [customDomain, setCustomDomain] = useState('')

  // Tenant admin
  const [adminFirstName, setAdminFirstName] = useState('')
  const [adminLastName, setAdminLastName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subdomainStatus, setSubdomainStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')

  const selectedDomain = DOMAIN_CATALOG.find((d) => d.code === domainType)

  const selectedTemplate: DesignTemplate | null = useMemo(() => {
    if (!domainType || !designTemplateId) return null
    return getTemplatesForDomain(domainType).find((t) => t.id === designTemplateId) || null
  }, [domainType, designTemplateId])

  // Auto-set defaults when domain is selected
  useEffect(() => {
    if (selectedDomain) {
      setTheme(selectedDomain.theme)
      setPrimaryColor(selectedDomain.primaryColor)
      setMenuItems(selectedDomain.defaultMenu)
      if (!designTemplateId) {
        const defaultId = DEFAULT_TEMPLATE_IDS[domainType]
        if (defaultId) setDesignTemplateId(defaultId)
      }
    }
  }, [domainType])

  // When the design template changes, seed all colors from the template
  useEffect(() => {
    if (selectedTemplate) {
      setColors({ ...selectedTemplate.tokens.colors })
      setPrimaryColor(selectedTemplate.tokens.colors.primary)
      setSecondaryColor(selectedTemplate.tokens.colors.secondary)
    }
  }, [designTemplateId])

  // When user edits the primary/secondary color, also sync the design-tokens palette
  useEffect(() => {
    if (!colors) return
    setColors((c) => (c ? { ...c, primary: primaryColor, secondary: secondaryColor } : c))
  }, [primaryColor, secondaryColor])

  // Auto-generate subdomain from name
  useEffect(() => {
    if (name && !subdomain) {
      const generated = name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 30)
      setSubdomain(generated)
    }
  }, [name])

  // Auto-fill site title from name
  useEffect(() => {
    if (name && !siteTitle) setSiteTitle(name)
  }, [name])

  // Auto-fill admin email from subdomain
  useEffect(() => {
    if (subdomain && !adminEmail) {
      setAdminEmail(`admin@${subdomain}.dexo.app`)
    }
  }, [subdomain])

  // Check subdomain availability (debounced)
  useEffect(() => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainStatus('idle')
      return
    }
    setSubdomainStatus('checking')
    const timer = setTimeout(async () => {
      try {
        const res = await tenantsApi.list({ limit: 1 })
        if (res.data) {
          const taken = res.data.data?.some((t: any) => t.subdomain === subdomain)
          setSubdomainStatus(taken ? 'taken' : 'available')
        } else {
          setSubdomainStatus('available')
        }
      } catch {
        setSubdomainStatus('available')
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [subdomain])

  function nextStep() {
    setError(null)
    if (step === 1 && !domainType) {
      setError('Please select a business domain type')
      return
    }
    if (step === 2) {
      if (!designTemplateId) {
        setError('Please select a design template')
        return
      }
    }
    if (step === 3) {
      if (!siteTitle.trim()) {
        setError('Website name is required')
        return
      }
      if (menuItems.filter((m) => m.trim()).length < 2) {
        setError('Please add at least 2 menu items')
        return
      }
    }
    if (step === 4) {
      if (!name.trim()) {
        setError('Organization name is required')
        return
      }
      if (!subdomain.trim() || subdomain.length < 3) {
        setError('Subdomain must be at least 3 characters')
        return
      }
      if (subdomainStatus === 'taken') {
        setError('This subdomain is already taken. Please choose another.')
        return
      }
      if (!adminFirstName.trim() || !adminLastName.trim() || !adminEmail.trim() || adminPassword.length < 8) {
        setError('Please fill in admin details: first/last name, email, and a password of at least 8 characters')
        return
      }
    }
    setStep(step + 1)
  }

  async function handleCreate() {
    setLoading(true)
    setError(null)

    try {
      // 1) Create the tenant
      const tenantResponse = await tenantsApi.create({
        name: name.trim(),
        subdomain: subdomain.trim(),
        domain: customDomain.trim() || undefined,
      })

      if (tenantResponse.error || !tenantResponse.data) {
        setError(tenantResponse.error || 'Failed to create tenant')
        setLoading(false)
        return
      }

      const tenantId = tenantResponse.data.id

      // 2) Apply industry domain (modules / roles / menus)
      const domainResponse = await domainsApi.quickSetup(tenantId, domainType)
      if (domainResponse.error) {
        setError(`Tenant created but template setup failed: ${domainResponse.error}. You can apply a template from the tenant detail page.`)
        setLoading(false)
        return
      }

      // 3) Register the tenant admin user (associated with the new tenant)
      const registerResp = await authApi.register({
        firstName: adminFirstName.trim(),
        lastName: adminLastName.trim(),
        email: adminEmail.trim(),
        password: adminPassword,
        phone: contactPhone || undefined,
        tenantId,
      })

      if (registerResp.error) {
        // Don't fail entirely - the user can be created later. Just warn.
        console.warn('Admin user creation warning:', registerResp.error)
      }

      // 4) Persist brand / design / footer / social to localStorage for the tenant app to read
      const selectedDesignTemplate = designTemplateId
        ? getTemplatesForDomain(domainType).find((t) => t.id === designTemplateId)
        : null

      const brandSettings = {
        logo,
        favicon,
        // Flat top-level primary/secondary for quick reads
        primaryColor,
        secondaryColor,
        // Full color palette (16 tokens) so the tenant app can apply the entire theme
        colors,
        siteTitle,
        tagline,
        hideDexoBranding,
        menuItems: menuItems.filter((m) => m.trim()),
        contact: { email: contactEmail, phone: contactPhone, address: contactAddress },
        aboutText,
        footer: {
          tagline: footerTagline,
          copyright: footerCopyright,
          socials: Object.fromEntries(Object.entries(socials).filter(([_, v]) => v && v.trim())),
        },
        socials: Object.fromEntries(Object.entries(socials).filter(([_, v]) => v && v.trim())),
        theme,
        domainCode: domainType,
        domainName: selectedDomain?.name,
        designTemplateId,
        designTemplate: selectedDesignTemplate
          ? {
              id: selectedDesignTemplate.id,
              name: selectedDesignTemplate.name,
              tagline: selectedDesignTemplate.tagline,
              description: selectedDesignTemplate.description,
              thumbnail: selectedDesignTemplate.thumbnail,
              mode: selectedDesignTemplate.mode,
              heroLayout: selectedDesignTemplate.heroLayout,
              cardStyle: selectedDesignTemplate.cardStyle,
              navigationStyle: selectedDesignTemplate.navigationStyle,
              pages: selectedDesignTemplate.pages,
              tokens: selectedDesignTemplate.tokens,
              previewGradient: selectedDesignTemplate.previewGradient,
            }
          : null,
        // Tenant admin login for convenience
        tenantAdmin: {
          email: adminEmail.trim(),
          // Don't store the password in localStorage
        },
        createdAt: new Date().toISOString(),
      }
      localStorage.setItem(`tenant-theme-${subdomain}`, JSON.stringify(brandSettings))

      // 5) Redirect to the tenant admin login. The user logs in as the admin we just created.
      router.push(`/t/${subdomain}/login?welcome=1&email=${encodeURIComponent(adminEmail.trim())}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setLogo(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleFaviconUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setFavicon(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function updateMenuItem(index: number, value: string) {
    const updated = [...menuItems]
    updated[index] = value
    setMenuItems(updated)
  }

  function addMenuItem() {
    setMenuItems([...menuItems, ''])
  }

  function removeMenuItem(index: number) {
    setMenuItems(menuItems.filter((_, i) => i !== index))
  }

  function updateColor(key: keyof DesignTokens['colors'], value: string) {
    setColors((c) => (c ? { ...c, [key]: value } : c))
    if (key === 'primary') setPrimaryColor(value)
    if (key === 'secondary') setSecondaryColor(value)
  }

  function setSocial(key: string, value: string) {
    setSocials((s) => ({ ...s, [key]: value }))
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Create New Tenant</h1>
        <p className="mt-2 text-gray-600">Launch a new business tenant on Dexo. Pick a template, brand it, set up your subdomain, and you're ready to go.</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-3 flex-wrap">
        {STEPS.map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step > s.num
                  ? 'bg-green-600 text-white'
                  : step === s.num
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step > s.num ? '✓' : s.num}
            </div>
            <span
              className={`ml-2 text-sm whitespace-nowrap ${
                step >= s.num ? 'text-indigo-600 font-medium' : 'text-gray-500'
              }`}
            >
              {s.label}
            </span>
            {idx < STEPS.length - 1 && <div className={`w-8 h-px mx-2 ${step > s.num ? 'bg-green-400' : 'bg-gray-300'}`}></div>}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
          <span className="mr-2">⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: Choose Domain */}
      {step === 1 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 1: Choose a Business Template</h2>
          <p className="text-sm text-gray-500 mb-6">
            Select the industry that best matches your business. We'll pre-configure modules, menus, theme, and color scheme.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DOMAIN_CATALOG.map((d) => {
              const isSelected = domainType === d.code
              return (
                <button
                  key={d.code}
                  type="button"
                  onClick={() => setDomainType(d.code)}
                  className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200 shadow-md'
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-3xl">{d.icon}</span>
                    {isSelected && (
                      <span className="text-xs font-medium text-indigo-700 bg-indigo-100 px-2 py-1 rounded-full">
                        ✓ Selected
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900">{d.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{d.description}</p>
                  <div
                    className="mt-3 h-2 rounded-full"
                    style={{ background: d.primaryColor }}
                  ></div>
                </button>
              )
            })}
          </div>

          {selectedDomain && (
            <div className="mt-6 p-5 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <span className="text-2xl">{selectedDomain.icon}</span>
                {selectedDomain.name} — Modules Included
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-3">
                {selectedDomain.modules.map((m) => (
                  <div key={m} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500">✓</span>
                    <span>{m}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between pt-6">
            <button
              type="button"
              onClick={() => router.push('/tenants')}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={nextStep}
              disabled={!domainType}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Design Template →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Design Template */}
      {step === 2 && (
        <div className="bg-white shadow rounded-lg p-6 space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 2: Design Template</h2>
            <p className="text-sm text-gray-500">
              Choose a premium design template tailored for {selectedDomain?.name || 'your business'}. Each template includes a complete design system (colors, typography, layout) and is mobile-responsive out of the box.
            </p>
          </div>

          {(() => {
            const templates = getTemplatesForDomain(domainType)
            if (templates.length === 0) {
              return (
                <div className="text-center py-12 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800">
                    ⚠️ Design templates for {selectedDomain?.name} are coming soon! (10 templates across 2 domains are currently available)
                  </p>
                </div>
              )
            }
            return (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {templates.map((template) => (
                    <DesignTemplatePreview
                      key={template.id}
                      template={template}
                      selected={designTemplateId === template.id}
                      onClick={() => setDesignTemplateId(template.id)}
                    />
                  ))}
                </div>
                {designTemplateId && (() => {
                  const sel = templates.find((t) => t.id === designTemplateId)
                  return sel ? (
                    <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <span className="text-3xl">{sel.thumbnail}</span>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900">Selected: {sel.name}</h4>
                          <p className="text-sm text-gray-700 mt-1">{sel.description}</p>
                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                            <div>
                              <p className="text-gray-500 uppercase tracking-wide">Hero</p>
                              <p className="font-medium text-gray-900 capitalize">{sel.heroLayout}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 uppercase tracking-wide">Cards</p>
                              <p className="font-medium text-gray-900 capitalize">{sel.cardStyle}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 uppercase tracking-wide">Nav</p>
                              <p className="font-medium text-gray-900 capitalize">{sel.navigationStyle}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 uppercase tracking-wide">Mode</p>
                              <p className="font-medium text-gray-900 capitalize">{sel.mode}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 uppercase tracking-wide">Pages</p>
                              <p className="font-medium text-gray-900">{sel.pages.length}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null
                })()}
              </>
            )
          })()}

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!designTemplateId) {
                  setError('Please select a design template')
                  return
                }
                setStep(3)
              }}
              disabled={!designTemplateId}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Brand & Content →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Brand & Content */}
      {step === 3 && (
        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 3: Brand & Content</h2>
            <p className="text-sm text-gray-500">
              Customize your tenant's visual identity. The default values come from your selected design template — you can override any color or text below.
            </p>
          </div>

          {/* Brand Identity */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3">🎨 Brand Identity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                <div className="flex items-center gap-3">
                  {logo ? (
                    <img src={logo} alt="Logo" className="h-12 border rounded p-1" />
                  ) : (
                    <div className="h-12 w-12 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
                      None
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Favicon</label>
                <div className="flex items-center gap-3">
                  {favicon ? (
                    <img src={favicon} alt="Favicon" className="h-10 w-10 border rounded" />
                  ) : (
                    <div className="h-10 w-10 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-400 text-xs">
                      None
                    </div>
                  )}
                  <input type="file" accept="image/*" onChange={handleFaviconUpload} className="text-sm" />
                </div>
              </div>
            </div>

            {/* Template color palette (full 16-color system, editable) */}
            {colors && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-gray-800">Template color palette</h4>
                  <button
                    type="button"
                    onClick={() => selectedTemplate && setColors({ ...selectedTemplate.tokens.colors })}
                    className="text-xs text-indigo-600 hover:text-indigo-700"
                  >
                    ↺ Reset to template defaults
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-3">
                  These colors are inherited from the <strong>{selectedTemplate?.name}</strong> design template. Override any of them to match your brand.
                </p>

                {(['brand', 'surface', 'text', 'state'] as const).map((group) => (
                  <div key={group} className="mb-4">
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">
                      {group === 'brand' ? 'Brand' : group === 'surface' ? 'Surfaces' : group === 'text' ? 'Text' : 'State'}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {COLOR_FIELDS.filter((f) => f.group === group).map((field) => (
                        <div key={field.key} className="flex items-center gap-2">
                          <input
                            type="color"
                            value={colors[field.key]}
                            onChange={(e) => updateColor(field.key, e.target.value)}
                            className="h-9 w-12 rounded border cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700">{field.label}</p>
                            <input
                              type="text"
                              value={colors[field.key]}
                              onChange={(e) => updateColor(field.key, e.target.value)}
                              className="w-full border border-gray-200 rounded px-2 py-0.5 font-mono text-xs"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <input
                type="checkbox"
                id="hide-branding"
                checked={hideDexoBranding}
                onChange={(e) => setHideDexoBranding(e.target.checked)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
              />
              <label htmlFor="hide-branding" className="text-sm text-gray-700">
                <strong>Hide "Powered by Dexo"</strong> (Whitelabel plan only)
              </label>
            </div>
          </div>

          {/* Website Content */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3">🌐 Website Content</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Website Name *</label>
                <input
                  type="text"
                  value={siteTitle}
                  onChange={(e) => setSiteTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Hilton Fitness Center"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Your path to a healthier life"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">About</label>
              <textarea
                value={aboutText}
                onChange={(e) => setAboutText(e.target.value)}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="Tell customers about your business…"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3">📞 Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="info@business.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="+977-9841234567"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input
                type="text"
                value={contactAddress}
                onChange={(e) => setContactAddress(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="123 Main Street, Kathmandu, Nepal"
              />
            </div>
          </div>

          {/* Social Networks */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3">🌐 Social Networks</h3>
            <p className="text-xs text-gray-500 mb-3">
              Add your social media links. They'll be shown on your website footer and tenant app sidebar.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SOCIAL_NETWORKS.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="text-xl w-8 text-center">{s.icon}</span>
                  <input
                    type="url"
                    value={socials[s.key] || ''}
                    onChange={(e) => setSocial(s.key, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder={`${s.label} URL`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3">📄 Footer</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Footer tagline</label>
                <input
                  type="text"
                  value={footerTagline}
                  onChange={(e) => setFooterTagline(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., Building stronger communities since 2015"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Copyright text</label>
                <input
                  type="text"
                  value={footerCopyright}
                  onChange={(e) => setFooterCopyright(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="e.g., © 2026 Hilton Fitness Center. All rights reserved."
                />
              </div>
            </div>
          </div>

          {/* Menu */}
          <div>
            <h3 className="text-md font-semibold text-gray-900 mb-3">📑 Website Menu</h3>
            <p className="text-xs text-gray-500 mb-3">Default menu items for your public website. You can change these later.</p>
            <div className="space-y-2">
              {menuItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm w-6">{i + 1}.</span>
                  <input
                    type="text"
                    value={item}
                    onChange={(e) => updateMenuItem(i, e.target.value)}
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Menu item name"
                  />
                  <button
                    type="button"
                    onClick={() => removeMenuItem(i)}
                    className="text-red-500 hover:text-red-700 px-2"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addMenuItem}
                className="text-sm text-indigo-600 hover:text-indigo-700"
              >
                + Add menu item
              </button>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Next: Subdomain →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Subdomain & Admin */}
      {step === 4 && (
        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Step 4: Subdomain & Admin</h2>
            <p className="text-sm text-gray-500">Choose a unique subdomain and create the initial tenant administrator.</p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Organization Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., Acme Fitness Center"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subdomain <span className="text-red-500">*</span>
              </label>
              <div className="flex rounded-md shadow-sm">
                <input
                  type="text"
                  required
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="flex-1 block w-full border border-gray-300 rounded-l-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="acme-fitness"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  .dexo.app
                </span>
              </div>
              {subdomainStatus === 'checking' && <p className="mt-1 text-xs text-gray-500">Checking availability…</p>}
              {subdomainStatus === 'available' && (
                <p className="mt-1 text-xs text-green-600">✓ Available — your tenant will be at <strong>{subdomain}.dexo.app</strong></p>
              )}
              {subdomainStatus === 'taken' && (
                <p className="mt-1 text-xs text-red-600">✗ This subdomain is already taken.</p>
              )}
              {subdomainStatus === 'idle' && (
                <p className="mt-1 text-xs text-gray-500">3-30 characters. Letters, numbers, and hyphens only.</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Domain <span className="text-gray-400 text-xs font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, ''))}
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="www.acmefitness.com"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-5">
            <h3 className="text-md font-semibold text-gray-900 mb-3">👤 Tenant Administrator</h3>
            <p className="text-xs text-gray-500 mb-4">
              This user will be the owner of the new tenant. They can manage users, settings, and billing.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name *</label>
                <input
                  type="text"
                  value={adminFirstName}
                  onChange={(e) => setAdminFirstName(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md py-2 px-3"
                  placeholder="Jane"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name *</label>
                <input
                  type="text"
                  value={adminLastName}
                  onChange={(e) => setAdminLastName(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md py-2 px-3"
                  placeholder="Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md py-2 px-3"
                  placeholder="admin@yourtenant.dexo.app"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password * <span className="text-gray-400 text-xs font-normal">(min 8 chars)</span></label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="block w-full border border-gray-300 rounded-md py-2 px-3"
                  placeholder="At least 8 characters"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={nextStep}
              disabled={!name.trim() || !subdomain || subdomainStatus === 'taken' || subdomainStatus === 'checking'}
              className="px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next: Review →
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: Review & Create */}
      {step === 5 && selectedTemplate && colors && (
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Step 5: Review & Create</h2>
            <p className="text-sm text-gray-500 mt-1">
              This is exactly how your tenant will look. The preview below uses your selected design template, your brand colors, your logo, and your menu.
            </p>
          </div>

          {/* Live preview using the design template */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Live preview</p>
              <p className="text-xs text-gray-500">Using <strong>{selectedTemplate.name}</strong> template</p>
            </div>
            <TenantWebsiteMockup
              template={selectedTemplate}
              colors={colors}
              siteTitle={siteTitle || name}
              tagline={tagline}
              logo={logo}
              menuItems={menuItems.filter((m) => m.trim())}
              aboutText={aboutText}
              contact={{ email: contactEmail, phone: contactPhone, address: contactAddress }}
              socials={socials}
              footer={{ tagline: footerTagline, copyright: footerCopyright }}
              hideDexoBranding={hideDexoBranding}
            />
          </div>

          {/* Summary grid */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 Configuration summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <SummaryItem label="Business template" value={`${selectedDomain?.icon} ${selectedDomain?.name || ''}`} />
              <SummaryItem label="Design template" value={`${selectedTemplate.thumbnail} ${selectedTemplate.name}`} />
              <SummaryItem label="Subdomain" value={`${subdomain}.dexo.app`} />
              <SummaryItem label="Custom domain" value={customDomain || '—'} />
              <SummaryItem label="Theme" value={theme || 'default'} />
              <SummaryItem label="Menu items" value={`${menuItems.filter((m) => m.trim()).length} pages`} />
              <SummaryItem label="Social links" value={`${Object.values(socials).filter((s) => s && s.trim()).length} networks`} />
              <SummaryItem label="Branding" value={hideDexoBranding ? 'White-label' : 'Powered by Dexo'} />
              <SummaryItem label="Admin" value={adminEmail} />
            </div>

            <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
              <h4 className="font-semibold text-indigo-900 mb-2">What happens next:</h4>
              <ol className="text-sm text-indigo-800 space-y-1 list-decimal list-inside">
                <li>Tenant <strong>{name}</strong> is created in the database</li>
                <li>Subdomain <code className="bg-white px-1 rounded">{subdomain}.dexo.app</code> is reserved</li>
                <li>{selectedDomain?.name} industry template is applied (modules, roles, menus, permissions)</li>
                <li>Tenant administrator <strong>{adminEmail}</strong> is created</li>
                <li>Your design template + brand settings are saved to the tenant app</li>
                <li>You'll be redirected to the tenant login to sign in as the new admin</li>
              </ol>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              ⚠️ {error}
            </div>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep(4)}
              disabled={loading}
              className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={loading}
              className="px-8 py-3 text-base font-semibold text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-lg"
            >
              {loading ? (
                <>
                  <span className="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Creating tenant…
                </>
              ) : (
                <>🚀 Create Tenant & Admin</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 bg-gray-50 rounded-lg">
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900 break-words">{value}</p>
    </div>
  )
}
