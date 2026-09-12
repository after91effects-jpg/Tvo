import { ok, err, getCurrentUser, isAdminRole } from '../../../../../lib/server/api';
import { upsertProduct } from '../../../../../lib/server/admin-catalog';

export const runtime = 'nodejs';

function requireAdmin(req: Request) {
  const user = getCurrentUser(req);
  if (!user || !isAdminRole(user.role)) return null;
  return user;
}

export async function POST(req: Request) {
  const user = requireAdmin(req);
  if (!user) return err('Admin access required', 403);

  try {
    const body = await req.json();
    const { rows, duplicateStrategy } = body;

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return err('No rows provided');
    }

    const summary = {
      created: 0,
      updated: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ row: number; reason: string; data: any }>,
    };

    // Get existing products from database to check for duplicates
    const { listProducts } = await import('../../../../../lib/server/admin-catalog');
    const existingProducts = listProducts({ limit: 10000 }).products || [];
    const existingMap = new Map<string, any>();
    existingProducts.forEach((p: any) => {
      if (p.sku) existingMap.set(p.sku.trim().toLowerCase(), p);
      if (p.name) existingMap.set(p.name.trim().toLowerCase(), p);
    });

    const CONFETTO_PRODUCT_FIELDS = [
      { key: 'sku', aliases: ['sku', 'product_sku', 'code', 'item_code'] },
      { key: 'name', aliases: ['name', 'title', 'product_name', 'post_title'] },
      { key: 'regularPrice', aliases: ['regular price', 'regular_price', 'mrp', 'price', 'standard_price'] },
      { key: 'salePrice', aliases: ['sale price', 'sale_price', 'selling_price', 'offer_price', 'price'] },
      { key: 'category', aliases: ['categories', 'category', 'product_cat', 'type'] },
      { key: 'shortDescription', aliases: ['short description', 'short_description', 'excerpt', 'post_excerpt', 'summary'] },
      { key: 'description', aliases: ['description', 'post_content', 'details', 'full_description'] },
      { key: 'stock', aliases: ['stock', 'inventory', 'quantity', 'qty', 'stock_quantity'] },
      { key: 'stockStatus', aliases: ['in stock?', 'stock_status', 'stock status', 'availability'] },
      { key: 'images', aliases: ['images', 'image', 'featured image', 'image_url', 'photos'] },
      { key: 'eggless', aliases: ['eggless', 'dietary', 'is_eggless', 'vegetarian', 'veg'] },
      { key: 'tags', aliases: ['tags', 'product_tags', 'keywords'] },
      { key: 'flavours', aliases: ['flavours', 'flavors', 'flavor', 'flavour'] },
      { key: 'badges', aliases: ['badges', 'badge', 'ribbon', 'highlight'] },
      { key: 'weight', aliases: ['weight (kg)', 'weight', 'size'] },
      { key: 'published', aliases: ['published', 'status', 'is_published', 'active'] },
      { key: 'seoTitle', aliases: ['seo title', 'meta_title', 'seo_title'] },
      { key: 'seoDescription', aliases: ['seo description', 'meta_description', 'seo_description'] },
    ];

    function autoSuggestColumnMapping(csvHeaders: string[]): Record<string, string> {
      const mapping: Record<string, string> = {};
      CONFETTO_PRODUCT_FIELDS.forEach(field => {
        const matchedHeader = csvHeaders.find(header => {
          const clean = header.trim().toLowerCase();
          return field.aliases.some(alias => clean === alias.toLowerCase() || clean.includes(alias.toLowerCase()));
        });
        if (matchedHeader) {
          mapping[field.key] = matchedHeader;
        }
      });
      return mapping;
    }

    function makeSlug(name: string): string {
      return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    }

    const headers = Object.keys(rows[0] || {});
    const mapping = autoSuggestColumnMapping(headers);

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const rowNum = index + 1;

      try {
        const skuVal = (row[mapping['sku']] || row['SKU'] || row['sku'] || '').toString().trim();
        const nameVal = (row[mapping['name']] || row['Name'] || row['name'] || '').toString().trim();

        if (!nameVal && !skuVal) {
          summary.skipped++;
          continue;
        }

        const existing = (skuVal && existingMap.get(skuVal.toLowerCase())) ||
          (nameVal && existingMap.get(nameVal.toLowerCase()));

        const regularPrice = parseFloat((row[mapping['regularPrice']] || row['Regular price'] || row['regular_price'] || 999).toString()) || 999;
        const salePrice = parseFloat((row[mapping['salePrice']] || row['Sale price'] || row['sale_price'] || regularPrice).toString()) || regularPrice;
        const rawCategory = (row[mapping['category']] || row['Categories'] || row['category'] || 'birthday').toString().trim();
        const categorySlug = rawCategory.toLowerCase().replace(/\s+/g, '-');
        const shortDesc = (row[mapping['shortDescription']] || row['Short description'] || row['short_description'] || 'Freshly baked artisan confection by TVO Flavours.').toString().trim();
        const fullDesc = (row[mapping['description']] || row['Description'] || row['description'] || shortDesc).toString().trim();
        const rawStock = parseInt((row[mapping['stock']] || row['Stock'] || row['stock'] || 20).toString(), 10);
        const stock = isNaN(rawStock) ? 20 : rawStock;
        const stockStatusVal = (row[mapping['stockStatus']] || row['In stock?'] || row['in_stock'] || '1').toString().toLowerCase();
        const stockStatus = stockStatusVal.includes('out') || stockStatusVal === '0' || stock <= 0 ? 'out_of_stock' : 'in_stock';
        const rawEggless = (row[mapping['eggless']] || row['Eggless'] || row['eggless'] || '').toString().toLowerCase();
        const eggless = rawEggless === 'yes' || rawEggless === 'true' || rawEggless === '1' || rawEggless.includes('veg');
        const tags = (row[mapping['tags']] || row['Tags'] || row['tags'] || '').toString() ? 
          (row[mapping['tags']] || row['Tags'] || row['tags'] || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean) : ['Artisan Cake'];
        const flavours = (row[mapping['flavours']] || row['Flavours'] || row['flavours'] || '').toString() ?
          (row[mapping['flavours']] || row['Flavours'] || row['flavours'] || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean) : ['Classic Vanilla'];
        const badges = (row[mapping['badges']] || row['Badges'] || row['badges'] || '').toString() ?
          (row[mapping['badges']] || row['Badges'] || row['badges'] || '').toString().split(',').map((s: string) => s.trim()).filter(Boolean) : (eggless ? ['Eggless'] : []);
        const rawImages = (row[mapping['images']] || row['Images'] || row['images'] || '').toString();
        const imageUrls = rawImages ? rawImages.split(',').map((s: string) => s.trim()).filter(Boolean) : [];
        
        const images = imageUrls.length > 0
          ? imageUrls.map((url: string, i: number) => ({
              url,
              thumbUrl: url,
              alt: `${nameVal} View ${i + 1}`,
            }))
          : [{
              url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80',
              thumbUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=300&q=70',
              alt: nameVal,
            }];
        
        const rawWeight = parseFloat((row[mapping['weight']] || row['Weight (kg)'] || row['weight'] || 0.5).toString()) || 0.5;
        const weightOptions = [
          { label: `${rawWeight} kg (Serves 4-6)`, weightKg: rawWeight, price: salePrice, mrp: regularPrice },
          { label: `${(rawWeight * 2).toFixed(1)} kg (Serves 8-10)`, weightKg: rawWeight * 2, price: Math.round(salePrice * 1.85), mrp: Math.round(regularPrice * 1.85) },
        ];
        const publishedVal = (row[mapping['published']] || row['Published'] || row['published'] || '1').toString();
        const published = publishedVal === '0' || publishedVal.toLowerCase() === 'false' ? false : true;

        const productData = {
          id: existing?.id || `prod-imp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          sku: skuVal || `CONF-IMP-${Date.now().toString().slice(-5)}`,
          name: nameVal || 'Imported Artisan Cake',
          slug: makeSlug(nameVal || 'imported-artisan-cake'),
          shortDescription: shortDesc,
          description: fullDesc,
          category: categorySlug,
          tags,
          flavours,
          eggless,
          weightOptions,
          images,
          rating: existing?.rating || 4.8,
          reviewCount: existing?.reviewCount || 1,
          stock,
          stockStatus,
          badges,
          published,
          seoTitle: (row[mapping['seoTitle']] || row['SEO Title'] || row['seo_title'] || `${nameVal} | TVO Flavours Artisan Bakery`).toString(),
          seoDescription: (row[mapping['seoDescription']] || row['SEO Description'] || row['seo_description'] || shortDesc).toString(),
          createdBy: user?.name || 'Chef Administrator',
        };

        if (existing) {
          if (duplicateStrategy === 'skip') {
            summary.skipped++;
            continue;
          } else if (duplicateStrategy === 'create_new') {
            delete productData.id;
            const r = upsertProduct(productData, user);
            summary.created++;
          } else {
            // 'overwrite' / 'update'
            const r = upsertProduct({ ...productData, id: existing.id }, user);
            summary.updated++;
          }
        } else {
          delete productData.id;
          const r = upsertProduct(productData, user);
          summary.created++;
        }
      } catch (err: any) {
        summary.failed++;
        summary.errors.push({
          row: rowNum,
          reason: err?.message || 'Error processing row',
          data: row,
        });
      }
    }

    return ok(summary);
  } catch (e: any) {
    return err(e.message || 'Import failed', 500);
  }
}