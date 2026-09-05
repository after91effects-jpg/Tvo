'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface CartLine {
  key: string;
  productId: number;
  name: string;
  slug: string;
  sku?: string;
  image?: string;
  price: number;
  qty: number;
  weight?: string;
  flavour?: string;
  messageOnCake?: string;
  addons?: { id: number; name: string; price: number }[];
}

interface CartCtx {
  items: CartLine[];
  add: (line: Omit<CartLine, 'key'>) => void;
  updateQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
}

const Ctx = createContext<CartCtx>(null!);
export const useCartStore = () => useContext(Ctx);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tvo_cart');
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('tvo_cart', JSON.stringify(items)); } catch {}
  }, [items]);

  const add = (line: Omit<CartLine, 'key'>) => {
    const addonKey = (line.addons || []).map((a) => `${a.id}:${a.price}`).sort().join('|');
    const key = `${line.productId}:${line.weight || ''}:${line.flavour || ''}:${addonKey}:${line.messageOnCake || ''}`;
    setItems((prev) => {
      const found = prev.find((i) => i.key === key);
      if (found) return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + line.qty } : i));
      return [...prev, { ...line, key }];
    });
  };

  const updateQty = (key: string, qty: number) =>
    setItems((prev) => (qty <= 0 ? prev.filter((i) => i.key !== key) : prev.map((i) => (i.key === key ? { ...i, qty } : i))));

  const remove = (key: string) => setItems((prev) => prev.filter((i) => i.key !== key));
  const clear = () => setItems([]);

  const lineTotal = (i: CartLine) => (Number(i.price) + (i.addons || []).reduce((a, x) => a + Number(x.price || 0), 0)) * i.qty;
  const count = items.reduce((a, i) => a + i.qty, 0);
  const subtotal = items.reduce((a, i) => a + lineTotal(i), 0);

  return <Ctx.Provider value={{ items, add, updateQty, remove, clear, count, subtotal }}>{children}</Ctx.Provider>;
}
