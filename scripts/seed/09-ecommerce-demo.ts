/**
 * Dexo v5 - 09: Demo ecommerce products (opt-in per tenant)
 *
 * OPT-IN ONLY. This is intentionally separate from
 * ProvisioningService.seedEcommerceDefaults(), which deliberately does NOT
 * create demo products for real tenants (see that method's comment). This
 * seeder exists purely to populate a demo/sandbox tenant's storefront with
 * ~50 browsable products so a customer demo has real data to click through.
 *
 * Called by index.ts's main pipeline for the two seeded demo tenants
 * (vrfitness, spicegarden). Also runnable standalone for any other tenant:
 *   ts-node --transpile-only scripts/seed/09-ecommerce-demo.ts --tenant=<subdomain>
 *   TENANT_SUBDOMAIN=<subdomain> ts-node --transpile-only scripts/seed/09-ecommerce-demo.ts
 *
 * `<subdomain>` may also be a tenant id (uuid) — falls back to an id lookup
 * if no tenant matches the subdomain.
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomIntBetween(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function money(value: number): Prisma.Decimal {
  return new Prisma.Decimal(value.toFixed(2));
}

interface CategoryDef {
  name: string;
  slug: string;
}

const CATEGORIES: CategoryDef[] = [
  { name: 'Electronics', slug: 'electronics' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Home & Living', slug: 'home-living' },
  { name: 'Beauty', slug: 'beauty' },
  { name: 'Sports & Outdoors', slug: 'sports-outdoors' },
  { name: 'Groceries', slug: 'groceries' },
  { name: 'Toys & Games', slug: 'toys-games' },
  { name: 'Books', slug: 'books' },
];

const BRAND_NAMES = [
  'Nimbus',
  'Orbit Co',
  'Verdant',
  'Aurora Goods',
  'Northline',
  'Pebble & Pine',
  'Bright Harbor',
];

// name, category slug, base price range
const PRODUCT_TEMPLATES: Array<{ name: string; category: string; min: number; max: number }> = [
  { name: 'Wireless Bluetooth Earbuds', category: 'electronics', min: 29, max: 89 },
  { name: 'Smart Fitness Watch', category: 'electronics', min: 49, max: 199 },
  { name: 'Portable Bluetooth Speaker', category: 'electronics', min: 25, max: 120 },
  { name: '65W USB-C Fast Charger', category: 'electronics', min: 15, max: 45 },
  { name: '4K Action Camera', category: 'electronics', min: 79, max: 249 },
  { name: 'Noise Cancelling Headphones', category: 'electronics', min: 59, max: 249 },
  { name: 'Mechanical Keyboard', category: 'electronics', min: 39, max: 149 },
  { name: 'Wireless Mouse', category: 'electronics', min: 12, max: 49 },
  { name: 'HD Webcam', category: 'electronics', min: 20, max: 79 },
  { name: 'Power Bank 20000mAh', category: 'electronics', min: 18, max: 59 },
  { name: "Men's Slim Fit Denim Jacket", category: 'fashion', min: 39, max: 99 },
  { name: "Women's Floral Summer Dress", category: 'fashion', min: 29, max: 89 },
  { name: 'Classic Leather Belt', category: 'fashion', min: 15, max: 45 },
  { name: 'Unisex Canvas Sneakers', category: 'fashion', min: 25, max: 79 },
  { name: 'Merino Wool Sweater', category: 'fashion', min: 45, max: 129 },
  { name: 'Aviator Sunglasses', category: 'fashion', min: 12, max: 59 },
  { name: 'Leather Crossbody Bag', category: 'fashion', min: 35, max: 119 },
  { name: 'Cotton Graphic T-Shirt', category: 'fashion', min: 9.99, max: 29.99 },
  { name: 'Ceramic Non-Stick Cookware Set', category: 'home-living', min: 49, max: 149 },
  { name: 'Memory Foam Pillow', category: 'home-living', min: 19, max: 49 },
  { name: 'Scented Soy Candle Trio', category: 'home-living', min: 15, max: 39 },
  { name: 'Stainless Steel Water Bottle', category: 'home-living', min: 12, max: 29 },
  { name: 'Cotton Throw Blanket', category: 'home-living', min: 25, max: 59 },
  { name: 'LED Desk Lamp', category: 'home-living', min: 18, max: 49 },
  { name: '6-Piece Towel Set', category: 'home-living', min: 22, max: 55 },
  { name: 'Bamboo Cutting Board', category: 'home-living', min: 14, max: 35 },
  { name: 'Hyaluronic Acid Serum', category: 'beauty', min: 14, max: 39 },
  { name: 'Vitamin C Brightening Cream', category: 'beauty', min: 16, max: 45 },
  { name: 'Matte Liquid Lipstick Set', category: 'beauty', min: 12, max: 32 },
  { name: 'Argan Oil Hair Mask', category: 'beauty', min: 10, max: 28 },
  { name: 'Charcoal Face Mask', category: 'beauty', min: 8, max: 22 },
  { name: 'Electric Facial Cleansing Brush', category: 'beauty', min: 19, max: 55 },
  { name: 'Yoga Mat with Carry Strap', category: 'sports-outdoors', min: 18, max: 49 },
  { name: 'Adjustable Dumbbell Set', category: 'sports-outdoors', min: 59, max: 199 },
  { name: '2-Person Camping Tent', category: 'sports-outdoors', min: 49, max: 159 },
  { name: 'Resistance Bands Set', category: 'sports-outdoors', min: 12, max: 29 },
  { name: 'Insulated Hiking Backpack', category: 'sports-outdoors', min: 39, max: 119 },
  { name: 'Foldable Camping Chair', category: 'sports-outdoors', min: 22, max: 55 },
  { name: 'Organic Trail Mix (12-Pack)', category: 'groceries', min: 15, max: 32 },
  { name: 'Cold Brew Coffee Concentrate', category: 'groceries', min: 9.99, max: 19.99 },
  { name: 'Extra Virgin Olive Oil 1L', category: 'groceries', min: 12, max: 28 },
  { name: 'Assorted Herbal Tea Sampler', category: 'groceries', min: 10, max: 24 },
  { name: 'Raw Honey Jar 500g', category: 'groceries', min: 9.99, max: 22 },
  { name: 'Wooden Building Blocks Set', category: 'toys-games', min: 19, max: 49 },
  { name: 'Remote Control Racing Car', category: 'toys-games', min: 25, max: 79 },
  { name: '1000-Piece Jigsaw Puzzle', category: 'toys-games', min: 12, max: 29 },
  { name: 'Plush Teddy Bear', category: 'toys-games', min: 9.99, max: 24.99 },
  { name: 'Strategy Board Game', category: 'toys-games', min: 19, max: 45 },
  { name: 'The Art of Modern Cooking (Hardcover)', category: 'books', min: 14, max: 35 },
  { name: 'Mystery of the Silent Harbor (Novel)', category: 'books', min: 9.99, max: 19.99 },
];

export async function seed09EcommerceDemo(tenantIdentifier: string) {
  console.log(`  → 09-ecommerce-demo (${tenantIdentifier})`);

  let tenant = await prisma.tenant.findUnique({ where: { subdomain: tenantIdentifier } });
  if (!tenant) {
    tenant = await prisma.tenant.findUnique({ where: { id: tenantIdentifier } }).catch(() => null);
  }
  if (!tenant) {
    throw new Error(`No tenant found for identifier "${tenantIdentifier}".`);
  }

  // 1. Ensure default warehouse exists (find-or-create, mirrors seedEcommerceDefaults' 'MAIN' code)
  let warehouse = await prisma.warehouse.findFirst({
    where: { tenantId: tenant.id, code: 'MAIN' },
  });
  if (!warehouse) {
    warehouse = await prisma.warehouse.create({
      data: { tenantId: tenant.id, name: 'Main Warehouse', code: 'MAIN', isDefault: true },
    });
  }

  // 2. Upsert categories
  const categoryBySlug = new Map<string, { id: string }>();
  for (const cat of CATEGORIES) {
    const existing = await prisma.productCategory.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug: cat.slug } },
    });
    if (existing) {
      const updated = await prisma.productCategory.update({
        where: { id: existing.id },
        data: { name: cat.name },
      });
      categoryBySlug.set(cat.slug, updated);
    } else {
      const created = await prisma.productCategory.create({
        data: { tenantId: tenant.id, name: cat.name, slug: cat.slug },
      });
      categoryBySlug.set(cat.slug, created);
    }
  }

  // 3. Upsert brands (no unique constraint on name, so find-first-by-name-then-create)
  const brands: { id: string; name: string }[] = [];
  for (const brandName of BRAND_NAMES) {
    const existing = await prisma.brand.findFirst({
      where: { tenantId: tenant.id, name: brandName },
    });
    if (existing) {
      brands.push(existing);
    } else {
      const created = await prisma.brand.create({
        data: { tenantId: tenant.id, name: brandName },
      });
      brands.push(created);
    }
  }

  // 4. Build 50 product definitions (cycle templates + a variant suffix so we hit exactly 50)
  const TOTAL_PRODUCTS = 50;
  const productDefs: Array<{
    index: number;
    name: string;
    categorySlug: string;
    sellingPrice: number;
  }> = [];

  for (let i = 0; i < TOTAL_PRODUCTS; i++) {
    const template = PRODUCT_TEMPLATES[i % PRODUCT_TEMPLATES.length];
    const cycle = Math.floor(i / PRODUCT_TEMPLATES.length);
    const name = cycle === 0 ? template.name : `${template.name} (Edition ${cycle + 1})`;
    const sellingPrice = Math.round(randomBetween(template.min, template.max) * 100) / 100;
    productDefs.push({ index: i, name, categorySlug: template.category, sellingPrice });
  }

  let productsCreated = 0;
  let productsUpdated = 0;

  for (const def of productDefs) {
    const skuNum = String(def.index + 1).padStart(4, '0');
    const sku = `DEMO-${skuNum}`;
    const slug = `${slugify(def.name)}-${skuNum}`;
    const category = categoryBySlug.get(def.categorySlug)!;
    const brand = brands[def.index % brands.length];

    const sellingPrice = Math.max(9.99, def.sellingPrice);
    const costPrice = sellingPrice * randomBetween(0.6, 0.7);
    const isFeatured = def.index % 8 === 0; // roughly ~6-7 featured products

    const images = [
      `https://picsum.photos/seed/${slug}/600/600`,
      `https://picsum.photos/seed/${slug}-alt/600/600`,
    ];

    const data = {
      tenantId: tenant.id,
      categoryId: category.id,
      brandId: brand.id,
      sku,
      name: def.name,
      slug,
      description: `${def.name} — a demo product for storefront preview. Sourced by ${brand.name}.`,
      images,
      costPrice: money(costPrice),
      sellingPrice: money(sellingPrice),
      taxRatePercent: money(13),
      trackInventory: true,
      isActive: true,
      isFeatured,
    };

    const existing = await prisma.product.findUnique({
      where: { tenantId_sku: { tenantId: tenant.id, sku } },
    });

    let product;
    if (existing) {
      product = await prisma.product.update({ where: { id: existing.id }, data });
      productsUpdated++;
    } else {
      product = await prisma.product.create({ data });
      productsCreated++;
    }

    // 5. Ensure a StockItem exists (find-then-create; @@unique doesn't dedupe when variantId is null)
    const existingStock = await prisma.stockItem.findFirst({
      where: {
        tenantId: tenant.id,
        productId: product.id,
        warehouseId: warehouse.id,
        variantId: null,
      },
    });

    const quantityOnHand = randomIntBetween(20, 200);

    if (existingStock) {
      await prisma.stockItem.update({
        where: { id: existingStock.id },
        data: { quantityOnHand },
      });
    } else {
      await prisma.stockItem.create({
        data: {
          tenantId: tenant.id,
          productId: product.id,
          warehouseId: warehouse.id,
          quantityOnHand,
          quantityReserved: 0,
        },
      });
    }
  }

  console.log(`    ${productsCreated} products created, ${productsUpdated} updated (${tenant.name})`);
}

function getCliTenantIdentifier(): string {
  const argFlag = process.argv.find((a) => a.startsWith('--tenant='));
  const fromArg = argFlag ? argFlag.split('=')[1] : undefined;
  const identifier = fromArg || process.env.TENANT_SUBDOMAIN || process.env.TENANT_ID;
  if (!identifier) {
    console.error(
      'Missing tenant identifier. Pass --tenant=<subdomain> or set TENANT_SUBDOMAIN / TENANT_ID env var.',
    );
    process.exit(1);
  }
  return identifier;
}

if (require.main === module) {
  seed09EcommerceDemo(getCliTenantIdentifier())
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('Error seeding demo ecommerce products:', e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
