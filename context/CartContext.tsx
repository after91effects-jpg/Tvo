'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product, WeightOption, CartItem, CartItemAddon, PromoCode, FlavourOption } from '../lib/types';
import { DEFAULT_PROMO_CODES, DEFAULT_STORE_SETTINGS } from '../lib/seedData';
import { useLocalStorageJSON, useLocalStorageString } from '../lib/useLocalStorage';

interface CartContextType {
  items: CartItem[];
  cartItems: CartItem[];
  itemCount: number;
  subtotal: number;
  discount: number;
  deliveryFee: number;
  slotSurcharge: number;
  tax: number;
  total: number;
  appliedPromo: PromoCode | null;
  deliveryCity: string;
  selectedSlot: { id: string; name: string; surcharge: number };
  addToCart: (
    product: Product,
    selectedWeight: WeightOption,
    selectedFlavour: string,
    flavourPriceOrMessage?: number | string,
    messageOrAddons?: string | CartItemAddon[],
    customDesignImageOrQuantity?: string | number,
    customDesignDescription?: string,
    addons?: CartItemAddon[],
    quantity?: number,
    customInstructions?: string
  ) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  applyPromoCode: (code: string) => Promise<{ success: boolean; message: string }>;
  removePromoCode: () => void;
  setDeliveryCity: (city: string) => void;
  setSelectedSlot: (slot: { id: string; name: string; surcharge: number }) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType>({
  items: [],
  cartItems: [],
  itemCount: 0,
  subtotal: 0,
  discount: 0,
  deliveryFee: 0,
  slotSurcharge: 0,
  tax: 0,
  total: 0,
  appliedPromo: null,
  deliveryCity: 'Gurugram',
  selectedSlot: { id: 'slot-std-1', name: 'Morning Fresh (9 AM - 1 PM)', surcharge: 0 },
  addToCart: () => {},
  updateQuantity: () => {},
  removeFromCart: () => {},
  clearCart: () => {},
  applyPromoCode: async () => ({ success: false, message: '' }),
  removePromoCode: () => {},
  setDeliveryCity: () => {},
  setSelectedSlot: () => {},
  isCartOpen: false,
  setIsCartOpen: () => {},
});

const INITIAL_ITEMS: CartItem[] = [];

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useLocalStorageJSON<CartItem[]>('confetto_cart', INITIAL_ITEMS);
  const [appliedPromo, setAppliedPromo] = useState<PromoCode | null>(null);
  const [deliveryCity, setDeliveryCity] = useLocalStorageString('confetto_delivery_city', 'Gurugram');
  const [selectedSlot, setSelectedSlot] = useState<{ id: string; name: string; surcharge: number }>({
    id: 'slot-std-1',
    name: 'Morning Fresh (9:00 AM – 1:00 PM)',
    surcharge: 0,
  });
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);

  const addToCart = (
    product: Product,
    selectedWeight: WeightOption,
    selectedFlavour: string,
    flavourPriceOrMessage?: number | string,
    messageOrAddons?: string | CartItemAddon[],
    customDesignImageOrQuantity?: string | number,
    customDesignDescription?: string,
    addonsParam: CartItemAddon[] = [],
    quantityParam: number = 1,
    customInstructions?: string
  ) => {
    let flavourPrice = 0;
    let messageOnCake = "";
    let customDesignImage = "";
    let description = customDesignDescription || "";
    let instructions = customInstructions || "";
    let addons: CartItemAddon[] = [];
    let quantity = 1;

    if (typeof flavourPriceOrMessage === "string") {
      // Legacy call: (product, weight, flavour, messageOnCake, addons, quantity)
      messageOnCake = flavourPriceOrMessage;
      addons = Array.isArray(messageOrAddons) ? messageOrAddons : [];
      quantity = typeof customDesignImageOrQuantity === "number" ? customDesignImageOrQuantity : 1;
    } else {
      flavourPrice = Number(flavourPriceOrMessage) || 0;
      messageOnCake = typeof messageOrAddons === "string" ? messageOrAddons : "";
      if (Array.isArray(customDesignImageOrQuantity)) {
        // Call: (product, weight, flavour, price, message, addons, qty)
        addons = customDesignImageOrQuantity;
        quantity = typeof customDesignDescription === "number" ? customDesignDescription : 1;
      } else {
        customDesignImage = typeof customDesignImageOrQuantity === "string" ? customDesignImageOrQuantity : "";
        addons = Array.isArray(addonsParam) ? addonsParam : [];
        quantity = Number(quantityParam) || 1;
      }
    }

    // Inventory validation
    const tracking = product.trackInventory ?? (product.manageStock !== undefined ? Boolean(product.manageStock) : ((product as any).manage_stock !== undefined ? Boolean((product as any).manage_stock) : true));
    if (tracking) {
      if (product.stockStatus === "out_of_stock" || (typeof product.stock === "number" && product.stock <= 0)) {
        if (typeof window !== "undefined") {
          alert(`${product.name} is currently out of stock.`);
        }
        return;
      }
      const currentInCart = items
        .filter((item) => String(item.productId) === String(product.id))
        .reduce((sum, item) => sum + item.quantity, 0);

      const availableStock = typeof product.stock === "number" ? product.stock : 999;
      if (currentInCart + quantity > availableStock) {
        const remainingAddable = Math.max(0, availableStock - currentInCart);
        if (remainingAddable <= 0) {
          if (typeof window !== "undefined") {
            alert(`You already have all ${availableStock} available units of ${product.name} in your cart.`);
          }
          return;
        } else {
          if (typeof window !== "undefined") {
            alert(`Only ${availableStock} in stock for ${product.name}. Added ${remainingAddable} to your cart.`);
          }
          quantity = remainingAddable;
        }
      }
    }

    const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = selectedWeight.price + flavourPrice + addonsTotal;

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.productId === product.id &&
          item.selectedWeight.label === selectedWeight.label &&
          item.selectedFlavour === selectedFlavour &&
          (item.flavourPrice || 0) === flavourPrice &&
          (item.messageOnCake || "") === (messageOnCake || "") &&
          (item.customInstructions || "") === (instructions || "") &&
          (item.customDesignImage || "") === (customDesignImage || "") &&
          (item.customDesignDescription || "") === (description || "") &&
          item.addons.length === addons.length &&
          item.addons.every((a) => addons.some((oa) => oa.id === a.id))
      );

      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += quantity;
        updated[existingIndex].totalPrice = updated[existingIndex].quantity * unitPrice;
        return updated;
      } else {
        const newItem: CartItem = {
          id: `cart-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId: product.id,
          product,
          selectedWeight,
          selectedFlavour,
          flavourPrice,
          messageOnCake: messageOnCake?.trim() || undefined,
          customInstructions: instructions?.trim() || undefined,
          customDesignImage: customDesignImage || undefined,
          customDesignDescription: description?.trim() || undefined,
          addons,
          quantity,
          unitPrice,
          totalPrice: unitPrice * quantity,
          isCustomHamper: (product as any).isCustomHamper,
          hamperDetails: (product as any).hamperDetails,
        };
        return [...prev, newItem];
      }
    });

    setIsCartOpen(true);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    const targetItem = items.find((it) => it.id === itemId);
    if (targetItem && targetItem.product) {
      const prod = targetItem.product;
      const tracking = prod.trackInventory ?? (prod.manageStock !== undefined ? Boolean(prod.manageStock) : ((prod as any).manage_stock !== undefined ? Boolean((prod as any).manage_stock) : true));
      if (tracking && typeof prod.stock === "number") {
        const otherCartQty = items
          .filter((it) => String(it.productId) === String(prod.id) && it.id !== itemId)
          .reduce((sum, it) => sum + it.quantity, 0);
        if (quantity + otherCartQty > prod.stock) {
          const maxAllowed = Math.max(1, prod.stock - otherCartQty);
          if (typeof window !== "undefined") {
            alert(`Only ${prod.stock} in stock for ${prod.name}. Adjusted to maximum available.`);
          }
          quantity = maxAllowed;
        }
      }
    }
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, quantity, totalPrice: item.unitPrice * quantity }
          : item
      )
    );
  };

  const removeFromCart = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const clearCart = () => {
    setItems([]);
    setAppliedPromo(null);
  };

  const applyPromoCode = async (codeStr: string): Promise<{ success: boolean; message: string }> => {
    const cleanCode = codeStr.trim().toUpperCase();
    if (!cleanCode) {
      return { success: false, message: 'Please enter a promo code.' };
    }

    try {
      let promo: PromoCode | undefined = DEFAULT_PROMO_CODES.find((p) => p.code === cleanCode && p.active);
      
      if (!promo) {
        try {
          const res = await fetch('/api/coupons');
          const data = await res.json();
          const coupons = data.coupons || data || [];
          const arr = Array.isArray(coupons) ? coupons : [];
          const found = arr.find((c: any) => (c.code || '').toUpperCase() === cleanCode && (c.active || c.active === 1));
          if (found) {
            promo = {
              code: found.code,
              discountType: found.discountType || found.discount_type || 'flat',
              discountValue: found.discountValue || found.discount_value || 0,
              minOrderValue: found.minOrderValue || found.min_order_value || 0,
              maxDiscount: found.maxDiscount || found.max_discount || 0,
              active: true,
              expiresAt: found.expiresAt || found.expires_at || '',
              description: found.description || '',
            };
          }
        } catch {}
      }

      if (!promo) {
        return { success: false, message: 'Invalid or expired coupon code.' };
      }

      const currentSubtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
      if (currentSubtotal < promo.minOrderValue) {
        return {
          success: false,
          message: `This coupon requires a minimum cart value of ₹${promo.minOrderValue}.`,
        };
      }

      setAppliedPromo(promo);
      return { success: true, message: `Sweet! Coupon ${promo.code} applied successfully!` };
    } catch (e: any) {
      return { success: false, message: 'Error checking coupon.' };
    }
  };

  const removePromoCode = () => {
    setAppliedPromo(null);
  };

  // Calculations
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.totalPrice, 0);

  let discount = 0;
  if (appliedPromo && subtotal >= appliedPromo.minOrderValue) {
    if (appliedPromo.discountType === 'percent') {
      const calc = (subtotal * appliedPromo.discountValue) / 100;
      discount = appliedPromo.maxDiscount ? Math.min(calc, appliedPromo.maxDiscount) : calc;
    } else {
      discount = appliedPromo.discountValue;
    }
  }
  discount = Math.min(discount, subtotal);

  const slotSurcharge = selectedSlot.surcharge || 0;
  const freeThreshold = DEFAULT_STORE_SETTINGS.thresholds.freeDeliveryAbove;
  const deliveryFee = subtotal >= freeThreshold || items.length === 0 ? 0 : DEFAULT_STORE_SETTINGS.thresholds.standardDeliveryFee;
  const taxableAmount = Math.max(0, subtotal - discount);
  const tax = 0; // Bakery prices are GST-inclusive
  const total = Math.max(0, Math.round(taxableAmount + deliveryFee + slotSurcharge + tax));

  return (
    <CartContext.Provider
      value={{
        items,
        cartItems: items,
        itemCount,
        subtotal,
        discount,
        deliveryFee,
        slotSurcharge,
        tax,
        total,
        appliedPromo,
        deliveryCity,
        selectedSlot,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        applyPromoCode,
        removePromoCode,
        setDeliveryCity,
        setSelectedSlot,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
