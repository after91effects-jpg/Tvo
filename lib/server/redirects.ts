export interface RedirectRule {
  oldUrl: string;
  newUrl: string;
  statusCode: 301;
  reason: string;
}

export const SEO_301_REDIRECT_MAPPINGS: RedirectRule[] = [
  // Old short slugs & IDs
  { oldUrl: '/category/birthday', newUrl: '/cakes/shop-by-occasion/birthday-cakes', statusCode: 301, reason: 'Mapped to canonical Birthday Cakes' },
  { oldUrl: '/category/anniversary', newUrl: '/cakes/shop-by-occasion/anniversary-cakes', statusCode: 301, reason: 'Mapped to canonical Anniversary Cakes' },
  { oldUrl: '/category/chocolate', newUrl: '/cakes/shop-by-flavour/chocolate-cakes', statusCode: 301, reason: 'Mapped to canonical Chocolate Cakes' },
  { oldUrl: '/category/fruit-cakes', newUrl: '/cakes/shop-by-flavour/fruit-cakes', statusCode: 301, reason: 'Mapped to canonical Fruit Cakes' },
  { oldUrl: '/category/mango-cakes', newUrl: '/cakes/shop-by-flavour/mango-cakes', statusCode: 301, reason: 'Mapped to canonical Mango Cakes' },
  { oldUrl: '/category/trending-cakes', newUrl: '/cakes/wedding-special-occasion-cakes/gourmet-cakes', statusCode: 301, reason: 'Consolidated trending duplicate to canonical Gourmet Cakes' },
  { oldUrl: '/category/eggless', newUrl: '/cakes/shop-by-type/eggless-cakes', statusCode: 301, reason: 'Mapped to canonical Eggless Cakes' },
  { oldUrl: '/category/desserts', newUrl: '/desserts-pastries', statusCode: 301, reason: 'Mapped to Main Category Desserts & Pastries' },
  { oldUrl: '/category/hampers', newUrl: '/hampers-gifts', statusCode: 301, reason: 'Mapped to Main Category Hampers & Gifts' },
  { oldUrl: '/category/rakhi-hampers', newUrl: '/hampers-gifts/rakhi-raksha-bandhan', statusCode: 301, reason: 'Mapped to Rakhi & Raksha Bandhan' },
  { oldUrl: '/category/festive-candles', newUrl: '/party-supplies/candles', statusCode: 301, reason: 'Mapped to Party Supplies Candles' },
  { oldUrl: '/category/by-relation', newUrl: '/cakes/shop-by-relation', statusCode: 301, reason: 'Mapped to Cakes Shop by Relation' },

  // CSV ID mappings
  { oldUrl: '/category/1141', newUrl: '/cakes/shop-by-occasion/anniversary-cakes', statusCode: 301, reason: 'Legacy ID 1141 to Anniversary Cakes' },
  { oldUrl: '/category/1129', newUrl: '/cakes/shop-by-occasion/birthday-cakes', statusCode: 301, reason: 'Legacy ID 1129 to Birthday Cakes' },
  { oldUrl: '/category/1119', newUrl: '/cakes/shop-by-relation', statusCode: 301, reason: 'Legacy ID 1119 to Shop by Relation' },
  { oldUrl: '/category/1391', newUrl: '/cakes/shop-by-type', statusCode: 301, reason: 'Legacy ID 1391 to Shop by Type' },
  { oldUrl: '/category/1181', newUrl: '/cakes/shop-by-type/designer-cakes', statusCode: 301, reason: 'Legacy ID 1181 to Designer Cakes' },
  { oldUrl: '/category/1193', newUrl: '/desserts-pastries', statusCode: 301, reason: 'Legacy ID 1193 to Desserts & Pastries' },
  { oldUrl: '/category/1209', newUrl: '/hampers-gifts', statusCode: 301, reason: 'Legacy ID 1209 to Hampers & Gifts' },
  { oldUrl: '/category/2516', newUrl: '/hampers-gifts/rakhi-raksha-bandhan', statusCode: 301, reason: 'Legacy ID 2516 to Rakhi & Raksha Bandhan' },
  { oldUrl: '/category/1217', newUrl: '/party-supplies', statusCode: 301, reason: 'Legacy ID 1217 to Party Supplies' },
  { oldUrl: '/category/1259', newUrl: '/baking-store', statusCode: 301, reason: 'Legacy ID 1259 to Baking Store' },
  { oldUrl: '/category/1281', newUrl: '/baking-store/baking-ingredients', statusCode: 301, reason: 'Legacy ID 1281 to Baking Ingredients' },
  { oldUrl: '/category/1309', newUrl: '/baking-store/baking-appliances', statusCode: 301, reason: 'Legacy ID 1309 to Baking Appliances' },
  { oldUrl: '/category/1301', newUrl: '/baking-store/packaging-supplies', statusCode: 301, reason: 'Legacy ID 1301 to Packaging Supplies' },

  // Duplicate consolidations
  { oldUrl: '/cakes/heart-shaped-cakes-2', newUrl: '/cakes/shop-by-type/heart-shaped-cakes', statusCode: 301, reason: 'Merged duplicate heart-shaped-cakes-2' },
  { oldUrl: '/cakes/chocolate-cakes-2', newUrl: '/cakes/shop-by-flavour/chocolate-cakes', statusCode: 301, reason: 'Merged duplicate chocolate-cakes-2' },
  { oldUrl: '/cakes/red-velvet-cakes-2', newUrl: '/cakes/shop-by-flavour/red-velvet-cakes', statusCode: 301, reason: 'Merged duplicate red-velvet-cakes-2' },
  { oldUrl: '/cakes/butterscotch-cakes-2', newUrl: '/cakes/shop-by-flavour/butterscotch-cakes', statusCode: 301, reason: 'Merged duplicate butterscotch-cakes-2' },
  { oldUrl: '/cakes/black-forest-cakes-2', newUrl: '/cakes/shop-by-flavour/black-forest-cakes', statusCode: 301, reason: 'Merged duplicate black-forest-cakes-2' },
  { oldUrl: '/cakes/pineapple-cakes-2', newUrl: '/cakes/shop-by-flavour/pineapple-cakes', statusCode: 301, reason: 'Merged duplicate pineapple-cakes-2' },
  { oldUrl: '/cakes/vanilla-cakes-2', newUrl: '/cakes/shop-by-flavour/vanilla-cakes', statusCode: 301, reason: 'Merged duplicate vanilla-cakes-2' },
  { oldUrl: '/cakes/cheesecakes-by-type', newUrl: '/cakes/shop-by-flavour/cheesecakes', statusCode: 301, reason: 'Consolidated duplicate cheesecakes-by-type' },
  { oldUrl: '/desserts/dessert-cups-2', newUrl: '/desserts-pastries/dessert-cups-boxes', statusCode: 301, reason: 'Merged duplicate dessert-cups-2' },
  { oldUrl: '/desserts/pastries-2', newUrl: '/desserts-pastries/pastries', statusCode: 301, reason: 'Merged duplicate pastries-2' },
  { oldUrl: '/uncategorized', newUrl: '/cakes', statusCode: 301, reason: 'Redirected uncategorized to canonical Cakes' },
];
