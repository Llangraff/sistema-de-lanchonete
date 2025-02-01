import { useState, useEffect } from 'react';
import OrderCard from '../components/OrderCard';
import OrderSummary from '../components/OrderSummary';
import LowStockAlert from '../components/LowStockAlert';
import { PlusCircle, Search, X, Loader2 } from 'lucide-react';
import { SearchInput } from '@/components/SearchInput';
import ConfirmDialog from '@/components/ConfirmDialog';

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  price: number;
  paid_quantity?: number;
}

interface Order {
  id: number;
  table_number: number;
  customer_name: string;
  status: string;
  total: number;
  items: OrderItem[];
  created_at: string;
}

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  min_quantity: number;
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [lowStockItems, setLowStockItems] = useState<InventoryItem[]>([]);
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [customerName, setCustomerName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [isCloseOrderDialogOpen, setIsCloseOrderDialogOpen] = useState(false);
  const [orderToClose, setOrderToClose] = useState<number | null>(null);
  const [isElectron, setIsElectron] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (window.db) {
      setIsElectron(true);
      loadInitialData();
    }
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadOrders(), loadLowStockItems()]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOrders = async () => {
    if (!window.db) return;
    const fetchedOrders = await window.db.getOrders();
    setOrders(fetchedOrders);
  };

  const loadLowStockItems = async () => {
    if (!window.db) return;
    const items = await window.db.getLowStockItems();
    setLowStockItems(items);
  };

  const createOrder = async () => {
    if (!window.db || !customerName.trim()) return;
    
    try {
      await window.db.createOrder({ tableNumber: selectedTable, customerName });
      setCustomerName('');
      setIsNewOrderModalOpen(false);
      await loadOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      // You could add a toast notification here
    }
  };

  const handleCloseOrder = (orderId: number) => {
    setOrderToClose(orderId);
    setIsCloseOrderDialogOpen(true);
  };

  const confirmCloseOrder = async () => {
    if (!window.db || !orderToClose) return;
    try {
      await window.db.closeOrder(orderToClose);
      await Promise.all([loadOrders(), loadLowStockItems()]);
      setIsCloseOrderDialogOpen(false);
    } catch (error) {
      console.error('Error closing order:', error);
    }
  };

  const removeItem = async (itemId: number) => {
    if (!window.db) return;
    try {
      await window.db.removeOrderItem(itemId);
      await loadOrders();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    return (
      order.customer_name?.toLowerCase().includes(searchLower) ||
      order.table_number.toString().includes(searchLower) ||
      order.items.some(item =>
        item.product_name.toLowerCase().includes(searchLower)
      )
    );
  });

  if (!isElectron) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <div className="text-4xl text-gray-400">⚡</div>
          <p className="text-gray-600 font-medium">Este aplicativo deve ser executado no Electron.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
          <p className="text-gray-600 font-medium">Carregando comandas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Comandas Ativas</h1>
            <p className="text-gray-600 mt-1">Gerencie os pedidos ativos do estabelecimento</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <SearchInput
              onSearch={setSearchTerm}
              placeholder="Pesquisar comandas..."
              className="w-full sm:w-80"
            />
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm"
            >
              <PlusCircle size={20} />
              Nova Comanda
            </button>
          </div>
        </div>

        <div className="grid gap-6 mb-8">
          <OrderSummary orders={filteredOrders} />
          {lowStockItems.length > 0 && <LowStockAlert items={lowStockItems} />}
        </div>

        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrders.map(order => (
              <OrderCard
                key={order.id}
                order={order}
                onItemAdded={loadInitialData}
                onRemoveItem={removeItem}
                onCloseOrder={handleCloseOrder}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma comanda encontrada</h3>
            <p className="text-gray-600">
              {searchTerm
                ? 'Nenhuma comanda corresponde aos critérios de pesquisa.'
                : 'Crie uma nova comanda para começar.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de Nova Comanda */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-900">Nova Comanda</h3>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={(e) => { e.preventDefault(); createOrder(); }} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Mesa
                </label>
                <select
                  value={selectedTable}
                  onChange={(e) => setSelectedTable(Number(e.target.value))}
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  {Array.from({ length: 20 }, (_, i) => i + 1).map(num => (
                    <option key={num} value={num}>Mesa {num}</option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Nome do Cliente
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Digite o nome do cliente"
                  className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={!customerName.trim()}
                >
                  Criar Comanda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isCloseOrderDialogOpen}
        onClose={() => setIsCloseOrderDialogOpen(false)}
        onConfirm={confirmCloseOrder}
        title="Fechar Comanda"
        message="Tem certeza que deseja fechar esta comanda? Esta ação não pode ser desfeita."
        confirmText="Fechar Comanda"
        variant="warning"
      />
    </div>
  );
}