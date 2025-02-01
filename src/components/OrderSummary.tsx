
import { formatCurrency } from '../utils/database';

interface OrderSummaryProps {
  orders: Array<{
    id: number;
    total: number;
    items: Array<{
      quantity: number;
      product_name: string;
    }>;
  }>;
}

export default function OrderSummary({ orders }: OrderSummaryProps) {
  const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalItems = orders.reduce((sum, order) => 
    sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-sm font-medium text-gray-500">Pedidos Ativos</h3>
        <p className="text-2xl font-semibold mt-1">{orders.length}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-sm font-medium text-gray-500">Total em Pedidos</h3>
        <p className="text-2xl font-semibold mt-1 text-green-600">{formatCurrency(totalRevenue)}</p>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
        <h3 className="text-sm font-medium text-gray-500">Itens Vendidos</h3>
        <p className="text-2xl font-semibold mt-1">{totalItems}</p>
      </div>
    </div>
  );
}