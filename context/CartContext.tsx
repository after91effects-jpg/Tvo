'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Product, WeightOption, CartItem, CartItemAddon, PromoCode } from '../lib/types';
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
    messageOnCake?: string,
    addons?: CartItemAddon[],
    quantity?: number
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
    messageOnCake?: string,
    addons: CartItemAddon[] = [],
    quantity: number = 1
  ) => {
    const addonsTotal = addons.reduce((sum, a) => sum + a.price, 0);
    const unitPrice = selectedWeight.price + addonsTotal;

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.productId === product.id &&
          item.selectedWeight.label === selectedWeight.label &&
          item.selectedFlavour === selectedFlavour &&
          (item.messageOnCake || '') === (messageOnCake || '') &&
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
          messageOnCake: messageOnCake?.trim(),
          addons,
          quantity,
          unitPrice,
          totalPrice: unitPrice * quantity,
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
  const tax = Math.round(taxableAmount * 0.05); // 5% GST on bakery
  const total = taxableAmount + deliveryFee + slotSurcharge + tax;

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
