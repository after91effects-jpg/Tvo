import { describe, it, expect } from 'vitest';
import { deserializeProduct, parseDietaryAttributes } from '../server/product-serializer';
import { DEFAULT_DIETARY_ATTRIBUTES } from '../types';

describe('PHASE 12B-5: Dietary Attributes', () => {
  const baseRow = {
    id: 10212,
    sku: 'CK-DIET-001',
    name: 'Signature Truffle Cake',
    slug: 'signature-truffle-cake',
    short_description: 'Rich chocolate truffle cake',
    description: 'Layered chocolate sponge with ganache.',
    regular_price: 899,
    sale_price: 799,
    stock: 20,
    low_stock_threshold: 5,
    stock_status: 'in_stock',
    category_id: 1,
    variations_json: JSON.stringify({ options: [{ label: '0.5 kg', weightKg: 0.5, price: 799, mrp: 899 }] }),
  };

  it('ships 21 built-in dietary attributes including the Custom slot', () => {
    expect(DEFAULT_DIETARY_ATTRIBUTES.length).toBe(21);
    const keys = DEFAULT_DIETARY_ATTRIBUTES.map((d) => d.key);
    expect(keys).toContain('eggless');
    expect(keys).toContain('vegetarian');
    expect(keys).toContain('vegan');
    expect(keys).toContain('jain');
    expect(keys).toContain('halal');
    expect(keys).toContain('custom');
    for (const d of DEFAULT_DIETARY_ATTRIBUTES) {
      expect(typeof d.label).toBe('string');
      expect(typeof d.enabled).toBe('boolean');
      expect(typeof d.showOnStorefront).toBe('boolean');
    }
  });

  it('parses dietary attributes from valid JSON preserving enabled/show flags', () => {
    const parsed = parseDietaryAttributes(JSON.stringify([
      { key: 'eggless', label: 'Eggless', enabled: true, showOnStorefront: true },
      { key: 'vegan', label: 'Vegan', enabled: false, showOnStorefront: true },
      { key: 'jain', label: 'Jain', enabled: true, showOnStorefront: false },
    ]), false);

    expect(parsed).toHaveLength(3);
    expect(parsed.find((d) => d.key === 'eggless')).toMatchObject({ enabled: true, showOnStorefront: true, label: 'Eggless' });
    expect(parsed.find((d) => d.key === 'vegan')).toMatchObject({ enabled: false, showOnStorefront: true });
    expect(parsed.find((d) => d.key === 'jain')).toMatchObject({ enabled: true, showOnStorefront: false });
  });

  it('preserves custom attributes with trimmed labels and isCustom=true', () => {
    const parsed = parseDietaryAttributes(JSON.stringify([
      { key: 'custom_keto', label: '  Keto  ', enabled: true, showOnStorefront: true },
    ]), false);

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ key: 'custom_keto', label: 'Keto', enabled: true, showOnStorefront: true, isCustom: true });
  });

  it('falls back to the eggless column for legacy products without dietary_json', () => {
    const eggless = parseDietaryAttributes(undefined, true);
    expect(eggless).toHaveLength(1);
    expect(eggless[0]).toMatchObject({ key: 'eggless', label: 'Eggless', enabled: true, showOnStorefront: true });

    const notEggless = parseDietaryAttributes(null, false);
    expect(notEggless).toHaveLength(DEFAULT_DIETARY_ATTRIBUTES.length);
    expect(notEggless.every((d) => d.enabled === false)).toBe(true);
  });

  it('handles malformed JSON safely without guessing attributes', () => {
    const parsed = parseDietaryAttributes('{invalid json!!!', true);
    // Must not throw; must not fabricate data beyond the safe eggless fallback.
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed[0]).toMatchObject({ key: 'eggless', enabled: true });
  });

  it('deduplicates repeat keys keeping only the first occurrence', () => {
    const parsed = parseDietaryAttributes(JSON.stringify([
      { key: 'eggless', label: 'Eggless', enabled: true, showOnStorefront: true },
      { key: 'eggless', label: 'Eggless AGAIN', enabled: false, showOnStorefront: false },
      { key: 'nut_free', label: 'Nut-Free', enabled: true, showOnStorefront: true },
    ]), false);

    expect(parsed).toHaveLength(2);
    expect(parsed.filter((d) => d.key === 'eggless')).toHaveLength(1);
    expect(parsed.find((d) => d.key === 'eggless')?.enabled).toBe(true);
  });

  it('ignores non-object and unknown entries without throwing', () => {
    const parsed = parseDietaryAttributes(JSON.stringify([null, 'x', 42, { key: 'vegan', label: 'Vegan', enabled: true, showOnStorefront: true }]), false);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].key).toBe('vegan');
  });

  it('serializes dietary attributes through deserializeProduct', () => {
    const row = {
      ...baseRow,
      eggless: 1,
      dietary_json: JSON.stringify([
        { key: 'eggless', label: 'Eggless', enabled: true, showOnStorefront: true },
        { key: 'contains_nuts', label: 'Contains Nuts', enabled: true, showOnStorefront: true },
      ]),
    };
    const product = deserializeProduct(row)!;
    expect(product.dietaryAttributes).toHaveLength(2);
    expect(product.dietaryAttributes?.map((d) => d.key)).toEqual(['eggless', 'contains_nuts']);
  });
});

describe('PHASE 12B-5: Storefront Feature Controls', () => {
  const baseRow = {
    id: 10213,
    sku: 'CK-FEAT-001',
    name: 'Feature Control Cake',
    slug: 'feature-control-cake',
    short_description: 'desc',
    description: 'desc',
    regular_price: 599,
    sale_price: 499,
    stock: 10,
    low_stock_threshold: 5,
    stock_status: 'in_stock',
    category_id: 1,
    variations_json: JSON.stringify({ options: [{ label: '0.5 kg', weightKg: 0.5, price: 499, mrp: 599 }] }),
  };

  const EXPECTED_CONTROLS = [
    'showGallery', 'showVideo', 'showRatings', 'showBadges', 'showSizeSelector',
    'showFlavour', 'showCustomization', 'showCustomerDesignUpload', 'showAddons',
    'showDietary', 'showDeliveryDate', 'showDeliverySlot', 'showSpecialInstructions',
    'showReviews', 'showFaq', 'showRelatedProducts', 'showCheckoutOptions',
  ];

  it('exposes all 17 storefront feature controls', () => {
    const product = deserializeProduct(baseRow)!;
    for (const key of EXPECTED_CONTROLS) {
      expect(key in product).toBe(true);
    }
  });

  it('defaults to everything shown when columns are missing/undefined (backward compatible)', () => {
    const product = deserializeProduct(baseRow)!;
    for (const key of ['showGallery', 'showRatings', 'showBadges', 'showSizeSelector', 'showFlavour', 'showCustomization', 'showCustomerDesignUpload', 'showAddons', 'showDietary', 'showDeliveryDate', 'showDeliverySlot', 'showSpecialInstructions', 'showReviews', 'showFaq', 'showRelatedProducts', 'showCheckoutOptions']) {
      expect(product[key as keyof typeof product]).toBe(true);
    }
    // Video is off by default only when explicitly configured; undefined stays false.
    expect(product.showVideo).toBe(false);
  });

  it('respects explicit on/off values from the DB row (admin-driven)', () => {
    const row = {
      ...baseRow,
      show_gallery: 1,
      show_video: 1,
      show_ratings: 0,
      show_badges: 0,
      show_size_selector: 0,
      show_flavour: 0,
      show_customize: 0,
      show_design_upload: 0,
      show_addons: 0,
      show_dietary: 0,
      show_delivery_date: 0,
      show_delivery_slot: 0,
      show_special_instructions: 0,
      show_reviews: 0,
      show_faq: 0,
      show_related_products: 0,
      show_checkout_options: 0,
    };
    const product = deserializeProduct(row)!;
    expect(product.showGallery).toBe(true);
    expect(product.showVideo).toBe(true);
    expect(product.showRatings).toBe(false);
    expect(product.showBadges).toBe(false);
    expect(product.showSizeSelector).toBe(false);
    expect(product.showFlavour).toBe(false);
    expect(product.showCustomization).toBe(false);
    expect(product.showCustomerDesignUpload).toBe(false);
    expect(product.showAddons).toBe(false);
    expect(product.showDietary).toBe(false);
    expect(product.showDeliveryDate).toBe(false);
    expect(product.showDeliverySlot).toBe(false);
    expect(product.showSpecialInstructions).toBe(false);
    expect(product.showReviews).toBe(false);
    expect(product.showFaq).toBe(false);
    expect(product.showRelatedProducts).toBe(false);
    expect(product.showCheckoutOptions).toBe(false);
  });

  it('honors the 0-is-off convention for every new control', () => {
    const row = {
      ...baseRow,
      show_dietary: 0,
      show_delivery_date: 0,
      show_delivery_slot: 0,
      show_ratings: 0,
      show_badges: 0,
      show_size_selector: 0,
      show_reviews: 0,
      show_faq: 0,
      show_related_products: 0,
      show_checkout_options: 0,
    };
    const product = deserializeProduct(row)!;
    expect(product.showDietary).toBe(false);
    expect(product.showDeliveryDate).toBe(false);
    expect(product.showDeliverySlot).toBe(false);
    expect(product.showRatings).toBe(false);
    expect(product.showBadges).toBe(false);
    expect(product.showSizeSelector).toBe(false);
    expect(product.showReviews).toBe(false);
    expect(product.showFaq).toBe(false);
    expect(product.showRelatedProducts).toBe(false);
    expect(product.showCheckoutOptions).toBe(false);
  });

  it('keeps existing customization/addon serialization intact', () => {
    const row = {
      ...baseRow,
      customization_fee: 149,
      allow_custom_message: 1,
      allow_custom_design: 0,
      show_customize: 1,
      show_design_upload: 1,
      show_addons: 1,
    };
    const product = deserializeProduct(row)!;
    expect(product.customizationFee).toBe(149);
    expect(product.allowCustomMessage).toBe(true);
    expect(product.allowCustomDesign).toBe(false);
    expect(product.showCustomization).toBe(true);
    expect(product.showCustomerDesignUpload).toBe(true);
    expect(product.showAddons).toBe(true);
  });
});