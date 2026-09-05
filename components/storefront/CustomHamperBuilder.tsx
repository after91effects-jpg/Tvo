'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Gift,
  Plus,
  Minus,
  X,
  Check,
  Sparkles,
  Cake,
  Cookie,
  Heart,
  Star,
  ShoppingBag,
  ChevronRight,
  ChevronDown,
  Package,
  Palette,
  MessageSquare,
  Truck,
  ShieldCheck,
  Zap,
  Award,
  RotateCcw,
  Search,
  Filter,
  ImagePlus,
  Trash2,
  Camera,
} from 'lucide-react';
import { Product, HamperSettings, HamperBoxOption, HamperCategoryOption } from '../../lib/types';
import { DEFAULT_HAMPER_SETTINGS } from '../../lib/seedData';
import { useCart } from '../../context/CartContext';

interface CustomHamperBuilderProps {
  products: Product[];
  isOpen: boolean;
  onClose: () => void;
  onOpenCheckout: () => void;
  settings?: HamperSettings;
}

interface HamperItem {
  productId: string;
  product: Product;
  quantity: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  cakes: 'bg-pink-50 text-pink-600 border-pink-200',
  desserts: 'bg-amber-50 text-amber-600 border-amber-200',
  chocolates: 'bg-orange-50 text-orange-600 border-orange-200',
  dryfruits: 'bg-green-50 text-green-600 border-green-200',
  cookies: 'bg-yellow-50 text-yellow-600 border-yellow-200',
  gifts: 'bg-purple-50 text-purple-600 border-purple-200',
};

const BOX_GRADIENTS: Record<string, string> = {
  mini: 'from-amber-500 to-orange-500',
  classic: 'from-[#FF2B6D] to-[#FF6B9D]',
  premium: 'from-purple-500 to-pink-500',
  royal: 'from-amber-600 to-yellow-500',
};

const PRICE_RANGES = [
  { id: 'all', name: 'All Prices', min: 0, max: Infinity },
  { id: 'under-200', name: 'Under ₹200', min: 0, max: 200 },
  { id: '200-400', name: '₹200 - ₹400', min: 200, max: 400 },
  { id: '400-600', name: '₹400 - ₹600', min: 400, max: 600 },
  { id: 'above-600', name: 'Above ₹600', min: 600, max: Infinity },
];

export const CustomHamperBuilder: React.FC<CustomHamperBuilderProps> = ({
  products,
  isOpen,
  onClose,
  onOpenCheckout,
  settings = DEFAULT_HAMPER_SETTINGS,
}) => {
  const { addToCart, setIsCartOpen } = useCart();

  const enabledBoxes: HamperBoxOption[] = settings.boxes.filter((b) => b.enabled);
  const enabledCategories: HamperCategoryOption[] = settings.categories.filter((c) => c.enabled);

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedBox, setSelectedBox] = useState<HamperBoxOption>(enabledBoxes[0] || settings.boxes[0]);
  const [selectedCategory, setSelectedCategory] = useState<string>(enabledCategories[0]?.id || 'cakes');
  const [hamperItems, setHamperItems] = useState<HamperItem[]>([]);
  const [giftMessage, setGiftMessage] = useState<string>('');
  const [selectedWrapping, setSelectedWrapping] = useState<string>(settings.wrappings.find((w) => w.enabled && w.id !== 'none')?.id || 'none');
  const [selectedTheme, setSelectedTheme] = useState<string>(settings.themes.find((t) => t.enabled)?.id || 'pink');
  const [recipientName, setRecipientName] = useState<string>('');
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setHamperItems([]);
      setGiftMessage('');
      setRecipientName('');
      setUploadedPhotos([]);
      setIsAdded(false);
      setSearchQuery('');
      setPriceRange('all');
      const firstEnabled = enabledBoxes[0] || settings.boxes[0];
      setSelectedBox(firstEnabled);
      setSelectedWrapping(settings.wrappings.find((w) => w.enabled && w.id !== 'none')?.id || 'none');
      setSelectedTheme(settings.themes.find((t) => t.enabled)?.id || 'pink');
    }
  }, [isOpen]);

  const matchingCat = (p: Product, cat: HamperCategoryOption): boolean => {
    const lowerName = p.name.toLowerCase();
    return cat.keywords.some((kw) => {
      const ln = kw.toLowerCase();
      return (
        lowerName.includes(ln) ||
        (p.category && p.category.toLowerCase().includes(ln)) ||
        (p.categories && p.categories.some((c) => c.toLowerCase().includes(ln))) ||
        (p.tags && p.tags.some((t) => t.toLowerCase().includes(ln)))
      );
    });
  };

  const hamperProducts = useMemo(() => {
    const activeCat = settings.categories.find((c) => c.id === selectedCategory);
    if (!activeCat) return [];
    const priceFilter = PRICE_RANGES.find((r) => r.id === priceRange) || PRICE_RANGES[0];
    return products.filter((p) => {
      if (!p.published || p.stock <= 0) return false;
      if (!matchingCat(p, activeCat)) return false;
      const price = p.weightOptions[0]?.price || 0;
      if (price < priceFilter.min || price > priceFilter.max) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [products, selectedCategory, priceRange, searchQuery, settings]);

  const totalItems = hamperItems.reduce((acc, item) => acc + item.quantity, 0);
  const itemPrice = (product: Product) => product.weightOptions[0]?.price || 0;
  const itemsPrice = hamperItems.reduce((acc, item) => {
    const price = itemPrice(item.product);
    return acc + price * item.quantity;
  }, 0);
  const boxPrice = selectedBox.price;
  const wrappingPrice = settings.wrappings.find((w) => w.id === selectedWrapping)?.price || 0;
  const totalPrice = itemsPrice + boxPrice + wrappingPrice;
  const selectedThemeOption = settings.themes.find((t) => t.id === selectedTheme);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = settings.photoUploadMaxCount - uploadedPhotos.length;
    const toUpload = files.slice(0, remaining);
    toUpload.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) setUploadedPhotos((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddItem = (product: Product) => {
    if (totalItems >= selectedBox.maxItems) return;

    const existing = hamperItems.find((item) => item.productId === product.id);
    if (existing) {
      setHamperItems((prev) =>
        prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setHamperItems((prev) => [...prev, { productId: product.id, product, quantity: 1 }]);
    }
  };

  const handleRemoveItem = (productId: string) => {
    const existing = hamperItems.find((item) => item.productId === productId);
    if (existing && existing.quantity > 1) {
      setHamperItems((prev) =>
        prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
      );
    } else {
      setHamperItems((prev) => prev.filter((item) => item.productId !== productId));
    }
  };

  const handleAddToCart = () => {
    const hamperProduct: Product = {
      id: `custom-hamper-${Date.now()}`,
      sku: `HAMPER-${selectedBox.id.toUpperCase()}`,
      name: `Custom ${selectedBox.name}`,
      slug: `custom-hamper-${selectedBox.id}`,
      shortDescription: `Custom hamper with ${totalItems} items: ${hamperItems.map((i) => i.product.name).join(', ')}`,
      description: giftMessage || `A beautiful ${selectedBox.name} curated with love.`,
      category: 'hampers-gifts',
      tags: ['custom-hamper', selectedBox.id],
      flavours: [],
      eggless: true,
      weightOptions: [{ label: 'Custom', weightKg: 1, price: totalPrice, mrp: totalPrice + 200 }],
      images: (uploadedPhotos.length ? uploadedPhotos.map((u) => ({ url: u })) : hamperItems[0]?.product.images) || [],
      rating: 5,
      reviewCount: 0,
      stock: 99,
      stockStatus: 'in_stock',
      badges: ['Custom Hamper', 'Handcrafted'],
      published: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const addons = [
      { id: 'wrapping', name: settings.wrappings.find((w) => w.id === selectedWrapping)?.name || 'Basic Wrap', price: wrappingPrice },
      { id: 'theme', name: `Theme: ${selectedThemeOption?.name || 'Default'}`, price: 0 },
    ];
    if (uploadedPhotos.length) {
      addons.push({ id: 'photos', name: `Personal Photo (${uploadedPhotos.length})`, price: 0 });
    }

    addToCart(
      hamperProduct,
      hamperProduct.weightOptions[0],
      'Mixed',
      giftMessage,
      addons,
      1
    );

    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      onClose();
      setIsCartOpen(true);
    }, 600);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] bg-gradient-to-r from-[#FF2B6D]/10 to-[#FF6B9D]/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF2B6D] to-[#FF6B9D] flex items-center justify-center text-white shadow-md">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-main)] font-display">Build Your Own Hamper</h2>
              <p className="text-[10px] text-[var(--text-muted)]">Create a personalized gift in 4 easy steps</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-3 border-b border-[var(--border)] bg-[var(--bg-subtle)]/50">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {[
              { num: 1, label: 'Choose Box' },
              { num: 2, label: 'Pick Items' },
              { num: 3, label: 'Personalize' },
              { num: 4, label: 'Review' },
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <button
                  onClick={() => setStep(s.num as any)}
                  className={`flex items-center gap-2 cursor-pointer transition-all ${
                    step === s.num
                      ? 'text-[var(--primary)] font-bold'
                      : step > s.num
                      ? 'text-emerald-600'
                      : 'text-[var(--text-muted)]'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                      step === s.num
                        ? 'bg-[var(--primary)] text-white'
                        : step > s.num
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[var(--border)] text-[var(--text-muted)]'
                    }`}
                  >
                    {step > s.num ? <Check className="w-3.5 h-3.5" /> : s.num}
                  </div>
                  <span className="hidden sm:inline text-[11px]">{s.label}</span>
                </button>
                {idx < 3 && <div className={`flex-1 h-0.5 mx-2 rounded ${step > s.num ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Choose Box */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">Choose Your Hamper Box</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {enabledBoxes.map((box) => (
                  <button
                    key={box.id}
                    onClick={() => {
                      setSelectedBox(box);
                      setHamperItems([]);
                      setStep(2);
                    }}
                    className={`relative p-5 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                      selectedBox.id === box.id
                        ? 'border-[var(--primary)] bg-[var(--primary-light)] shadow-lg ring-2 ring-[var(--primary)]/20'
                        : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:shadow-md'
                    }`}
                  >
                    {box.popular && (
                      <div className="absolute -top-2 -right-2 bg-[var(--primary)] text-white px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 shadow">
                        <Star className="w-2.5 h-2.5 fill-current" /> Popular
                      </div>
                    )}
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${BOX_GRADIENTS[box.id] || 'from-[#FF2B6D] to-[#FF6B9D]'} flex items-center justify-center text-2xl mb-3 shadow-md`}>
                      {box.icon}
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-main)]">{box.name}</h4>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">{box.description}</p>
                    <div className="mt-3 flex items-baseline gap-2">
                      {box.price === 0 ? (
                        <span className="text-lg font-bold text-emerald-600">FREE</span>
                      ) : (
                        <span className="text-lg font-bold text-[var(--primary)]">+₹{box.price}</span>
                      )}
                    </div>
                    <div className="mt-2 text-[10px] text-[var(--text-muted)]">
                      Up to <span className="font-bold text-[var(--text-main)]">{box.maxItems}</span> items
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Pick Items */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">
                  Pick Items ({totalItems}/{selectedBox.maxItems})
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">Total:</span>
                  <span className="text-sm font-bold text-[var(--primary)]">₹{totalPrice}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[var(--primary)] to-[#FF6B9D] rounded-full transition-all"
                  style={{ width: `${(totalItems / selectedBox.maxItems) * 100}%` }}
                />
              </div>

              {/* Search + Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search items..."
                    className="w-full pl-9 pr-8 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <select
                    value={priceRange}
                    onChange={(e) => setPriceRange(e.target.value)}
                    className="pl-9 pr-8 py-2.5 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] appearance-none cursor-pointer"
                  >
                    {PRICE_RANGES.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {enabledCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all cursor-pointer whitespace-nowrap ${
                      selectedCategory === cat.id
                        ? `${CATEGORY_COLORS[cat.id] || 'bg-[var(--primary-light)] text-[var(--primary)] border-[var(--primary)]'} border-current shadow-sm`
                        : 'bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border)] hover:bg-[var(--bg-subtle)]'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {hamperProducts.slice(0, 12).map((product) => {
                  const inHamper = hamperItems.find((i) => i.productId === product.id);
                  const isFull = totalItems >= selectedBox.maxItems && !inHamper;
                  return (
                    <div
                      key={product.id}
                      className={`relative rounded-xl border overflow-hidden transition-all ${
                        inHamper
                          ? 'border-[var(--primary)] bg-[var(--primary-light)]/50 shadow-md'
                          : 'border-[var(--border)] bg-[var(--bg-surface)]'
                      } ${isFull ? 'opacity-50' : ''}`}
                    >
                      <div className="aspect-square bg-[var(--bg-subtle)] overflow-hidden">
                        <img
                          src={product.images?.[0]?.url || 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=200&q=60'}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2.5">
                        <h4 className="text-[11px] font-bold text-[var(--text-main)] line-clamp-2 leading-tight">
                          {product.name}
                        </h4>
                        <div className="text-[10px] text-[var(--primary)] font-bold mt-1">
                          ₹{itemPrice(product)}
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          {inHamper ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleRemoveItem(product.id)}
                                className="w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-bold text-[var(--primary)] w-5 text-center">{inHamper.quantity}</span>
                              <button
                                onClick={() => !isFull && handleAddItem(product)}
                                className="w-6 h-6 rounded-full bg-[var(--primary)] text-white flex items-center justify-center hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => !isFull && handleAddItem(product)}
                              disabled={isFull}
                              className="w-full py-1.5 rounded-lg bg-[var(--primary)] text-white text-[10px] font-bold flex items-center justify-center gap-1 hover:bg-[var(--primary-hover)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3" />
                              Add
                            </button>
                          )}
                        </div>
                      </div>
                      {inHamper && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-[10px] font-bold shadow">
                          {inHamper.quantity}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {hamperProducts.length === 0 && (
                <div className="p-8 text-center">
                  <Package className="w-10 h-10 text-[var(--text-subtle)] mx-auto mb-2" />
                  <p className="text-xs text-[var(--text-muted)]">No products available in this category</p>
                </div>
              )}

              {/* Selected Items Summary */}
              {hamperItems.length > 0 && (
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-2">
                  <h4 className="text-[11px] font-bold text-[var(--text-main)] uppercase tracking-wider">Selected Items</h4>
                  <div className="space-y-1.5">
                    {hamperItems.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="text-[var(--text-main)]">{item.product.name}</span>
                          <span className="text-[var(--text-muted)]">x{item.quantity}</span>
                        </div>
                        <span className="font-bold text-[var(--text-main)]">
                          ₹{itemPrice(item.product) * item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-main)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={totalItems < settings.minItemsRequired}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:bg-[var(--primary-hover)] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {totalItems < settings.minItemsRequired
                    ? `Add at least ${settings.minItemsRequired} item${settings.minItemsRequired > 1 ? 's' : ''}`
                    : 'Continue to Personalize'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Personalize */}
          {step === 3 && (
            <div className="space-y-5 max-w-lg mx-auto">
              <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">Personalize Your Hamper</h3>

              {settings.allowRecipientName && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] mb-1.5 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Who is this hamper for?"
                    className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)]"
                  />
                </div>
              )}

              {settings.allowGiftMessage && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[var(--primary)]" />
                    Gift Message on Card
                  </label>
                  <textarea
                    maxLength={settings.maxGiftMessageChars}
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value)}
                    placeholder={`Write a heartfelt message... (Max ${settings.maxGiftMessageChars} characters)`}
                    rows={3}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] resize-none"
                  />
                  <span className="text-[10px] text-[var(--text-muted)]">{giftMessage.length}/{settings.maxGiftMessageChars}</span>
                </div>
              )}

              {/* Theme / Color Selection */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-amber-500" />
                  Hamper Theme
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {settings.themes.filter((t) => t.enabled).map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        selectedTheme === theme.id
                          ? 'border-[var(--primary)] bg-[var(--primary-light)] shadow-sm'
                          : 'border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <div className={`w-full h-10 rounded-lg bg-gradient-to-br ${theme.gradient} mb-2`} />
                      <div className="text-xs font-bold text-[var(--text-main)]">{theme.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{theme.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wrapping Options */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-main)] mb-2 flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-amber-500" />
                  Gift Wrapping Style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {settings.wrappings.filter((w) => w.enabled).map((wrap) => (
                    <button
                      key={wrap.id}
                      onClick={() => setSelectedWrapping(wrap.id)}
                      className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                        selectedWrapping === wrap.id
                          ? 'border-[var(--primary)] bg-[var(--primary-light)] shadow-sm'
                          : 'border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{wrap.icon}</span>
                        <div>
                          <div className="text-xs font-bold text-[var(--text-main)]">{wrap.name}</div>
                          <div className="text-[10px] text-[var(--text-muted)]">
                            {wrap.price === 0 ? 'FREE' : `+₹${wrap.price}`}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Personal Photo Upload */}
              {settings.allowPhotoUpload && (
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] mb-2 flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-sky-500" />
                    Personal Photo on Card
                    <span className="text-[10px] text-[var(--text-muted)] font-normal">
                      (up to {settings.photoUploadMaxCount})
                    </span>
                  </label>
                  {uploadedPhotos.length < settings.photoUploadMaxCount && (
                    <label className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] cursor-pointer transition-colors">
                      <ImagePlus className="w-4 h-4" />
                      <span className="text-xs font-semibold">Upload Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                  {uploadedPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {uploadedPhotos.map((photo, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={photo}
                            alt={`Upload ${idx + 1}`}
                            className="w-16 h-16 rounded-lg object-cover border border-[var(--border)]"
                          />
                          <button
                            onClick={() => setUploadedPhotos((prev) => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center cursor-pointer shadow"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-main)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="flex-1 py-2.5 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:bg-[var(--primary-hover)] transition-colors cursor-pointer"
                >
                  Review Hamper
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review & Add to Cart */}
          {step === 4 && (
            <div className="space-y-5 max-w-lg mx-auto">
              <h3 className="text-sm font-bold text-[var(--text-main)] uppercase tracking-wider">Review Your Hamper</h3>

              {/* Hamper Summary Card */}
              <div className="rounded-2xl border border-[var(--border)] overflow-hidden bg-[var(--bg-surface)]">
                {/* Box Header */}
                <div className={`p-4 bg-gradient-to-r ${BOX_GRADIENTS[selectedBox.id] || selectedThemeOption?.gradient || 'from-[#FF2B6D] to-[#FF6B9D]'} text-white`}>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedBox.icon}</span>
                    <div>
                      <h4 className="font-bold">{selectedBox.name}</h4>
                      <p className="text-[10px] opacity-80">{recipientName ? `For ${recipientName}` : 'Custom Hamper'}</p>
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div className="p-4 space-y-2">
                  <div className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Items ({totalItems})</div>
                  {hamperItems.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3 py-2 border-b border-[var(--border)] last:border-0">
                      <img
                        src={item.product.images?.[0]?.thumbUrl || item.product.images?.[0]?.url || ''}
                        alt={item.product.name}
                        className="w-10 h-10 rounded-lg object-cover bg-[var(--bg-subtle)]"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[var(--text-main)] truncate">{item.product.name}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Qty: {item.quantity}</div>
                      </div>
                      <div className="text-xs font-bold text-[var(--text-main)]">
                        ₹{itemPrice(item.product) * item.quantity}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Extras */}
                <div className="px-4 pb-4 space-y-2">
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>Items Subtotal</span>
                    <span>₹{itemsPrice}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>{selectedBox.name}</span>
                    <span>{boxPrice === 0 ? 'FREE' : `₹${boxPrice}`}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>Wrapping ({settings.wrappings.find((w) => w.id === selectedWrapping)?.name})</span>
                    <span>{wrappingPrice === 0 ? 'FREE' : `₹${wrappingPrice}`}</span>
                  </div>
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>Theme</span>
                    <span className="text-[var(--text-main)]">{selectedThemeOption?.name || 'Default'}</span>
                  </div>
                  {uploadedPhotos.length > 0 && (
                    <div className="flex justify-between text-xs text-[var(--text-muted)]">
                      <span>Personal Photo</span>
                      <span className="text-emerald-600">Included</span>
                    </div>
                  )}
                  {giftMessage && (
                    <div className="flex justify-between text-xs text-[var(--text-muted)]">
                      <span>Gift Card Message</span>
                      <span className="text-emerald-600">Included</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold text-[var(--text-main)] pt-2 border-t border-[var(--border)]">
                    <span>Total</span>
                    <span className="text-[var(--primary)]">₹{totalPrice}</span>
                  </div>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-center">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <div className="text-[9px] font-bold text-[var(--text-main)]">Quality Assured</div>
                </div>
                <div className="p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-center">
                  <Truck className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <div className="text-[9px] font-bold text-[var(--text-main)]">Free Delivery</div>
                </div>
                <div className="p-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-center">
                  <Award className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                  <div className="text-[9px] font-bold text-[var(--text-main)]">Freshly Packed</div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border)] text-[var(--text-main)] text-xs font-semibold hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 inline mr-1" />
                  Edit
                </button>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[#FF6B9D] hover:brightness-110 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  {isAdded ? (
                    <>
                      <Check className="w-4 h-4" />
                      Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      Add Custom Hamper to Cart - ₹{totalPrice}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
