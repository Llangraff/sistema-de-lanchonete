import React, { useState, useEffect, useMemo } from 'react';
import Tesseract from 'tesseract.js';
import {
  Package,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  Trash2,
  Plus,
  Download,
  Upload,
  FileText,
  Clock,
  Tag,
  Settings
} from 'lucide-react';
import { formatDate } from '../utils/database';

// Types
interface InventoryItem {
  id: number;
  product_id?: number | null;
  product_name?: string;
  manual_name?: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  disable_low_stock_alert?: number;
  category?: string;
  location?: string;
  last_updated?: string;
  expiry_date?: string;
  supplier?: string;
  cost?: number;
}

interface InventoryTransaction {
  id: number;
  quantity: number;
  type: string;
  description: string;
  created_at: string;
  user?: string;
  reference?: string;
  cost?: number;
}

interface StockAlert {
  type: 'low' | 'expiring' | 'overstock';
  message: string;
  items: InventoryItem[];
}

const UNITS = [
  { value: 'kg', label: 'Quilogramas (kg)' },
  { value: 'g', label: 'Gramas (g)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'un', label: 'Unidades (un)' },
  { value: 'cx', label: 'Caixas (cx)' },
  { value: 'pc', label: 'Peças (pc)' },
  { value: 'mt', label: 'Metros (mt)' }
];

const CATEGORIES = [
  'Matéria-prima',
  'Produto acabado',
  'Embalagem',
  'Material de consumo',
  'Equipamento',
  'Outros'
];

export default function Inventory() {
  // Main state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);

  // Filters and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnit, setFilterUnit] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'quantity' | 'updated'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: '',
    end: ''
  });

  // Modal states (inclui 'invoice')
  const [activeModal, setActiveModal] = useState<
    'add' | 'edit' | 'delete' | 'move' | 'import' | 'export' | 'invoice' | null
  >(null);

  // Form states
  const [newItem, setNewItem] = useState({
    manual_name: '',
    quantity: 0,
    unit: 'un',
    min_quantity: 0,
    category: '',
    location: '',
    supplier: '',
    cost: 0,
    expiry_date: ''
  });

  const [moveQuantity, setMoveQuantity] = useState({
    quantity: 0,
    type: 'entrada',
    description: '',
    reference: '',
    cost: 0
  });

  // Estado para Nota Fiscal
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [invoiceProcessing, setInvoiceProcessing] = useState(false);

  // Load data
  useEffect(() => {
    loadInventory();
    loadAlerts();
  }, []);

  const loadInventory = async () => {
    if (!window.db) return;
    const fetchedItems = await window.db.getInventoryItems();
    setItems(fetchedItems);
  };

  const loadAlerts = async () => {
    if (!window.db) return;
    const lowStock = await window.db.getLowStockItems();
    const expiring = await window.db.getExpiringItems();
    const overstock = await window.db.getOverstockItems();

    const alerts: StockAlert[] = [];
    if (lowStock.length > 0) {
      alerts.push({
        type: 'low',
        message: 'Itens com estoque baixo',
        items: lowStock
      });
    }
    if (expiring.length > 0) {
      alerts.push({
        type: 'expiring',
        message: 'Itens próximos ao vencimento',
        items: expiring
      });
    }
    if (overstock.length > 0) {
      alerts.push({
        type: 'overstock',
        message: 'Itens com excesso de estoque',
        items: overstock
      });
    }
    setAlerts(alerts);
  };

  const loadTransactions = async (itemId: number) => {
    if (!window.db) return;
    const fetchedTransactions = await window.db.getInventoryTransactions(itemId);
    setTransactions(fetchedTransactions);
  };

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter(item => {
        const nameMatch = (item.product_name || item.manual_name || '')
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
        const unitMatch = filterUnit ? item.unit === filterUnit : true;
        const categoryMatch = filterCategory ? item.category === filterCategory : true;
        return nameMatch && unitMatch && categoryMatch;
      })
      .sort((a, b) => {
        const factor = sortOrder === 'asc' ? 1 : -1;
        const nameA = a.product_name || a.manual_name || '';
        const nameB = b.product_name || b.manual_name || '';
        switch (sortBy) {
          case 'name':
            return nameA.localeCompare(nameB) * factor;
          case 'quantity':
            return (a.quantity - b.quantity) * factor;
          case 'updated':
            return (
              (new Date(a.last_updated || 0).getTime() -
                new Date(b.last_updated || 0).getTime()) *
              factor
            );
          default:
            return 0;
        }
      });
  }, [items, searchTerm, filterUnit, filterCategory, sortBy, sortOrder]);

  // Statistics
  const stats = useMemo(() => {
    return {
      totalItems: items.length,
      totalValue: items.reduce((sum, item) => sum + (item.quantity * (item.cost || 0)), 0),
      lowStockItems: items.filter(item => item.quantity <= item.min_quantity).length,
      categories: items.reduce((acc, item) => {
        if (item.category) {
          acc[item.category] = (acc[item.category] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>)
    };
  }, [items]);

  // Handlers
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.db) return;
    
    await window.db.addInventoryItem({
      ...newItem,
      quantity: Number(newItem.quantity),
      min_quantity: Number(newItem.min_quantity),
      cost: Number(newItem.cost)
    });

    setNewItem({
      manual_name: '',
      quantity: 0,
      unit: 'un',
      min_quantity: 0,
      category: '',
      location: '',
      supplier: '',
      cost: 0,
      expiry_date: ''
    });
    setActiveModal(null);
    loadInventory();
    loadAlerts();
  };

  const handleMoveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.db || !selectedItem) return;

    await window.db.updateInventoryQuantity({
      id: selectedItem.id,
      quantity: Number(moveQuantity.quantity),
      type: moveQuantity.type,
      description: moveQuantity.description,
      reference: moveQuantity.reference,
      cost: Number(moveQuantity.cost)
    });

    setMoveQuantity({
      quantity: 0,
      type: 'entrada',
      description: '',
      reference: '',
      cost: 0
    });
    setActiveModal(null);
    loadInventory();
    loadAlerts();
    if (selectedItem) {
      loadTransactions(selectedItem.id);
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem || !window.db) return;
    await window.db.deleteInventoryItem(selectedItem.id);
    setActiveModal(null);
    setSelectedItem(null);
    loadInventory();
    loadAlerts();
  };

  const handleExport = async () => {
    const data = {
      items,
      transactions,
      date: new Date().toISOString(),
      stats
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        if (!event.target?.result) return;
        
        const importedData = JSON.parse(event.target.result as string);
        
        if (!window.db) return;
        
        // Importa os itens
        for (const item of importedData.items) {
          await window.db.addInventoryItem(item);
        }
        
        setActiveModal(null);
        loadInventory();
        loadAlerts();
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Erro ao importar dados. Verifique o formato do arquivo.');
      }
    };
    
    reader.readAsText(file);
  };

  // Handler para Nota Fiscal via OCR
  const handleInvoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setInvoiceFile(e.target.files[0]);
    }
  };

  const processInvoice = async () => {
    if (!invoiceFile) return;
    setInvoiceProcessing(true);
    try {
      const { data: { text } } = await Tesseract.recognize(invoiceFile, 'por');
      console.log("Texto extraído da nota fiscal:", text);
      // Aqui você implementaria a extração dos dados relevantes.
      // Exemplo de item extraído:
      const produtoExtraido = {
        manual_name: "Produto da Nota Fiscal",
        quantity: 5,
        unit: "un",
        min_quantity: 2,
        category: "Produto acabado",
        location: "",
        supplier: "",
        cost: 10,
        expiry_date: ""
      };
      await window.db.addInventoryItem(produtoExtraido);
      setInvoiceFile(null);
      setActiveModal(null);
      loadInventory();
      loadAlerts();
    } catch (error) {
      console.error("Erro no processamento da nota fiscal:", error);
      alert("Erro ao processar a nota fiscal.");
    } finally {
      setInvoiceProcessing(false);
    }
  };

  // Novo handler para desativar alertas globalmente
  const handleDisableAlerts = async () => {
    try {
      await window.db.disableAllStockAlerts();
      alert("Alertas de estoque desativados.");
      loadAlerts();
    } catch (error) {
      console.error("Erro ao desativar alertas:", error);
      alert("Erro ao desativar alertas.");
    }
  };

  // Render functions
  const renderHeader = () => (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="flex items-center gap-3">
        <div className="bg-blue-100 p-2 rounded-lg">
          <Package className="h-8 w-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Controle de Estoque</h1>
          <p className="text-sm text-gray-500">
            {stats.totalItems} itens · Valor total: R$ {stats.totalValue.toFixed(2)}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveModal('add')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Novo Item
        </button>
        <button
          onClick={() => setActiveModal('invoice')}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <FileText className="h-4 w-4" />
          Nota Fiscal
        </button>
        <button
          onClick={handleDisableAlerts}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Settings className="h-4 w-4" />
          Desativar Alertas
        </button>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Download className="h-4 w-4" />
          Exportar
        </button>
        <button
          onClick={() => setActiveModal('import')}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          <Upload className="h-4 w-4" />
          Importar
        </button>
        <button
          onClick={() => loadInventory()}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          title="Atualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="space-y-4 mb-6">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg border ${
            alert.type === 'low'
              ? 'bg-red-50 border-red-100'
              : alert.type === 'expiring'
              ? 'bg-yellow-50 border-yellow-100'
              : 'bg-blue-50 border-blue-100'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle
              className={`h-5 w-5 ${
                alert.type === 'low'
                  ? 'text-red-500'
                  : alert.type === 'expiring'
                  ? 'text-yellow-500'
                  : 'text-blue-500'
              }`}
            />
            <h3 className="font-medium">{alert.message}</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alert.items.map(item => (
              <div
                key={item.id}
                className="bg-white bg-opacity-50 p-3 rounded border border-current cursor-pointer"
                onClick={() => {
                  setSelectedItem(item);
                  loadTransactions(item.id);
                }}
              >
                <h4 className="font-medium">
                  {item.product_name || item.manual_name}
                </h4>
                <div className="mt-1 text-sm">
                  <span>
                    {item.quantity} {item.unit} / Min: {item.min_quantity} {item.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderFilters = () => (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
      <div className="flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar itens..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <select
          value={filterUnit}
          onChange={e => setFilterUnit(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as unidades</option>
          {UNITS.map(unit => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </select>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value)}
          className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todas as categorias</option>
          {CATEGORIES.map(category => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (sortBy === 'name') {
                setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortBy('name');
                setSortOrder('asc');
              }
            }}
            className={`p-2 rounded ${
              sortBy === 'name'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:bg-gray-100'
            }`}
            title="Ordenar por nome"
          >
            <Filter className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              if (sortBy === 'quantity') {
                setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortBy('quantity');
                setSortOrder('desc');
              }
            }}
            className={`p-2 rounded ${
              sortBy === 'quantity'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:bg-gray-100'
            }`}
            title="Ordenar por quantidade"
          >
            <Package className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              if (sortBy === 'updated') {
                setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
              } else {
                setSortBy('updated');
                setSortOrder('desc');
              }
            }}
            className={`p-2 rounded ${
              sortBy === 'updated'
                ? 'bg-blue-100 text-blue-600'
                : 'text-gray-400 hover:bg-gray-100'
            }`}
            title="Ordenar por última atualização"
          >
            <Clock className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderInventoryList = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            Itens em Estoque
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {filteredItems.map(item => (
            <div
              key={item.id}
              className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                selectedItem?.id === item.id ? 'bg-blue-50' : ''
              }`}
              onClick={() => {
                setSelectedItem(item);
                loadTransactions(item.id);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        item.quantity <= item.min_quantity
                          ? 'bg-red-100 text-red-600'
                          : 'bg-green-100 text-green-600'
                      }`}
                    >
                      <Package className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {item.product_name || item.manual_name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 mt-1 text-sm text-gray-500">
                        <span>
                          {item.quantity} {item.unit}
                        </span>
                        {item.category && (
                          <span className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            {item.category}
                          </span>
                        )}
                        {item.location && (
                          <span className="flex items-center gap-1">
                            <Package className="h-4 w-4" />
                            {item.location}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedItem(item);
                      setMoveQuantity({ ...moveQuantity, type: 'entrada' });
                      setActiveModal('move');
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
                      setMoveQuantity({ ...moveQuantity, type: 'saida' });
                      setActiveModal('move');
                    }}
                    className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                    title="Saída"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setSelectedItem(item);
                      setActiveModal('edit');
                    }}
                    className="p-2 text-yellow-600 bg-yellow-50 rounded-lg hover:bg-yellow-100 transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  {!item.product_id && (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedItem(item);
                        setActiveModal('delete');
                      }}
                      className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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

      {selectedItem ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Detalhes do Item
            </h2>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">Nome</h3>
                <p className="text-gray-900">
                  {selectedItem.product_name || selectedItem.manual_name}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-1">
                  Quantidade
                </h3>
                <p className="text-gray-900">
                  {selectedItem.quantity} {selectedItem.unit}
                </p>
              </div>
              {selectedItem.category && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Categoria
                  </h3>
                  <p className="text-gray-900">{selectedItem.category}</p>
                </div>
              )}
              {selectedItem.location && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Localização
                  </h3>
                  <p className="text-gray-900">{selectedItem.location}</p>
                </div>
              )}
              {selectedItem.supplier && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Fornecedor
                  </h3>
                  <p className="text-gray-900">{selectedItem.supplier}</p>
                </div>
              )}
              {selectedItem.cost !== undefined && (
                <div>
                  <h3 className="text-sm font-medium text-gray-500 mb-1">
                    Custo Unitário
                  </h3>
                  <p className="text-gray-900">
                    R$ {selectedItem.cost.toFixed(2)}
                  </p>
                </div>
              )}
            </div>

            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Histórico de Movimentações
            </h3>
            <div className="space-y-4">
              {transactions.map(transaction => (
                <div
                  key={transaction.id}
                  className={`p-4 rounded-lg ${
                    transaction.type === 'entrada'
                      ? 'bg-green-50 border border-green-100'
                      : 'bg-red-50 border border-red-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {transaction.type === 'entrada' ? (
                        <ArrowUp className="h-5 w-5 text-green-600" />
                      ) : (
                        <ArrowDown className="h-5 w-5 text-red-600" />
                      )}
                      <div>
                        <p
                          className={`font-medium ${
                            transaction.type === 'entrada'
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {transaction.type === 'entrada' ? 'Entrada' : 'Saída'} de{' '}
                          {Math.abs(transaction.quantity)} {selectedItem.unit}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {transaction.description}
                        </p>
                        {transaction.reference && (
                          <p className="text-sm text-gray-500 mt-1">
                            Ref: {transaction.reference}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {formatDate(new Date(transaction.created_at))}
                      </p>
                      {transaction.cost && (
                        <p className="text-sm text-gray-600 mt-1">
                          R$ {transaction.cost.toFixed(2)}
                        </p>
                      )}
                    </div>
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
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg border border-gray-200 border-dashed p-8 flex flex-col items-center justify-center text-center">
          <Package className="h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Selecione um Item
          </h3>
          <p className="text-gray-500">
            Clique em um item para ver seus detalhes e histórico
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {renderHeader()}
      {alerts.length > 0 && renderAlerts()}
      {renderFilters()}
      {renderInventoryList()}

      {/* Modal de Adicionar Item */}
      {activeModal === 'add' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[500px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Adicionar Novo Item</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Item
                </label>
                <input
                  type="text"
                  value={newItem.manual_name}
                  onChange={e => setNewItem({ ...newItem, manual_name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newItem.quantity}
                    onChange={e => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 p-2.5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidade
                  </label>
                  <select
                    value={newItem.unit}
                    onChange={e => setNewItem({ ...newItem, unit: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 p-2.5"
                    required
                  >
                    {UNITS.map(unit => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantidade Mínima
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.min_quantity}
                  onChange={e => setNewItem({ ...newItem, min_quantity: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  value={newItem.category}
                  onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
                >
                  <option value="">Selecione uma categoria</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localização
                </label>
                <input
                  type="text"
                  value={newItem.location}
                  onChange={e => setNewItem({ ...newItem, location: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fornecedor
                </label>
                <input
                  type="text"
                  value={newItem.supplier}
                  onChange={e => setNewItem({ ...newItem, supplier: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custo Unitário (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newItem.cost}
                  onChange={e => setNewItem({ ...newItem, cost: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data de Validade
                </label>
                <input
                  type="date"
                  value={newItem.expiry_date}
                  onChange={e => setNewItem({ ...newItem, expiry_date: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Movimentação */}
      {activeModal === 'move' && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[500px] max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">
              {moveQuantity.type === 'entrada' ? 'Entrada' : 'Saída'} de Estoque
            </h3>
            <form onSubmit={handleMoveStock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item
                </label>
                <p className="text-gray-900">
                  {selectedItem.product_name || selectedItem.manual_name}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Movimentação
                </label>
                <select
                  value={moveQuantity.type}
                  onChange={e => setMoveQuantity({ ...moveQuantity, type: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
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
                  value={moveQuantity.quantity}
                  onChange={e => setMoveQuantity({ ...moveQuantity, quantity: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={moveQuantity.description}
                  onChange={e => setMoveQuantity({ ...moveQuantity, description: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
                  rows={3}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Referência
                </label>
                <input
                  type="text"
                  value={moveQuantity.reference}
                  onChange={e => setMoveQuantity({ ...moveQuantity, reference: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
                  placeholder="Número da nota, pedido, etc."
                />
              </div>
              {moveQuantity.type === 'entrada' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custo Unitário (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={moveQuantity.cost}
                    onChange={e => setMoveQuantity({ ...moveQuantity, cost: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 p-2.5"
                  />
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {activeModal === 'edit' && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[500px] max-w-[90vw] max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Editar Item</h3>
            <form
              onSubmit={e => {
                e.preventDefault();
                if (!window.db) return;
                window.db.updateInventoryItem(selectedItem);
                setActiveModal(null);
                loadInventory();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Item
                </label>
                <input
                  type="text"
                  value={selectedItem.manual_name || ''}
                  onChange={e => setSelectedItem({ ...selectedItem, manual_name: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unidade
                  </label>
                  <select
                    value={selectedItem.unit}
                    onChange={e => setSelectedItem({ ...selectedItem, unit: e.target.value })}
                    className="w-full rounded-lg border border-gray-200 p-2.5"
                  >
                    {UNITS.map(unit => (
                      <option key={unit.value} value={unit.value}>
                        {unit.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantidade Mínima
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={selectedItem.min_quantity}
                    onChange={e => setSelectedItem({ ...selectedItem, min_quantity: Number(e.target.value) })}
                    className="w-full rounded-lg border border-gray-200 p-2.5"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria
                </label>
                <select
                  value={selectedItem.category || ''}
                  onChange={e => setSelectedItem({ ...selectedItem, category: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
                >
                  <option value="">Selecione uma categoria</option>
                  {CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localização
                </label>
                <input
                  type="text"
                  value={selectedItem.location || ''}
                  onChange={e => setSelectedItem({ ...selectedItem, location: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fornecedor
                </label>
                <input
                  type="text"
                  value={selectedItem.supplier || ''}
                  onChange={e => setSelectedItem({ ...selectedItem, supplier: e.target.value })}
                  className="w-full rounded-lg border border-gray-200 p-2.5"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {activeModal === 'delete' && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[400px] max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir o item "{selectedItem.product_name || selectedItem.manual_name}"?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Importação */}
      {activeModal === 'import' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[400px] max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Importar Dados</h3>
            <p className="text-gray-600 mb-4">
              Selecione um arquivo JSON exportado anteriormente para importar os dados.
            </p>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="w-full mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nota Fiscal */}
      {activeModal === 'invoice' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-[500px] max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Inserir Nota Fiscal</h3>
            <div className="mb-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleInvoiceUpload}
                className="w-full"
              />
              {invoiceFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Arquivo selecionado: {invoiceFile.name}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveModal(null);
                  setInvoiceFile(null);
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={processInvoice}
                disabled={!invoiceFile || invoiceProcessing}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {invoiceProcessing ? "Processando..." : "Processar Nota Fiscal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
