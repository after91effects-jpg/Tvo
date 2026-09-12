import { Category, Product, PromoCode, StoreSettings, HamperSettings } from './types';
import { ALL_FLAT_CATEGORIES } from './masterCatalogHierarchy';
import { RESTRUCTURED_MASTER_PRODUCTS } from './productOrganizer';

export const INITIAL_CATEGORIES: Category[] = ALL_FLAT_CATEGORIES;
export const INITIAL_PRODUCTS: Product[] = RESTRUCTURED_MASTER_PRODUCTS;

export const DEFAULT_PROMO_CODES: PromoCode[] = [
  {
    code: 'FIRST15',
    discountType: 'percent',
    discountValue: 15,
    minOrderValue: 499,
    maxDiscount: 300,
    active: true,
    expiresAt: '2027-12-31',
    description: 'Flat 15% off on your first celebration order.',
  },
  {
    code: 'TVO10',
    discountType: 'percent',
    discountValue: 10,
    minOrderValue: 499,
    maxDiscount: 200,
    active: true,
    expiresAt: '2027-12-31',
    description: 'Get 10% off on all celebratory cakes above ₹499.',
  },
  {
    code: 'FIRSTCAKE',
    discountType: 'flat',
    discountValue: 150,
    minOrderValue: 699,
    active: true,
    expiresAt: '2027-12-31',
    description: 'Flat ₹150 discount for your first sweet order.',
  },
  {
    code: 'SWEET20',
    discountType: 'percent',
    discountValue: 20,
    minOrderValue: 1499,
    maxDiscount: 400,
    active: true,
    expiresAt: '2027-12-31',
    description: 'Enjoy 20% off on orders above ₹1,499.',
  },
];

export const DEFAULT_STORE_SETTINGS: StoreSettings = {
  storeInfo: {
    name: 'TVO Flavours',
    tagline: 'The All-in-one Bakery Shop.',
    contactEmail: 'hello@tvoflavours.com',
    phone: '+91 76782 59522',
    address: 'Vipul World, Sector 48, Gurugram, Haryana 122001, India',
    operatingHours: 'Kitchen active 7:00 AM – 1:00 AM (Midnight Deliveries Available)',
  },
  deliveryCities: [
    'Gurugram',
    'Delhi NCR',
    'Noida',
    'Faridabad',
    'Ghaziabad',
    'Greater Noida',
  ],
  imageOptimization: {
    quality: 82,
    maxWidthPx: 1200,
    maxHeightPx: 1200,
    generateWebp: true,
  },
  deliverySlots: [
    { id: 'slot-std-1', name: 'Morning Fresh', timeRange: '9:00 AM – 1:00 PM', surcharge: 0 },
    { id: 'slot-std-2', name: 'Afternoon Tea', timeRange: '1:00 PM – 5:00 PM', surcharge: 0 },
    { id: 'slot-eve', name: 'Prime Evening', timeRange: '5:00 PM – 9:00 PM', surcharge: 49 },
    { id: 'slot-mid', name: 'Midnight Surprise (11 PM - 12 AM)', timeRange: '11:00 PM – 12:00 AM', surcharge: 199 },
  ],
  thresholds: {
    freeDeliveryAbove: 499,
    standardDeliveryFee: 49,
  },
};

export const DEFAULT_HAMPER_SETTINGS: HamperSettings = {
  enabled: true,
  banner: {
    title: 'Build Your Own Hamper',
    subtitle: 'Pick your favourite treats, choose a beautiful box, and create a personalized gift in minutes',
    gradient: 'from-[#FF2B6D] via-[#FF6B9D] to-[#FF2B6D]',
    emoji: '🎁',
  },
  boxes: [
    { id: 'mini', name: 'Mini Treat Box', description: 'Perfect for a sweet gesture', price: 0, maxItems: 3, icon: '📦', enabled: true },
    { id: 'classic', name: 'Classic Gift Hamper', description: 'Our most loved hamper size', price: 199, maxItems: 5, icon: '🎁', popular: true, enabled: true },
    { id: 'premium', name: 'Premium Celebration Box', description: 'For grand celebrations', price: 399, maxItems: 8, icon: '👑', enabled: true },
    { id: 'royal', name: 'Royal Luxury Hamper', description: 'The ultimate gifting experience', price: 699, maxItems: 12, icon: '🏰', enabled: true },
  ],
  categories: [
    { id: 'cakes', name: 'Cakes', icon: '🎂', enabled: true, keywords: ['cake', 'cakes'] },
    { id: 'desserts', name: 'Desserts', icon: '🍰', enabled: true, keywords: ['pastry', 'brownie', 'cupcake', 'mousse', 'cheesecake', 'jar'] },
    { id: 'chocolates', name: 'Chocolates', icon: '🍫', enabled: true, keywords: ['chocolate', 'truffle', 'praline'] },
    { id: 'dryfruits', name: 'Dry Fruits', icon: '🥜', enabled: true, keywords: ['dry fruit', 'ladoo', 'barfi', 'kaju'] },
    { id: 'cookies', name: 'Cookies', icon: '🍪', enabled: true, keywords: ['cookie', 'biscuit'] },
    { id: 'gifts', name: 'Gifts', icon: '🧸', enabled: true, keywords: ['teddy', 'rakhi', 'card', 'flower'] },
  ],
  wrappings: [
    { id: 'none', name: 'No Wrapping', price: 0, icon: '📦', enabled: true },
    { id: 'basic', name: 'Basic Wrap', price: 49, icon: '🎁', enabled: true },
    { id: 'premium', name: 'Premium Ribbon & Tag', price: 149, icon: '🎀', enabled: true },
    { id: 'luxury', name: 'Luxury Velvet Box', price: 349, icon: '👑', enabled: true },
  ],
  themes: [
    { id: 'pink', name: 'Rose Pink', description: 'Soft romantic rosy tones', gradient: 'from-pink-500 to-rose-400', enabled: true },
    { id: 'royal', name: 'Royal Purple', description: 'Rich regal purple elegance', gradient: 'from-purple-600 to-indigo-500', enabled: true },
    { id: 'emerald', name: 'Emerald Green', description: 'Fresh festive green palette', gradient: 'from-emerald-600 to-teal-500', enabled: true },
    { id: 'gold', name: 'Royal Gold', description: 'Luxurious golden shimmer', gradient: 'from-amber-500 to-yellow-400', enabled: true },
  ],
  allowPhotoUpload: true,
  allowGiftMessage: true,
  allowRecipientName: true,
  maxGiftMessageChars: 150,
  photoUploadMaxCount: 3,
  minItemsRequired: 1,
};

// Helper to seed database via API if empty or force update
export async function seedFirestoreDatabase(force: boolean = false): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/admin/csv/seed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Seeding failed');
    }

    return data.data;
  } catch (error: any) {
    console.error('Seeding error:', error);
    return { success: false, message: error?.message || 'Failed to seed database.' };
  }
}

export const seedDatabaseIfEmpty = seedFirestoreDatabase;