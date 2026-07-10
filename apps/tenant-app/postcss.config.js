// tenant-app uses Tailwind CSS v3 (see local node_modules/tailwindcss@3.4.x and
// the v3 `@tailwind base/components/utilities` directives in app/globals.css).
// This config is what makes Next.js actually run Tailwind — without it, every
// utility class is silently dropped and the app renders unstyled.
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
