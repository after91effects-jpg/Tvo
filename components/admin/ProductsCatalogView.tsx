'use client';

import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
  X,
  Sparkles,
  Eye,
  Filter,
  Image as ImageIcon,
  Save,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileUp,
  Layers,
  ArrowRight,
  Info,
  CheckCheck,
  Sparkles as SparklesIcon,
  MessageSquare,
  Upload as UploadIcon,
  Tag,
  Eye as EyeIcon,
  ToggleLeft,
  ToggleRight,
  LayoutDashboard,
  Image as ImageIcon2,
  Menu,
  Settings,
  Star,
  Award,
  Truck,
  Calendar,
  Clock,
  HelpCircle,
  ShoppingBag,
  Leaf,
  Film,
  ArrowLeft,
} from 'lucide-react';
import { Product, WeightOption, FlavourOption, DuplicateStrategy, ImportSummary, DietaryAttribute, DEFAULT_DIETARY_ATTRIBUTES, ProductImage, ProductVideo } from '../../lib/types';
import { logAuditEvent } from '../../lib/audit';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { INITIAL_CATEGORIES } from '../../lib/seedData';
import { validateImageFile, validateVideoFile } from '../../lib/uploadValidation';
import { normalizeImageUrl } from '../../lib/imageUrl';

interface ProductsCatalogViewProps {
  products: Product[];
  onRefresh: () => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
}

interface ParsedCakeRow {
  name: string;
  sku: string;
  category: string;
  price: number;
  mrp: number;
  stock: number;
  eggless: boolean;
  shortDescription: string;
  description: string;
  flavours: string[];
  tags: string[];
  badges: string[];
  imageUrl: string;
  published: boolean;
  isDuplicate: boolean;
  existingId?: string;
  hasErrors: boolean;
  errorMessages: string[];
}

export const ProductsCatalogView: React.FC<ProductsCatalogViewProps> = ({
  products,
  onRefresh,
  isAddModalOpen,
  setIsAddModalOpen,
}) => {
  const { user, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDietary, setSelectedDietary] = useState('all');

  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // CSV Bulk Import State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isParsingCsv, setIsParsingCsv] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedCakeRow[]>([]);
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateStrategy>('update');
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'new' | 'update' | 'error'>('all');
  const [previewSearch, setPreviewSearch] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State for Add / Edit
  const [formName, setFormName] = useState('');
  const [formSku, setFormSku] = useState('');
  const [formCategory, setFormCategory] = useState('chocolate');
  const [formShortDesc, setFormShortDesc] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formEggless, setFormEggless] = useState(true);
  const [formPrice, setFormPrice] = useState('699');
  const [formMrp, setFormMrp] = useState('849');
  const [formStock, setFormStock] = useState('30');
  const [formFlavours, setFormFlavours] = useState('Dark Chocolate, Truffle');
  const [formTags, setFormTags] = useState('Bestseller, Birthday, Chocolate');
  const [formBadges, setFormBadges] = useState('Bestseller, Eggless');
  const [formImageUrl, setFormImageUrl] = useState(
    'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80'
  );
  const [formImages, setFormImages] = useState<ProductImage[]>([]);
  const [formVideos, setFormVideos] = useState<ProductVideo[]>([]);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [isVideoUploading, setIsVideoUploading] = useState(false);
  const [formPublished, setFormPublished] = useState(true);
  const [formSellingUnit, setFormSellingUnit] = useState<'piece' | 'weight'>('weight');
  // Flavour Options
  const [formFlavourOptions, setFormFlavourOptions] = useState<FlavourOption[]>([
    { id: 'flav-1', name: 'Original', additionalPrice: 0, isDefault: true, displayOrder: 1, isActive: true, showOnStorefront: true },
  ]);
  // Customization
  const [formCustomizationFee, setFormCustomizationFee] = useState('0');
  const [formAllowCustomMessage, setFormAllowCustomMessage] = useState(true);
  const [formAllowCustomDesign, setFormAllowCustomDesign] = useState(false);
  // Feature Toggles
  const [formShowGallery, setFormShowGallery] = useState(true);
  const [formShowVideo, setFormShowVideo] = useState(false);
  const [formShowFlavour, setFormShowFlavour] = useState(true);
  const [formShowCustomize, setFormShowCustomize] = useState(true);
  const [formShowDesignUpload, setFormShowDesignUpload] = useState(false);
  const [formShowAddons, setFormShowAddons] = useState(true);
  const [formShowDietary, setFormShowDietary] = useState(true);
  const [formShowDelivery, setFormShowDelivery] = useState(true);
  const [formShowSpecialInstructions, setFormShowSpecialInstructions] = useState(true);
  // Extended Feature Toggles (12B-5)
  const [formShowRatings, setFormShowRatings] = useState(true);
  const [formShowBadges, setFormShowBadges] = useState(true);
  const [formShowSizeSelector, setFormShowSizeSelector] = useState(true);
  const [formShowDeliveryDate, setFormShowDeliveryDate] = useState(true);
  const [formShowDeliverySlot, setFormShowDeliverySlot] = useState(true);
  const [formShowReviews, setFormShowReviews] = useState(true);
  const [formShowFaq, setFormShowFaq] = useState(true);
  const [formShowRelatedProducts, setFormShowRelatedProducts] = useState(true);
  const [formShowCheckoutOptions, setFormShowCheckoutOptions] = useState(true);
  // Dietary Attributes (12B-5)
  const [formDietaryAttributes, setFormDietaryAttributes] = useState<DietaryAttribute[]>(
    () => DEFAULT_DIETARY_ATTRIBUTES.map((d) => ({ ...d }))
  );
  const [formCustomDietaryLabel, setFormCustomDietaryLabel] = useState('');

  const [categoryIdMap, setCategoryIdMap] = useState<Record<string, number>>({});

  useEffect(() => {
    fetch('/api/admin?type=categories')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: any) => {
        if (data?.categories?.length) {
          const map: Record<string, number> = {};
          for (const c of data.categories) if (c?.slug) map[c.slug] = Number(c.id);
          setCategoryIdMap(map);
        }
      })
      .catch(() => {});
  }, []);

  // Download Sample CSV Template
  const handleDownloadSampleCsv = () => {
    const sampleHeaders = [
      'name',
      'sku',
      'category',
      'price',
      'mrp',
      'stock',
      'eggless',
      'short_description',
      'description',
      'flavours',
      'tags',
      'badges',
      'image_url',
      'published',
    ];

    const sampleData = [
      [
        'Royal Belgian Dark Truffle Cake',
        'CONF-TRUF-01',
        'chocolate',
        '749',
        '899',
        '30',
        'true',
        'Signature 54% dark chocolate ganache enveloped in cacao sponge.',
        'Handcrafted with pure Belgian couverture chocolate, layered with moist dark chocolate sponge and silky ganache.',
        'Belgian Dark Chocolate, Truffle',
        'Bestseller, Truffle, Birthday',
        'Bestseller, Eggless',
        'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80',
        'true',
      ],
      [
        'Imperial Red Velvet Gateau',
        'CONF-RED-02',
        'anniversary',
        '799',
        '949',
        '25',
        'true',
        'Velvety ruby sponge with whipped Madagascar vanilla cream cheese.',
        'Traditional red velvet layered with rich cream cheese frosting and fine crumb finish.',
        'Red Velvet, Cream Cheese',
        'Anniversary, Romantic, Signature',
        "Chef's Special, Eggless",
        'https://images.unsplash.com/photo-1586788680434-30d324b2d46f?auto=format&fit=crop&w=800&q=80',
        'true',
      ],
      [
        'Alphonso Mango & Passionfruit Gateau',
        'CONF-MAN-03',
        'fruit-cakes',
        '749',
        '899',
        '20',
        'true',
        'Fresh seasonal Ratnagiri Alphonso mango mousse with passionfruit compote.',
        'Layers of airy vanilla sponge infused with fresh Alphonso mango pulp and passionfruit curd.',
        'Alphonso Mango, Passionfruit',
        'Seasonal, Fruit, Summer',
        'Fresh Seasonal, Eggless',
        'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=800&q=80',
        'true',
      ],
      [
        'Lotus Biscoff Caramel Drip Cake',
        'CONF-BISC-04',
        'birthday',
        '849',
        '999',
        '22',
        'true',
        'Spiced speculoos cookie crust layered with caramelised cream.',
        'Decadent layers of spiced biscuit crunch, salted caramel drizzle, and creamy Biscoff frosting.',
        'Lotus Biscoff, Salted Caramel',
        'Birthday, Biscoff, Caramel',
        'Trending, Eggless',
        'https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80',
        'true',
      ],
    ];

    const csvContent = [
      sampleHeaders.join(','),
      ...sampleData.map((row) =>
        row.map((val) => `"${val.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const linkEl = document.createElement('a');
    linkEl.setAttribute('href', url);
    linkEl.setAttribute('download', 'tvo_flavours_cake_inventory_template.csv');
    document.body.appendChild(linkEl);
    linkEl.click();
    document.body.removeChild(linkEl);
  };

  // Process CSV File with PapaParse
  const handleParseCsvFile = (file: File) => {
    setImportFile(file);
    setIsParsingCsv(true);
    setImportSummary(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim().toLowerCase().replace(/[\s_-]+/g, '_'),
      complete: (results) => {
        const rawData = results.data as Record<string, any>[];
        const existingSkuMap = new Map<string, Product>();
        const existingNameMap = new Map<string, Product>();

        products.forEach((p) => {
          if (p.sku) existingSkuMap.set(p.sku.trim().toLowerCase(), p);
          if (p.name) existingNameMap.set(p.name.trim().toLowerCase(), p);
        });

        const rows: ParsedCakeRow[] = rawData
          .map((row, idx) => {
            const errorMessages: string[] = [];

            // Name
            const name = (
              row.name ||
              row.title ||
              row.cake_name ||
              row.product_name ||
              row.post_title ||
              ''
            ).toString().trim();

            if (!name) {
              errorMessages.push('Missing cake title / name.');
            }

            // SKU
            const rawSku = (
              row.sku ||
              row.product_code ||
              row.code ||
              row.item_code ||
              ''
            ).toString().trim();

            const sku =
              rawSku ||
              `CONF-${(name || 'CAKE')
                .slice(0, 4)
                .toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

            // Category
            const rawCat = (
              row.category ||
              row.categories ||
              row.product_cat ||
              'chocolate'
            ).toString().trim().toLowerCase();
            const category = rawCat.replace(/\s+/g, '-');

            // Price & MRP
            const price = parseFloat(
              row.price || row.sale_price || row.selling_price || row.base_price || '699'
            ) || 699;

            const mrp = parseFloat(
              row.mrp || row.regular_price || row.original_price || ''
            ) || Math.round(price * 1.2);

            // Stock
            const rawStock = parseInt(
              row.stock || row.inventory || row.quantity || row.qty || '20',
              10
            );
            const stock = isNaN(rawStock) ? 20 : rawStock;

            // Eggless
            const rawEgg = (
              row.eggless ||
              row.dietary ||
              row.is_eggless ||
              row.vegetarian ||
              'true'
            ).toString().toLowerCase().trim();
            const eggless =
              rawEgg === 'true' ||
              rawEgg === 'yes' ||
              rawEgg === '1' ||
              rawEgg === 'eggless' ||
              rawEgg.includes('veg');

            // Descriptions
            const shortDescription = (
              row.short_description ||
              row.short_desc ||
              row.summary ||
              row.excerpt ||
              `${name || 'Artisan cake'} handcrafted with fresh premium ingredients.`
            ).toString().trim();

            const description = (
              row.description ||
              row.full_description ||
              row.details ||
              row.post_content ||
              shortDescription
            ).toString().trim();

            // Flavours, Tags, Badges
            const flavours = (row.flavours || row.flavors || row.flavor || 'Signature Flavour')
              .toString()
              .split(/[,|]/)
              .map((s: string) => s.trim())
              .filter(Boolean);

            const tags = (row.tags || row.product_tags || 'Artisan, Celebration')
              .toString()
              .split(/[,|]/)
              .map((s: string) => s.trim())
              .filter(Boolean);

            const badges = (row.badges || (eggless ? 'Eggless, Bestseller' : 'Bestseller'))
              .toString()
              .split(/[,|]/)
              .map((s: string) => s.trim())
              .filter(Boolean);

            // Image URL
            const imageUrl = (
              row.image_url ||
              row.image ||
              row.photo_url ||
              row.images ||
              'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80'
            ).toString().trim().split(/[,|]/)[0] ||
              'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80';

            // Published
            const rawPub = (
              row.published ||
              row.status ||
              row.is_published ||
              'true'
            ).toString().toLowerCase().trim();
            const published =
              rawPub === 'true' || rawPub === '1' || rawPub === 'published' || rawPub === 'yes';

            // Duplicate detection
            const matchedExisting =
              (sku && existingSkuMap.get(sku.toLowerCase())) ||
              (name && existingNameMap.get(name.toLowerCase()));

            return {
              name,
              sku,
              category,
              price,
              mrp,
              stock,
              eggless: eggless,
              shortDescription,
              description,
              flavours,
              tags,
              badges,
              imageUrl,
              published,
              isDuplicate: !!matchedExisting,
              existingId: matchedExisting?.id,
              hasErrors: errorMessages.length > 0,
              errorMessages,
            };
          })
          .filter((r) => r.name || r.sku);

        setParsedRows(rows);
        setIsParsingCsv(false);
      },
      error: (err) => {
        alert(`Failed to parse CSV: ${err.message}`);
        setIsParsingCsv(false);
      },
    });
  };

  // Bulk Commit to Firestore
  const handleBulkImportToFirestore = async () => {
    if (!parsedRows || parsedRows.length === 0) return;

    try {
      setIsImporting(true);
      setImportProgress(0);

      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      const errorsList: { row: number; reason: string }[] = [];

      const rowsToProcess = parsedRows.filter((r) => !r.hasErrors);
      const batchSize = 100; // safe Firestore batch ceiling

      for (let i = 0; i < rowsToProcess.length; i += batchSize) {
        const chunk = rowsToProcess.slice(i, i + batchSize);

        await Promise.all(chunk.map(async (row, chunkIdx) => {
          const overallIndex = i + chunkIdx + 1;

          try {
            if (row.isDuplicate && duplicateStrategy === 'skip') {
              skippedCount++;
              return;
            }

            const isUpdating = row.isDuplicate && duplicateStrategy === 'update' && row.existingId;
            const prodId = isUpdating
              ? row.existingId!
              : `prod-csv-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

            const slug = row.name
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/(^-|-$)+/g, '');

            const weightOptions: WeightOption[] = [
              {
                label: '0.5 kg (Serves 4-6)',
                weightKg: 0.5,
                price: row.price,
                mrp: row.mrp,
              },
              {
                label: '1.0 kg (Serves 8-10)',
                weightKg: 1.0,
                price: Math.round(row.price * 1.85),
                mrp: Math.round(row.mrp * 1.85),
              },
              {
                label: '1.5 kg (Serves 12-14)',
                weightKg: 1.5,
                price: Math.round(row.price * 2.7),
                mrp: Math.round(row.mrp * 2.7),
              },
              {
                label: '2.0 kg (Serves 16-20)',
                weightKg: 2.0,
                price: Math.round(row.price * 3.5),
                mrp: Math.round(row.mrp * 3.5),
              },
            ];

            const productPayload: Product = {
              id: prodId,
              sku: row.sku,
              name: row.name,
              slug,
              shortDescription: row.shortDescription,
              description: row.description,
              category: row.category,
              tags: row.tags,
              flavours: row.flavours,
              eggless: row.eggless,
              weightOptions,
              images: [
                {
                  url: row.imageUrl,
                  thumbUrl: row.imageUrl,
                  mediumUrl: row.imageUrl,
                  alt: row.name,
                },
              ],
              rating: 0,
              reviewCount: 0,
              stock: row.stock,
              stockStatus: row.stock > 0 ? 'in_stock' : 'out_of_stock',
              badges: row.badges,
              published: row.published,
              seoTitle: `${row.name} | TVO Flavours Bakery`,
              seoDescription: row.shortDescription,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              createdBy: user?.name || 'Chef Administrator (CSV Import)',
            };

            const res = await fetch('/api/admin/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: isUpdating ? 'update' : 'create',
                id: isUpdating ? row.existingId : undefined,
                name: productPayload.name,
                sku: row.sku,
                slug,
                regular_price: row.mrp,
                sale_price: row.price,
                stock: row.stock,
                published: row.published ? 1 : 0,
                short_description: productPayload.shortDescription,
                description: productPayload.description,
                eggless: row.eggless ? 1 : 0,
                flavours: productPayload.flavours,
                badges: productPayload.badges,
                tags: productPayload.tags,
images_json: (formImages.filter((i) => i.url && i.url.trim()).map((i) => ({
              url: i.url.trim(),
              thumbUrl: i.thumbUrl?.trim() || i.url.trim(),
              mediumUrl: i.mediumUrl?.trim() || i.url.trim(),
              alt: i.alt?.trim() || formName.trim(),
              caption: i.caption?.trim() || '',
              isPrimary: !!i.isPrimary,
            }))).map((img, idx, arr) => (arr.some((x) => x.isPrimary) ? img : idx === 0 ? { ...img, isPrimary: true } : img)),
            videos_json: formVideos.filter((v) => v.url && v.url.trim()).map((v) => ({
              url: v.url.trim(),
              posterUrl: v.posterUrl?.trim() || '',
              caption: v.caption?.trim() || '',
              isPrimary: !!v.isPrimary,
            })),
                variations_json: {
                  attribute: 'Select Weight',
                  options: weightOptions.map((w) => ({
                    label: w.label,
                    value: w.label,
                    weightKg: w.weightKg ?? null,
                    price: w.price,
                    mrp: w.mrp ?? w.price,
                  })),
                },
              }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            if (isUpdating) {
              updatedCount++;
            } else {
              createdCount++;
            }
          } catch (itemErr: any) {
            failedCount++;
            errorsList.push({
              row: overallIndex,
              reason: itemErr?.message || 'Error writing row to catalog',
            });
          }
        }));

        const progressPercent = Math.min(100, Math.round(((i + chunk.length) / rowsToProcess.length) * 100));
        setImportProgress(progressPercent);
      }

      await logAuditEvent({
        actorUid: user?.uid,
        actorName: user?.name,
        actorEmail: user?.email,
        action: 'PRODUCT_BULK_IMPORT',
        targetType: 'ProductCatalog',
        targetId: `import-${Date.now()}`,
        details: `Bulk imported ${rowsToProcess.length} cake recipes via CSV: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped.`,
      });

      setImportSummary({
        created: createdCount,
        updated: updatedCount,
        skipped: skippedCount,
        failed: failedCount,
        errors: errorsList,
      });

      onRefresh();
    } catch (importErr: any) {
      alert(`Bulk import error: ${importErr?.message || 'Failed to write to Firestore'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormSku(`CONF-REC-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormCategory('chocolate');
    setFormShortDesc('');
    setFormDesc('');
    setFormEggless(true);
    setFormPrice('699');
    setFormMrp('849');
    setFormStock('25');
    setFormFlavours('Belgian Dark Chocolate, Hazelnut Truffle');
    setFormTags('Bestseller, Truffle, Birthday');
    setFormBadges('Bestseller, Eggless');
    setFormImageUrl(
      'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=800&q=80'
    );
    setFormImages([
      {
        url: 'https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?auto=format&fit=crop&w=800&q=80',
        isPrimary: true,
      },
    ]);
    setFormVideos([]);
    setFormPublished(true);
    setFormSellingUnit('weight');
    // Reset flavour options
    setFormFlavourOptions([{ id: 'flav-1', name: 'Original', additionalPrice: 0, isDefault: true, displayOrder: 1, isActive: true, showOnStorefront: true }]);
    // Reset customization
    setFormCustomizationFee('0');
    setFormAllowCustomMessage(true);
    setFormAllowCustomDesign(false);
    // Reset feature toggles
    setFormShowGallery(true);
    setFormShowVideo(false);
    setFormShowFlavour(true);
    setFormShowCustomize(true);
    setFormShowDesignUpload(false);
    setFormShowAddons(true);
    setFormShowDietary(true);
    setFormShowDelivery(true);
    setFormShowSpecialInstructions(true);
    // Reset extended feature toggles (12B-5)
    setFormShowRatings(true);
    setFormShowBadges(true);
    setFormShowSizeSelector(true);
    setFormShowDeliveryDate(true);
    setFormShowDeliverySlot(true);
    setFormShowReviews(true);
    setFormShowFaq(true);
    setFormShowRelatedProducts(true);
    setFormShowCheckoutOptions(true);
    // Reset dietary attributes (12B-5)
    setFormDietaryAttributes(DEFAULT_DIETARY_ATTRIBUTES.map((d) => ({ ...d })));
    setFormCustomDietaryLabel('');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormName(prod.name);
    setFormSku(prod.sku);
    setFormCategory(prod.category);
    setFormShortDesc(prod.shortDescription || '');
    setFormDesc(prod.description || '');
    setFormEggless(prod.eggless);
    setFormPrice(prod.weightOptions?.[0]?.price?.toString() || '699');
    setFormMrp(prod.weightOptions?.[0]?.mrp?.toString() || '849');
    setFormStock(prod.stock?.toString() || '25');
    setFormFlavours(prod.flavours?.join(', ') || '');
    setFormTags(prod.tags?.join(', ') || '');
    setFormBadges(prod.badges?.join(', ') || '');
    setFormImageUrl(prod.images?.[0]?.url || '');
    setFormImages((prod.images || []).map((img: any) => ({
      url: img.url || '',
      thumbUrl: img.thumbUrl || '',
      mediumUrl: img.mediumUrl || '',
      alt: img.alt || img.altText || '',
      caption: img.caption || '',
      isPrimary: !!img.isPrimary || img.type === 'primary',
    })));
    setFormVideos(((prod as any).videos || []).map((v: any) => ({
      url: v.url || '',
      posterUrl: v.posterUrl || '',
      caption: v.caption || '',
      id: v.id,
      isPrimary: !!v.isPrimary,
    })));
    setFormPublished(prod.published);
    setFormSellingUnit((prod as any).sellingUnit ?? (prod as any).selling_unit ?? 'weight');
    // Load flavour options
    setFormFlavourOptions((prod as any).flavourOptions?.length
      ? (prod as any).flavourOptions
      : [{ id: 'flav-1', name: 'Original', additionalPrice: 0, isDefault: true, displayOrder: 1, isActive: true, showOnStorefront: true }]);
    // Load customization
    setFormCustomizationFee((prod as any).customizationFee?.toString() || '0');
    setFormAllowCustomMessage((prod as any).allowCustomMessage !== false);
    setFormAllowCustomDesign((prod as any).allowCustomDesign === true);
    // Load feature toggles
    setFormShowGallery((prod as any).showGallery !== false);
    setFormShowVideo((prod as any).showVideo === true);
    setFormShowFlavour((prod as any).showFlavour !== false);
    setFormShowCustomize((prod as any).showCustomize !== false);
    setFormShowDesignUpload((prod as any).showDesignUpload === true);
    setFormShowAddons((prod as any).showAddons !== false);
    setFormShowDietary((prod as any).showDietary !== false);
    setFormShowDelivery((prod as any).showDelivery !== false);
    setFormShowSpecialInstructions((prod as any).showSpecialInstructions !== false);
    // Load extended feature toggles (12B-5)
    setFormShowRatings((prod as any).showRatings !== false);
    setFormShowBadges((prod as any).showBadges !== false);
    setFormShowSizeSelector((prod as any).showSizeSelector !== false);
    setFormShowDeliveryDate((prod as any).showDeliveryDate !== false);
    setFormShowDeliverySlot((prod as any).showDeliverySlot !== false);
    setFormShowReviews((prod as any).showReviews !== false);
    setFormShowFaq((prod as any).showFaq !== false);
    setFormShowRelatedProducts((prod as any).showRelatedProducts !== false);
    setFormShowCheckoutOptions((prod as any).showCheckoutOptions !== false);
    // Load dietary attributes (12B-5)
    const loadedDietary = Array.isArray((prod as any).dietaryAttributes)
      ? (prod as any).dietaryAttributes
      : null;
    if (loadedDietary) {
      const merged = DEFAULT_DIETARY_ATTRIBUTES.map((d) => {
        const match = loadedDietary.find((x: any) => x.key === d.key);
        return match ? { ...d, enabled: !!match.enabled, showOnStorefront: !!match.showOnStorefront } : { ...d };
      });
      for (const custom of loadedDietary.filter((x: any) => x.isCustom || !DEFAULT_DIETARY_ATTRIBUTES.some((d) => d.key === x.key))) {
        if (!merged.some((m) => m.key === custom.key)) {
          merged.push({ key: custom.key, label: custom.label || 'Custom', enabled: true, showOnStorefront: custom.showOnStorefront !== false, isCustom: true });
        }
      }
      setFormDietaryAttributes(merged);
    } else {
      setFormDietaryAttributes(DEFAULT_DIETARY_ATTRIBUTES.map((d) => ({ ...d })));
    }
    setFormCustomDietaryLabel('');
    setIsAddModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formSku.trim()) {
      setErrorMessage('Product name and SKU are mandatory.');
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage('');

      const parsedPrice = parseFloat(formPrice);
      const parsedMrp = parseFloat(formMrp);
      const parsedStock = parseInt(formStock, 10);
      const priceNum = Number.isFinite(parsedPrice) ? Math.max(0, parsedPrice) : 699;
      const mrpNum = Number.isFinite(parsedMrp) ? Math.max(0, parsedMrp) : Math.round(priceNum * 1.2);
      const stockNum = Number.isFinite(parsedStock) ? Math.max(0, parsedStock) : 20;

      const weightOptions: WeightOption[] = formSellingUnit === 'piece'
        ? [
            { label: '1 piece', weightKg: 0.1, price: priceNum, mrp: mrpNum, isDefault: true },
            { label: '2 pieces (Pack of 2)', weightKg: 0.2, price: Math.round(priceNum * 1.9), mrp: Math.round(mrpNum * 1.9) },
            { label: '4 pieces (Party Box)', weightKg: 0.4, price: Math.round(priceNum * 3.8), mrp: Math.round(mrpNum * 3.8) },
            { label: '6 pieces (Family Box)', weightKg: 0.6, price: Math.round(priceNum * 5.5), mrp: Math.round(mrpNum * 5.5) },
            { label: '12 pieces (Celebration Box)', weightKg: 1.2, price: Math.round(priceNum * 10), mrp: Math.round(mrpNum * 10) },
          ]
        : [
            { label: '0.5 kg (Serves 4-6)', weightKg: 0.5, price: priceNum, mrp: mrpNum },
            {
              label: '1.0 kg (Serves 8-10)',
              weightKg: 1.0,
              price: Math.round(priceNum * 1.85),
              mrp: Math.round(mrpNum * 1.85),
            },
            {
              label: '1.5 kg (Serves 12-14)',
              weightKg: 1.5,
              price: Math.round(priceNum * 2.7),
              mrp: Math.round(mrpNum * 2.7),
            },
            {
              label: '2.0 kg (Serves 16-20)',
              weightKg: 2.0,
              price: Math.round(priceNum * 3.5),
              mrp: Math.round(mrpNum * 3.5),
            },
          ];

      const prodId =
        editingProduct?.id ||
        `prod-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

      const slug = formName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');

      const productPayload: Product = {
        id: prodId,
        sku: formSku.trim(),
        name: formName.trim(),
        slug,
        shortDescription: formShortDesc.trim(),
        description: formDesc.trim() || formShortDesc.trim(),
        category: formCategory,
        tags: formTags.split(',').map((s) => s.trim()).filter(Boolean),
        flavours: formFlavours.split(',').map((s) => s.trim()).filter(Boolean),
        eggless: formEggless,
        sellingUnit: formSellingUnit,
        weightOptions,
        images: formImages.filter((i) => i.url && i.url.trim()).map((i) => ({
          url: i.url.trim(),
          thumbUrl: i.thumbUrl?.trim() || i.url.trim(),
          mediumUrl: i.mediumUrl?.trim() || i.url.trim(),
          alt: i.alt?.trim() || formName.trim(),
          caption: i.caption?.trim() || '',
          isPrimary: !!i.isPrimary,
        })),
        videos: formVideos.filter((v) => v.url && v.url.trim()).map((v) => ({
          url: v.url.trim(),
          posterUrl: v.posterUrl?.trim() || '',
          caption: v.caption?.trim() || '',
          isPrimary: !!v.isPrimary,
        })),
        rating: editingProduct?.rating ?? 0,
        reviewCount: editingProduct?.reviewCount ?? 0,
        stock: stockNum,
        stockStatus: stockNum > 0 ? 'in_stock' : 'out_of_stock',
        badges: formBadges.split(',').map((s) => s.trim()).filter(Boolean),
        published: formPublished,
        seoTitle: `${formName.trim()} | TVO Flavours Bakery`,
        seoDescription: formShortDesc.trim(),
        createdAt: editingProduct?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: user?.name || 'Chef Administrator',
      };

      try {
        const res = await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: editingProduct ? 'update' : 'create',
            id: editingProduct?.id,
            name: productPayload.name,
            sku: formSku,
            slug: productPayload.slug || undefined,
            regular_price: mrpNum,
            sale_price: priceNum,
            stock: stockNum,
            stock_status: stockNum > 0 ? 'in_stock' : 'out_of_stock',
            published: formPublished ? 1 : 0,
            category_id: categoryIdMap[formCategory] || undefined,
            short_description: productPayload.shortDescription,
            description: productPayload.description,
            eggless: formEggless ? 1 : 0,
            selling_unit: formSellingUnit,
            images_json: productPayload.images,
            variations_json: {
              attribute: 'Select Weight',
              options: weightOptions.map((w) => ({
                label: w.label,
                value: w.label,
                weightKg: w.weightKg ?? null,
                price: w.price,
                mrp: w.mrp ?? w.price,
              })),
            },
            flavours: productPayload.flavours,
            flavour_options_json: formFlavourOptions.filter(f => f.name.trim()).map(f => ({
              id: f.id,
              name: f.name,
              additionalPrice: f.additionalPrice,
              isDefault: f.isDefault,
              displayOrder: f.displayOrder,
              isActive: f.isActive,
              showOnStorefront: f.showOnStorefront,
            })),
            badges: productPayload.badges,
            tags: productPayload.tags,
            customization_fee: Number(formCustomizationFee) || 0,
            allow_custom_message: formAllowCustomMessage ? 1 : 0,
            allow_custom_design: formAllowCustomDesign ? 1 : 0,
            show_gallery: formShowGallery ? 1 : 0,
            show_video: formShowVideo ? 1 : 0,
            show_flavour: formShowFlavour ? 1 : 0,
            show_customize: formShowCustomize ? 1 : 0,
            show_design_upload: formShowDesignUpload ? 1 : 0,
            show_addons: formShowAddons ? 1 : 0,
            show_dietary: formShowDietary ? 1 : 0,
            show_delivery: formShowDelivery ? 1 : 0,
            show_special_instructions: formShowSpecialInstructions ? 1 : 0,
            show_ratings: formShowRatings ? 1 : 0,
            show_badges: formShowBadges ? 1 : 0,
            show_size_selector: formShowSizeSelector ? 1 : 0,
            show_delivery_date: formShowDeliveryDate ? 1 : 0,
            show_delivery_slot: formShowDeliverySlot ? 1 : 0,
            show_reviews: formShowReviews ? 1 : 0,
            show_faq: formShowFaq ? 1 : 0,
            show_related_products: formShowRelatedProducts ? 1 : 0,
            show_checkout_options: formShowCheckoutOptions ? 1 : 0,
            dietary_json: (formDietaryAttributes as DietaryAttribute[]).map((d) => ({
              key: d.key,
              label: d.label,
              enabled: d.enabled,
              showOnStorefront: d.showOnStorefront,
              isCustom: !!d.isCustom,
            })),
          }),
        });
        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody?.error || `Could not save product (${res.status}).`);
        }
      } catch (e: any) {
        setErrorMessage(e.message || 'Could not save product. Please try again.');
        setIsSaving(false);
        return;
      }

      await logAuditEvent({
        actorUid: user?.uid,
        actorName: user?.name,
        actorEmail: user?.email,
        action: editingProduct ? 'PRODUCT_UPDATE' : 'PRODUCT_CREATE',
        targetType: 'Product',
        targetId: prodId,
        details: `${editingProduct ? 'Updated' : 'Created'} recipe "${formName}" (SKU: ${formSku})`,
      });

      setIsAddModalOpen(false);
      onRefresh();
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to save product to database.');
    } finally {
      setIsSaving(false);
    }
  };

  // ---- Product Media (Phase 12B-6): image & video manager helpers ----

  const uploadMediaFile = async (file: File, kind: 'image' | 'video', folder?: string): Promise<string> => {
    const url = new URL('/api/admin/media', window.location.origin);
    url.searchParams.set('kind', kind);
    if (folder) url.searchParams.set('folder', folder);
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(url.toString(), { method: 'POST', body: formData });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `Could not upload ${kind} (${res.status}).`);
    return data.url;
  };

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const check = await validateImageFile(file);
    if (!check.valid) {
      setErrorMessage(check.error || 'Invalid image file.');
      return;
    }
    try {
      setIsImageUploading(true);
      setErrorMessage('');
      const uploadedUrl = await uploadMediaFile(file, 'image');
      setFormImages((prev) => {
        const next = [...prev, { url: uploadedUrl, isPrimary: prev.length === 0 }];
        if (!next.some((i) => i.isPrimary)) next[0] = { ...next[0], isPrimary: true };
        return next;
      });
      if (!formImageUrl || !formImages.length) setFormImageUrl(uploadedUrl);
    } catch (e: any) {
      setErrorMessage(e.message || 'Image upload failed.');
    } finally {
      setIsImageUploading(false);
    }
  };

  const handleAddImageByUrl = () => {
    const raw = formImageUrl.trim();
    if (!raw) return;
    const url = normalizeImageUrl(raw);
    if (!url) {
      setErrorMessage('Image URL is not valid.');
      return;
    }
    setFormImages((prev) => {
      const next = prev.some((i) => i.url === url) ? prev : [...prev, { url, isPrimary: prev.length === 0 }];
      if (!next.some((i) => i.isPrimary)) next[0] = { ...next[0], isPrimary: true };
      return next;
    });
    setFormImageUrl('');
  };

  const handleRemoveImage = async (index: number) => {
    const target = formImages[index];
    setFormImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length && !next.some((i) => i.isPrimary)) next[0] = { ...next[0], isPrimary: true };
      return next;
    });
    if (target?.url && target.url.startsWith('/uploads/')) {
      try {
        await fetch('/api/admin/media', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: target.url, kind: 'image' }),
        });
      } catch { /* orphan file cleanup is best-effort; DB already updated on save */ }
    }
  };

  const handleMoveImage = (index: number, dir: -1 | 1) => {
    setFormImages((prev) => {
      const to = index + dir;
      if (to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[to]] = [next[to], next[index]];
      return next;
    });
  };

  const handleSetPrimaryImage = (index: number) => {
    setFormImages((prev) => prev.map((img, i) => ({ ...img, isPrimary: i === index })));
  };

  const handleUpdateImage = (index: number, patch: Partial<ProductImage>) => {
    setFormImages((prev) => prev.map((img, i) => (i === index ? { ...img, ...patch } : img)));
  };

  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const check = await validateVideoFile(file);
    if (!check.valid) {
      setErrorMessage(check.error || 'Invalid video file.');
      return;
    }
    try {
      setIsVideoUploading(true);
      setErrorMessage('');
      const uploadedUrl = await uploadMediaFile(file, 'video');
      setFormVideos((prev) => [
        ...prev,
        { url: uploadedUrl, posterUrl: '', caption: '', isPrimary: prev.length === 0 },
      ]);
    } catch (e: any) {
      setErrorMessage(e.message || 'Video upload failed.');
    } finally {
      setIsVideoUploading(false);
    }
  };

  const handleAddVideoByUrl = (raw: string) => {
    const url = normalizeImageUrl(raw.trim());
    if (!url) {
      setErrorMessage('Video URL is not valid.');
      return;
    }
    setFormVideos((prev) => prev.some((v) => v.url === url)
      ? prev
      : [...prev, { url, posterUrl: '', caption: '', isPrimary: prev.length === 0 }]
    );
  };

  const handleRemoveVideo = async (index: number) => {
    const target = formVideos[index];
    setFormVideos((prev) => prev.filter((_, i) => i !== index));
    if (target?.url && target.url.startsWith('/uploads/product-videos/')) {
      try {
        await fetch('/api/admin/media', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: target.url, kind: 'video' }),
        });
      } catch { /* best-effort */ }
    }
  };

  const handleUpdateVideo = (index: number, patch: Partial<ProductVideo>) => {
    setFormVideos((prev) => prev.map((v, i) => (i === index ? { ...v, ...patch } : v)));
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    if (!isAdmin) {
      alert('Only users with the "admin" role are authorized to delete recipes.');
      return;
    }

    try {
      const res = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          id: productToDelete.id,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error || `Could not delete product (${res.status}).`);
      }

      await logAuditEvent({
        actorUid: user?.uid,
        actorName: user?.name,
        actorEmail: user?.email,
        action: 'PRODUCT_DELETE',
        targetType: 'Product',
        targetId: productToDelete.id,
        details: `Deleted product recipe "${productToDelete.name}" (SKU: ${productToDelete.sku})`,
      });

      setProductToDelete(null);
      onRefresh();
    } catch (e: any) {
      alert(e.message || 'Failed to delete product.');
    }
  };

  // Filtered list
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      searchQuery === '' ||
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === 'all' || p.category === selectedCategory;
    const matchesDietary =
      selectedDietary === 'all' ||
      (selectedDietary === 'eggless' && p.eggless) ||
      (selectedDietary === 'egg' && !p.eggless);

    return matchesSearch && matchesCategory && matchesDietary;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Search / Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border)] shadow-xs">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-[var(--text-main)]">
            Products & Recipe Catalog ({products.length})
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Manage artisan recipes, weight options, pricing, dietary tags, and live inventory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Hidden File Input for CSV */}
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                handleParseCsvFile(file);
                setIsImportModalOpen(true);
              }
              // reset input value so re-uploading same file triggers change
              e.target.value = '';
            }}
            className="hidden"
          />

          {/* Download Sample Template */}
          <button
            id="download-csv-template-btn"
            onClick={handleDownloadSampleCsv}
            type="button"
            title="Download CSV format template"
            className="px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--border)] text-[var(--text-main)] text-xs font-medium flex items-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-[var(--primary)]" />
            <span className="hidden sm:inline">CSV Template</span>
          </button>

          {/* Bulk Import CSV Button */}
          <button
            id="bulk-import-csv-btn"
            onClick={() => setIsImportModalOpen(true)}
            type="button"
            className="px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] hover:bg-[var(--border)] text-[var(--text-main)] text-xs font-medium flex items-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-[var(--primary)]" />
            <span>Bulk Import CSV</span>
          </button>

          {/* Add New Recipe Button */}
          <button
            id="add-new-recipe-btn"
            onClick={handleOpenAddModal}
            type="button"
            className="px-4 py-2.5 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold flex items-center gap-2 shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Recipe</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border)] shadow-xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full sm:min-w-[200px] min-w-0">
          <Search className="w-4 h-4 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by recipe name or SKU..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none font-medium"
        >
          <option value="all">All Categories</option>
          {INITIAL_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Dietary Filter */}
        <select
          value={selectedDietary}
          onChange={(e) => setSelectedDietary(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none font-medium"
        >
          <option value="all">All Dietary</option>
          <option value="eggless">100% Eggless</option>
          <option value="egg">Contains Egg</option>
        </select>
      </div>

      {/* Products Table */}
      <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--bg-subtle)]/70 text-[var(--text-subtle)] uppercase text-[10px] tracking-wider border-b border-[var(--border)]">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Image & Recipe Title</th>
                <th className="py-3.5 px-4 font-semibold">SKU & Category</th>
                <th className="py-3.5 px-4 font-semibold">Base Price (₹)</th>
                <th className="py-3.5 px-4 font-semibold">Dietary</th>
                <th className="py-3.5 px-4 font-semibold">Stock</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)] text-[var(--text-main)]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-[var(--text-muted)]">
                    No recipes found matching your search and filter criteria.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((prod) => (
                  <tr key={prod.id} className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                    {/* Image & Title */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg overflow-hidden bg-[var(--bg-subtle)] shrink-0 border border-[var(--border)]">
                          <img
                            src={
                              prod.images?.[0]?.thumbUrl ||
                              prod.images?.[0]?.url ||
                              'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=200&q=80'
                            }
                            alt={prod.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-bold text-[var(--text-main)] line-clamp-1">
                            {prod.name}
                          </div>
                          <div className="text-[11px] text-[var(--text-subtle)]">
                            {prod.weightOptions?.length || 1} weight sizes available
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* SKU & Category */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[11px] font-semibold text-[var(--primary)]">
                        {prod.sku}
                      </div>
                      <div className="text-[11px] text-[var(--text-muted)] capitalize">
                        {prod.category}
                      </div>
                    </td>

                    {/* Price */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold">
                        ₹{prod.weightOptions?.[0]?.price || prod.variations?.[0]?.price || prod.sale_price || prod.regular_price || 699}
                      </div>
                      {(prod.weightOptions?.[0]?.mrp || prod.variations?.[0]?.mrp || prod.regular_price) && (
                        <div className="text-[10px] text-[var(--text-subtle)] line-through">
                          MRP ₹{prod.weightOptions?.[0]?.mrp || prod.variations?.[0]?.mrp || prod.regular_price}
                        </div>
                      )}
                    </td>

                    {/* Dietary */}
                    <td className="py-3.5 px-4">
                      {prod.eggless ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--success-light)] text-[var(--success)] text-[10px] font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                          <span>100% Eggless</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--bg-subtle)] text-[var(--text-muted)] text-[10px] font-medium">
                          Contains Egg
                        </span>
                      )}
                    </td>

                    {/* Stock */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                          prod.stock > 10
                            ? 'text-[var(--text-main)] bg-[var(--bg-subtle)]'
                            : prod.stock > 0
                            ? 'text-amber-600 bg-amber-500/10'
                            : 'text-[var(--danger)] bg-[var(--danger-light)]'
                        }`}
                      >
                        {prod.stock} {prod.sellingUnit === 'piece' ? 'pcs in stock' : 'in stock'}
                      </span>
                    </td>

                    {/* Published */}
                    <td className="py-3.5 px-4">
                      {prod.published ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--success)] font-medium">
                          <Check className="w-3.5 h-3.5" /> Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[var(--text-subtle)]">
                          <X className="w-3.5 h-3.5" /> Draft
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(prod)}
                          className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors"
                          title="Edit Recipe"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setProductToDelete(prod)}
                          className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[var(--danger)] hover:bg-[var(--danger-light)] transition-colors"
                          title="Delete Recipe (Admin only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingProduct ? `Edit Recipe: ${editingProduct.name}` : 'Add New Cake Recipe'}
        subtitle="Configure recipe details, pricing, image URL, and dietary specifications"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-[var(--danger-light)] text-[var(--danger)] text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Cake Recipe Title *
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Royal Belgian Dark Truffle Cake"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                SKU (Stock Keeping Unit) *
              </label>
              <input
                type="text"
                value={formSku}
                onChange={(e) => setFormSku(e.target.value)}
                placeholder="CONF-TRUF-01"
                required
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Selling Unit
              </label>
              <select
                value={formSellingUnit}
                onChange={(e) => setFormSellingUnit(e.target.value as 'piece' | 'weight')}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none font-medium"
              >
                <option value="weight">By Weight (KG)</option>
                <option value="piece">By Piece</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none font-medium"
              >
                {INITIAL_CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                {formSellingUnit === 'piece' ? 'Base Price per Piece (₹)' : '0.5kg Base Price (₹)'}
              </label>
              <input
                type="number"
                value={formPrice}
                onChange={(e) => setFormPrice(e.target.value)}
                placeholder="699"
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                {formSellingUnit === 'piece' ? 'Regular MRP per Piece (₹)' : '0.5kg Regular MRP (₹)'}
              </label>
              <input
                type="number"
                value={formMrp}
                onChange={(e) => setFormMrp(e.target.value)}
                placeholder="849"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                {formSellingUnit === 'piece' ? 'Inventory Stock Count (Pieces)' : 'Inventory Stock Count (Units)'}
              </label>
              <input
                type="number"
                value={formStock}
                onChange={(e) => setFormStock(e.target.value)}
                placeholder="25"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Dietary Preference
              </label>
              <div className="flex items-center gap-4 mt-2">
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-main)] cursor-pointer">
                  <input
                    type="radio"
                    name="dietary"
                    checked={formEggless}
                    onChange={() => setFormEggless(true)}
                    className="accent-[var(--primary)]"
                  />
                  <span>100% Eggless (Vegetarian)</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-[var(--text-main)] cursor-pointer">
                  <input
                    type="radio"
                    name="dietary"
                    checked={!formEggless}
                    onChange={() => setFormEggless(false)}
                    className="accent-[var(--primary)]"
                  />
                  <span>Contains Egg</span>
                </label>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Short Summary Description
            </label>
            <input
              type="text"
              value={formShortDesc}
              onChange={(e) => setFormShortDesc(e.target.value)}
              placeholder="Signature 54% dark chocolate ganache enveloped in cacao sponge."
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Full Recipe & Artisan Description
            </label>
            <textarea
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              rows={3}
              placeholder="Detailed description of ingredients, layers, and pastry chef tasting notes..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Flavours (comma-separated)
              </label>
              <input
                type="text"
                value={formFlavours}
                onChange={(e) => setFormFlavours(e.target.value)}
                placeholder="Dark Chocolate, Hazelnut Truffle"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Badges (e.g. Bestseller, New)
              </label>
              <input
                type="text"
                value={formBadges}
                onChange={(e) => setFormBadges(e.target.value)}
                placeholder="Bestseller, Eggless, Chef's Special"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
          </div>

          <div className="space-y-4">
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 flex items-center gap-1.5">
              <ImageIcon2 className="w-3.5 h-3.5 text-violet-500" />
              Media — Images
            </label>

            {formImages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  No images yet. Upload a file or paste an image URL to add your first image.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {formImages.map((img, idx) => (
                  <div key={`img-${idx}-${img.url}`} className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-2 space-y-2">
                    <div className="flex items-start gap-2">
                      <img
                        src={img.url}
                        alt={img.alt || 'Product image'}
                        className="w-14 h-14 rounded-lg object-cover shrink-0 bg-[var(--bg-surface)]"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80'; }}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <input
                          type="text"
                          value={img.alt || ''}
                          onChange={(e) => handleUpdateImage(idx, { alt: e.target.value })}
                          placeholder="Alt text (accessibility & SEO)"
                          className="w-full px-2 py-1 text-[11px] rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        />
                        <input
                          type="text"
                          value={img.caption || ''}
                          onChange={(e) => handleUpdateImage(idx, { caption: e.target.value })}
                          placeholder="Caption (optional)"
                          className="w-full px-2 py-1 text-[11px] rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(idx)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
                          img.isPrimary ? 'bg-emerald-500/15 text-emerald-600' : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" /> {img.isPrimary ? 'Primary' : 'Set Primary'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, -1)}
                        disabled={idx === 0}
                        className="p-1 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ArrowLeft className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveImage(idx, 1)}
                        disabled={idx === formImages.length - 1}
                        className="p-1 rounded-lg bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ArrowRight className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="ml-auto p-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-main)] cursor-pointer hover:bg-[var(--bg-surface)]">
                <UploadIcon className="w-3.5 h-3.5" />
                {isImageUploading ? 'Uploading…' : 'Upload Image'}
                <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleImageFileUpload} disabled={isImageUploading} />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="url"
                value={formImageUrl}
                onChange={(e) => setFormImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/... — paste an image URL"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              <button
                type="button"
                onClick={handleAddImageByUrl}
                className="shrink-0 px-3 py-2 rounded-xl text-[11px] font-semibold bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90 transition"
              >
                Add Image
              </button>
            </div>
          </div>

          {/* Product Videos (12B-6) */}
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-indigo-500" />
              Media — Videos
              <span className="font-normal text-[var(--text-muted)]">(MP4/WEBM up to 50MB)</span>
            </label>

            {formShowVideo && formVideos.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--border)] p-6 text-center">
                <p className="text-xs text-[var(--text-muted)] mb-3">
                  This product has the video section enabled, but no video has been added yet.
                </p>
              </div>
            ) : null}

            {formVideos.length > 0 && (
              <div className="space-y-2">
                {formVideos.map((vid, idx) => (
                  <div key={`vid-${idx}-${vid.url}`} className="rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] p-2 space-y-2">
                    <div className="flex items-start gap-2">
                      <video
                        src={vid.url}
                        poster={vid.posterUrl || undefined}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-24 h-16 rounded-lg object-cover shrink-0 bg-[var(--bg-surface)]"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <input
                          type="url"
                          value={vid.posterUrl || ''}
                          onChange={(e) => handleUpdateVideo(idx, { posterUrl: e.target.value })}
                          placeholder="Poster image URL (optional)"
                          className="w-full px-2 py-1 text-[11px] rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        />
                        <input
                          type="text"
                          value={vid.caption || ''}
                          onChange={(e) => handleUpdateVideo(idx, { caption: e.target.value })}
                          placeholder="Video caption (optional)"
                          className="w-full px-2 py-1 text-[11px] rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveVideo(idx)}
                        className="p-1 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="px-1 text-[10px] text-[var(--text-muted)] truncate">{vid.url}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold bg-[var(--bg-subtle)] border border-[var(--border)] text-[var(--text-main)] cursor-pointer hover:bg-[var(--bg-surface)]">
                <UploadIcon className="w-3.5 h-3.5" />
                {isVideoUploading ? 'Uploading…' : 'Upload Video'}
                <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleVideoFileUpload} disabled={isVideoUploading} />
              </label>
              <input
                type="url"
                placeholder="https://cdn.example/... — paste a video URL"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddVideoByUrl((e.currentTarget as HTMLInputElement).value);
                    (e.currentTarget as HTMLInputElement).value = '';
                  }
                }}
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              <button
                type="button"
                onClick={(e) => {
                  const input = (e.currentTarget as HTMLButtonElement).parentElement?.querySelector('input[type="url"]') as HTMLInputElement | null;
                  handleAddVideoByUrl(input?.value || '');
                  if (input) input.value = '';
                }}
                className="shrink-0 px-3 py-2 rounded-xl text-[11px] font-semibold bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90 transition"
              >
                Add Video
              </button>
            </div>
          </div>

          {/* Flavour Options */}
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 flex items-center gap-1.5">
              <SparklesIcon className="w-3.5 h-3.5 text-amber-500" />
              Flavour Options (with pricing)
            </label>
            <div className="space-y-2">
              {formFlavourOptions.map((fo, idx) => (
                <div key={fo.id} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <input
                    type="checkbox"
                    checked={fo.isActive}
                    onChange={(e) => {
                      const updated = [...formFlavourOptions];
                      updated[idx] = { ...updated[idx], isActive: e.target.checked };
                      setFormFlavourOptions(updated);
                    }}
                    className="w-4 h-4 rounded accent-[var(--primary)]"
                    title="Active"
                  />
                  <input
                    type="checkbox"
                    checked={fo.showOnStorefront}
                    onChange={(e) => {
                      const updated = [...formFlavourOptions];
                      updated[idx] = { ...updated[idx], showOnStorefront: e.target.checked };
                      setFormFlavourOptions(updated);
                    }}
                    className="w-4 h-4 rounded accent-[var(--primary)]"
                    title="Show on Storefront"
                  />
                  <input
                    type="radio"
                    name="default-flavour"
                    checked={fo.isDefault}
                    onChange={() => {
                      const updated = formFlavourOptions.map((f, i) => ({ ...f, isDefault: i === idx }));
                      setFormFlavourOptions(updated);
                    }}
                    className="w-4 h-4 rounded accent-[var(--primary)]"
                    title="Default"
                  />
                  <input
                    type="text"
                    value={fo.name}
                    onChange={(e) => {
                      const updated = [...formFlavourOptions];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setFormFlavourOptions(updated);
                    }}
                    placeholder="Flavour name"
                    className="flex-1 px-2 py-1.5 text-xs rounded border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                  <input
                    type="number"
                    value={fo.additionalPrice}
                    onChange={(e) => {
                      const updated = [...formFlavourOptions];
                      updated[idx] = { ...updated[idx], additionalPrice: Number(e.target.value) || 0 };
                      setFormFlavourOptions(updated);
                    }}
                    placeholder="+₹"
                    min="0"
                    className="w-20 px-2 py-1.5 text-xs rounded border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                  <input
                    type="number"
                    value={fo.displayOrder}
                    onChange={(e) => {
                      const updated = [...formFlavourOptions];
                      updated[idx] = { ...updated[idx], displayOrder: Number(e.target.value) || 1 };
                      setFormFlavourOptions(updated);
                    }}
                    placeholder="Order"
                    min="1"
                    className="w-16 px-2 py-1.5 text-xs rounded border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                  />
                  {formFlavourOptions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setFormFlavourOptions(formFlavourOptions.filter((_, i) => i !== idx))}
                      className="p-1.5 text-[var(--text-muted)] hover:text-red-500 transition-colors"
                      title="Remove flavour"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setFormFlavourOptions([
                  ...formFlavourOptions,
                  { id: `flav-${Date.now()}`, name: '', additionalPrice: 0, isDefault: false, displayOrder: formFlavourOptions.length + 1, isActive: true, showOnStorefront: true }
                ])}
                className="w-full py-2 px-3 rounded-lg border-2 border-dashed border-[var(--border)] text-xs font-medium text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary-light)]/10 transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Flavour Option</span>
              </button>
            </div>
          </div>

          {/* Customization Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--border)]">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[var(--primary)]" />
                Customization Fee (₹)
              </label>
              <input
                type="number"
                value={formCustomizationFee}
                onChange={(e) => setFormCustomizationFee(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </div>
            <div className="flex items-center pt-6">
              <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer w-full">
                <input
                  type="checkbox"
                  checked={formAllowCustomMessage}
                  onChange={(e) => setFormAllowCustomMessage(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--primary)]"
                />
                <span>Allow custom message on cake</span>
              </label>
            </div>
            <div className="flex items-center pt-2">
              <label className="flex items-center gap-2 text-xs text-[var(--text-main)] cursor-pointer w-full">
                <input
                  type="checkbox"
                  checked={formAllowCustomDesign}
                  onChange={(e) => setFormAllowCustomDesign(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--primary)]"
                />
                <span>Allow customer design upload</span>
              </label>
            </div>
          </div>

          {/* Product Page Feature Toggles */}
          <div className="pt-4 border-t border-[var(--border)]">
            <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Settings className="w-3.5 h-3.5 text-[var(--primary)]" />
              Storefront Feature Controls (Show/Hide on Storefront)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { key: 'showGallery', label: 'Product Gallery', icon: ImageIcon2, state: formShowGallery, setState: setFormShowGallery },
                { key: 'showVideo', label: 'Product Video', icon: Menu, state: formShowVideo, setState: setFormShowVideo },
                { key: 'showRatings', label: 'Ratings & Reviews (count)', icon: Star, state: formShowRatings, setState: setFormShowRatings },
                { key: 'showBadges', label: 'Badges', icon: Award, state: formShowBadges, setState: setFormShowBadges },
                { key: 'showSizeSelector', label: 'Size Selector', icon: LayoutDashboard, state: formShowSizeSelector, setState: setFormShowSizeSelector },
                { key: 'showFlavour', label: 'Flavour Selector', icon: SparklesIcon, state: formShowFlavour, setState: setFormShowFlavour },
                { key: 'showCustomize', label: 'Customize Cake', icon: MessageSquare, state: formShowCustomize, setState: setFormShowCustomize },
                { key: 'showDesignUpload', label: 'Design Upload', icon: UploadIcon, state: formShowDesignUpload, setState: setFormShowDesignUpload },
                { key: 'showAddons', label: 'Add-ons', icon: Tag, state: formShowAddons, setState: setFormShowAddons },
                { key: 'showDietary', label: 'Dietary Info', icon: EyeIcon, state: formShowDietary, setState: setFormShowDietary },
                { key: 'showDelivery', label: 'Delivery Options', icon: Truck, state: formShowDelivery, setState: setFormShowDelivery },
                { key: 'showDeliveryDate', label: 'Delivery Date', icon: Calendar, state: formShowDeliveryDate, setState: setFormShowDeliveryDate },
                { key: 'showDeliverySlot', label: 'Delivery Slot', icon: Clock, state: formShowDeliverySlot, setState: setFormShowDeliverySlot },
                { key: 'showSpecialInstructions', label: 'Special Instructions', icon: Settings, state: formShowSpecialInstructions, setState: setFormShowSpecialInstructions },
                { key: 'showReviews', label: 'Reviews Tab', icon: Star, state: formShowReviews, setState: setFormShowReviews },
                { key: 'showFaq', label: 'FAQ', icon: HelpCircle, state: formShowFaq, setState: setFormShowFaq },
                { key: 'showRelatedProducts', label: 'Related Products', icon: Layers, state: formShowRelatedProducts, setState: setFormShowRelatedProducts },
                { key: 'showCheckoutOptions', label: 'Checkout Options', icon: ShoppingBag, state: formShowCheckoutOptions, setState: setFormShowCheckoutOptions },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between p-3 rounded-xl border bg-[var(--bg-surface)] cursor-pointer transition-all hover:border-[var(--border-strong)]">
                  <div className="flex items-center gap-2">
                    <item.icon className="w-4 h-4 text-[var(--primary)]" />
                    <span className="text-xs font-medium text-[var(--text-main)]">{item.label}</span>
                  </div>
                  <div className="relative w-10 h-6 rounded-full transition-colors cursor-pointer"
                    style={{ backgroundColor: item.state ? 'var(--primary)' : 'var(--border)' }}
                    onClick={() => item.setState(!item.state)}
                  >
                    <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
                      style={{ transform: item.state ? 'translateX(26px)' : 'translateX(0.5px)' }} />
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Dietary Attributes */}
          <div className="pt-4 border-t border-[var(--border)]">
            <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              Dietary Attributes
            </h4>
            <p className="text-[10px] text-[var(--text-muted)] mb-3">
              Enable attributes that apply to this product. Only enabled attributes with &ldquo;Show on Storefront&rdquo; checked appear as chips on the product page.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {formDietaryAttributes.map((attr, idx) => (
                <div key={attr.key} className="flex items-center justify-between gap-2 p-2.5 rounded-xl border bg-[var(--bg-surface)]">
                  <span className="text-xs font-semibold text-[var(--text-main)] truncate">{attr.label}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] cursor-pointer" title="Applies to this product">
                      <input
                        type="checkbox"
                        checked={attr.enabled}
                        onChange={(e) => {
                          const next = [...formDietaryAttributes];
                          next[idx] = { ...next[idx], enabled: e.target.checked };
                          setFormDietaryAttributes(next);
                        }}
                        className="w-3.5 h-3.5 rounded accent-[var(--primary)]"
                      />
                      Enabled
                    </label>
                    <label className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted)] cursor-pointer" title="Show chip on storefront">
                      <input
                        type="checkbox"
                        checked={attr.showOnStorefront}
                        onChange={(e) => {
                          const next = [...formDietaryAttributes];
                          next[idx] = { ...next[idx], showOnStorefront: e.target.checked };
                          setFormDietaryAttributes(next);
                        }}
                        className="w-3.5 h-3.5 rounded accent-[var(--primary)]"
                      />
                      Show
                    </label>
                    {attr.isCustom && (
                      <button
                        type="button"
                        onClick={() => {
                          const next = formDietaryAttributes.filter((_, i) => i !== idx);
                          setFormDietaryAttributes(next);
                        }}
                        className="text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                        aria-label={`Remove ${attr.label}`}
                        title="Remove this custom attribute"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <input
                type="text"
                value={formCustomDietaryLabel}
                onChange={(e) => setFormCustomDietaryLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const label = formCustomDietaryLabel.trim();
                    if (!label) return;
                    const key = `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
                    if (formDietaryAttributes.some((d) => d.key === key)) return;
                    setFormDietaryAttributes((prev) => [
                      ...prev,
                      { key, label, enabled: true, showOnStorefront: true, isCustom: true },
                    ]);
                    setFormCustomDietaryLabel('');
                  }
                }}
                placeholder="Add custom dietary attribute (e.g. Keto)"
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              <button
                type="button"
                onClick={() => {
                  const label = formCustomDietaryLabel.trim();
                  if (!label) return;
                  const key = `custom_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
                  if (formDietaryAttributes.some((d) => d.key === key)) return;
                  setFormDietaryAttributes((prev) => [
                    ...prev,
                    { key, label, enabled: true, showOnStorefront: true, isCustom: true },
                  ]);
                  setFormCustomDietaryLabel('');
                }}
                className="px-3 py-2 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-xs font-semibold text-[var(--text-main)] hover:border-[var(--primary)] transition-colors cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="product-published-checkbox"
              checked={formPublished}
              onChange={(e) => setFormPublished(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--primary)] cursor-pointer"
            />
            <label htmlFor="product-published-checkbox" className="text-xs font-semibold text-[var(--text-main)] cursor-pointer">
              Publish immediately to live customer storefront
            </label>
          </div>

          <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : editingProduct ? 'Update Recipe' : 'Create Recipe'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        title="Confirm Recipe Deletion"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            Are you sure you want to delete <strong className="text-[var(--text-main)]">{productToDelete?.name}</strong> (SKU: {productToDelete?.sku}) from the TVO Flavours catalog? This moves it to Trash (recoverable) and is recorded in the audit trail.
          </p>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              onClick={() => setProductToDelete(null)}
              className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)]"
            >
              Keep Recipe
            </button>
            <button
              onClick={handleDeleteProduct}
              className="px-4 py-2 rounded-xl bg-[var(--danger)] hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
            >
              Delete Recipe
            </button>
          </div>
        </div>
      </Modal>

      {/* CSV Bulk Import Modal */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          if (!isImporting) {
            setIsImportModalOpen(false);
            setImportFile(null);
            setParsedRows([]);
            setImportSummary(null);
          }
        }}
        title="Bulk Import Cake Inventory (CSV)"
        subtitle="Upload and parse a CSV spreadsheet to import or synchronize cake recipes in Firestore"
        maxWidth="4xl"
      >
        <div className="space-y-5">
          {/* File Upload / Dropzone or File Summary */}
          {!importFile ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  handleParseCsvFile(file);
                }
              }}
              className="border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] bg-[var(--bg-subtle)]/50 rounded-2xl p-8 text-center space-y-3 transition-colors"
            >
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] text-[var(--primary)] mx-auto flex items-center justify-center shadow-xs">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-main)]">
                  Drag and drop your Cake Inventory CSV file here
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">
                  Supports standard WooCommerce or TVO Flavours custom CSV headers (name, sku, category, price, mrp, stock, eggless, flavours, image_url, etc.)
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <FileUp className="w-4 h-4" />
                  <span>Browse CSV File</span>
                </button>

                <button
                  type="button"
                  onClick={handleDownloadSampleCsv}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] hover:bg-[var(--border)] text-[var(--text-main)] text-xs font-medium shadow-xs active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Download className="w-4 h-4 text-[var(--primary)]" />
                  <span>Download Sample CSV Template</span>
                </button>
              </div>
            </div>
          ) : isParsingCsv ? (
            <div className="p-8 text-center bg-[var(--bg-subtle)] rounded-2xl space-y-2">
              <RefreshCw className="w-6 h-6 text-[var(--primary)] animate-spin mx-auto" />
              <p className="text-xs font-medium text-[var(--text-main)]">Parsing CSV spreadsheet...</p>
            </div>
          ) : importSummary ? (
            /* Import Success Summary */
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl p-6 space-y-5">
              <div className={`flex items-center gap-3 p-4 rounded-xl border ${importSummary.failed > 0 ? 'bg-[var(--danger-light)] border-[var(--danger)]/20 text-[var(--danger)]' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600'}`}>
                {importSummary.failed > 0 ? <AlertCircle className="w-6 h-6 shrink-0" /> : <CheckCircle2 className="w-6 h-6 shrink-0" />}
                <div>
                  <h4 className="text-sm font-bold">{importSummary.failed > 0 ? `CSV Bulk Import Completed with ${importSummary.failed} error(s)` : 'CSV Bulk Import Complete!'}</h4>
                  <p className="text-xs mt-0.5 opacity-90">
                    {importSummary.failed > 0
                      ? 'Some rows could not be written to the catalog. Review the errors below.'
                      : 'Your cake catalog has been updated.'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-center">
                  <div className="text-xs text-[var(--text-muted)]">New Recipes Created</div>
                  <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
                    {importSummary.created}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-center">
                  <div className="text-xs text-[var(--text-muted)]">Existing Updated</div>
                  <div className="text-xl font-bold font-mono text-blue-600 mt-1">
                    {importSummary.updated}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-center">
                  <div className="text-xs text-[var(--text-muted)]">Skipped / Unchanged</div>
                  <div className="text-xl font-bold font-mono text-[var(--text-subtle)] mt-1">
                    {importSummary.skipped}
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)] text-center">
                  <div className="text-xs text-[var(--text-muted)]">Errors / Failed</div>
                  <div className="text-xl font-bold font-mono text-red-600 mt-1">
                    {importSummary.failed}
                  </div>
                </div>
              </div>

              {importSummary.errors.length > 0 && (
                <div className="p-3 rounded-xl bg-[var(--danger-light)] text-[var(--danger)] text-xs space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    <span>Row warnings encountered:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {importSummary.errors.map((err, i) => (
                      <li key={i}>
                        Row #{err.row}: {err.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-3 border-t border-[var(--border)] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setImportFile(null);
                    setParsedRows([]);
                    setImportSummary(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors cursor-pointer"
                >
                  Import Another CSV
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setImportFile(null);
                    setParsedRows([]);
                    setImportSummary(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                >
                  Done & View Catalog
                </button>
              </div>
            </div>
          ) : (
            /* Parsed Preview Table & Strategy Controls */
            <div className="space-y-4">
              {/* File Info Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-[var(--primary)]" />
                  <div>
                    <div className="text-xs font-bold text-[var(--text-main)]">{importFile.name}</div>
                    <div className="text-[11px] text-[var(--text-muted)]">
                      {(importFile.size / 1024).toFixed(1)} KB • {parsedRows.length} cake recipes detected
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setImportFile(null);
                    setParsedRows([]);
                  }}
                  className="text-xs font-semibold text-[var(--danger)] hover:underline cursor-pointer"
                >
                  Change File
                </button>
              </div>

              {/* Duplicate Strategy & Summary Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border)]">
                <div>
                  <label className="block text-xs font-bold text-[var(--text-main)] mb-1">
                    Duplicate Resolution Strategy
                  </label>
                  <p className="text-[11px] text-[var(--text-muted)] mb-2">
                    Action to take when a cake SKU or name already exists in Firestore.
                  </p>
                  <select
                    value={duplicateStrategy}
                    onChange={(e) => setDuplicateStrategy(e.target.value as DuplicateStrategy)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] font-medium focus:outline-none"
                  >
                    <option value="update">Update Existing Recipes (Overwrite prices & stock)</option>
                    <option value="skip">Skip Duplicates (Import new items only)</option>
                    <option value="create_new">Create as New (Generate distinct new recipe IDs)</option>
                  </select>
                </div>

                <div className="flex flex-col justify-center">
                  <div className="text-xs font-bold text-[var(--text-main)] mb-1.5">Parsed Breakdown</div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold border border-emerald-500/20">
                      {parsedRows.filter((r) => !r.isDuplicate && !r.hasErrors).length} New Recipes
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-600 font-bold border border-blue-500/20">
                      {parsedRows.filter((r) => r.isDuplicate && !r.hasErrors).length} Existing Matches
                    </span>
                    {parsedRows.some((r) => r.hasErrors) && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 font-bold border border-amber-500/20">
                        {parsedRows.filter((r) => r.hasErrors).length} Issues
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Search & Filter Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 w-full sm:min-w-[180px] min-w-0">
                  <Search className="w-3.5 h-3.5 text-[var(--text-subtle)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    placeholder="Search in parsed rows..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-subtle)] text-[var(--text-main)] focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('all')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      previewFilter === 'all'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    All ({parsedRows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('new')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      previewFilter === 'new'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    New ({parsedRows.filter((r) => !r.isDuplicate).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('update')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      previewFilter === 'update'
                        ? 'bg-[var(--primary)] text-white'
                        : 'bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    Existing ({parsedRows.filter((r) => r.isDuplicate).length})
                  </button>
                </div>
              </div>

              {/* Scrollable Preview Table */}
              <div className="border border-[var(--border)] rounded-xl overflow-hidden max-h-[300px] overflow-y-auto bg-[var(--bg-surface)]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[var(--bg-subtle)] text-[var(--text-subtle)] uppercase text-[10px] tracking-wider sticky top-0 border-b border-[var(--border)]">
                    <tr>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Recipe Name & SKU</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Price / MRP</th>
                      <th className="py-2.5 px-3">Dietary</th>
                      <th className="py-2.5 px-3">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {parsedRows
                      .filter((row) => {
                        const matchesFilter =
                          previewFilter === 'all' ||
                          (previewFilter === 'new' && !row.isDuplicate) ||
                          (previewFilter === 'update' && row.isDuplicate) ||
                          (previewFilter === 'error' && row.hasErrors);

                        const matchesSearch =
                          previewSearch === '' ||
                          row.name.toLowerCase().includes(previewSearch.toLowerCase()) ||
                          row.sku.toLowerCase().includes(previewSearch.toLowerCase());

                        return matchesFilter && matchesSearch;
                      })
                      .map((row, idx) => (
                        <tr key={idx} className="hover:bg-[var(--bg-subtle)]/40 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {row.hasErrors ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 text-[10px] font-bold">
                                Invalid
                              </span>
                            ) : row.isDuplicate ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 text-[10px] font-bold">
                                {duplicateStrategy === 'update'
                                  ? 'Update Existing'
                                  : duplicateStrategy === 'skip'
                                  ? 'Will Skip'
                                  : 'Clone as New'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                                New Recipe
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-[var(--text-main)] line-clamp-1">{row.name}</div>
                            <div className="font-mono text-[10px] text-[var(--primary)]">{row.sku}</div>
                          </td>
                          <td className="py-2.5 px-3 capitalize text-[var(--text-muted)]">{row.category}</td>
                          <td className="py-2.5 px-3 font-semibold text-[var(--text-main)]">
                            ₹{row.price}{' '}
                            <span className="text-[10px] text-[var(--text-subtle)] line-through font-normal">
                              ₹{row.mrp}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {row.eggless ? (
                              <span className="text-[10px] font-bold text-emerald-600">Eggless</span>
                            ) : (
                              <span className="text-[10px] text-[var(--text-muted)]">Egg</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 font-mono">{row.stock}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Progress Bar during Bulk Import */}
              {isImporting && (
                <div className="space-y-2 p-4 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border)]">
                  <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-main)]">
                    <span className="flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 text-[var(--primary)] animate-spin" />
                      Writing inventory to Firestore...
                    </span>
                    <span>{importProgress}%</span>
                  </div>
                  <div className="w-full bg-[var(--border)] h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-[var(--primary)] h-full transition-all duration-300 rounded-full"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Bottom Action Controls */}
              <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between gap-3">
                <div className="text-[11px] text-[var(--text-muted)]">
                  Ready to commit {parsedRows.filter((r) => !r.hasErrors).length} recipes to Firestore database.
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportFile(null);
                      setParsedRows([]);
                    }}
                    className="px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-medium text-[var(--text-main)] hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    id="confirm-csv-bulk-import-btn"
                    type="button"
                    disabled={isImporting || parsedRows.filter((r) => !r.hasErrors).length === 0}
                    onClick={handleBulkImportToFirestore}
                    className="px-5 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white text-xs font-semibold shadow-sm active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {isImporting
                        ? `Importing (${importProgress}%)...`
                        : `Import ${parsedRows.filter((r) => !r.hasErrors).length} Recipes to Firestore`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
