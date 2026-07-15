#!/usr/bin/env node
// ============================================================================
// Seed: Madhyapur VR Fitness (Lokanthali, Bhaktapur, Nepal).
//
// Provisions the tenant through the SAME public API the signup wizard uses,
// then enriches it with premium content: brand (maroon/gold from their logo),
// contact + socials, membership plans, trainers, homepage sections and an
// About page. All page content is ordinary Website Builder data (Pages ->
// sections), fully editable by the tenant afterwards; marketing copy is
// location-neutral - the address lives only in the editable contact fields.
//
// Images are uploaded through the tenant's OWN files API (documentType
// LOGO/MEDIA, isPublic) and referenced by their permanent per-tenant URLs
// (/api/files/public/:id) - they live in the tenant's Media Library, count
// against its storage, and are NOT shared static assets visible to other
// tenants.
//
// Usage:
//   node scripts/seed-madhyapur.mjs [apiBase] [imagesDir]
//
// Re-runnable: provisioning/plans/trainers are skipped when present; pages
// are archived and rebuilt so content updates land.
// ============================================================================

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

const API = (process.argv[2] || 'https://api.onedexo.com').replace(/\/+$/, '');
const IMAGES_DIR = process.argv[3] || 'C:\\Users\\user\\Downloads\\MadhyapurVrfitness';

const SLUG = 'madhyapur';
const SITE = `https://${SLUG}.onedexo.com`;

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

const CONTACT = {
  phone: '985-1097131',
  address: 'Lokanthali-1, Bhaktapur (Kathmandu), Nepal 44600',
  mapUrl: 'https://maps.google.com/?q=Lokanthali+Bhaktapur+Nepal',
  facebook: 'https://www.facebook.com/madhyapurfitness',
  instagram: 'https://www.instagram.com/Madhyapur_VR_Fitness',
};

// Local source file -> clean name + document type. Uploaded once; matched by
// originalName on re-runs.
const IMAGES = {
  logo:           { src: 'logo.jpg', name: 'madhyapur-logo.jpg', documentType: 'LOGO' },
  trainingAction: { src: '626179758_18389753989197937_9114650184951904840_n.jpg', name: 'madhyapur-training-action.jpg', documentType: 'MEDIA' },
  ramesh:         { src: '615981682_1374534204685607_5627982288160546014_n.jpg', name: 'madhyapur-trainer-ramesh.jpg', documentType: 'MEDIA' },
  sushan:         { src: '670915484_1448786563927037_4353292000310712633_n.jpg', name: 'madhyapur-trainer-sushan.jpg', documentType: 'MEDIA' },
  prakash:        { src: '619661432_1381839297288431_4625668606018345901_n.jpg', name: 'madhyapur-trainer-prakash.jpg', documentType: 'MEDIA' },
  community1:     { src: '615963243_1374523968019964_6354820522506165197_n.jpg', name: 'madhyapur-community-1.jpg', documentType: 'MEDIA' },
  community2:     { src: '616602709_1374523858019975_8518694060753212649_n.jpg', name: 'madhyapur-community-2.jpg', documentType: 'MEDIA' },
  team:           { src: '616492914_1374534221352272_8604775410631670567_n.jpg', name: 'madhyapur-team.jpg', documentType: 'MEDIA' },
  community3:     { src: '696903432_1471142025024824_7403072953417871094_n.jpg', name: 'madhyapur-community-3.jpg', documentType: 'MEDIA' },
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
function done(msg) { console.log(`    [ok] ${msg}`); }
function warn(msg) { console.log(`    [!!] ${msg}`); }

async function main() {
  console.log(`Seeding Madhyapur VR Fitness against ${API}`);
  console.log(`Images from ${IMAGES_DIR}`);

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
        templateId: 'fitness-nocturne', // Dark Premium - fits maroon/gold gym branding
      },
      ownerEmail: OWNER.email,
      ownerPassword: OWNER.password,
      ownerFirstName: OWNER.firstName,
      ownerLastName: OWNER.lastName,
    },
  });
  if (prov.ok) {
    done(`tenant created: ${prov.data.tenantId} -> ${prov.data.url}`);
  } else if (prov.status === 409) {
    warn(`slug "${SLUG}" already exists - continuing with content refresh only`);
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

  // ------------------------------------------------------------ 3. Upload images (tenant-owned)
  step("Uploading images into the tenant's Media Library");
  const existingFiles = await api('/files', { token });
  const byName = new Map(
    (Array.isArray(existingFiles.data) ? existingFiles.data : existingFiles.data?.items || [])
      .map((f) => [f.originalName, f]),
  );
  /** key -> permanent public URL scoped to this tenant's file row */
  const img = {};
  for (const [key, def] of Object.entries(IMAGES)) {
    let file = byName.get(def.name);
    if (file) {
      warn(`${def.name} already uploaded - reusing`);
    } else {
      const bytes = await readFile(join(IMAGES_DIR, def.src));
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: 'image/jpeg' }), def.name);
      form.append('documentType', def.documentType);
      form.append('isPublic', 'true');
      const res = await fetch(`${API}/api/files/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.id) {
        warn(`upload ${def.name} failed: ${res.status} ${JSON.stringify(json)}`);
        continue;
      }
      file = json;
      done(`uploaded ${def.name}`);
    }
    img[key] = `${API}/api/files/public/${file.id}`;
  }
  if (!img.logo) { console.error('Logo upload failed - aborting. Is MinIO/S3 storage running on the server?'); process.exit(1); }

  // ------------------------------------------------------------ 4. Branding & contact
  step('Applying branding, contact details and social links');
  const branding = await api('/tenants/me/branding', {
    method: 'PUT',
    token,
    body: {
      colorPrimary: BRAND.colorPrimary,
      colorAccent: BRAND.colorAccent,
      logo: img.logo,
      tagline: 'No shortcuts. Just strength.',
      email: OWNER.email,
      phone: CONTACT.phone,
      address: CONTACT.address,
      social: {
        facebook: CONTACT.facebook,
        instagram: CONTACT.instagram,
        tiktok: '',
        youtube: '',
      },
    },
  });
  branding.ok ? done('branding saved') : warn(`branding failed: ${branding.status} ${JSON.stringify(branding.data)}`);

  // ------------------------------------------------------------ 5. Membership plans
  step('Creating membership plans');
  const existingPlans = await api('/fitness/membership-plans', { token });
  const have = new Set(
    (Array.isArray(existingPlans.data) ? existingPlans.data : existingPlans.data?.items || []).map((p) => p.name),
  );
  const withVat = (npr) => Math.round(npr * 1.13);
  const plans = [
    {
      name: 'Day Pass', type: 'TRIAL', durationDays: 1, priceNpr: 300, vatPercent: 13, totalWithVat: withVat(300),
      description: 'Full gym access for one day - perfect for trying us out.',
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
    if (have.has(plan.name)) { warn(`plan "${plan.name}" already exists - skipped`); continue; }
    const r = await api('/fitness/membership-plans', { method: 'POST', token, body: plan });
    r.ok ? done(`plan "${plan.name}" (NPR ${plan.priceNpr})`) : warn(`plan "${plan.name}" failed: ${r.status} ${JSON.stringify(r.data)}`);
  }

  // ------------------------------------------------------------ 6. Trainers
  step('Creating trainers');
  const existingTrainers = await api('/fitness/trainers', { token });
  const haveTrainer = new Set(
    (Array.isArray(existingTrainers.data) ? existingTrainers.data : existingTrainers.data?.items || []).map((t) => t.name),
  );
  const trainers = [
    {
      name: 'Ramesh Pyatha',
      specialization: 'Head Trainer & Founder - Strength and Conditioning',
      bio: 'Founder of Madhyapur VR Fitness and the heart of the gym. Ramesh has spent over a decade coaching bodybuilders and everyday members alike, and built this gym into one of the strongest fitness communities around. Facebook: https://www.facebook.com/rhymes.pyatha.1',
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
      bio: 'Known in the gym for leading by example, Prakash specialises in body transformations - fat loss, strength and discipline - for members of every level. Facebook: https://www.facebook.com/prakash.ale.62542',
      certifications: 'Certified Fitness Instructor',
    },
  ];
  for (const t of trainers) {
    if (haveTrainer.has(t.name)) { warn(`trainer "${t.name}" already exists - skipped`); continue; }
    const r = await api('/fitness/trainers', { method: 'POST', token, body: t });
    r.ok ? done(`trainer ${t.name}`) : warn(`trainer ${t.name} failed: ${r.status} ${JSON.stringify(r.data)}`);
  }

  // ------------------------------------------------------------ 7. Pages
  /** Archive any previous page with this slug, create fresh, publish. */
  async function buildPage({ name, slug, metaTitle, metaDescription, sections }) {
    const pagesRes = await api('/pages', { token });
    const pages = Array.isArray(pagesRes.data) ? pagesRes.data : pagesRes.data?.items || [];
    for (const old of pages.filter((p) => p.slug === slug && p.status !== 'archived')) {
      const r = await api(`/pages/${old.id}/archive`, { method: 'POST', token, body: {} });
      r.ok ? warn(`archived previous "${slug}" page`) : warn(`archive of old "${slug}" failed: ${r.status}`);
    }
    const created = await api('/pages', { method: 'POST', token, body: { name, slug, metaTitle, metaDescription } });
    if (!created.ok) {
      warn(`page "${slug}" create failed: ${created.status} ${JSON.stringify(created.data)}`);
      return;
    }
    for (const [componentType, content] of sections) {
      const s = await api(`/pages/${created.data.id}/sections`, { method: 'POST', token, body: { componentType, content } });
      s.ok ? done(`${slug}: section ${componentType}`) : warn(`${slug}: section ${componentType} failed: ${s.status} ${JSON.stringify(s.data)}`);
    }
    // Pages follow a review workflow: draft -> in_review -> approved -> published.
    for (const stepName of ['submit-review', 'approve', 'publish']) {
      const r = await api(`/pages/${created.data.id}/${stepName}`, { method: 'POST', token, body: {} });
      if (!r.ok) warn(`${slug}: ${stepName} failed: ${r.status} ${JSON.stringify(r.data)}`);
    }
    done(`page "${slug}" published`);
  }

  // Seeded member reviews - replace with real ones from Website -> Pages.
  const REVIEWS = [
    { quote: 'Joined for one month, stayed for three years. Ramesh dai personally corrected my squat form in my first week - that never happens in other gyms.', author: 'Suraj Maharjan, member since 2023' },
    { quote: "Lost 14 kg in 8 months with Prakash sir's transformation plan. The community here pushes you without judging you.", author: 'Anisha Shrestha' },
    { quote: 'Best free-weight floor in the area, hands down. Serious equipment, serious lifters, zero attitude.', author: 'Bibek Tamang' },
    { quote: 'My father (58) and I train here together. The trainers adjust everything for him - that care is why we renew every year.', author: 'Prajwal K.C.' },
  ];

  const TEAM_ITEMS = [
    { name: 'Ramesh Pyatha', role: 'Head Trainer & Founder', photo: img.ramesh },
    { name: 'Sushan Dware', role: 'Bodybuilding Coach', photo: img.sushan },
    { name: 'Prakash Ale', role: 'Transformation Coach', photo: img.prakash },
  ];

  const CONTACT_CONTENT = {
    address: CONTACT.address,
    phone: CONTACT.phone,
    email: OWNER.email,
    mapUrl: CONTACT.mapUrl,
  };

  step('Building the homepage sections (trainers / reviews / gallery / contact)');
  await buildPage({
    name: 'Home',
    slug: 'home', // slug "home" renders inside the template homepage as extra sections
    metaTitle: 'Madhyapur VR Fitness - Gym & Fitness Center',
    metaDescription: 'Train at Madhyapur VR Fitness: certified trainers, full free-weight floor, memberships from NPR 300.',
    sections: [
      ['team', { title: 'Meet Your Trainers', items: TEAM_ITEMS }],
      ['testimonials', { title: 'What Our Members Say', items: REVIEWS }],
      ['gallery', {
        title: 'Life at VR Fitness',
        items: [
          { image: img.trainingAction, caption: 'Leg day' },
          { image: img.community1, caption: 'The evening crew' },
          { image: img.community2, caption: 'Members & coaches' },
          { image: img.team, caption: 'The VR Fitness family' },
        ],
      }],
      ['contact', { title: 'Find Us', ...CONTACT_CONTENT }],
    ],
  });

  step('Building the About page (hero / story / team / gallery / contact)');
  await buildPage({
    name: 'About Us',
    slug: 'about-us',
    metaTitle: 'About Madhyapur VR Fitness',
    metaDescription: 'Madhyapur VR Fitness Pvt. Ltd. - our home of physical fitness. Meet our trainers, see the gym and start training today.',
    sections: [
      ['hero', {
        title: 'Built on Sweat. Powered by Community.',
        subtitle: 'Madhyapur VR Fitness Pvt. Ltd. - your home of physical fitness. Real equipment, real coaches, real results.',
        image: img.trainingAction,
        ctaLabel: 'Start Training Today',
        ctaUrl: '/contact',
      }],
      ['richtext', {
        html: [
          '<h2>Our Story</h2>',
          '<p>Madhyapur VR Fitness began with one belief: that every community deserves a serious place to train. What started as a neighbourhood gym has grown into one of the strongest fitness communities around - home to national-level bodybuilders, first-time lifters, and everyone in between.</p>',
          "<p>Walk in on any evening and you'll find the full spectrum: members chasing their first push-up and champions preparing for the stage - all training side by side, all pushing each other. That's the VR Fitness difference. <strong>No shortcuts. Just strength.</strong></p>",
        ].join(''),
      }],
      ['features', {
        title: 'Why Train With Us',
        items: [
          { title: 'Championship Coaching', description: 'SSI-certified instructors who compete, coach and walk the talk every single day.' },
          { title: 'Complete Free-Weight Floor', description: 'Squat racks, platforms, machines and dumbbells for every level, from first session to prep.' },
          { title: 'A Community That Shows Up', description: 'Birthdays, competitions and PRs - we celebrate every member milestone together.' },
          { title: 'Honest Membership Pricing', description: 'Plans from a NPR 300 day pass to a full Yearly Champion package. No hidden fees.' },
          { title: 'Personal Programming', description: 'Every membership starts with an assessment and a plan matched to your goal.' },
          { title: 'Open 7 Days', description: 'Early mornings to late evenings - 5AM to 9PM - so training fits your life.' },
        ],
      }],
      ['team', { title: 'Meet Your Trainers', items: TEAM_ITEMS }],
      ['gallery', {
        title: 'Inside the Gym',
        items: [
          { image: img.trainingAction, caption: 'Leg day on the racks' },
          { image: img.community1, caption: 'The evening crew' },
          { image: img.community2, caption: 'Members & coaches' },
          { image: img.team, caption: 'The VR Fitness family' },
          { image: img.community3, caption: 'Celebrating our members' },
          { image: img.logo, caption: 'Madhyapur VR Fitness Pvt. Ltd.' },
        ],
      }],
      ['testimonials', { title: 'What Our Members Say', items: REVIEWS.slice(0, 3) }],
      ['cta', {
        title: 'Your First Session Is On Us',
        subtitle: 'Come in for a free trial workout - meet the coaches, feel the plates, and see why our members train here.',
        ctaLabel: 'Claim Free Trial',
        ctaUrl: '/contact',
      }],
      ['contact', { title: 'Visit Us', ...CONTACT_CONTENT }],
    ],
  });

  // ------------------------------------------------------------ 8. Nav link (best-effort)
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
    warn('no menus found - add the About link from Website -> Navigation');
  }

  console.log(`\nDone.
  Website:      ${SITE}
  About page:   ${SITE}/about-us
  Admin panel:  ${SITE}/admin
  Admin login:  ${OWNER.email} / ${OWNER.password}  (change this password after first login!)
`);
}

main().catch((e) => { console.error(e); process.exit(1); });
