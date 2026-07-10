import type { Config } from 'tailwindcss'

// Brand foundation comes from the shared DEXO preset (packages/ui) — colors,
// type stack, radius and shadows. Tenants override the semantic --dx-primary
// token at runtime only (white-label rule, brand/Design/17-design-system.md).
const config: Config = {
  presets: [require('../../packages/ui/tailwind-preset')],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
export default config
