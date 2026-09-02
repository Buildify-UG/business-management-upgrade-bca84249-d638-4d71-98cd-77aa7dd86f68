import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Company, Product } from '@/types';
import { toast } from 'sonner';

interface Props {
  company: Company;
}

interface ProductWithStock extends Product {
  quantity?: number;
}

const ProductManager: React.FC<Props> = ({ company }) => {
  const [products, setProducts] = useState<ProductWithStock[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    unit: 'Unit',
    quantity: 0,
  });

  useEffect(() => {
    loadProducts();
  }, [company.id]);

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('company_id', company.id)
        .order('name');
      if (error) throw error;

      const productsWithStock = await Promise.all(
        (data || []).map(async (product) => {
          const { data: stockData } = await supabase
            .from('stock')
            .select('quantity')
            .eq('product_id', product.id)
            .single();
          return { ...product, quantity: stockData?.quantity || 0 };
        })
      );

      setProducts(productsWithStock);
    } catch (err) {
      toast.error('Error loading products');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('products')
          .update({ name: formData.name, code: formData.code, unit: formData.unit })
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Product updated');
      } else {
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert([{ name: formData.name, code: formData.code, unit: formData.unit, company_id: company.id }])
          .select()
          .single();
        if (error) throw error;

        if (formData.quantity > 0) {
          await supabase.from('stock').insert([{ product_id: newProduct.id, quantity: formData.quantity }]);
        }

        toast.success('Product created');
      }

      setFormData({ name: '', code: '', unit: 'Unit', quantity: 0 });
      setEditingId(null);
      setShowForm(false);
      loadProducts();
    } catch (err) {
      toast.error('Error saving product');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: ProductWithStock) => {
    setFormData({
      name: product.name,
      code: product.code,
      unit: product.unit,
      quantity: product.quantity || 0,
    });
    setEditingId(product.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await supabase.from('stock').delete().eq('product_id', id);
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      toast.success('Product deleted');
      loadProducts();
    } catch (err) {
      toast.error('Error deleting product');
    }
  };

  const updateStock = async (productId: string, newQuantity: number) => {
    try {
      const { error } = await supabase
        .from('stock')
        .update({ quantity: newQuantity })
        .eq('product_id', productId);
      if (error) throw error;
      loadProducts();
    } catch (err) {
      toast.error('Error updating stock');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-foreground">Products</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({ name: '', code: '', unit: 'Unit', quantity: 0 });
          }}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-md font-medium hover:bg-primary/90"
        >
          {showForm ? 'Cancel' : 'Add Product'}
        </button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Product Code/SKU *</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
                className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Unit</label>
                <input
                  type="text"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
              </div>
              {!editingId && (
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Opening Stock</label>
                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  />
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2 rounded-md font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Saving...' : editingId ? 'Update Product' : 'Create Product'}
            </button>
          </form>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Product Name</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Code</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Unit</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Stock</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b border-border hover:bg-muted/50">
                <td className="px-4 py-3 text-foreground">{product.name}</td>
                <td className="px-4 py-3 text-muted-foreground">{product.code}</td>
                <td className="px-4 py-3 text-muted-foreground">{product.unit}</td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    value={product.quantity || 0}
                    onChange={(e) => updateStock(product.id, parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 border border-border rounded bg-background text-foreground text-sm"
                  />
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleEdit(product)}
                    className="text-primary hover:underline mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {products.length === 0 && (
          <div className="px-4 py-8 text-center text-muted-foreground">No products found</div>
        )}
      </div>
    </div>
  );
};

export default ProductManager;
