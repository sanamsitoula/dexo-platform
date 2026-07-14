/**
 * Forms Builder — field type registry.
 *
 * Pure data, same pattern as the Page Builder Component Library: the API
 * layer validates a FormField's `type` against this list, and tenant-admin
 * renders the right input for both the field-config editor AND the public
 * submission form off the same `needsOptions` flag — no per-type UI branch
 * duplicated between admin and public code.
 *
 * NOT built (explicitly out of scope, not hidden): file upload, signature
 * capture, OTP verification, CAPTCHA. Each needs its own extra
 * infrastructure (upload needs a submission-scoped storage path with
 * retention rules, signature needs a canvas capture lib, OTP needs an SMS
 * provider, CAPTCHA needs a third-party challenge service) — see
 * website_builder_remaining.md.
 */

export interface FieldTypeDef {
  key: string;
  label: string;
  icon: string;
  /** Whether this type needs the `options` string list configured (radio/dropdown). */
  needsOptions: boolean;
  htmlInputType?: string; // for simple <input type="..."> types
}

export const FORM_FIELD_TYPES: FieldTypeDef[] = [
  { key: 'text', label: 'Short text', icon: '✏️', needsOptions: false, htmlInputType: 'text' },
  { key: 'email', label: 'Email', icon: '📧', needsOptions: false, htmlInputType: 'email' },
  { key: 'phone', label: 'Phone', icon: '📞', needsOptions: false, htmlInputType: 'tel' },
  { key: 'number', label: 'Number', icon: '🔢', needsOptions: false, htmlInputType: 'number' },
  { key: 'date', label: 'Date', icon: '📅', needsOptions: false, htmlInputType: 'date' },
  { key: 'textarea', label: 'Long text', icon: '📝', needsOptions: false },
  { key: 'checkbox', label: 'Checkbox', icon: '☑️', needsOptions: false },
  { key: 'radio', label: 'Multiple choice', icon: '🔘', needsOptions: true },
  { key: 'dropdown', label: 'Dropdown', icon: '🔽', needsOptions: true },
  { key: 'rating', label: 'Rating (1-5)', icon: '⭐', needsOptions: false },
];

export function getFieldTypeDef(key: string): FieldTypeDef | undefined {
  return FORM_FIELD_TYPES.find((f) => f.key === key);
}
