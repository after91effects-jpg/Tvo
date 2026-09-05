import { Product } from './types';
import { ALL_CSV_PRODUCTS } from './catalog';
import { MASTER_5_MAIN_CATEGORIES, MainCategoryHierarchy } from './masterCatalogHierarchy';

export interface ProductOrganizationReportItem {
  productId: string;
  sku: string;
  productName: string;
  oldCategory: string;
  newMainCategory: string;
  newSubCategory: string;
  newCanonicalCategory: string;
  additionalCategories: string[];
  canonicalUrl: string;
  price: number;
  stock: number;
  status: 'Organized' | 'Needs Review' | 'Preserved';
}

export interface CategoryMappingReportItem {
  oldCategory: string;
  newMainCategory: string;
  newSubCategory: string;
  newChildCategory: string;
  action: 'Keep' | 'Rename' | 'Reparent' | 'Merge' | 'Redirect' | 'Convert to Tag';
  oldUrl: string;
  newUrl: string;
}

export interface CategoryImageReportItem {
  categoryName: string;
  mainCategory: string;
  imageUrl: string;
  imageAlt: string;
  status: 'Active' | 'Optimized' | 'Generated';
}

/**
 * Intelligent categorization logic that examines product name, description,
 * flavours, tags, and dietary indicators without deleting any business data.
 */
export function organizeProductRecord(product: Product): Product {
  const nameLower = product.name.toLowerCase();
  const descLower = (product.description + ' ' + (product.shortDescription || '')).toLowerCase();
  const tagsLower = (product.tags || []).map((t) => t.toLowerCase());
  const combinedText = `${nameLower} ${descLower} ${tagsLower.join(' ')}`;

  // Preserved fields
  const updated: Product = { ...product };
  const targetCategories: Set<string> = new Set(product.categories || [product.category]);
  const targetSubcategories: Set<string> = new Set(product.subcategories || (product.subCategory ? [product.subCategory] : []));

  // Determine Main Category
  let mainCat = 'cakes';
  let primarySub = 'shop-by-flavour';

  if (
    combinedText.includes('pastry') ||
    combinedText.includes('cheesecake slice') ||
    combinedText.includes('cupcake') ||
    combinedText.includes('brownie') ||
    combinedText.includes('mousse cup') ||
    combinedText.includes('cookie') ||
    combinedText.includes('ladoo') ||
    combinedText.includes('barfi') ||
    combinedText.includes('jar cake') ||
    combinedText.includes('tea cake')
  ) {
    mainCat = 'desserts-pastries';
    if (combinedText.includes('pastry') || combinedText.includes('slice')) primarySub = 'pastries';
    else if (combinedText.includes('cookie')) primarySub = 'cookies';
    else if (combinedText.includes('mousse') || combinedText.includes('cup')) primarySub = 'dessert-cups-boxes';
    else if (combinedText.includes('ladoo') || combinedText.includes('mithai') || combinedText.includes('barfi')) primarySub = 'traditional-mithai';
    else if (combinedText.includes('cupcake')) primarySub = 'cupcakes';
    else if (combinedText.includes('brownie')) primarySub = 'brownies';
    else primarySub = 'pastries';
  } else if (
    combinedText.includes('hamper') ||
    combinedText.includes('rakhi') ||
    combinedText.includes('raksha bandhan') ||
    combinedText.includes('dry fruit') ||
    combinedText.includes('potli') ||
    combinedText.includes('gift box')
  ) {
    mainCat = 'hampers-gifts';
    if (combinedText.includes('rakhi') || combinedText.includes('raksha bandhan') || combinedText.includes('lumba')) {
      primarySub = 'rakhi-raksha-bandhan';
    } else {
      primarySub = 'gift-hampers';
    }
  } else if (
    combinedText.includes('candle') ||
    combinedText.includes('topper') ||
    combinedText.includes('balloon') ||
    combinedText.includes('pooja') ||
    combinedText.includes('decoration')
  ) {
    mainCat = 'party-supplies';
    primarySub = combinedText.includes('candle') ? 'candles' : 'party-decorations';
  } else if (
    combinedText.includes('baking tool') ||
    combinedText.includes('mould') ||
    combinedText.includes('premix') ||
    combinedText.includes('turntable')
  ) {
    mainCat = 'baking-store';
    primarySub = 'baking-tools';
  } else {
    // Default to Cakes
    mainCat = 'cakes';
    if (combinedText.includes('birthday') || combinedText.includes('bday')) primarySub = 'birthday-cakes';
    else if (combinedText.includes('anniversary') || combinedText.includes('love') || combinedText.includes('heart')) primarySub = 'anniversary-cakes';
    else if (combinedText.includes('chocolate') || combinedText.includes('truffle') || combinedText.includes('belgian')) primarySub = 'chocolate-cakes';
    else if (combinedText.includes('mango')) primarySub = 'mango-cakes';
    else if (combinedText.includes('pineapple') || combinedText.includes('fruit')) primarySub = 'fruit-cakes';
    else if (combinedText.includes('kunafa') || combinedText.includes('dubai') || combinedText.includes('trending')) primarySub = 'gourmet-cakes';
    else if (combinedText.includes('mom') || combinedText.includes('mother')) primarySub = 'cakes-for-mother';
    else primarySub = 'chocolate-cakes';
  }

  // Populate multi-intent categories
  targetCategories.add(mainCat);
  targetCategories.add(primarySub);

  // Map Occasions
  if (combinedText.includes('birthday')) {
    targetCategories.add('birthday-cakes');
    targetSubcategories.add('shop-by-occasion');
  }
  if (combinedText.includes('anniversary') || combinedText.includes('heart')) {
    targetCategories.add('anniversary-cakes');
    targetCategories.add('heart-shaped-cakes');
    targetSubcategories.add('shop-by-occasion');
  }
  if (combinedText.includes('wedding')) {
    targetCategories.add('wedding-cakes');
    targetSubcategories.add('wedding-special-occasion-cakes');
  }

  // Map Flavours
  if (combinedText.includes('chocolate') || combinedText.includes('truffle') || combinedText.includes('belgian')) {
    targetCategories.add('chocolate-cakes');
  }
  if (combinedText.includes('mango')) {
    targetCategories.add('mango-cakes');
  }
  if (combinedText.includes('pineapple')) {
    targetCategories.add('pineapple-cakes');
    targetCategories.add('fruit-cakes');
  }
  if (combinedText.includes('red velvet')) {
    targetCategories.add('red-velvet-cakes');
  }
  if (combinedText.includes('butterscotch')) {
    targetCategories.add('butterscotch-cakes');
  }
  if (combinedText.includes('tiramisu') || combinedText.includes('coffee')) {
    targetCategories.add('coffee-cakes');
  }
  if (combinedText.includes('cheesecake')) {
    targetCategories.add('cheesecakes');
  }

  // Map Relations
  if (combinedText.includes('mom') || combinedText.includes('mother')) {
    targetCategories.add('cakes-for-mother');
  }
  if (combinedText.includes('dad') || combinedText.includes('father')) {
    targetCategories.add('cakes-for-father');
  }
  if (combinedText.includes('brother') || combinedText.includes('bhai')) {
    targetCategories.add('cakes-for-brother');
  }
  if (combinedText.includes('sister')) {
    targetCategories.add('cakes-for-sister');
  }

  // Dietary
  if (product.eggless) {
    targetCategories.add('eggless-cakes');
  }

  // Apply non-destructive updates
  updated.category = mainCat;
  updated.subCategory = primarySub;
  updated.categories = Array.from(targetCategories);
  updated.subcategories = Array.from(targetSubcategories);

  // Generate clean SEO Title and Description if missing
  if (!updated.seoTitle) {
    updated.seoTitle = `${product.name} | Order Online with Express Delivery`;
  }
  if (!updated.seoDescription) {
    updated.seoDescription = `Order fresh handcrafted ${product.name} online. Made with premium ingredients and delivered fresh to your doorstep.`;
  }

  return updated;
}

// Master Organized Products List (Guarantees zero data loss: Total = ALL_CSV_PRODUCTS.length)
export const RESTRUCTURED_MASTER_PRODUCTS: Product[] = ALL_CSV_PRODUCTS.map((prod) =>
  organizeProductRecord(prod)
);

/**
 * Generate comprehensive reports for the Admin Category Restructure View
 */
export function generateCategoryMappingReport(): CategoryMappingReportItem[] {
  return [
    { oldCategory: 'Anniversary Cakes (1141)', newMainCategory: 'Cakes', newSubCategory: 'Shop by Occasion', newChildCategory: 'Anniversary Cakes', action: 'Reparent', oldUrl: '/category/anniversary', newUrl: '/cakes/shop-by-occasion/anniversary-cakes' },
    { oldCategory: 'Birthday Cakes (1129)', newMainCategory: 'Cakes', newSubCategory: 'Shop by Occasion', newChildCategory: 'Birthday Cakes', action: 'Reparent', oldUrl: '/category/birthday', newUrl: '/cakes/shop-by-occasion/birthday-cakes' },
    { oldCategory: 'Chocolate Cakes (1401/1108)', newMainCategory: 'Cakes', newSubCategory: 'Shop by Flavour', newChildCategory: 'Chocolate Cakes', action: 'Merge', oldUrl: '/category/chocolate', newUrl: '/cakes/shop-by-flavour/chocolate-cakes' },
    { oldCategory: 'Fruit Cakes (1405/1113)', newMainCategory: 'Cakes', newSubCategory: 'Shop by Flavour', newChildCategory: 'Fruit Cakes', action: 'Reparent', oldUrl: '/category/fruit-cakes', newUrl: '/cakes/shop-by-flavour/fruit-cakes' },
    { oldCategory: 'Mango Cakes (1094/1112)', newMainCategory: 'Cakes', newSubCategory: 'Shop by Flavour', newChildCategory: 'Mango Cakes', action: 'Merge', oldUrl: '/category/mango-cakes', newUrl: '/cakes/shop-by-flavour/mango-cakes' },
    { oldCategory: 'Trending Cakes (1082)', newMainCategory: 'Cakes', newSubCategory: 'Wedding & Special Occasions', newChildCategory: 'Gourmet Luxury Cakes', action: 'Convert to Tag', oldUrl: '/category/trending-cakes', newUrl: '/cakes/wedding-special-occasion-cakes/gourmet-cakes' },
    { oldCategory: 'By Relation (1119)', newMainCategory: 'Cakes', newSubCategory: 'Shop by Relation', newChildCategory: 'Cakes for Mother/Father/etc.', action: 'Reparent', oldUrl: '/category/by-relation', newUrl: '/cakes/shop-by-relation' },
    { oldCategory: 'By Type (1391)', newMainCategory: 'Cakes', newSubCategory: 'Shop by Type', newChildCategory: 'Heart / Bento / Eggless', action: 'Reparent', oldUrl: '/category/by-type', newUrl: '/cakes/shop-by-type' },
    { oldCategory: 'Desserts (1193)', newMainCategory: 'Desserts & Pastries', newSubCategory: 'Pastries & Slices', newChildCategory: 'Pastries', action: 'Rename', oldUrl: '/category/desserts', newUrl: '/desserts-pastries/pastries' },
    { oldCategory: 'Hampers (1209)', newMainCategory: 'Hampers & Gifts', newSubCategory: 'Gift Hampers', newChildCategory: 'Gift Hampers', action: 'Rename', oldUrl: '/category/hampers', newUrl: '/hampers-gifts/gift-hampers' },
    { oldCategory: 'Rakhi Hampers (2516)', newMainCategory: 'Hampers & Gifts', newSubCategory: 'Rakhi & Raksha Bandhan', newChildCategory: 'Rakhi & Raksha Bandhan', action: 'Reparent', oldUrl: '/category/rakhi-hampers', newUrl: '/hampers-gifts/rakhi-raksha-bandhan' },
    { oldCategory: 'Festive Candles (149)', newMainCategory: 'Party Supplies', newSubCategory: 'Candles', newChildCategory: 'Candles', action: 'Reparent', oldUrl: '/category/festive-candles', newUrl: '/party-supplies/candles' },
    { oldCategory: 'Baking Accessories (1259)', newMainCategory: 'Baking Store', newSubCategory: 'Baking Tools', newChildCategory: 'Baking Tools', action: 'Reparent', oldUrl: '/category/baking-accessories', newUrl: '/baking-store/baking-tools' },
    { oldCategory: 'Baking Ingredients (1281)', newMainCategory: 'Baking Store', newSubCategory: 'Baking Ingredients', newChildCategory: 'Baking Ingredients', action: 'Reparent', oldUrl: '/category/baking-ingredients', newUrl: '/baking-store/baking-ingredients' },
    { oldCategory: 'Baking Appliances (1309)', newMainCategory: 'Baking Store', newSubCategory: 'Baking Appliances', newChildCategory: 'Baking Appliances', action: 'Reparent', oldUrl: '/category/baking-appliances', newUrl: '/baking-store/baking-appliances' },
    { oldCategory: 'Packaging Supplies (1301)', newMainCategory: 'Baking Store', newSubCategory: 'Packaging Supplies', newChildCategory: 'Packaging Supplies', action: 'Reparent', oldUrl: '/category/packaging-supplies', newUrl: '/baking-store/packaging-supplies' },
  ];
}

export function generateProductOrganizationReport(products: Product[]): ProductOrganizationReportItem[] {
  return products.map((p) => {
    const defaultWeight = p.weightOptions?.find((w) => w.isDefault) || p.weightOptions?.[0];
    return {
      productId: p.id,
      sku: p.sku,
      productName: p.name,
      oldCategory: p.category,
      newMainCategory: p.category === 'cakes' ? 'Cakes' : p.category === 'desserts-pastries' ? 'Desserts & Pastries' : p.category === 'hampers-gifts' ? 'Hampers & Gifts' : p.category === 'party-supplies' ? 'Party Supplies' : 'Baking Store',
      newSubCategory: p.subCategory || 'General',
      newCanonicalCategory: `/${p.category}/${p.subCategory || ''}`,
      additionalCategories: p.categories || [],
      canonicalUrl: `/product/${p.slug}`,
      price: defaultWeight?.price || 0,
      stock: p.stock || 50,
      status: 'Organized',
    };
  });
}

export function generateCategoryImageReport(): CategoryImageReportItem[] {
  const reports: CategoryImageReportItem[] = [];
  MASTER_5_MAIN_CATEGORIES.forEach((main) => {
    reports.push({
      categoryName: main.name,
      mainCategory: main.name,
      imageUrl: main.image,
      imageAlt: main.imageAlt,
      status: 'Active',
    });
    main.subcategories.forEach((sub) => {
      reports.push({
        categoryName: `${main.name} → ${sub.name}`,
        mainCategory: main.name,
        imageUrl: sub.image,
        imageAlt: sub.imageAlt,
        status: 'Active',
      });
      sub.childCategories?.forEach((child) => {
        reports.push({
          categoryName: `${main.name} → ${sub.name} → ${child.name}`,
          mainCategory: main.name,
          imageUrl: child.image,
          imageAlt: child.imageAlt,
          status: 'Active',
        });
      });
    });
  });
  return reports;
}
