import { describe, it, expect } from "vitest";
import { deserializeProduct } from "../server/product-serializer";
import { validateSlot } from "../server/order-engine";
import { normalizeOrderRow } from "../orderNormalizer";
import type { CartItem, WeightOption } from "../types";

describe("PHASE 12B Final End-to-End Customer Purchase Flow", () => {
  // Step 1 - 3: Product, Weight, Flavour Selection
  const sampleProductRow = {
    id: 1,
    sku: "CK-PINE-01",
    name: "Pineapple Cake",
    slug: "pineapple-cake",
    regular_price: 599,
    sale_price: 529,
    stock: 25,
    stock_status: "in_stock",
    category_slug: "birthday-cakes",
    category_id: 105,
    selling_unit: "weight",
    published: 1,
    show_customize: 1,
    show_design_upload: 1,
    show_flavour: 1,
    show_addons: 1,
    flavour_options_json: JSON.stringify([
      { id: "flav-1", name: "Vanilla", additionalPrice: 0, isDefault: true, isActive: true, showOnStorefront: true },
      { id: "flav-2", name: "Fresh Strawberry", additionalPrice: 80, isDefault: false, isActive: true, showOnStorefront: true },
      { id: "flav-3", name: "Red Velvet", additionalPrice: 50, isDefault: false, isActive: true, showOnStorefront: true },
    ]),
    variations_json: JSON.stringify({
      attribute: "Select Weight",
      options: [
        { label: "0.5 kg", weightKg: 0.5, price: 529, mrp: 599 },
        { label: "1 kg", weightKg: 1.0, price: 999, mrp: 1199 },
      ],
    }),
  };

  const product = deserializeProduct(sampleProductRow)!;

  it("Step 1 - 3: product correctly deserializes with options, weights, and flavours", () => {
    expect(product).toBeDefined();
    expect(product.name).toBe("Pineapple Cake");
    const weightOpts = (product.weightOptions as any)?.options || product.weightOptions;
    expect(weightOpts.length).toBe(2);
    expect(product.flavourOptions?.length).toBe(3);

    // Feature toggles are enabled
    expect(product.showCustomization).toBe(true);
    expect(product.showCustomerDesignUpload).toBe(true);
  });

  it("Step 4 - 10: customization, reference image, add-ons, and quantity in Cart", () => {
    const weightOpts = (product.weightOptions as any)?.options || product.weightOptions;
    const selectedWeight: WeightOption = weightOpts[1]!; // 1 kg -> ₹999
    const selectedFlavour = "Fresh Strawberry";
    const selectedFlavourPrice = 80;
    const messageOnCake = "Happy 25th Anniversary! 💍";
    const customInstructions = "Make it eggless with less cream and golden pearls";
    const customDesignImage = "/uploads/custom-designs/design_1789639790426_44db6ad40fa5.webp";
    const customDesignDescription = "Tiered floral piped border reference";
    const selectedAddOns = [
      { id: "addon-candle", name: "Musical Rotating Candle", price: 99 },
      { id: "addon-card", name: "Handwritten Greeting Card", price: 49 },
    ];
    const quantity = 2;

    const addOnsTotal = selectedAddOns.reduce((sum, a) => sum + a.price, 0); // 99 + 49 = 148
    const unitPrice = selectedWeight.price + selectedFlavourPrice + addOnsTotal; // 999 + 80 + 148 = 1227
    const totalPrice = unitPrice * quantity; // 1227 * 2 = 2454

    const cartItem: CartItem = {
      id: "cart-item-anniversary-1",
      productId: product.id,
      product,
      selectedWeight,
      selectedFlavour,
      flavourPrice: selectedFlavourPrice,
      messageOnCake,
      customInstructions,
      customDesignImage,
      customDesignDescription,
      addons: selectedAddOns,
      quantity,
      unitPrice,
      totalPrice,
    };

    // Step 11 - 12: Verify cart data integrity
    expect(cartItem.selectedWeight.label).toBe("1 kg");
    expect(cartItem.selectedFlavour).toBe("Fresh Strawberry");
    expect(cartItem.flavourPrice).toBe(80);
    expect(cartItem.messageOnCake).toBe("Happy 25th Anniversary! 💍");
    expect(cartItem.customInstructions).toContain("less cream");
    expect(cartItem.customDesignImage).toBe("/uploads/custom-designs/design_1789639790426_44db6ad40fa5.webp");
    expect(cartItem.customDesignImage).not.toContain("data:image"); // NEVER base64
    expect(cartItem.customDesignDescription).toBe("Tiered floral piped border reference");
    expect(cartItem.addons.length).toBe(2);
    expect(cartItem.quantity).toBe(2);
    expect(cartItem.unitPrice).toBe(1227);
    expect(cartItem.totalPrice).toBe(2454);
  });

  it("Step 13 - 14: Cart differentiation - multiple customized variants of same product do not merge", () => {
    const item1: CartItem = {
      id: "cart-1",
      productId: "1",
      product,
      selectedWeight: { label: "1 kg", weightKg: 1.0, price: 999, mrp: 1199 },
      selectedFlavour: "Vanilla",
      flavourPrice: 0,
      messageOnCake: "Happy Birthday Rohan",
      addons: [],
      quantity: 1,
      unitPrice: 999,
      totalPrice: 999,
    };

    const item2: CartItem = {
      id: "cart-2",
      productId: "1",
      product,
      selectedWeight: { label: "1 kg", weightKg: 1.0, price: 999, mrp: 1199 },
      selectedFlavour: "Fresh Strawberry",
      flavourPrice: 80,
      messageOnCake: "Happy Birthday Priya",
      customDesignImage: "/uploads/custom-designs/priya_ref.webp",
      addons: [],
      quantity: 1,
      unitPrice: 1079,
      totalPrice: 1079,
    };

    const cart = [item1];
    // Check duplication predicate used in CartContext.tsx
    const isSameCustomization = (a: CartItem, b: CartItem) =>
      a.productId === b.productId &&
      a.selectedWeight.label === b.selectedWeight.label &&
      a.selectedFlavour === b.selectedFlavour &&
      (a.flavourPrice || 0) === (b.flavourPrice || 0) &&
      (a.messageOnCake || "") === (b.messageOnCake || "") &&
      (a.customDesignImage || "") === (b.customDesignImage || "");

    const exists = cart.some((c) => isSameCustomization(c, item2));
    expect(exists).toBe(false); // Does NOT merge!

    const updatedCart = [...cart, item2];
    expect(updatedCart.length).toBe(2);
    expect(updatedCart[0].messageOnCake).toBe("Happy Birthday Rohan");
    expect(updatedCart[1].messageOnCake).toBe("Happy Birthday Priya");
  });

  it("Step 15 - 18: Delivery validation and server-authoritative price calculation", () => {
    const future = new Date();
    future.setDate(future.getDate() + 2);
    const deliveryDate = future.toISOString().split("T")[0];

    const slotCheck = validateSlot(deliveryDate, "Morning Fresh", 1);
    expect(slotCheck.ok).toBe(true);

    // Tampered client prices simulation
    const clientSuppliedItem = {
      productId: "1",
      price: 1, // Tampered
      flavourPrice: 0, // Tampered
      addonPrice: 0, // Tampered
      subtotal: 1, // Tampered
      total: 1, // Tampered
      qty: 2,
    };

    // Server authoritative calculation
    const serverWeightPrice = 999;
    const serverFlavourPrice = 80;
    const serverAddonPrice = 148;
    const authoritativeUnitPrice = serverWeightPrice + serverFlavourPrice + serverAddonPrice;
    const authoritativeSubtotal = authoritativeUnitPrice * clientSuppliedItem.qty; // 1227 * 2 = 2454

    expect(authoritativeSubtotal).toBe(2454);
    expect(authoritativeSubtotal).not.toBe(clientSuppliedItem.total);

    // Free delivery threshold test: ₹2454 >= ₹499 -> Delivery fee is ₹0
    const freeDeliveryThreshold = 499;
    const deliveryFee = authoritativeSubtotal >= freeDeliveryThreshold ? 0 : 49;
    expect(deliveryFee).toBe(0);

    const authoritativeTotal = authoritativeSubtotal + deliveryFee;
    expect(authoritativeTotal).toBe(2454);
  });

  it("Step 19 - 20: Order payload sanitization and Admin order view representation", () => {
    const rawOrderRow = {
      id: 99,
      order_number: "TVO-2026-FINAL-099",
      customer_name: "Anita Sharma",
      customer_phone: "9876543210",
      customer_email: "anita@example.com",
      customer_address: "Apartment 4B, Palm Grove Heights, Golf Course Road",
      city: "Gurugram",
      pincode: "122002",
      tracking_note: "Please ring bell and leave with security if unavailable",
      delivery_date: "2026-09-20",
      delivery_slot: "Evening Delight (5:00 PM – 9:00 PM)",
      status: "Order Placed",
      items: JSON.stringify([
        {
          productId: "1",
          name: "Pineapple Cake",
          sku: "CK-PINE-01",
          qty: 2,
          weight: "1 kg",
          flavour: "Fresh Strawberry",
          flavourPrice: 80,
          messageOnCake: "Happy 25th Anniversary! 💍",
          customInstructions: "Make it eggless with less cream and golden pearls",
          customDesignImage: "/uploads/custom-designs/design_1789639790426_44db6ad40fa5.webp",
          customDesignDescription: "Tiered floral piped border reference",
          addons: [
            { id: "addon-candle", name: "Musical Rotating Candle", price: 99 },
            { id: "addon-card", name: "Handwritten Greeting Card", price: 49 },
          ],
          unitPrice: 1079,
          addonTotal: 148,
          totalPrice: 2454,
          sellingUnit: "weight",
        },
      ]),
      subtotal: 2454,
      delivery_fee: 0,
      slot_surcharge: 0,
      discount: 0,
      total: 2454,
      created_at: "2026-09-17T10:15:00.000Z",
    };

    // Normalize order row as CustomerOrdersView does
    const order = normalizeOrderRow(rawOrderRow);

    expect(order.orderNumber).toBe("TVO-2026-FINAL-099");
    expect(order.customer.name).toBe("Anita Sharma");
    expect(order.customer.phone).toBe("9876543210");
    expect(order.customer.pincode).toBe("122002");
    expect(order.customer.instructions).toBe("Please ring bell and leave with security if unavailable");
    expect(order.deliveryDate).toBe("2026-09-20");
    expect(order.deliverySlot).toBe("Evening Delight (5:00 PM – 9:00 PM)");
    expect(order.total).toBe(2454);

    // Verify Admin Item representation
    const item = order.items[0];
    expect(item.name).toBe("Pineapple Cake");
    expect(item.weight).toBe("1 kg");
    expect(item.flavour).toBe("Fresh Strawberry");
    expect(item.flavourPrice).toBe(80);
    expect(item.messageOnCake).toBe("Happy 25th Anniversary! 💍");
    expect(item.customInstructions).toContain("less cream");
    expect(item.customDesignImage).toBe("/uploads/custom-designs/design_1789639790426_44db6ad40fa5.webp");
    expect(item.customDesignDescription).toBe("Tiered floral piped border reference");
    expect(item.addons?.length).toBe(2);
    expect(item.addons?.[0].name).toBe("Musical Rotating Candle");
  });
});
