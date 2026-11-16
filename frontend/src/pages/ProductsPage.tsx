import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Product } from '../types';
import { useAuth } from '../context/AuthContext';
import { useInventoryData } from '../context/InventoryDataContext';
import { formatCurrency, getCurrencySymbol } from '../lib/currency';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import {
  Plus,
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  Edit2,
  Archive,
  RotateCcw,
  AlertCircle,
  Package,
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const { products: storeProducts, invalidate } = useInventoryData();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const isAdmin = user?.role === 'ADMIN';

  const [products, setProducts] = useState<Product[]>(storeProducts);
  const [isLoading, setIsLoading] = useState(() => storeProducts.length === 0);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [showArchived, setShowArchived] = useState(false);

  // Modal states
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Form state
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    unitOfMeasure: 'PCS',
    costPrice: 0,
    sellingPrice: 0,
    reorderPoint: 10,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // CSV Import state
  const [csvText, setCsvText] = useState('');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvSuccess, setCsvSuccess] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory !== 'ALL') params.append('category', selectedCategory);
      params.append('isActive', showArchived ? 'false' : 'true');

      const res = await api.get<{ products: Product[] }>(`/products?${params.toString()}`);
      setProducts(res.products);
      if (!search && selectedCategory === 'ALL' && !showArchived) {
        sessionStorage.setItem('astrava_cache_products', JSON.stringify(res.products));
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, showArchived]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      sku: '',
      name: '',
      description: '',
      category: 'General',
      unitOfMeasure: 'PCS',
      costPrice: 0,
      sellingPrice: 0,
      reorderPoint: 10,
    });
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category: product.category,
      unitOfMeasure: product.unitOfMeasure,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      reorderPoint: product.reorderPoint,
    });
    setFormError(null);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, formData);
      } else {
        await api.post('/products', formData);
      }
      setIsProductModalOpen(false);
      await invalidate('products');
      fetchProducts();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to save product');
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchiveProduct = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to archive SKU "${product.sku}"? Active orders or historical ledger entries will be preserved.`)) {
      return;
    }
    try {
      await api.delete(`/products/${product.id}`);
      await invalidate('products');
      fetchProducts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to archive product');
    }
  };

  const handleRestoreProduct = async (product: Product) => {
    try {
      await api.patch(`/products/${product.id}/restore`);
      await invalidate('products');
      fetchProducts();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to restore product');
    }
  };

  const handleCsvExport = async () => {
    try {
      const csv = await api.get<string>('/products/export-csv');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory_products_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to export CSV: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleCsvImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsImporting(true);
    setCsvError(null);
    setCsvSuccess(null);

    try {
      const res = await api.post<{ message: string }>('/products/import-csv', {
        csvData: csvText,
      });
      setCsvSuccess(res.message);
      setCsvText('');
      await invalidate('products');
      fetchProducts();
    } catch (err: unknown) {
      setCsvError(err instanceof Error ? err.message : 'CSV import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Derive unique categories
  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Product Catalog</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage SKUs, categories, pricing, and reorder thresholds.
          </p>
        </div>
        {isManagerOrAdmin && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCsvExport}
              icon={<Download className="h-3.5 w-3.5" />}
            >
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCsvError(null);
                setCsvSuccess(null);
                setIsCsvModalOpen(true);
              }}
              icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
            >
              Import CSV
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={openCreateModal}
              icon={<Plus className="h-3.5 w-3.5" />}
            >
              Add Product
            </Button>
          </div>
        )}
      </div>

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by SKU, product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </form>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <Button
              variant={showArchived ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="text-xs"
            >
              {showArchived ? 'Showing Archived SKUs' : 'View Archived SKUs'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Products Table */}
      <Card>
        {isLoading ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            Loading product catalog...
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <Package className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            {showArchived
              ? 'No archived products found.'
              : 'No active products found matching the criteria.'}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 -my-5">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">SKU / Item</th>
                  <th className="py-3 px-4 font-semibold">Category</th>
                  <th className="py-3 px-4 font-semibold">UOM</th>
                  <th className="py-3 px-4 font-semibold text-right">Cost Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Selling Price</th>
                  <th className="py-3 px-4 font-semibold text-right">Margin</th>
                  <th className="py-3 px-4 font-semibold text-right">On Hand</th>
                  <th className="py-3 px-4 font-semibold text-right">Available</th>
                  <th className="py-3 px-4 font-semibold text-center">Status</th>
                  {isManagerOrAdmin && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {products.map((p) => {
                  const available = p.totalAvailable ?? 0;
                  const isLow = available <= p.reorderPoint;
                  const marginPct =
                    p.sellingPrice > 0
                      ? Math.round(((p.sellingPrice - p.costPrice) / p.sellingPrice) * 100)
                      : 0;

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white block tabular-nums">{p.sku}</span>
                        <span className="text-slate-400 text-[11px] block">{p.name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="default" size="sm">
                          {p.category}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{p.unitOfMeasure}</td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-300">
                        {formatCurrency(p.costPrice, user?.currency)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-200 font-medium">
                        {formatCurrency(p.sellingPrice, user?.currency)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-emerald-400 font-medium">
                        {marginPct}%
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-slate-300">
                        {p.totalOnHand ?? 0}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums font-semibold text-white">
                        {available}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!p.isActive ? (
                          <Badge variant="default" size="sm">
                            Archived
                          </Badge>
                        ) : available === 0 ? (
                          <Badge variant="danger" size="sm">
                            Out of Stock
                          </Badge>
                        ) : isLow ? (
                          <Badge variant="warning" size="sm">
                            Low Stock
                          </Badge>
                        ) : (
                          <Badge variant="success" size="sm">
                            In Stock
                          </Badge>
                        )}
                      </td>
                      {isManagerOrAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(p)}
                              className="p-1 rounded text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
                              title="Edit product"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            {isAdmin && (
                              p.isActive ? (
                                <button
                                  onClick={() => handleArchiveProduct(p)}
                                  className="p-1 rounded text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
                                  title="Archive SKU"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleRestoreProduct(p)}
                                  className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                                  title="Restore SKU"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              )
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={editingProduct ? 'Edit Product Details' : 'Create New Product SKU'}
        description="Fill in product specifications, pricing, and reorder point threshold."
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                SKU Identifier *
              </label>
              <input
                type="text"
                required
                disabled={!!editingProduct}
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. SKU-IND-9001"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 tabular-nums uppercase disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category *</label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Power Tools"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Industrial High-Torque Impact Driver"
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Specification details, materials, warranty notes..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Unit of Measure</label>
              <input
                type="text"
                value={formData.unitOfMeasure}
                onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value.toUpperCase() })}
                placeholder="PCS, BOXES, KG"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-blue-500 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Cost Price ({getCurrencySymbol(user?.currency)}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.costPrice || ''}
                onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 tabular-nums focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Selling Price ({getCurrencySymbol(user?.currency)}) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={formData.sellingPrice || ''}
                onChange={(e) => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 tabular-nums focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Safety Reorder Point *
            </label>
            <input
              type="number"
              min="0"
              required
              value={formData.reorderPoint}
              onChange={(e) => setFormData({ ...formData, reorderPoint: parseInt(e.target.value, 10) || 0 })}
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 tabular-nums focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Triggers low-stock warnings when available inventory across all locations drops below this level.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsProductModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
            >
              {editingProduct ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Bulk CSV Import Modal */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        title="Bulk Import Products via CSV"
        description="Paste raw CSV text below. Header must contain: sku, name, category, cost_price, selling_price, reorder_point"
      >
        <form onSubmit={handleCsvImport} className="space-y-4">
          {csvError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{csvError}</span>
            </div>
          )}

          {csvSuccess && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              {csvSuccess}
            </div>
          )}

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-mono">
            <span className="text-slate-500 block mb-1 font-sans font-semibold">Example Format:</span>
            sku,name,category,unit_of_measure,cost_price,selling_price,reorder_point<br />
            SKU-TOOL-001,Drill Bit Set,Tools,SET,15.50,29.99,10<br />
            SKU-TOOL-002,Hex Wrench,Tools,PCS,4.20,8.99,25
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Raw CSV Content *
            </label>
            <textarea
              rows={6}
              required
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="sku,name,category,cost_price,selling_price..."
              className="w-full bg-slate-900 border border-slate-700/80 rounded-lg p-2.5 text-xs text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCsvModalOpen(false)}
            >
              Close
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isImporting}
              icon={<FileSpreadsheet className="h-3.5 w-3.5" />}
            >
              Parse & Import
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
