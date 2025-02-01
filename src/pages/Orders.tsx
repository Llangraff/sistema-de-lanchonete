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
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-4 bg-white p-8 rounded-2xl shadow-lg">
          <div className="text-5xl text-gray-400">⚡</div>
          <p className="text-gray-600 font-medium">Este aplicativo deve ser executado no Electron.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-4 bg-white p-8 rounded-2xl shadow-lg">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600 font-medium">Carregando comandas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 space-y-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-md w-full md:w-auto">
            <h1 className="text-3xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
              Comandas Ativas
            </h1>
            <p className="text-gray-600 mt-2">Gerencie os pedidos ativos do estabelecimento</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <SearchInput
              onSearch={setSearchTerm}
              placeholder="Pesquisar comandas..."
              className="w-full sm:w-96 shadow-lg"
            />
            <button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <PlusCircle size={22} />
              <span className="font-semibold">Nova Comanda</span>
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
          <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
            <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Nenhuma comanda encontrada</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              {searchTerm
                ? 'Nenhuma comanda corresponde aos critérios de pesquisa.'
                : 'Crie uma nova comanda para começar a registrar pedidos.'}
            </p>
          </div>
        )}
      </div>

      {/* Modal de Nova Comanda */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-2xl font-semibold text-gray-900">Nova Comanda</h3>
              <button
                onClick={() => setIsNewOrderModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-lg"
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
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 h-12"
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
                  className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 h-12"
                  required
                />
              </div>

              <div className="flex justify-end gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-300 font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
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