'use client';

import React, { useState } from 'react';
import {
  ShoppingBag,
  Sparkles,
  Heart,
  Check,
  Leaf,
  Clock,
  ShieldCheck,
  X,
  Plus,
  Minus,
  Gift,
  Truck,
  Star,
  Share2,
  ChevronDown,
  ChevronRight,
  Info,
  Award,
  Flame,
  Package,
  Recycle,
  Phone,
  MessageSquare,
  Calendar,
  BadgeCheck,
  Zap,
} from 'lucide-react';
import { Product, WeightOption, AddOn } from '../../lib/types';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { StarRating } from '../common/StarRating';
import { ReviewSection } from './ReviewSection';
import { Modal } from '../common/Modal';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenCheckout: () => void;
  variant?: 'modal' | 'embedded';
  onBack?: () => void;
}

const AVAILABLE_ADD_ONS: AddOn[] = [
  { id: 'addon-1', name: 'Golden Sparkler Candle', price: 99, category: 'candle' },
  { id: 'addon-2', name: 'Artisan Handwritten Greeting Card', price: 49, category: 'card' },
  { id: 'addon-3', name: 'Festive Balloon Bouquet', price: 199, category: 'balloon' },
  { id: 'addon-4', name: 'Premium Gift Wrapping', price: 149, category: 'wrapping' },
  { id: 'addon-5', name: 'Photo Topper Print', price: 179, category: 'topper' },
  { id: 'addon-6', name: 'Cupcake Box (6 pcs)', price: 299, category: 'combo' },
];

const DELIVERY_SLOTS = [
  { label: 'Standard Delivery', time: '9 AM - 1 PM', price: 0, icon: '📦' },
  { label: 'Afternoon Slot', time: '2 PM - 6 PM', price: 0, icon: '☀️' },
  { label: 'Evening Express', time: '6 PM - 9 PM', price: 49, icon: '🌆' },
  { label: 'Midnight Surprise', time: '11 PM - 12 AM', price: 199, icon: '🌙' },
];

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isOpen,
  onClose,
  onOpenCheckout,
  variant = 'modal',
  onBack,
}) => {
  const { addToCart, setIsCartOpen } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = product ? isInWishlist(product.id) : false;

  const [selectedWeight, setSelectedWeight] = useState<WeightOption>(
    product?.weightOptions?.[0] || { label: '0.5 kg', weightKg: 0.5, price: 699, mrp: 849 }
  );
  const [selectedFlavour, setSelectedFlavour] = useState<string>(
    product?.flavours?.[0] || 'Original'
  );
  const [messageOnCake, setMessageOnCake] = useState<string>('');
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<'details' | 'description' | 'reviews' | 'delivery'>('details');
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);
  const [isAdded, setIsAdded] = useState<boolean>(false);
  const [selectedDeliverySlot, setSelectedDeliverySlot] = useState<number>(0);
  const [deliveryDate, setDeliveryDate] = useState<string>('');
  const [giftWrap, setGiftWrap] = useState<boolean>(false);
  const [showFullDescription, setShowFullDescription] = useState<boolean>(false);
  const [showAllAddOns, setShowAllAddOns] = useState<boolean>(false);

  const isEmbedded = variant === 'embedded';

  if (!product) return null;
  if (!isEmbedded && !isOpen) return null;

  const images = product.images?.length
    ? product.images
    : [
        {
          url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
          thumbUrl: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=200&q=80',
          alt: product.name,
        },
      ];

  const handleToggleAddOn = (addon: AddOn) => {
    if (selectedAddOns.some((a) => a.id === addon.id)) {
      setSelectedAddOns((prev) => prev.filter((a) => a.id !== addon.id));
    } else {
      setSelectedAddOns((prev) => [...prev, addon]);
    }
  };

  const handleAddToCart = () => {
    addToCart(
      product,
      selectedWeight,
      selectedFlavour,
      messageOnCake,
      selectedAddOns,
      quantity
    );
    setIsAdded(true);
    setTimeout(() => {
      setIsAdded(false);
      if (!isEmbedded) onClose();
      setIsCartOpen(true);
    }, 400);
  };

  const handleBuyNow = () => {
    addToCart(
      product,
      selectedWeight,
      selectedFlavour,
      messageOnCake,
      selectedAddOns,
      quantity
    );
    if (!isEmbedded) onClose();
    onOpenCheckout();
  };

  const addOnsTotal = selectedAddOns.reduce((acc, curr) => acc + curr.price, 0);
  const deliveryCharge = DELIVERY_SLOTS[selectedDeliverySlot].price;
  const giftWrapCharge = giftWrap ? 149 : 0;
  const itemUnitPrice = selectedWeight.price + addOnsTotal + deliveryCharge + giftWrapCharge;
  const savings = selectedWeight.mrp ? (selectedWeight.mrp - selectedWeight.price) * quantity : 0;
  const savingsPercent = selectedWeight.mrp ? Math.round(((selectedWeight.mrp - selectedWeight.price) / selectedWeight.mrp) * 100) : 0;

  const today = new Date();
  const minDeliveryDate = new Date(today.setDate(today.getDate() + 2)).toISOString().split('T')[0];

  return (
    <Modal isOpen={isOpen || isEmbedded} onClose={onClose} maxWidth="5xl" embedded={isEmbedded}>
      <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 pr-1 ${isEmbedded ? '' : 'max-h-[85vh] overflow-y-auto'}`}>
        {/* Left: Image Gallery & Trust Badges */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main Image */}
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-[var(--bg-subtle)] border border-[var(--border)] group">
            <img
              src={images[activeImageIndex]?.url || images[0].url}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            
            {/* Badges Overlay */}
            <div className="absolute top-3 left-3 flex flex-col gap-2">
              {product.eggless && (
                <div className="bg-[var(--success-light)] text-[var(--success)] border border-[var(--success)]/20 px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm backdrop-blur-sm">
                  <Leaf className="w-3 h-3" />
                  <span>100% Eggless</span>
                </div>
              )}
              {product.badges?.includes('Bestseller') && (
                <div className="bg-amber-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm">
                  <Award className="w-3 h-3" />
                  <span>Bestseller</span>
                </div>
              )}
              {product.badges?.includes('Chef Choice') && (
                <div className="bg-purple-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm">
                  <Star className="w-3 h-3" />
                  <span>Chef's Pick</span>
                </div>
              )}
              {savingsPercent > 0 && (
                <div className="bg-rose-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold shadow-sm">
                  Save {savingsPercent}%
                </div>
              )}
            </div>

            {/* Wishlist & Share */}
            <div className="absolute top-3 right-3 flex flex-col gap-2">
              <button
                id={`modal-wishlist-toggle-${product.id}`}
                type="button"
                onClick={() => toggleWishlist(product.id, product.name)}
                aria-label={isWishlisted ? `Remove ${product.name} from favorites` : `Save ${product.name} to favorites`}
                className={`p-2.5 rounded-full backdrop-blur-md transition-all duration-200 cursor-pointer shadow-md ${
                  isWishlisted
                    ? 'bg-white/95 dark:bg-stone-900/95 text-rose-500 border border-rose-200 dark:border-rose-900/50 scale-105'
                    : 'bg-white/80 dark:bg-stone-900/80 text-stone-600 dark:text-stone-300 hover:text-rose-500 hover:bg-white dark:hover:bg-stone-900 hover:scale-110'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${
                    isWishlisted ? 'fill-rose-500 text-rose-500 stroke-rose-500' : 'stroke-current'
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={() => navigator.share?.({ title: product.name, url: window.location.href })}
                className="p-2.5 rounded-full bg-white/80 dark:bg-stone-900/80 text-stone-600 dark:text-stone-300 hover:text-blue-500 hover:bg-white dark:hover:bg-stone-900 backdrop-blur-md transition-all duration-200 cursor-pointer shadow-md"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>

            {/* Image Counter */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white px-3 py-1 rounded-full text-[10px] font-bold backdrop-blur-sm">
              {activeImageIndex + 1} / {images.length}
            </div>
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImageIndex(idx)}
                  className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 cursor-pointer ${
                    activeImageIndex === idx
                      ? 'border-[var(--primary)] shadow-sm scale-105'
                      : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img.thumbUrl || img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Trust Badges */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-center">
              <Clock className="w-5 h-5 text-[var(--primary)] mx-auto mb-1" />
              <div className="text-[10px] font-bold text-[var(--text-main)]">Baked Fresh</div>
              <div className="text-[9px] text-[var(--text-muted)]">2 Hours Before Dispatch</div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-center">
              <Truck className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-[var(--text-main)]">Express Delivery</div>
              <div className="text-[9px] text-[var(--text-muted)]">Same-Day 2-Hour</div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-center">
              <ShieldCheck className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-[var(--text-main)]">Cold-Chain</div>
              <div className="text-[9px] text-[var(--text-muted)]">Chilled Van Transit</div>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-center">
              <Recycle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <div className="text-[10px] font-bold text-[var(--text-main)]">Eco-Friendly</div>
              <div className="text-[9px] text-[var(--text-muted)]">Sustainable Packaging</div>
            </div>
          </div>

          {/* Quick Contact */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-[#FF2B6D]/10 to-[#FF6B9D]/10 border border-[#FF2B6D]/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#FF2B6D]" />
                <div>
                  <div className="text-[10px] font-bold text-[var(--text-main)]">Need Help?</div>
                  <div className="text-[9px] text-[var(--text-muted)]">Call us for custom orders</div>
                </div>
              </div>
              <a href="tel:+919876543210" className="px-3 py-1.5 rounded-lg bg-[#FF2B6D] text-white text-[10px] font-bold hover:bg-[#FF1A5B] transition-colors">
                📞 Call Now
              </a>
            </div>
          </div>
        </div>

        {/* Right: Product Info & Customization */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div>
            {/* Breadcrumb & Category */}
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] mb-2">
              <span className="hover:text-[var(--primary)] cursor-pointer">Home</span>
              <ChevronRight className="w-3 h-3" />
              <span className="hover:text-[var(--primary)] cursor-pointer">{product.category}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-[var(--text-main)] font-medium">{product.name}</span>
            </div>

            {/* Title & Rating */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--text-main)] leading-tight">
                  {product.name}
                </h2>
                <div className="mt-2 flex items-center gap-3 flex-wrap">
                  <StarRating rating={product.rating || 4.9} showValue count={product.reviewCount || 38} />
                  <span className="text-xs text-[var(--success)] font-bold bg-[var(--success-light)] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" />
                    In Stock ({product.stock} left)
                  </span>
                </div>
              </div>
            </div>

            {/* Price Display */}
            <div className="mt-3 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-bold font-display text-[var(--text-main)]">
                  ₹{selectedWeight.price * quantity}
                </span>
                {selectedWeight.mrp && (
                  <>
                    <span className="text-sm text-[var(--text-subtle)] line-through">
                      ₹{selectedWeight.mrp * quantity}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full">
                      You Save ₹{savings} ({savingsPercent}% OFF)
                    </span>
                  </>
                )}
              </div>
              <div className="text-[10px] text-[var(--text-muted)] mt-1">
                Inclusive of all taxes • Free delivery on orders above ₹999
              </div>
            </div>

            {/* Short Description */}
            <div className="mt-3">
              <p className="text-sm text-[var(--text-main)] leading-relaxed font-medium">
                {product.shortDescription}
              </p>
            </div>

            {/* SKU & Tags */}
            <div className="mt-2 flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
              <span>SKU: <span className="font-bold text-[var(--text-main)]">{product.sku}</span></span>
              {product.tags && product.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  {product.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-[var(--bg-subtle)] text-[var(--text-muted)]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 border-b border-[var(--border)] mt-4 mb-4 overflow-x-auto">
              {[
                { id: 'details', label: 'Customize' },
                { id: 'description', label: 'Description' },
                { id: 'delivery', label: 'Delivery' },
                { id: 'reviews', label: `Reviews (${product.reviewCount || 42})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-2 px-3 text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'text-[var(--primary)] border-b-2 border-[var(--primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
              <div className="space-y-5">
                {/* Weight Options */}
                {product.weightOptions && product.weightOptions.length > 0 && (
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-[var(--primary)]" />
                      {product.sellingUnit === 'piece' ? 'Select Quantity' : 'Select Weight'}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {product.weightOptions.map((opt) => {
                        const discount = opt.mrp ? Math.round(((opt.mrp - opt.price) / opt.mrp) * 100) : 0;
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setSelectedWeight(opt)}
                            className={`relative p-3 rounded-xl border text-left transition-all cursor-pointer ${
                              selectedWeight.label === opt.label
                                ? 'border-[var(--primary)] bg-[var(--primary-light)] shadow-md ring-2 ring-[var(--primary)]/20'
                                : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:shadow-sm'
                            }`}
                          >
                            {discount > 0 && (
                              <div className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full">
                                {discount}% OFF
                              </div>
                            )}
                            <div className="text-xs font-bold text-[var(--text-main)]">
                              {product.sellingUnit === 'piece' ? opt.label : `${opt.weightKg} kg`}
                            </div>
                            <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                              {product.sellingUnit === 'piece'
                                ? `Serves ${Math.round(opt.weightKg * 10) * 2}-${Math.round(opt.weightKg * 10) * 3}`
                                : `Serves ${Math.ceil(opt.weightKg * 8)}-${Math.ceil(opt.weightKg * 12)}`}
                            </div>
                            <div className="flex items-baseline gap-1 mt-1">
                              <span className="text-sm font-bold text-[var(--primary)]">₹{opt.price}</span>
                              {opt.mrp && (
                                <span className="text-[10px] text-[var(--text-subtle)] line-through">₹{opt.mrp}</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Flavours */}
                {product.flavours && product.flavours.length > 1 && (
                  <div>
                    <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      Choose Flavour Profile
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {product.flavours.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setSelectedFlavour(f)}
                          className={`px-4 py-2 rounded-xl text-xs font-semibold border-2 transition-all cursor-pointer ${
                            selectedFlavour === f
                              ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-md'
                              : 'bg-[var(--bg-surface)] text-[var(--text-main)] border-[var(--border)] hover:border-[var(--primary)]/50'
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message on Cake */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[var(--primary)]" />
                    Custom Message on Cake
                    <span className="text-[10px] font-normal text-[var(--text-muted)] normal-case">(Free)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      maxLength={35}
                      value={messageOnCake}
                      onChange={(e) => setMessageOnCake(e.target.value)}
                      placeholder="e.g. Happy 30th Birthday Priya! 🎂"
                      className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">
                      {messageOnCake.length}/35
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">✨ Hand-piped by our pastry chef with premium chocolate ganache</p>
                </div>

                {/* Add-ons */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-rose-500" />
                    Celebration Add-ons
                    <span className="text-[10px] font-normal text-[var(--text-muted)] normal-case">
                      ({selectedAddOns.length} selected)
                    </span>
                  </label>
                  <div className="space-y-2">
                    {(showAllAddOns ? AVAILABLE_ADD_ONS : AVAILABLE_ADD_ONS.slice(0, 4)).map((addon) => {
                      const isSelected = selectedAddOns.some((a) => a.id === addon.id);
                      return (
                        <label
                          key={addon.id}
                          onClick={() => handleToggleAddOn(addon)}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 text-xs cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-[var(--primary-light)] border-[var(--primary)] shadow-sm'
                              : 'bg-[var(--bg-surface)] border-[var(--border)] hover:bg-[var(--bg-subtle)] hover:border-[var(--border-strong)]'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-[var(--primary)] border-[var(--primary)]'
                                : 'border-[var(--border)]'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <span className="font-semibold text-[var(--text-main)]">{addon.name}</span>
                              {addon.category === 'candle' && <span className="ml-1">🕯️</span>}
                              {addon.category === 'card' && <span className="ml-1">💌</span>}
                              {addon.category === 'balloon' && <span className="ml-1">🎈</span>}
                              {addon.category === 'wrapping' && <span className="ml-1">🎁</span>}
                              {addon.category === 'topper' && <span className="ml-1">📸</span>}
                              {addon.category === 'combo' && <span className="ml-1">🧁</span>}
                            </div>
                          </div>
                          <span className="font-bold text-[var(--primary)]">+₹{addon.price}</span>
                        </label>
                      );
                    })}
                  </div>
                  {!showAllAddOns && AVAILABLE_ADD_ONS.length > 4 && (
                    <button
                      type="button"
                      onClick={() => setShowAllAddOns(true)}
                      className="text-[10px] font-bold text-[var(--primary)] hover:underline mt-2 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Show {AVAILABLE_ADD_ONS.length - 4} more add-ons
                    </button>
                  )}
                </div>

                {/* Quantity Stepper */}
                <div className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <span className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                    Quantity:
                  </span>
                  <div className="flex items-center border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--bg-surface)]">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="p-2.5 hover:bg-[var(--bg-subtle)] text-[var(--text-main)] transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-[var(--text-main)]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                      className="p-2.5 hover:bg-[var(--bg-subtle)] text-[var(--text-main)] transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {quantity > 1 && (
                    <span className="text-[10px] text-[var(--success)] font-bold">
                      Total: ₹{itemUnitPrice * quantity}
                    </span>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'description' && (
              <div className="space-y-4">
                {/* Long Description */}
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-[var(--primary)]" />
                    About This Product
                  </h3>
                  <div className="text-sm text-[var(--text-main)] leading-relaxed space-y-3">
                    <p>{product.description || product.shortDescription}</p>
                    {showFullDescription && (
                      <div className="space-y-3 text-[var(--text-muted)]">
                        <p>Our artisan bakers handcraft each cake using premium imported ingredients and traditional techniques. Every creation is baked fresh to order, ensuring maximum flavour and quality.</p>
                        <p>We use only the finest Belgian chocolate, pure Madagascar vanilla, fresh dairy cream, and 100% eggless recipes. Our cold-chain delivery ensures your cake arrives in perfect condition.</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1"
                    >
                      {showFullDescription ? 'Show Less' : 'Read More'}
                      <ChevronDown className={`w-3 h-3 transition-transform ${showFullDescription ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Product Highlights */}
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    Product Highlights
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: '🍫', label: 'Premium Belgian Chocolate' },
                      { icon: '🥛', label: 'Fresh Dairy Cream' },
                      { icon: '🌿', label: '100% Vegetarian' },
                      { icon: '✨', label: 'No Artificial Preservatives' },
                      { icon: '🎂', label: 'Baked to Order' },
                      { icon: '❄️', label: 'Cold-Chain Delivery' },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                        <span className="text-base">{item.icon}</span>
                        <span className="text-[10px] font-semibold text-[var(--text-main)]">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ingredients */}
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                    Key Ingredients
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {product.flavours?.map((f) => (
                      <span key={f} className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold border border-emerald-200 dark:border-emerald-800">
                        {f}
                      </span>
                    ))}
                    <span className="px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[10px] font-semibold border border-amber-200 dark:border-amber-800">
                      Fresh Cream
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-[10px] font-semibold border border-blue-200 dark:border-blue-800">
                      Cocoa Butter
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 text-[10px] font-semibold border border-purple-200 dark:border-purple-800">
                      Vanilla Extract
                    </span>
                  </div>
                </div>

                {/* Nutritional Info */}
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <BadgeCheck className="w-3.5 h-3.5 text-blue-600" />
                    Nutritional Information (per 100g)
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Calories', value: '320 kcal', color: 'text-rose-600' },
                      { label: 'Protein', value: '4.2g', color: 'text-blue-600' },
                      { label: 'Carbs', value: '42g', color: 'text-amber-600' },
                      { label: 'Fat', value: '16g', color: 'text-purple-600' },
                      { label: 'Sugar', value: '28g', color: 'text-pink-600' },
                      { label: 'Fiber', value: '1.8g', color: 'text-emerald-600' },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]">
                        <div className={`text-sm font-bold ${item.color}`}>{item.value}</div>
                        <div className="text-[9px] text-[var(--text-muted)] uppercase">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'delivery' && (
              <div className="space-y-4">
                {/* Delivery Date */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
                    Select Delivery Date
                  </label>
                  <input
                    type="date"
                    min={minDeliveryDate}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-[var(--primary)] transition-all"
                  />
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">📅 Minimum 2 days advance booking required</p>
                </div>

                {/* Delivery Slots */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    Choose Delivery Slot
                  </label>
                  <div className="space-y-2">
                    {DELIVERY_SLOTS.map((slot, idx) => (
                      <label
                        key={idx}
                        onClick={() => setSelectedDeliverySlot(idx)}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          selectedDeliverySlot === idx
                            ? 'bg-[var(--primary-light)] border-[var(--primary)] shadow-sm'
                            : 'bg-[var(--bg-surface)] border-[var(--border)] hover:bg-[var(--bg-subtle)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{slot.icon}</span>
                          <div>
                            <div className="text-xs font-bold text-[var(--text-main)]">{slot.label}</div>
                            <div className="text-[10px] text-[var(--text-muted)]">{slot.time}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          {slot.price === 0 ? (
                            <span className="text-xs font-bold text-emerald-600">FREE</span>
                          ) : (
                            <span className="text-xs font-bold text-[var(--primary)]">+₹{slot.price}</span>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Gift Wrap Option */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20 border border-rose-200 dark:border-rose-800">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">🎁</span>
                      <div>
                        <div className="text-xs font-bold text-[var(--text-main)]">Premium Gift Wrapping</div>
                        <div className="text-[10px] text-[var(--text-muted)]">Beautiful ribbon & handmade tag</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-[var(--primary)]">+₹149</span>
                      <div className={`w-10 h-6 rounded-full transition-all cursor-pointer ${
                        giftWrap ? 'bg-[var(--primary)]' : 'bg-[var(--border)]'
                      }`} onClick={() => setGiftWrap(!giftWrap)}>
                        <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                          giftWrap ? 'translate-x-5' : 'translate-x-0.5'
                        }`} />
                      </div>
                    </div>
                  </label>
                </div>

                {/* Delivery Info */}
                <div className="p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-3">
                  <h3 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">Delivery Policy</h3>
                  {[
                    { icon: '🚚', text: 'Free delivery on orders above ₹999' },
                    { icon: '❄️', text: 'Temperature-controlled cold-chain vans' },
                    { icon: '📍', text: 'Live GPS tracking for your order' },
                    { icon: '🔄', text: 'Easy rescheduling up to 4 hours before delivery' },
                    { icon: '💰', text: '100% refund if cake is damaged in transit' },
                  ].map((item) => (
                    <div key={item.text} className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span>{item.icon}</span>
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <ReviewSection
                productId={product.id}
                productName={product.name}
                initialRating={product.rating}
                initialReviewCount={product.reviewCount}
              />
            )}
          </div>

          {/* Action Buttons */}
          {activeTab === 'details' && (
            <div className="pt-4 border-t border-[var(--border)] space-y-3">
              {/* Price Summary */}
              <div className="p-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] space-y-1.5">
                <div className="flex justify-between text-xs text-[var(--text-muted)]">
                  <span>Base Price ({product.sellingUnit === 'piece' ? selectedWeight.label : `${selectedWeight.weightKg} kg`})</span>
                  <span>₹{selectedWeight.price}</span>
                </div>
                {addOnsTotal > 0 && (
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>Add-ons ({selectedAddOns.length} items)</span>
                    <span>+₹{addOnsTotal}</span>
                  </div>
                )}
                {deliveryCharge > 0 && (
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>Express Delivery</span>
                    <span>+₹{deliveryCharge}</span>
                  </div>
                )}
                {giftWrap && (
                  <div className="flex justify-between text-xs text-[var(--text-muted)]">
                    <span>Gift Wrapping</span>
                    <span>+₹149</span>
                  </div>
                )}
                <div className="flex justify-between text-xs font-bold text-[var(--text-main)] pt-1.5 border-t border-[var(--border)]">
                  <span>Total ({quantity} {quantity === 1 ? 'item' : 'items'})</span>
                  <span>₹{itemUnitPrice * quantity}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="py-3.5 px-4 rounded-xl border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-light)] text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isAdded ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Added to Cart ✓</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-4 h-4" />
                      <span>Add to Cart</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--primary-hover)] hover:brightness-110 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4" />
                  <span>Buy Now - ₹{itemUnitPrice * quantity}</span>
                </button>
              </div>

              {/* Micro Trust */}
              <div className="flex items-center justify-center gap-4 text-[9px] text-[var(--text-muted)] pt-2">
                <span className="flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Secure Payment</span>
                <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Fast Delivery</span>
                <span className="flex items-center gap-1"><BadgeCheck className="w-3 h-3" /> Quality Assured</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
