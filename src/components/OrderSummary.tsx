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
  const totalItems = orders.reduce(
    (sum, order) =>
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
      {/* Card de Pedidos Ativos (Azul Escuro) */}
      <div className="relative p-6 rounded-xl shadow-lg transform transition hover:scale-105">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-900 to-blue-800 opacity-80 -z-10"></div>
        <div className="relative z-10 text-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">
            Pedidos Ativos
          </h3>
          <p className="text-3xl font-extrabold mt-2 text-white">
            {orders.length}
          </p>
        </div>
      </div>

      {/* Card de Total em Pedidos (Verde Escuro) */}
      <div className="relative p-6 rounded-xl shadow-lg transform transition hover:scale-105">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-green-900 to-green-800 opacity-80 -z-10"></div>
        <div className="relative z-10 text-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">
            Total em Pedidos
          </h3>
          <p className="text-3xl font-extrabold mt-2 text-white">
            {formatCurrency(totalRevenue)}
          </p>
        </div>
      </div>

      {/* Card de Itens Vendidos (Rosa Escuro) */}
      <div className="relative p-6 rounded-xl shadow-lg transform transition hover:scale-105">
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-pink-900 to-pink-800 opacity-80 -z-10"></div>
        <div className="relative z-10 text-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-wide">
            Itens Vendidos
          </h3>
          <p className="text-3xl font-extrabold mt-2 text-white">
            {totalItems}
          </p>
        </div>
      </div>
    </div>
  );
}
