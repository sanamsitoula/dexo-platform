# Task Checklist — Multi-Part Platform Update (2026-07-10)

- [x] 0. Prisma schema: Blog.template, BlogCategory.thumbnail, BlogTag.tenantId, ChannelConfig model + migration (20260710162218)
- [x] 1. Footer duplicate on platform-web index — verified fixed (commit 4dec9ce); served HTML has exactly one footer
- [x] 2. Roles/permissions: guard /permissions, module catalog, admin/staff/customer tenant defaults, matrix UI + (i) modal, tenant-admin roles pages + nav — done, typecheck clean
- [ ] 3. Blogs: templates, editor, AI slug, tags, SEO, category thumbnails, tenant-admin blogs, platform-web blog section + public pages
- [ ] 4. CRM: ChannelConfig CRUD + webhook secret verification, platform-admin channels page, tenant-admin channel setup
- [x] 5. Billing demo seed: 15 invoices, 11 payments, 26 journal entries seeded (idempotent); NFRS reports verified returning data via API
- [ ] 6. Server-side pagination: users, tenants, branches, roles, notifications (platform-admin)
- [ ] 7. Subscriptions: module toggles in plan editor, changePlan bug fix, ModuleAccessGuard, sidebar gating
- [x] 8. Tenant-website /login route + NEXT_PUBLIC_TENANT_APP_URL — done and verified
- [x] 9. Verify class creation at 4006/classes — verified via API: POST /api/fitness/classes returns 201 with derived endTime (fix 4dec9ce works)
- [ ] 10. type-check + runtime verification
