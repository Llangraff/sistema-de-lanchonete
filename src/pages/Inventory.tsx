import React, { useState, useEffect } from 'react';
import {
  Plus,
  AlertTriangle,
  Edit2,
  Trash2,
  Package,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  RefreshCw
} from 'lucide-react';
import { formatDate } from '../utils/database';
import { Button } from '@/components/ui/Button'; // Importa o componente Button atualizado

interface InventoryItem {
  id: number;
  product_id?: number | null;
  product_name?: string; // preenchido via backend com COALESCE(p.name, ii.manual_name)
  manual_name?: string;
  quantity: number;
  unit: string;
  min_quantity: number;
}

interface Transaction {
  id: number;
  quantity: number;
  type: string;
  description: string;
  created_at: string;
}

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Form state para adição manual de item no estoque
  const [newItem, setNewItem] = useState({
    manual_name: '',
    quantity: 0,
    unit: 'kg',
    min_quantity: 0,
  });

  const [updateQuantity, setUpdateQuantity] = useState({
    quantity: 0,
    type: 'entrada',
    description: '',
  });

  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

  useEffect(() => {
    loadInventory();
    loadLowStockItems();
  }, []);

  const loadInventory = async () => {
    if (!window.db) return;
    const fetchedItems = await window.db.getInventoryItems();
    setItems(fetchedItems);
  };

  const loadLowStockItems = async () => {
    if (!window.db) return;
    const fetchedItems = await window.db.getLowStockItems();
    setLowStockItems(fetchedItems);
  };

  const loadTransactions = async (itemId: number) => {
    if (!window.db) return;
    const fetchedTransactions = await window.db.getInventoryTransactions(itemId);
    setTransactions(fetchedTransactions);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.db) return;
    if (newItem.manual_name.trim() === '') {
      alert("Digite o nome do item.");
      return;
    }
    await window.db.addInventoryItem(newItem);
    setNewItem({ manual_name: '', quantity: 0, unit: 'kg', min_quantity: 0 });
    setIsAddModalOpen(false);
    loadInventory();
    loadLowStockItems();
  };

  const handleUpdateQuantity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.db || !selectedItem) return;
    // Para "entrada", inverte o sinal; para "saída", mantém positivo.
    const quantity = updateQuantity.type === 'entrada'
      ? -Math.abs(updateQuantity.quantity)
      : Math.abs(updateQuantity.quantity);
    await window.db.updateInventoryQuantity({
      id: selectedItem.id,
      quantity,
      type: updateQuantity.type,
      description: updateQuantity.description,
    });
    setUpdateQuantity({ quantity: 0, type: 'entrada', description: '' });
    setIsUpdateModalOpen(false);
    loadInventory();
    loadLowStockItems();
    if (selectedItem) {
      loadTransactions(selectedItem.id);
    }
  };

  const handleEditItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem || !window.db) return;
    await window.db.updateInventoryItem({
      id: editItem.id,
      unit: editItem.unit,
      min_quantity: editItem.min_quantity,
    });
    setIsEditModalOpen(false);
    if (selectedItem && selectedItem.id === editItem.id) {
      setSelectedItem(editItem);
    }
    setEditItem(null);
    loadInventory();
    loadLowStockItems();
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete || !window.db) return;
    await window.db.deleteInventoryItem(itemToDelete.id);
    setIsDeleteModalOpen(false);
    setItemToDelete(null);
    if (selectedItem && selectedItem.id === itemToDelete.id) {
      setSelectedItem(null);
      setTransactions([]);
    }
    loadInventory();
    loadLowStockItems();
  };

  const openEditModal = (item: InventoryItem) => {
    setEditItem(item);
    setIsEditModalOpen(true);
  };

  const openDeleteModal = (item: InventoryItem) => {
    setItemToDelete(item);
    setIsDeleteModalOpen(true);
  };

  const refreshInventory = () => {
    loadInventory();
    loadLowStockItems();
  };

  const filteredItems = items
    .filter(item =>
      (item.product_name || item.manual_name || "").toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterUnit ? item.unit === filterUnit : true)
    )
    .sort((a, b) => {
      const factor = sortOrder === 'asc' ? 1 : -1;
      const nameA = a.product_name || a.manual_name || "";
      const nameB = b.product_name || b.manual_name || "";
      if (sortBy === 'name') {
        return nameA.localeCompare(nameB) * factor;
      }
      return (a.quantity - b.quantity) * factor;
    });

  const uniqueUnits = Array.from(new Set(items.map(item => item.unit)));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Package className="h-8 w-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Controle de Estoque</h1>
            <p className="text-sm text-gray-500">Gerencie seus produtos e insumos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus className="h-5 w-5" />
            Novo Item
          </button>
          <button
            onClick={refreshInventory}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            title="Atualizar Estoque"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Alertas de Estoque Baixo */}
      {lowStockItems.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-100 p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-yellow-100 p-2 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-yellow-800">
                Itens com Estoque Baixo
              </h2>
              <p className="text-sm text-yellow-600">
                {lowStockItems.length} {lowStockItems.length === 1 ? 'item precisa' : 'itens precisam'} de reposição
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {lowStockItems.map(item => (
              <div
                key={item.id}
                className="bg-white bg-opacity-50 p-4 rounded-lg border border-yellow-100"
              >
                <h3 className="font-medium text-yellow-900">
                  {item.product_name || item.manual_name}
                </h3>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm text-yellow-700">
                    Atual: {item.quantity} {item.unit}
                  </span>
                  <span className="text-sm text-yellow-600">
                    Mínimo: {item.min_quantity} {item.unit}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-yellow-100 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full"
                      style={{
                        width: `${Math.min((item.quantity / item.min_quantity) * 100, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros e Busca */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar itens..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterUnit}
              onChange={e => setFilterUnit(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Todas as unidades</option>
              {uniqueUnits.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
              <button
                onClick={() => {
                  if (sortBy === 'name') {
                    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('name');
                    setSortOrder('asc');
                  }
                }}
                className={`p-1.5 rounded ${sortBy === 'name' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
              >
                <Filter className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  if (sortBy === 'quantity') {
                    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortBy('quantity');
                    setSortOrder('desc');
                  }
                }}
                className={`p-1.5 rounded ${sortBy === 'quantity' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:bg-gray-100'}`}
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lista de Itens */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Itens em Estoque</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredItems.map(item => (
              <div
                key={item.id}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${selectedItem?.id === item.id ? 'bg-blue-50' : ''}`}
                onClick={() => {
                  setSelectedItem(item);
                  loadTransactions(item.id);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${item.quantity <= item.min_quantity ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        <Package className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {item.product_name || item.manual_name}
                        </h3>
                        <div className="flex items-center gap-4 mt-1">
                          <span className="text-sm text-gray-500">
                            Quantidade: {item.quantity} {item.unit}
                          </span>
                          <span className="text-sm text-gray-500">
                            Mínimo: {item.min_quantity} {item.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedItem(item);
                        setUpdateQuantity({ ...updateQuantity, type: 'entrada' });
                        setIsUpdateModalOpen(true);
                      }}
                      className="p-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                      title="Entrada"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedItem(item);
                        setUpdateQuantity({ ...updateQuantity, type: 'saida' });
                        setIsUpdateModalOpen(true);
                      }}
                      className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      title="Saída"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        openEditModal(item);
                      }}
                      className="p-2 text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    {(item.product_id === null || item.product_id === undefined) && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={e => {
                          e.stopPropagation();
                          openDeleteModal(item);
                        }}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {filteredItems.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                Nenhum item encontrado
              </div>
            )}
          </div>
        </div>

        {/* Histórico de Movimentações */}
        {selectedItem ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Histórico de Movimentações
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedItem.product_name || selectedItem.manual_name} - Atual: {selectedItem.quantity} {selectedItem.unit}
              </p>
            </div>
            <div className="p-6 space-y-4">
              {transactions.map(transaction => (
                <div
                  key={transaction.id}
                  className={`p-4 rounded-lg border ${transaction.type === 'entrada' ? 'border-green-100 bg-green-50' : 'border-red-100 bg-red-50'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${transaction.type === 'entrada' ? 'bg-green-100' : 'bg-red-100'}`}>
                        {transaction.type === 'entrada' ? (
                          <ArrowUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDown className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <span className={`text-sm font-medium ${transaction.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'entrada' ? 'Entrada' : 'Saída'}: {Math.abs(transaction.quantity)} {selectedItem.unit}
                        </span>
                        <p className="text-sm text-gray-600 mt-1">
                          {transaction.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(new Date(transaction.created_at))}
                    </span>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  Nenhuma movimentação registrada
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg border border-gray-200 border-dashed p-8 flex flex-col items-center justify-center text-center">
            <Package className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecione um Item
            </h3>
            <p className="text-gray-500">
              Clique em um item para ver seu histórico de movimentações
            </p>
          </div>
        )}
      </div>

      {/* Modal para adicionar novo item */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Adicionar Novo Item no Estoque</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Item
                </label>
                <input
                  type="text"
                  value={newItem.manual_name}
                  onChange={e =>
                    setNewItem({ ...newItem, manual_name: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-200 p-2.5"
                  placeholder="Digite o nome do item"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade Inicial
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.quantity}
                  onChange={e =>
                    setNewItem({ ...newItem, quantity: parseFloat(e.target.value) })
                  }
                  className="w-full rounded-lg border-gray-200 p-2.5"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade
                </label>
                <select
                  value={newItem.unit}
                  onChange={e =>
                    setNewItem({ ...newItem, unit: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-200 p-2.5"
                  required
                >
                  <option value="kg">Quilogramas (kg)</option>
                  <option value="g">Gramas (g)</option>
                  <option value="l">Litros (l)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="un">Unidades (un)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade Mínima
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.min_quantity}
                  onChange={e =>
                    setNewItem({ ...newItem, min_quantity: parseFloat(e.target.value) })
                  }
                  className="w-full rounded-lg border-gray-200 p-2.5"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para movimentar estoque (entrada/saída) */}
      {isUpdateModalOpen && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">
              Movimentar Estoque - {selectedItem.product_name || selectedItem.manual_name}
            </h3>
            <form onSubmit={handleUpdateQuantity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Movimentação
                </label>
                <select
                  value={updateQuantity.type}
                  onChange={e =>
                    setUpdateQuantity({ ...updateQuantity, type: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-200 p-2.5"
                  required
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={updateQuantity.quantity}
                  onChange={e =>
                    setUpdateQuantity({ ...updateQuantity, quantity: parseFloat(e.target.value) })
                  }
                  className="w-full rounded-lg border-gray-200 p-2.5"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={updateQuantity.description}
                  onChange={e =>
                    setUpdateQuantity({ ...updateQuantity, description: e.target.value })
                  }
                  className="w-full rounded-lg border-gray-200 p-2.5"
                  rows={3}
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsUpdateModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Atualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal para editar item */}
      {isEditModalOpen && editItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">
              Editar Item - {editItem.product_name || editItem.manual_name}
            </h3>
            <form onSubmit={handleEditItemSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unidade
                </label>
                <select
                  value={editItem.unit}
                  onChange={e => setEditItem({ ...editItem, unit: e.target.value })}
                  className="w-full rounded-lg border-gray-200 p-2.5"
                  required
                >
                  <option value="kg">Quilogramas (kg)</option>
                  <option value="g">Gramas (g)</option>
                  <option value="l">Litros (l)</option>
                  <option value="ml">Mililitros (ml)</option>
                  <option value="un">Unidades (un)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade Mínima
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editItem.min_quantity}
                  onChange={e => setEditItem({ ...editItem, min_quantity: parseFloat(e.target.value) })}
                  className="w-full rounded-lg border-gray-200 p-2.5"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditItem(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de confirmação para exclusão (apenas para itens manuais) */}
      {isDeleteModalOpen && itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Excluir Item</h3>
            <p className="mb-4">
              Tem certeza que deseja excluir o item <strong>{itemToDelete.product_name || itemToDelete.manual_name}</strong>? Essa ação não poderá ser desfeita.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                className="px-4 py-2 text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
