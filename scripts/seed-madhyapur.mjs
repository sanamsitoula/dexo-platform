#!/usr/bin/env node
// ============================================================================
// Seed: Madhyapur VR Fitness — a real gym in Lokanthali, Bhaktapur, Nepal.
//
// Provisions the tenant through the SAME public API the signup wizard uses,
// then enriches it with premium content: brand (maroon/gold from their logo),
// contact + socials, membership plans, trainers, and a published About page
// (hero / story / team / gallery / contact sections) built from their real
// Facebook photos (committed under
// apps/tenant-website/public/tenants/madhyapur/).
//
// Usage:
//   node scripts/seed-madhyapur.mjs                       # against production
//   node scripts/seed-madhyapur.mjs http://localhost:4000 # against local API
//
// Idempotent-ish: if the slug is already taken it skips provisioning and
// only re-applies the content (logging in with the owner credentials).
// ============================================================================

const API = (process.argv[2] || 'https://api.onedexo.com').replace(/\/+$/, '');

const SLUG = 'madhyapur';
const SITE = `https://${SLUG}.onedexo.com`;
const IMG = (f) => `/tenants/madhyapur/${f}`; // served by tenant-website /public

const OWNER = {
  email: 'pyatharhymes@gmail.com',
  password: 'MadhyapurVR@2026',
  firstName: 'Ramesh',
  lastName: 'Pyatha',
};

const BRAND = {
  // Sampled from their circular logo: deep maroon + trophy gold "VR".
  colorPrimary: '#8E1B1B',
  colorAccent: '#F2C21B',
};

async function api(path, { method = 'GET', token, body } = {}) {
  const res = await fetch(`${API}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = text ? JSON.parse(text) : null; } catch { json = { raw: text }; }
  return { ok: res.ok, status: res.status, data: json };
}

function step(label) { console.log(`\n==> ${label}`); }
function done(msg) { console.log(`    ✓ ${msg}`); }
function warn(msg) { console.log(`    ⚠ ${msg}`); }

async function main() {
  console.log(`Seeding Madhyapur VR Fitness against ${API}`);

  // ------------------------------------------------------------ 1. Provision
  step('Provisioning tenant (signup wizard API)');
  const prov = await api('/tenants/provision', {
    method: 'POST',
    body: {
      slug: SLUG,
      name: 'Madhyapur VR Fitness',
      domainType: 'FITNESS_CENTER',
      themeId: 'fitness-pro',
      branding: {
        colorPrimary: BRAND.colorPrimary,
        colorAccent: BRAND.colorAccent,
        logo: IMG('logo.jpg'),
        templateId: 'fitness-nocturne', // Dark Premium — fits maroon/gold gym branding
      },
      ownerEmail: OWNER.email,
      ownerPassword: OWNER.password,
      ownerFirstName: OWNER.firstName,
      ownerLastName: OWNER.lastName,
    },
  });
  if (prov.ok) {
    done(`tenant created: ${prov.data.tenantId} → ${prov.data.url}`);
  } else if (prov.status === 409) {
    warn(`slug "${SLUG}" already exists — continuing with content refresh only`);
  } else {
    console.error('Provisioning failed:', prov.status, prov.data);
    process.exit(1);
  }

  // ------------------------------------------------------------ 2. Owner login
  step('Logging in as owner');
  const login = await api('/auth/login', { method: 'POST', body: { email: OWNER.email, password: OWNER.password } });
  if (!login.ok || !login.data?.accessToken) {
    console.error('Owner login failed:', login.status, login.data);
    process.exit(1);
  }
  const token = login.data.accessToken;
  done(`logged in as ${OWNER.email}`);

  // ------------------------------------------------------------ 3. Branding & contact
  step('Applying branding, contact details and social links');
  const branding = await api('/tenants/me/branding', {
    method: 'PUT',
    token,
    body: {
      colorPrimary: BRAND.colorPrimary,
      colorAccent: BRAND.colorAccent,
      logo: IMG('logo.jpg'),
      tagline: 'No shortcuts. Just strength. Train with the best in Bhaktapur.',
      email: OWNER.email,
      phone: '985-1097131',
      address: 'Lokanthali-1, Bhaktapur (Kathmandu), Nepal 44600',
      social: {
        facebook: 'https://www.facebook.com/madhyapurfitness',
        instagram: 'https://www.instagram.com/Madhyapur_VR_Fitness',
        tiktok: '',
        youtube: '',
      },
    },
  });
  branding.ok ? done('branding saved') : warn(`branding failed: ${branding.status} ${JSON.stringify(branding.data)}`);

  // ------------------------------------------------------------ 4. Membership plans
  step('Creating membership plans');
  const existingPlans = await api('/fitness/membership-plans', { token });
  const have = new Set(
    (Array.isArray(existingPlans.data) ? existingPlans.data : existingPlans.data?.items || []).map((p) => p.name),
  );
  const withVat = (npr) => Math.round(npr * 1.13);
  const plans = [
    {
      name: 'Day Pass', type: 'TRIAL', durationDays: 1, priceNpr: 300, vatPercent: 13, totalWithVat: withVat(300),
      description: 'Full gym access for one day — perfect for trying us out or training while visiting Bhaktapur.',
      includesTrainer: false, includesClasses: false, freezeAllowed: false, maxFreezeDays: 0, accessHours: '5AM-9PM', sortOrder: 0,
    },
    {
      name: 'Monthly', type: 'MONTHLY', durationDays: 30, priceNpr: 2500, vatPercent: 13, totalWithVat: withVat(2500),
      description: 'Unlimited gym access with a personalised starter workout plan from our instructors.',
      includesTrainer: false, includesClasses: true, freezeAllowed: true, maxFreezeDays: 7, accessHours: '5AM-9PM', sortOrder: 1,
    },
    {
      name: 'Quarterly', type: 'QUARTERLY', durationDays: 90, priceNpr: 6500, vatPercent: 13, totalWithVat: withVat(6500),
      description: '3 months of training with monthly body assessments and diet guidance. Save ~13% vs monthly.',
      includesTrainer: false, includesClasses: true, includesDietPlan: true, freezeAllowed: true, maxFreezeDays: 15, accessHours: '5AM-9PM', sortOrder: 2,
    },
    {
      name: 'Yearly Champion', type: 'YEARLY', durationDays: 365, priceNpr: 21000, vatPercent: 13, totalWithVat: withVat(21000),
      description: 'Our best value: 12 months, dedicated instructor support, diet plan, locker and priority class booking. Save ~30%.',
      includesTrainer: true, includesClasses: true, includesDietPlan: true, includesLocker: true, freezeAllowed: true, maxFreezeDays: 30, accessHours: '5AM-9PM', sortOrder: 3,
    },
  ];
  for (const plan of plans) {
    if (have.has(plan.name)) { warn(`plan "${plan.name}" already exists — skipped`); continue; }
    const r = await api('/fitness/membership-plans', { method: 'POST', token, body: plan });
    r.ok ? done(`plan "${plan.name}" (NPR ${plan.priceNpr})`) : warn(`plan "${plan.name}" failed: ${r.status} ${JSON.stringify(r.data)}`);
  }

  // ------------------------------------------------------------ 5. Trainers
  step('Creating trainers');
  const existingTrainers = await api('/fitness/trainers', { token });
  const haveTrainer = new Set(
    (Array.isArray(existingTrainers.data) ? existingTrainers.data : existingTrainers.data?.items || []).map((t) => t.name),
  );
  const trainers = [
    {
      name: 'Ramesh Pyatha',
      specialization: 'Head Trainer & Founder — Strength and Conditioning',
      bio: 'Founder of Madhyapur VR Fitness and the heart of the gym. Ramesh has spent over a decade coaching bodybuilders and everyday members alike, and built this gym into Lokanthali’s strongest community. Facebook: https://www.facebook.com/rhymes.pyatha.1',
      certifications: 'SSI Certified Fitness Instructor',
    },
    {
      name: 'Sushan Dware',
      specialization: 'Bodybuilding & Muscle Hypertrophy',
      bio: 'Competition-level physique athlete who coaches members through structured muscle-building programmes with an eye for perfect form. Facebook: https://www.facebook.com/sushan.dware',
      certifications: 'Certified Personal Trainer',
    },
    {
      name: 'Prakash Ale',
      specialization: 'Functional Fitness & Transformation Coaching',
      bio: 'Known in the gym for leading by example, Prakash specialises in body transformations — fat loss, strength and discipline — for members of every level. Facebook: https://www.facebook.com/prakash.ale.62542',
      certifications: 'Certified Fitness Instructor',
    },
  ];
  for (const t of trainers) {
    if (haveTrainer.has(t.name)) { warn(`trainer "${t.name}" already exists — skipped`); continue; }
    const r = await api('/fitness/trainers', { method: 'POST', token, body: t });
    r.ok ? done(`trainer ${t.name}`) : warn(`trainer ${t.name} failed: ${r.status} ${JSON.stringify(r.data)}`);
  }

  // ------------------------------------------------------------ 6. About page
  step('Building the About page (hero / story / team / gallery / contact)');
  const pagesRes = await api('/pages', { token });
  const pages = Array.isArray(pagesRes.data) ? pagesRes.data : pagesRes.data?.items || [];
  let about = pages.find((p) => p.slug === 'about-us');
  if (about) {
    warn('about-us page already exists — leaving it untouched');
  } else {
    const created = await api('/pages', {
      method: 'POST', token,
      body: {
        name: 'About Us',
        slug: 'about-us',
        metaTitle: 'About Madhyapur VR Fitness — Gym in Lokanthali, Bhaktapur',
        metaDescription: 'Madhyapur VR Fitness Pvt. Ltd. — Bhaktapur’s home of physical fitness. Meet our trainers, see the gym and start training today.',
      },
    });
    if (!created.ok) {
      warn(`page create failed: ${created.status} ${JSON.stringify(created.data)}`);
    } else {
      about = created.data;
      const sections = [
        ['hero', {
          title: 'Built on Sweat. Powered by Community.',
          subtitle: 'Madhyapur VR Fitness Pvt. Ltd. — Lokanthali’s home of physical fitness since day one. Real equipment, real coaches, real results.',
          image: IMG('training-action.jpg'),
          ctaLabel: 'Start Training Today',
          ctaUrl: '/contact',
        }],
        ['richtext', {
          html: [
            '<h2>Our Story</h2>',
            '<p>Madhyapur VR Fitness began with one belief: that everyone in Bhaktapur deserves a serious place to train. What started as a neighbourhood gym in Lokanthali has grown into one of the area’s strongest fitness communities — home to national-level bodybuilders, first-time lifters, and everyone in between.</p>',
            '<p>Walk in on any evening and you’ll find the full spectrum: members chasing their first push-up and champions preparing for the stage — all training side by side, all pushing each other. That’s the VR Fitness difference. <strong>No shortcuts. Just strength.</strong></p>',
          ].join(''),
        }],
        ['features', {
          title: 'Why Train With Us',
          items: [
            { title: 'Championship Coaching', description: 'SSI-certified instructors who compete, coach and walk the talk every single day.' },
            { title: 'Complete Free-Weight Floor', description: 'Squat racks, platforms, machines and dumbbells for every level, from first session to prep.' },
            { title: 'A Community That Shows Up', description: 'Birthdays, competitions and PRs — we celebrate every member milestone together.' },
            { title: 'Honest Membership Pricing', description: 'Plans from a NPR 300 day pass to a full Yearly Champion package. No hidden fees.' },
            { title: 'Personal Programming', description: 'Every membership starts with an assessment and a plan matched to your goal.' },
            { title: 'Open 7 Days', description: 'Early mornings to late evenings — 5AM to 9PM — so training fits your life.' },
          ],
        }],
        ['team', {
          title: 'Meet Your Trainers',
          items: [
            { name: 'Ramesh Pyatha', role: 'Head Trainer & Founder', photo: IMG('ramesh-pyatha.jpg') },
            { name: 'Sushan Dware', role: 'Bodybuilding Coach', photo: IMG('sushan-dware.jpg') },
            { name: 'Prakash Ale', role: 'Transformation Coach', photo: IMG('prakash-ale.jpg') },
          ],
        }],
        ['gallery', {
          title: 'Inside the Gym',
          items: [
            { image: IMG('training-action.jpg'), caption: 'Leg day on the racks' },
            { image: IMG('community-1.jpg'), caption: 'The evening crew' },
            { image: IMG('community-2.jpg'), caption: 'Members & coaches' },
            { image: IMG('team.jpg'), caption: 'The VR Fitness family' },
            { image: IMG('community-3.jpg'), caption: 'Celebrating our members' },
            { image: IMG('logo.jpg'), caption: 'Madhyapur VR Fitness Pvt. Ltd.' },
          ],
        }],
        ['cta', {
          title: 'Your First Session Is On Us',
          subtitle: 'Come in for a free trial workout — meet the coaches, feel the plates, and see why Lokanthali trains here.',
          ctaLabel: 'Claim Free Trial',
          ctaUrl: '/contact',
        }],
        ['contact', {
          title: 'Visit Us',
          address: 'Lokanthali-1, Bhaktapur (Kathmandu), Nepal 44600',
          phone: '985-1097131',
          email: OWNER.email,
          mapUrl: 'https://maps.google.com/?q=Lokanthali+Bhaktapur+Nepal',
        }],
      ];
      for (const [componentType, content] of sections) {
        const s = await api(`/pages/${about.id}/sections`, { method: 'POST', token, body: { componentType, content } });
        s.ok ? done(`section ${componentType}`) : warn(`section ${componentType} failed: ${s.status} ${JSON.stringify(s.data)}`);
      }
      // Pages follow a review workflow: draft → in_review → approved → published.
      for (const stepName of ['submit-review', 'approve', 'publish']) {
        const r = await api(`/pages/${about.id}/${stepName}`, { method: 'POST', token, body: {} });
        r.ok ? done(`page ${stepName}`) : warn(`page ${stepName} failed: ${r.status} ${JSON.stringify(r.data)}`);
      }
    }
  }

  // ------------------------------------------------------------ 7. Nav link (best-effort)
  step('Adding About link to site navigation (best-effort)');
  const menus = await api('/menus', { token });
  const menuList = Array.isArray(menus.data) ? menus.data : menus.data?.items || [];
  const mainMenu = menuList[0];
  if (mainMenu) {
    const items = await api(`/menus/${mainMenu.id}/items`, { token });
    const list = Array.isArray(items.data) ? items.data : items.data?.items || [];
    if (list.some((i) => /about/i.test(i.label || ''))) {
      warn('About nav item already present');
    } else {
      const add = await api(`/menus/${mainMenu.id}/items`, { method: 'POST', token, body: { label: 'About', url: '/about-us' } });
      add.ok ? done('nav item "About" added') : warn(`nav item failed: ${add.status} ${JSON.stringify(add.data)}`);
    }
  } else {
    warn('no menus found — add the About link from Website → Navigation');
  }

  console.log(`\n🎉 Done.
  Website:      ${SITE}
  About page:   ${SITE}/about-us
  Admin panel:  ${SITE}/admin
  Admin login:  ${OWNER.email} / ${OWNER.password}  (change this password after first login!)
`);
}

main().catch((e) => { console.error(e); process.exit(1); });
