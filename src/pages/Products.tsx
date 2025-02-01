import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Toaster, toast } from 'sonner';
import {
  Plus,
  Loader2,
  AlertCircle,
  Edit,
  Search,
  Trash2,
  Package,
  ArrowLeft,
  ArrowRight,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { SearchInput } from '@/components/SearchInput';
import { formatPrice } from '@/lib/utils';
import ConfirmDialog from '@/components/ConfirmDialog';

const productSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  price: z.number().min(0.01, 'Preço deve ser maior que zero'),
  category: z.enum(
    [
      'espetinho',
      'bebida',
      'acompanhamento',
      'comida',
      'diversos',
      'refeição',
      'salgados',
      'porcao',
      'doce',
      'sobremesa',
      'lanche'
    ],
    {
      required_error: 'Selecione uma categoria',
    }
  ),
});

type ProductFormData = z.infer<typeof productSchema>;

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

const ITEMS_PER_PAGE = 10;

const categoryLabels: Record<string, string> = {
  espetinho: 'Espetinho',
  bebida: 'Bebida',
  acompanhamento: 'Acompanhamento',
  refeição: 'Refeição',
  lanche: 'Lanche',
  porcao: 'Porção',
  diversos: 'Diversos',
  sobremesa: 'Sobremesa',
  doce: 'Doce',
  salgados: 'Salgados',
  comida: 'Comida'
};

const categoryColors: Record<string, string> = {
  espetinho: 'bg-red-100 text-red-800',
  bebida: 'bg-blue-100 text-blue-800',
  acompanhamento: 'bg-green-100 text-green-800',
  refeição: 'bg-yellow-100 text-yellow-800',
  lanche: 'bg-purple-100 text-purple-800',
  porcao: 'bg-orange-100 text-orange-800',
  diversos: 'bg-gray-100 text-gray-800',
  sobremesa: 'bg-pink-100 text-pink-800',
  doce: 'bg-rose-100 text-rose-800',
  salgados: 'bg-indigo-100 text-indigo-800',
  comida: 'bg-emerald-100 text-emerald-800'
};

export default function Products() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<number | null>(null);
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      category: 'espetinho',
    },
  });

  useEffect(() => {
    if (window.db) {
      setIsLoading(true);
      loadInitialData();
    }
  }, []);

  const loadInitialData = async () => {
    try {
      await queryClient.prefetchQuery({
        queryKey: ['products'],
        queryFn: () => window.db.getProducts(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => window.db.getProducts(),
  });

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const addProductMutation = useMutation({
    mutationFn: (product: ProductFormData) => window.db.addProduct(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto adicionado com sucesso!');
      reset();
      setIsNewOrderModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao adicionar produto: ${error.message}`);
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: (product: Product) => window.db.updateProduct(product),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Produto atualizado com sucesso!');
      setEditingProduct(null);
      reset();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao atualizar produto: ${error.message}`);
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: number) => window.db.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsDeleteDialogOpen(false);
      toast.success('Produto removido com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover produto: ${error.message}`);
    },
  });

  const onSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateProductMutation.mutate({ ...data, id: editingProduct.id });
    } else {
      addProductMutation.mutate(data);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setValue('name', product.name);
    setValue('price', product.price);
    setValue('category', product.category as any);
  };

  const handleDelete = (id: number) => {
    setProductToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProductMutation.mutate(productToDelete);
    }
  };

  if (!window.db) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Package className="w-16 h-16 text-gray-400 mb-4" />
        <p className="text-gray-600 font-medium">Este aplicativo deve ser executado no Electron.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-gray-600 font-medium">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <Toaster position="top-right" />
      
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
            <p className="text-gray-600 mt-1">Gerencie o catálogo de produtos do estabelecimento</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <SearchInput
              onSearch={setSearchTerm}
              placeholder="Pesquisar produtos..."
              className="w-full sm:w-80"
            />
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
            >
              <Plus size={20} />
              Novo Produto
            </button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Catálogo de Produtos</CardTitle>
          </CardHeader>
          <CardContent>
            {paginatedProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Search className="w-12 h-12 mb-3 text-gray-400" />
                <p className="text-lg font-medium text-gray-900 mb-1">Nenhum produto encontrado</p>
                <p className="text-gray-500">
                  {searchTerm
                    ? 'Tente ajustar sua pesquisa para encontrar o que está procurando'
                    : 'Comece adicionando seu primeiro produto ao catálogo'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Nome</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Categoria</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-600">Preço</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-600">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedProducts.map((product: Product) => (
                        <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                          <td className="py-3 px-4">
                            <span className="font-medium text-gray-900">{product.name}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${categoryColors[product.category]}`}>
                              {categoryLabels[product.category]}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-gray-900 font-medium">{formatPrice(product.price)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(product)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(product.id)}
                                className="bg-white border border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                  <p className="text-sm text-gray-500">
                    Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, filteredProducts.length)} de{' '}
                    {filteredProducts.length} produtos
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    <div className="flex gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className={currentPage === page ? 'bg-blue-600 text-white' : ''}
                        >
                          {page}
                        </Button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Próxima
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Novo/Editar Produto */}
      {(isNewOrderModalOpen || editingProduct) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingProduct ? 'Editar Produto' : 'Novo Produto'}
              </h3>
              <button
                onClick={() => {
                  setIsNewOrderModalOpen(false);
                  setEditingProduct(null);
                  reset();
                }}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Nome do Produto</label>
                  <input
                    {...register('name')}
                    className="w-full rounded-lg border border-gray-300 shadow-sm px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="Ex: Espetinho de Carne"
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Preço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('price', { valueAsNumber: true })}
                    className="w-full rounded-lg border border-gray-300 shadow-sm px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                  {errors.price && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.price.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Categoria</label>
                  <select
                    {...register('category')}
                    className="w-full rounded-lg border border-gray-300 shadow-sm px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.category.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewOrderModalOpen(false);
                    setEditingProduct(null);
                    reset();
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingProduct ? (
                    <Edit className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  {editingProduct ? 'Atualizar Produto' : 'Adicionar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={confirmDelete}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita."
        confirmText="Excluir Produto"
        variant="danger"
      />
    </div>
  );
}
