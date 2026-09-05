'use client';

import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { Product, WeightOption, DuplicateStrategy, ImportSummary } from '../../lib/types';
import { logAuditEvent } from '../../lib/audit';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../common/Modal';
import { INITIAL_CATEGORIES } from '../../lib/seedData';

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
  const [formPublished, setFormPublished] = useState(true);

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

        chunk.forEach(async (row, chunkIdx) => {
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
              rating: 4.9,
              reviewCount: 1,
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

            await fetch('/api/admin/products', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: isUpdating ? 'update' : 'create',
                id: isUpdating ? row.existingId : undefined,
                name: productPayload.name,
                sku: row.sku,
                slug,
                regular_price: row.price,
                sale_price: row.mrp,
                stock: row.stock,
                published: row.published ? 1 : 0,
                short_description: productPayload.shortDescription,
                description: productPayload.description,
                eggless: row.eggless ? 1 : 0,
                flavours: productPayload.flavours,
                badges: productPayload.badges,
                tags: productPayload.tags,
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
              }),
            }).catch(() => {});

            if (isUpdating) {
              updatedCount++;
            } else {
              createdCount++;
            }
          } catch (itemErr: any) {
            failedCount++;
            errorsList.push({
              row: overallIndex,
              reason: itemErr?.message || 'Error formulating batch update',
            });
          }
        });

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
    setFormPublished(true);
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
    setFormPublished(prod.published);
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

      const priceNum = parseFloat(formPrice) || 699;
      const mrpNum = parseFloat(formMrp) || Math.round(priceNum * 1.2);
      const stockNum = parseInt(formStock, 10) || 20;

      const weightOptions: WeightOption[] = [
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
        weightOptions,
        images: [
          {
            url: formImageUrl.trim(),
            thumbUrl: formImageUrl.trim(),
            mediumUrl: formImageUrl.trim(),
            alt: formName.trim(),
          },
        ],
        rating: editingProduct?.rating || 4.9,
        reviewCount: editingProduct?.reviewCount || 1,
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
            regular_price: productPayload.regularPrice,
            sale_price: productPayload.salePrice,
            stock: stockNum,
            stock_status: stockNum > 0 ? 'in_stock' : 'out_of_stock',
            published: formPublished ? 1 : 0,
            category_id: (editingProduct as any)?.category_id ? Number((editingProduct as any).category_id) : undefined,
            short_description: productPayload.shortDescription,
            description: productPayload.description,
            eggless: formEggless ? 1 : 0,
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
            badges: productPayload.badges,
            tags: productPayload.tags,
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

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    if (!isAdmin) {
      alert('Only users with the "admin" role are authorized to delete recipes.');
      return;
    }

    try {
      try {
        await fetch('/api/admin/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'delete',
            id: productToDelete.id,
          }),
        });
      } catch (e) {}

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
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase());
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
        <div className="relative flex-1 min-w-[200px]">
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
                        {prod.stock} in stock
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                0.5kg Base Price (₹)
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
                0.5kg Regular MRP (₹)
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
                Inventory Stock Count
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

          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Image URL
            </label>
            <input
              type="url"
              value={formImageUrl}
              onChange={(e) => setFormImageUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
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
            Are you sure you want to delete <strong className="text-[var(--text-main)]">{productToDelete?.name}</strong> (SKU: {productToDelete?.sku}) from the TVO Flavours catalog? This action is permanent and recorded in the audit trail.
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
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold">CSV Bulk Import Complete!</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Your cake catalog has been updated in Firestore database.
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
                <div className="relative flex-1 min-w-[180px]">
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
