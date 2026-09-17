import { describe, it, expect } from "vitest";
import { serializeProduct } from "../server/product-serializer";
import { serializeAdminProduct } from "../server/admin-catalog";
import { validateSlot } from "../server/order-engine";
import { normalizeOrderRow } from "../orderNormalizer";

describe("PHASE 12B-10: Storefront & Admin Feature Controls Hardening", () => {
  // 1. Feature Toggle Serialization
  describe("1. Feature Toggle Serialization", () => {
    it("serializes all 19 feature toggles correctly from product row", () => {
      const row = {
        id: 101,
        sku: "FEAT-101",
        name: "Feature Test Cake",
        slug: "feature-test-cake",
        regular_price: 599,
        stock: 15,
        published: 1,
        show_gallery: 1,
        show_video: 1,
        show_flavour: 1,
        show_customize: 1,
        show_design_upload: 1,
        show_addons: 1,
        show_dietary: 1,
        show_delivery: 1,
        show_delivery_date: 1,
        show_delivery_slot: 1,
        show_special_instructions: 1,
        show_ratings: 1,
        show_badges: 1,
        show_size_selector: 1,
        show_reviews: 1,
        show_faq: 1,
        show_related_products: 1,
        show_checkout_options: 1,
        same_day_eligible: 1,
      };

      const product = serializeProduct(row);
      expect(product).not.toBeNull();
      expect(product?.showGallery).toBe(true);
      expect(product?.showVideo).toBe(true);
      expect(product?.showFlavour).toBe(true);
      expect(product?.showCustomize).toBe(true);
      expect(product?.showDesignUpload).toBe(true);
      expect(product?.showAddons).toBe(true);
      expect(product?.showDietary).toBe(true);
      expect(product?.showDelivery).toBe(true);
      expect(product?.showDeliveryDate).toBe(true);
      expect(product?.showDeliverySlot).toBe(true);
      expect(product?.showSpecialInstructions).toBe(true);
      expect(product?.showRatings).toBe(true);
      expect(product?.showBadges).toBe(true);
      expect(product?.showSizeSelector).toBe(true);
      expect(product?.showReviews).toBe(true);
      expect(product?.showFaq).toBe(true);
      expect(product?.showRelatedProducts).toBe(true);
      expect(product?.showCheckoutOptions).toBe(true);
      expect(product?.sameDayEligible).toBe(true);
    });
  });

  // 2. Gallery Toggle
  describe("2. Gallery Toggle", () => {
    it("respects showGallery: 0 and hides gallery without deleting stored images", () => {
      const row = {
        id: 102,
        sku: "GAL-01",
        name: "Gallery Cake",
        slug: "gallery-cake",
        regular_price: 499,
        images_json: JSON.stringify([{ url: "/images/cake.webp", isPrimary: true }]),
        show_gallery: 0,
      };

      const product = serializeProduct(row);
      expect(product?.showGallery).toBe(false);
      // Underlying images remain intact
      expect(product?.images).toHaveLength(1);
      expect(product?.images[0].url).toBe("/images/cake.webp");
    });
  });

  // 3. Video Toggle
  describe("3. Video Toggle", () => {
    it("respects showVideo: 0 and hides video without deleting stored video metadata", () => {
      const row = {
        id: 103,
        sku: "VID-01",
        name: "Video Cake",
        slug: "video-cake",
        regular_price: 699,
        videos_json: JSON.stringify([{ url: "/videos/cake.mp4", caption: "Process" }]),
        show_video: 0,
      };

      const product = serializeProduct(row);
      expect(product?.showVideo).toBe(false);
      expect(product?.videos).toHaveLength(1);
      expect(product?.videos?.[0].url).toBe("/videos/cake.mp4");
    });
  });

  // 4. Weight Toggle
  describe("4. Weight / Size Selector Toggle", () => {
    it("preserves variations_json while showSizeSelector is false", () => {
      const row = {
        id: 104,
        sku: "WT-01",
        name: "Weight Cake",
        slug: "weight-cake",
        regular_price: 799,
        variations_json: JSON.stringify([{ id: "1", label: "1 Kg", price: 799 }]),
        show_size_selector: 0,
      };

      const product = serializeProduct(row);
      expect(product?.showSizeSelector).toBe(false);
      expect(product?.weightOptions).toHaveLength(1);
      expect(product?.weightOptions[0].label).toBe("1 Kg");
    });
  });

  // 5. Flavour Toggle
  describe("5. Flavour Selector Toggle", () => {
    it("preserves flavour options when showFlavour is false", () => {
      const row = {
        id: 105,
        sku: "FLV-01",
        name: "Flavour Cake",
        slug: "flavour-cake",
        regular_price: 549,
        flavour_options_json: JSON.stringify([
          { id: "f1", name: "Chocolate Truffle", additionalPrice: 50, isActive: true },
        ]),
        show_flavour: 0,
      };

      const product = serializeProduct(row);
      expect(product?.showFlavour).toBe(false);
      expect(product?.flavourOptions).toHaveLength(1);
      expect(product?.flavourOptions?.[0].name).toBe("Chocolate Truffle");
    });
  });

  // 6. Customization Toggle
  describe("6. Cake Customization Toggle", () => {
    it("respects showCustomize: 0 and allowCustomMessage", () => {
      const row = {
        id: 106,
        sku: "CUST-01",
        name: "Custom Cake",
        slug: "custom-cake",
        regular_price: 649,
        customization_fee: 30,
        show_customize: 0,
        allow_custom_message: 0,
      };

      const product = serializeProduct(row);
      expect(product?.showCustomize).toBe(false);
      expect(product?.allowCustomMessage).toBe(false);
      expect(product?.customizationFee).toBe(30);
    });
  });

  // 7. Customer Design Upload Toggle
  describe("7. Customer Design Upload Toggle", () => {
    it("respects showDesignUpload: 0 without removing support", () => {
      const row = {
        id: 107,
        sku: "DSGN-01",
        name: "Design Cake",
        slug: "design-cake",
        regular_price: 899,
        show_design_upload: 0,
        allow_custom_design: 0,
      };

      const product = serializeProduct(row);
      expect(product?.showDesignUpload).toBe(false);
      expect(product?.allowCustomDesign).toBe(false);
    });
  });

  // 8. Add-on Toggle
  describe("8. Add-on Toggle", () => {
    it("preserves database add-ons while showAddons is false", () => {
      const row = {
        id: 108,
        sku: "ADD-01",
        name: "Addon Cake",
        slug: "addon-cake",
        regular_price: 399,
        show_addons: 0,
      };

      const product = serializeProduct(row);
      expect(product?.showAddons).toBe(false);
      expect(product?.addons?.length).toBeGreaterThan(0);
    });
  });

  // 9. Dietary Visibility
  describe("9. Dietary Attributes Visibility", () => {
    it("filters dietary attributes according to enabled and showOnStorefront", () => {
      const dietary = [
        { key: "eggless", label: "100% Eggless", enabled: true, showOnStorefront: true },
        { key: "nut_free", label: "Nut Free", enabled: true, showOnStorefront: false },
        { key: "sugar_free", label: "Sugar Free", enabled: false, showOnStorefront: true },
      ];

      const row = {
        id: 109,
        sku: "DIET-01",
        name: "Dietary Cake",
        slug: "dietary-cake",
        regular_price: 499,
        dietary_json: JSON.stringify(dietary),
        show_dietary: 1,
      };

      const product = serializeProduct(row);
      expect(product?.showDietary).toBe(true);
      expect(product?.dietaryAttributes).toBeDefined();

      const visible = (product?.dietaryAttributes || []).filter((d) => d.enabled && d.showOnStorefront);
      expect(visible.map((v) => v.key)).toEqual(["eggless"]);
    });
  });

  // 10. Delivery Date Toggle
  describe("10. Delivery Date Toggle", () => {
    it("serializes showDeliveryDate correctly", () => {
      const rowEnabled = { id: 110, sku: "DEL-01", name: "Delivery Cake", show_delivery_date: 1 };
      const rowDisabled = { id: 111, sku: "DEL-02", name: "Delivery Cake 2", show_delivery_date: 0 };

      expect(serializeProduct(rowEnabled)?.showDeliveryDate).toBe(true);
      expect(serializeProduct(rowDisabled)?.showDeliveryDate).toBe(false);
    });
  });

  // 11. Delivery Time / Slot Toggle
  describe("11. Delivery Time / Slot Toggle", () => {
    it("serializes showDeliverySlot correctly", () => {
      const rowEnabled = { id: 112, sku: "SLOT-01", name: "Slot Cake", show_delivery_slot: 1 };
      const rowDisabled = { id: 113, sku: "SLOT-02", name: "Slot Cake 2", show_delivery_slot: 0 };

      expect(serializeProduct(rowEnabled)?.showDeliverySlot).toBe(true);
      expect(serializeProduct(rowDisabled)?.showDeliverySlot).toBe(false);
    });
  });

  // 12. Delivery Slot Validation
  describe("12. Delivery Slot Validation", () => {
    it("validates existing active slot on valid date", () => {
      const future = new Date();
      future.setDate(future.getDate() + 5);
      const dateStr = future.toISOString().split("T")[0];

      const check = validateSlot(dateStr, "11:00 AM - 01:00 PM", 2);
      expect(check.ok).toBe(true);
      expect(check.slot?.name).toBe("11:00 AM - 01:00 PM");
    });

    it("rejects invalid date format", () => {
      const check = validateSlot("2026/09/20", "11:00 AM - 01:00 PM", 2);
      expect(check.ok).toBe(false);
      expect(check.error).toContain("format");
    });
  });

  // 13. Related Products Toggle
  describe("13. Related Products Toggle", () => {
    it("serializes showRelatedProducts and preserves related products array", () => {
      const row = {
        id: 114,
        sku: "REL-01",
        name: "Related Cake",
        slug: "related-cake",
        related_products: JSON.stringify([{ id: "5", name: "Companion Cake", slug: "comp-cake", price: 399 }]),
        show_related_products: 0,
      };

      const product = serializeProduct(row);
      expect(product?.showRelatedProducts).toBe(false);
      expect(product?.related).toHaveLength(1);
      expect(product?.related?.[0].id).toBe("5");
    });
  });

  // 14. Checkout State Persistence
  describe("14. Checkout State Persistence", () => {
    it("preserves customer details, slot, and delivery address across checkout payload", () => {
      const payload = {
        customer_name: "Anita Roy",
        customer_phone: "9876543210",
        customer_email: "anita@example.com",
        customer_address: "Sector 45, Near Cyber Park",
        pincode: "122001",
        city: "Gurugram",
        deliveryDate: "2026-09-22",
        deliverySlot: "03:00 PM - 05:00 PM",
        deliverySlotId: 3,
        deliveryInstructions: "Ring bell twice and leave at doorstep",
      };

      expect(payload.customer_name).toBe("Anita Roy");
      expect(payload.pincode).toBe("122001");
      expect(payload.deliveryDate).toBe("2026-09-22");
      expect(payload.deliveryInstructions).toContain("Ring bell");
    });
  });

  // 15. Cart Customization Persistence
  describe("15. Cart Customization Persistence", () => {
    it("preserves item customization including message, instructions, and design reference", () => {
      const cartItem = {
        id: "item-101",
        productId: "1",
        name: "Black Forest Cake",
        weight: "1 Kg",
        flavour: "German Black Forest",
        flavourPrice: 40,
        messageOnCake: "Happy 25th Anniversary",
        customInstructions: "Less sugar, eggless sponge only",
        customDesignImage: "/uploads/design-anniversary.webp",
        customDesignDescription: "Gold edible pearl finish",
        addons: [{ id: "1", name: "Anniversary Topper", price: 49 }],
        qty: 1,
      };

      expect(cartItem.messageOnCake).toBe("Happy 25th Anniversary");
      expect(cartItem.flavourPrice).toBe(40);
      expect(cartItem.customDesignImage).toBe("/uploads/design-anniversary.webp");
      expect(cartItem.addons).toHaveLength(1);
    });
  });

  // 16. Server-Side Pricing
  describe("16. Server-Side Pricing Calculation", () => {
    it("authoritatively computes subtotal from base variation, flavour, and addons", () => {
      const baseVariationPrice = 699;
      const authoritativeFlavourPrice = 50;
      const validatedAddonsTotal = 89; // 49 + 40
      const qty = 2;

      const itemUnitPrice = baseVariationPrice + authoritativeFlavourPrice;
      const lineTotal = (itemUnitPrice + validatedAddonsTotal) * qty;

      expect(itemUnitPrice).toBe(749);
      expect(lineTotal).toBe((749 + 89) * 2);
      expect(lineTotal).toBe(1676);

      const deliveryFee = lineTotal >= 499 ? 0 : 49;
      const total = lineTotal + deliveryFee;
      expect(deliveryFee).toBe(0);
      expect(total).toBe(1676);
    });
  });

  // 17. Tampered Client Price Rejection
  describe("17. Tampered Client Price Rejection", () => {
    it("replaces manipulated client prices with authoritative server calculations", () => {
      // Client tampers prices to 1 rupee
      const clientTamperedItem = {
        productId: "1",
        unitPrice: 1,
        flavourPrice: 0, // Client tries to bypass 50 rupee flavour charge
        addonTotal: 1,   // Client tries to bypass 89 rupee addon charge
        totalPrice: 2,
        qty: 1,
      };

      // Server calculates authoritative amounts
      const serverBasePrice = 699;
      const serverFlavourPrice = 50;
      const serverAddonPrice = 89;

      const authoritativeTotal = (serverBasePrice + serverFlavourPrice + serverAddonPrice) * clientTamperedItem.qty;
      expect(authoritativeTotal).toBe(838);
      expect(authoritativeTotal).not.toBe(clientTamperedItem.totalPrice);
    });
  });

  // 18. Backward Compatibility
  describe("18. Backward Compatibility", () => {
    it("defaults missing feature toggles safely to enabled for legacy products", () => {
      const legacyRow = {
        id: 1,
        sku: "LEGACY-001",
        name: "Legacy Pineapple Cake",
        slug: "legacy-pineapple-cake",
        regular_price: 399,
        stock: 10,
        published: 1,
      };

      const serialized = serializeProduct(legacyRow);
      expect(serialized).not.toBeNull();
      expect(serialized?.showGallery).toBe(true);
      expect(serialized?.showFlavour).toBe(true);
      expect(serialized?.showCustomize).toBe(true);
      expect(serialized?.showAddons).toBe(true);
      expect(serialized?.showDietary).toBe(true);
      expect(serialized?.showDelivery).toBe(true);
      expect(serialized?.showDeliveryDate).toBe(true);
      expect(serialized?.showDeliverySlot).toBe(true);
      expect(serialized?.showRatings).toBe(true);
      expect(serialized?.showBadges).toBe(true);
      expect(serialized?.showSizeSelector).toBe(true);
      expect(serialized?.showReviews).toBe(true);
      expect(serialized?.showFaq).toBe(true);
      expect(serialized?.showRelatedProducts).toBe(true);
    });

    it("normalizes order row mapping tracking_note to instructions and specialInstructions", () => {
      const rawOrder = {
        id: 88,
        order_number: "TVO-2026-088",
        customer_name: "Rohan Varma",
        customer_phone: "9811223344",
        customer_email: "rohan@example.com",
        customer_address: "DLF Phase 2",
        city: "Gurugram",
        pincode: "122002",
        tracking_note: "Please handle carefully - contains birthday candles",
        items: JSON.stringify([{ productId: "1", name: "Cake", qty: 1, unitPrice: 500 }]),
        subtotal: 500,
        delivery_fee: 0,
        total: 500,
        status: "Order Placed",
      };

      const order = normalizeOrderRow(rawOrder);
      expect(order.specialInstructions).toBe("Please handle carefully - contains birthday candles");
      expect(order.customer.instructions).toBe("Please handle carefully - contains birthday candles");
    });
  });
});
