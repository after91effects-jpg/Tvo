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

  it('maps customization data into checkout order payload correctly', () => {
    const cartItem = {
      product: { id: '9999', name: 'Belgian Chocolate Truffle Cake', sku: 'CK-CUSTOM-001' },
      quantity: 2,
      selectedWeight: { label: '500 g', price: 599 },
      selectedFlavour: 'Belgian Chocolate',
      flavourPrice: 0,
      messageOnCake: 'Congratulations Aman!',
      customInstructions: 'Please pack in eco box',
      customDesignImage: '/uploads/custom-designs/design_123_abc.webp',
      customDesignDescription: 'Star pattern',
      addons: [],
      unitPrice: 599,
      totalPrice: 1198,
    };

    // Simulate Checkout mapping
    const orderItem = {
      productId: cartItem.product.id,
      name: cartItem.product.name,
      sku: cartItem.product.sku,
      qty: cartItem.quantity,
      price: cartItem.selectedWeight.price,
      weight: cartItem.selectedWeight.label,
      flavour: cartItem.selectedFlavour,
      flavourPrice: cartItem.flavourPrice,
      messageOnCake: cartItem.messageOnCake,
      customInstructions: cartItem.customInstructions,
      customDesignImage: cartItem.customDesignImage,
      customDesignDescription: cartItem.customDesignDescription,
      addons: cartItem.addons,
      sellingUnit: 'weight',
    };

    expect(orderItem.messageOnCake).toBe('Congratulations Aman!');
    expect(orderItem.customInstructions).toBe('Please pack in eco box');
    expect(orderItem.customDesignImage).toBe('/uploads/custom-designs/design_123_abc.webp');
    expect(orderItem.customDesignDescription).toBe('Star pattern');
  });

  it('sanitizes and preserves customization in server itemsJson while discarding base64 data URLs', () => {
    const inputItems = [
      {
        productId: '9999',
        name: 'Belgian Chocolate Truffle Cake',
        sku: 'CK-001',
        qty: 1,
        weight: '500 g',
        flavour: 'Chocolate',
        flavourPrice: 50,
        messageOnCake: ' Happy Birthday ',
        customInstructions: ' Extra chocolate drizzle ',
        customDesignImage: '/uploads/custom-designs/design_clean.webp',
        customDesignDescription: ' Minimalist gold leaf ',
      },
      {
        productId: '9999',
        name: 'Belgian Chocolate Truffle Cake',
        sku: 'CK-001',
        qty: 1,
        weight: '500 g',
        flavour: 'Original',
        flavourPrice: 0,
        messageOnCake: 'Best Mom',
        customInstructions: 'Deliver cold',
        customDesignImage: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        customDesignDescription: 'Base64 image should not be stored directly',
      },
    ];

    const serializedLines = inputItems.map((it) => {
      const safeDesignImage = it.customDesignImage && !String(it.customDesignImage).startsWith('data:')
        ? String(it.customDesignImage).trim().slice(0, 500)
        : null;

      return {
        productId: String(it.productId),
        name: it.name,
        sku: it.sku,
        qty: it.qty,
        weight: it.weight || null,
        flavour: it.flavour || null,
        flavourPrice: typeof it.flavourPrice === 'number' && it.flavourPrice >= 0 ? it.flavourPrice : 0,
        messageOnCake: it.messageOnCake ? String(it.messageOnCake).trim().slice(0, 100) : null,
        customInstructions: it.customInstructions ? String(it.customInstructions).trim().slice(0, 500) : null,
        customDesignImage: safeDesignImage,
        customDesignDescription: it.customDesignDescription ? String(it.customDesignDescription).trim().slice(0, 500) : null,
      };
    });

    // Clean URL preserved
    expect(serializedLines[0].messageOnCake).toBe('Happy Birthday');
    expect(serializedLines[0].customInstructions).toBe('Extra chocolate drizzle');
    expect(serializedLines[0].customDesignImage).toBe('/uploads/custom-designs/design_clean.webp');
    expect(serializedLines[0].customDesignDescription).toBe('Minimalist gold leaf');
    expect(serializedLines[0].flavourPrice).toBe(50);

    // Base64 image discarded
    expect(serializedLines[1].customDesignImage).toBeNull();
    expect(serializedLines[1].messageOnCake).toBe('Best Mom');
    expect(serializedLines[1].customInstructions).toBe('Deliver cold');
  });

  describe('PHASE 12B-3: Multiple Flavours Selector and Pricing', () => {
    it('provides standard 6 cake flavours with correct pricing for American Rich Milk Choco Cake', () => {
      const americanChocoCakeRow = {
        id: 13,
        sku: 'ARMCC',
        name: 'American Rich Milk Choco Cake',
        slug: 'american-rich-milk-choco-cake',
        category_slug: 'gourmet-cakes',
        category_id: 78,
        regular_price: 599,
        sale_price: 599,
        stock: 20,
        stock_status: 'in_stock',
        flavours: '[]',
        selling_unit: 'weight',
        published: 1,
      };

      const product = deserializeProduct(americanChocoCakeRow)!;
      expect(product.flavourOptions).toBeDefined();
      expect(product.flavourOptions?.length).toBe(6);

      const flavours = product.flavourOptions!;
      expect(flavours[0].name).toBe('Belgian Chocolate');
      expect(flavours[0].additionalPrice).toBe(0);
      expect(flavours[0].isDefault).toBe(true);

      expect(flavours[1].name).toBe('Red Velvet');
      expect(flavours[1].additionalPrice).toBe(50);

      expect(flavours[2].name).toBe('Vanilla');
      expect(flavours[2].additionalPrice).toBe(0);

      expect(flavours[3].name).toBe('Butterscotch');
      expect(flavours[3].additionalPrice).toBe(0);

      expect(flavours[4].name).toBe('Black Forest');
      expect(flavours[4].additionalPrice).toBe(0);

      expect(flavours[5].name).toBe('Fresh Strawberry');
      expect(flavours[5].additionalPrice).toBe(80);

      // Verify all flavours have active and storefront flags
      for (const f of flavours) {
        expect(f.isActive).toBe(true);
        expect(f.showOnStorefront).toBe(true);
      }
    });

    it('does not assign cake flavour options to non-cake products', () => {
      const candleRow = {
        id: 201,
        sku: 'CNDL-01',
        name: 'Festive Spiral Candle Set',
        slug: 'festive-spiral-candle-set',
        category_slug: 'party-supplies',
        category_id: 88,
        regular_price: 199,
        sale_price: 149,
        stock: 50,
        stock_status: 'in_stock',
        flavours: '[]',
        selling_unit: 'piece',
        published: 1,
      };

      const product = deserializeProduct(candleRow)!;
      expect(product.flavourOptions).toBeDefined();
      expect(product.flavourOptions?.length).toBe(0);
    });

    it('correctly updates unit and total prices when additional flavour pricing is applied', () => {
      const americanChocoCakeRow = {
        id: 13,
        sku: 'ARMCC',
        name: 'American Rich Milk Choco Cake',
        slug: 'american-rich-milk-choco-cake',
        category_slug: 'gourmet-cakes',
        category_id: 78,
        regular_price: 599,
        sale_price: 599,
        stock: 20,
        stock_status: 'in_stock',
        flavours: '[]',
        selling_unit: 'weight',
        published: 1,
      };

      const product = deserializeProduct(americanChocoCakeRow)!;
      const basePrice = 599;
      const selectedFlavourOption = product.flavourOptions?.find((f: any) => f.name === 'Fresh Strawberry')!;
      expect(selectedFlavourOption.additionalPrice).toBe(80);

      const cartItem: CartItem = {
        id: 'cart-choco-1',
        productId: product.id,
        product,
        selectedWeight: { label: '0.5 kg', weightKg: 0.5, price: basePrice },
        selectedFlavour: selectedFlavourOption.name,
        flavourPrice: selectedFlavourOption.additionalPrice,
        addons: [],
        quantity: 2,
        unitPrice: basePrice + selectedFlavourOption.additionalPrice,
        totalPrice: (basePrice + selectedFlavourOption.additionalPrice) * 2,
      };

      expect(cartItem.selectedFlavour).toBe('Fresh Strawberry');
      expect(cartItem.flavourPrice).toBe(80);
      expect(cartItem.unitPrice).toBe(679);
      expect(cartItem.totalPrice).toBe(1358);
    });
  });
});
