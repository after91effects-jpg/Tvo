import { describe, it, expect } from 'vitest';
import { deserializeProduct } from '../server/product-serializer';
import { CartItem } from '../types';

describe('PHASE 12B-2: Product Customization & Design Upload', () => {
  const sampleProductRow = {
    id: 9999,
    sku: 'CK-CUSTOM-001',
    name: 'Belgian Chocolate Truffle Cake',
    slug: 'belgian-chocolate-truffle-cake',
    short_description: 'Rich dark chocolate cake',
    description: 'Decadent multi-layered chocolate cake.',
    regular_price: 699,
    sale_price: 599,
    cost_price: 300,
    stock: 25,
    low_stock_threshold: 5,
    stock_status: 'in_stock',
    category_id: 1,
    brand_id: null,
    weight_kg: 0.5,
    eggless: 1,
    flavours: JSON.stringify(['Chocolate', 'Red Velvet', 'Black Forest']),
    flavour_options_json: JSON.stringify([
      { id: 'flav_choc', name: 'Belgian Chocolate', additionalPrice: 0, enabled: true, sortOrder: 1 },
      { id: 'flav_rv', name: 'Red Velvet', additionalPrice: 100, enabled: true, sortOrder: 2 },
    ]),
    variations_json: JSON.stringify({
      type: 'weight',
      options: [
        { label: '500 g', weightKg: 0.5, price: 599, regularPrice: 699 },
        { label: '1 kg', weightKg: 1.0, price: 1099, regularPrice: 1299 },
      ],
    }),
    show_gallery: 1,
    show_flavour: 1,
    show_customize: 1,
    show_design_upload: 1,
  };

  it('correctly deserializes customization feature toggles and flavour options', () => {
    const product = deserializeProduct(sampleProductRow)!;

    expect(product.flavourOptions).toBeDefined();
    expect(product.flavourOptions?.length).toBe(2);
    expect(product.flavourOptions?.[1].name).toBe('Red Velvet');
    expect(product.flavourOptions?.[1].additionalPrice).toBe(100);

    expect(product.showCustomization).toBe(true);
    expect(product.showCustomerDesignUpload).toBe(true);
    expect(product.showFlavour).toBe(true);
  });

  it('preserves customization data structure on cart items', () => {
    const product = deserializeProduct(sampleProductRow)!;

    const cartItem: CartItem = {
      id: 'cart-1',
      productId: product.id,
      product,
      selectedWeight: { label: '1 kg', weightKg: 1.0, price: 1099 },
      selectedFlavour: 'Red Velvet',
      flavourPrice: 100,
      messageOnCake: 'Happy Birthday Priya! 🎂',
      customInstructions: 'Please write in gold cursive with less sugar',
      customDesignImage: '/uploads/custom-designs/sample-design.webp',
      customDesignDescription: 'Floral piping reference photo',
      addons: [],
      quantity: 1,
      unitPrice: 1199,
      totalPrice: 1199,
    };

    // Preserves Phase 12B-2 customization fields
    expect(cartItem.messageOnCake).toBe('Happy Birthday Priya! 🎂');
    expect(cartItem.customInstructions).toBe('Please write in gold cursive with less sugar');
    expect(cartItem.customDesignImage).toBe('/uploads/custom-designs/sample-design.webp');
    expect(cartItem.customDesignDescription).toBe('Floral piping reference photo');

    // Preserves flavour and pricing from Phase 12B-1
    expect(cartItem.selectedFlavour).toBe('Red Velvet');
    expect(cartItem.flavourPrice).toBe(100);
    expect(cartItem.unitPrice).toBe(1199);
    expect(cartItem.totalPrice).toBe(1199);
  });
});
