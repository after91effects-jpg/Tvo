export type DuplicateStrategy = 'skip' | 'update' | 'create_new' | 'overwrite';

export interface ImportSummary {
  totalProcessed?: number;
  totalRows?: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: { row: number; reason: string; data?: any }[];
}

export interface WeightOption {
  label: string; // e.g. "0.5 kg", "1.0 kg", "1.5 kg", "2.0 kg"
  weightKg: number;
  price: number;
  mrp: number;
  isDefault?: boolean;
}

export interface ProductImage {
  id?: string;
  url: string;
  thumbUrl?: string;
  mediumUrl?: string;
  alt?: string;
  altText?: string;
  isPrimary?: boolean;
}

export interface Review {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  verified: boolean;
  createdAt: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  category: string; // e.g. "birthday", "anniversary", "chocolate", "fruit-cakes", "desserts", "hampers", "eggless"
  subCategory?: string;
  categories?: string[];
  subcategories?: string[];
  tags: string[];
  flavours: string[];
  eggless: boolean;
  sellingUnit?: 'piece' | 'weight';
  weightOptions: WeightOption[];
  images: ProductImage[];
  rating: number;
  reviewCount: number;
  stock: number;
  stockStatus: 'in_stock' | 'out_of_stock' | 'low_stock';
  badges: string[]; // e.g. ["Bestseller", "Eggless", "Chef's Special", "New"]
  published: boolean;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  category?: string;
  icon?: string;
}

export interface CartItemAddon {
  id: string;
  name: string;
  price: number;
}

export interface CartItem {
  id: string; // cart item unique id
  productId: string;
  product: Product;
  selectedWeight: WeightOption;
  selectedFlavour: string;
  messageOnCake?: string;
  addons: CartItemAddon[];
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface CustomerDetails {
  name: string;
  phone: string;
  email: string;
  address: string;
  landmark?: string;
  pincode: string;
  city: string;
  deliveryDate?: string;
  deliverySlot?: string; // e.g. "Standard (9 AM - 1 PM)", "Evening (4 PM - 8 PM)", "Midnight Express (11 PM - 12 AM)"
  slotSurcharge?: number;
  giftMessage?: string;
  instructions?: string;
  specialInstructions?: string; // Specific cake toppings, dietary preferences, or allergy notes
}

export type OrderStatus = 'Order Placed' | 'Baking in Kitchen' | 'Out for Delivery' | 'Delivered' | 'Cancelled';

export interface OrderStatusHistoryItem {
  status: OrderStatus;
  timestamp: string;
  note?: string;
  updatedBy?: string;
}

export interface Order {
  id: string;
  orderNumber: string; // e.g. "CNF-783921"
  userId?: string;
  customer: CustomerDetails;
  specialInstructions?: string;
  items: {
    productId: string;
    name: string;
    sku: string;
    qty: number;
    weight: string;
    flavour: string;
    messageOnCake?: string;
    addons?: string[];
    unitPrice: number;
    totalPrice: number;
    imageUrl?: string;
  }[];
  subtotal: number;
  deliveryFee: number;
  slotSurcharge: number;
  discount: number;
  promoCode?: string;
  tax: number;
  total: number;
  deliveryDate: string;
  deliverySlot: string;
  status: OrderStatus;
  paymentMethod: 'Card' | 'UPI' | 'NetBanking' | 'COD';
  paymentStatus: 'Paid' | 'Pending' | 'Refunded';
  transactionId?: string;
  statusHistory: OrderStatusHistoryItem[];
  createdAt: string;
  updatedAt: string;
}

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  itemCount?: number;
  featured?: boolean;
  subcategories?: SubCategory[];
}

export interface PromoCode {
  id?: string;
  code: string;
  discountType: 'flat' | 'percent';
  discountValue: number;
  minOrderValue: number;
  maxDiscount?: number;
  active: boolean;
  expiresAt: string;
  description: string;
}

export interface MediaAsset {
  id: string;
  fileName: string;
  originalUrl: string;
  optimizedVariants: {
    thumb: string;
    medium: string;
    large: string;
    webp: string;
  };
  originalSizeBytes: number;
  optimizedSizeBytes: number;
  dimensions: {
    width: number;
    height: number;
  };
  uploadedBy: string;
  uploadedAt: string;
  usedInProductIds: string[];
}

export interface AuditLog {
  id: string;
  actorUid: string;
  actorName: string;
  actorEmail: string;
  role: 'admin' | 'staff' | 'system' | 'customer';
  action: string; // e.g. "PRODUCT_CREATE", "ORDER_STATUS_UPDATE", "CSV_IMPORT", "LOGIN_SUCCESS"
  targetType: 'Product' | 'Order' | 'Media' | 'Settings' | 'Security' | 'Auth' | 'Catalog' | string;
  targetId?: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface StoreSettings {
  storeInfo: {
    name: string;
    tagline: string;
    contactEmail: string;
    phone: string;
    address: string;
    operatingHours: string;
  };
  deliveryCities: string[];
  imageOptimization: {
    quality: number; // 0-100 (e.g. 80)
    maxWidthPx: number;
    maxHeightPx: number;
    generateWebp: boolean;
  };
  deliverySlots: {
    id: string;
    name: string;
    timeRange: string;
    surcharge: number;
  }[];
  thresholds: {
    freeDeliveryAbove: number;
    standardDeliveryFee: number;
  };
}

export interface HamperBoxOption {
  id: string;
  name: string;
  description: string;
  price: number;
  maxItems: number;
  icon: string;
  popular?: boolean;
  enabled: boolean;
}

export interface HamperCategoryOption {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  keywords: string[];
}

export interface HamperWrappingOption {
  id: string;
  name: string;
  price: number;
  icon: string;
  enabled: boolean;
}

export interface HamperThemeOption {
  id: string;
  name: string;
  description: string;
  gradient: string;
  enabled: boolean;
}

export interface HamperSettings {
  enabled: boolean;
  banner: {
    title: string;
    subtitle: string;
    gradient: string;
    emoji: string;
  };
  boxes: HamperBoxOption[];
  categories: HamperCategoryOption[];
  wrappings: HamperWrappingOption[];
  themes: HamperThemeOption[];
  allowPhotoUpload: boolean;
  allowGiftMessage: boolean;
  allowRecipientName: boolean;
  maxGiftMessageChars: number;
  photoUploadMaxCount: number;
  minItemsRequired: number;
}

export type UserRole = 'admin' | 'staff' | 'customer';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  lastLogin?: string;
  createdAt?: string;
}

export interface AdminUser {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  createdAt: string;
  lastLoginAt: string;
}

export interface ImportJob {
  id: string;
  fileName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  columnMapping: Record<string, string>;
  duplicateStrategy: 'skip' | 'update' | 'create_new';
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; reason: string; data?: any }[];
  startedBy: string;
  startedAt: string;
  completedAt?: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actorId?: string;
  actorName?: string;
  actorEmail?: string;
  targetType?: string;
  targetId?: string;
  details?: string;
  timestamp: string;
  ip?: string;
}

export interface SearchHistoryItem {
  id: string;
  userId: string;
  query: string;
  timestamp: string;
  resultCount?: number;
}
