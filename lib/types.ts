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

export interface VariantStockAdjustment {
  id: number;
  variantId: number;
  productId: number;
  previousQuantity: number;
  adjustmentQuantity: number;
  resultingQuantity: number;
  reason: string;
  userId: number | null;
  userName: string | null;
  createdAt: string;
}

export interface ProductVariant {
  id: number;
  productId: number;
  sku: string;
  label: string;
  mrp: number | null;
  price: number;
  stock: number;
  lowStockThreshold: number;
  stockStatus: 'in_stock' | 'low_stock' | 'out_of_stock';
  weightKg: number | null;
  status: 'active' | 'inactive';
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTreeNode {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  description: string | null;
  children: CategoryTreeNode[];
}

export interface FlavourOption {
  id: string;
  name: string;
  additionalPrice: number;
  isDefault?: boolean;
  displayOrder: number;
  isActive: boolean;
  showOnStorefront: boolean;
}

export interface DietaryAttribute {
  key: string;
  label: string;
  enabled: boolean;
  showOnStorefront: boolean;
  isCustom?: boolean;
}

export const DEFAULT_DIETARY_ATTRIBUTES: DietaryAttribute[] = [
  { key: 'eggless', label: 'Eggless', enabled: false, showOnStorefront: true },
  { key: 'contains_egg', label: 'Contains Egg', enabled: false, showOnStorefront: true },
  { key: 'vegetarian', label: 'Vegetarian', enabled: false, showOnStorefront: true },
  { key: 'vegan', label: 'Vegan', enabled: false, showOnStorefront: true },
  { key: 'jain', label: 'Jain', enabled: false, showOnStorefront: true },
  { key: 'dairy_free', label: 'Dairy-Free', enabled: false, showOnStorefront: true },
  { key: 'contains_dairy', label: 'Contains Dairy', enabled: false, showOnStorefront: true },
  { key: 'gluten_free', label: 'Gluten-Free', enabled: false, showOnStorefront: true },
  { key: 'contains_gluten', label: 'Contains Gluten', enabled: false, showOnStorefront: true },
  { key: 'nut_free', label: 'Nut-Free', enabled: false, showOnStorefront: true },
  { key: 'contains_nuts', label: 'Contains Nuts', enabled: false, showOnStorefront: true },
  { key: 'sugar_free', label: 'Sugar-Free', enabled: false, showOnStorefront: true },
  { key: 'no_added_sugar', label: 'No Added Sugar', enabled: false, showOnStorefront: true },
  { key: 'low_sugar', label: 'Low Sugar', enabled: false, showOnStorefront: true },
  { key: 'diabetic_friendly', label: 'Diabetic-Friendly', enabled: false, showOnStorefront: true },
  { key: 'soy_free', label: 'Soy-Free', enabled: false, showOnStorefront: true },
  { key: 'contains_soy', label: 'Contains Soy', enabled: false, showOnStorefront: true },
  { key: 'preservative_free', label: 'Preservative-Free', enabled: false, showOnStorefront: true },
  { key: 'alcohol_free', label: 'Alcohol-Free', enabled: false, showOnStorefront: true },
  { key: 'halal', label: 'Halal', enabled: false, showOnStorefront: true },
  { key: 'custom', label: 'Custom', enabled: false, showOnStorefront: true },
];

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
  flavourOptions?: FlavourOption[];
  eggless: boolean;
  sellingUnit?: 'piece' | 'weight';
  weightOptions: WeightOption[];
  images: ProductImage[];
  imageUrl?: string;
  price?: number;
  regularPrice?: number;
  salePrice?: number;
  regular_price?: number;
  sale_price?: number;
  variations?: any[];
  rating: number;
  reviewCount: number;
  stock: number;
  stockStatus: 'in_stock' | 'out_of_stock' | 'low_stock';
  badges: string[]; // e.g. ["Bestseller", "Eggless", "Chef's Special", "New"]
  published: boolean;
  bestseller?: boolean;
  newArrival?: boolean;
  deal?: boolean;
  featured?: boolean;
  addons?: AddOn[];
  weight?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  // Customization
  customizationFee?: number;
  allowCustomMessage?: boolean;
  allowCustomDesign?: boolean;
  // Feature toggles for product page sections
  showGallery?: boolean;
  showVideo?: boolean;
  showFlavour?: boolean;
  showCustomize?: boolean;
  showCustomization?: boolean;
  showDesignUpload?: boolean;
  showCustomerDesignUpload?: boolean;
  showAddons?: boolean;
  showDietary?: boolean;
  showDelivery?: boolean;
  showDeliveryDate?: boolean;
  showDeliverySlot?: boolean;
  showSpecialInstructions?: boolean;
  showRatings?: boolean;
  showBadges?: boolean;
  showSizeSelector?: boolean;
  showReviews?: boolean;
  showFaq?: boolean;
  showRelatedProducts?: boolean;
  showCheckoutOptions?: boolean;
  // Dietary
  dietaryAttributes?: DietaryAttribute[];
}

export interface AddOn {
  id: string;
  name: string;
  price: number;
  category?: string;
  icon?: string;
  description?: string;
  isActive?: boolean;
  displayOrder?: number;
  showOnStorefront?: boolean;
  productIds?: string[]; // which products this addon applies to
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
  flavourPrice?: number; // additional price for selected flavour
  messageOnCake?: string;
  customInstructions?: string;
  customDesignImage?: string; // base64 or URL of uploaded design
  customDesignDescription?: string; // text description of design
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
    flavourPrice?: number;
    messageOnCake?: string;
    customInstructions?: string;
    customDesignImage?: string;
    customDesignDescription?: string;
    addons?: any[];
    unitPrice: number;
    totalPrice: number;
    imageUrl?: string;
    sellingUnit?: 'piece' | 'weight';
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
  parentSlug?: string;
  description: string;
  image: string;
  displayOrder?: number;
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
  url?: string;
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
  role: UserRole;
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

export type UserRole = 'super_admin' | 'admin' | 'catalog_manager' | 'seo_manager' | 'kitchen_manager' | 'delivery_manager' | 'marketing_manager' | 'festival_manager' | 'customer_support' | 'media_manager' | 'finance_manager' | 'read_only' | 'staff' | 'customer';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  lastLogin?: string;
  createdAt?: string;
}

export type AddressLabel = 'home' | 'work' | 'other';

export interface CustomerAddress {
  id: string;
  label: AddressLabel;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerAddressInput {
  label: AddressLabel;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
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
