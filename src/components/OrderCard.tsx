import { useState } from 'react';
import { Clock, Trash2, Plus, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card';
import { formatPrice, getTimeAgo } from '@/lib/utils';
import AddOrderItem from './AddOrderItem';

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  price: number;
  paid_quantity?: number;
}

interface OrderCardProps {
  order: {
    id: number;
    table_number: number;
    customer_name?: string;
    items: OrderItem[];
    created_at: string;
  };
  onItemAdded: () => void;
  onRemoveItem: (itemId: number) => void;
  onCloseOrder: (orderId: number) => void;
}

export default function OrderCard({
  order,
  onItemAdded,
  onRemoveItem,
  onCloseOrder,
}: OrderCardProps) {
  const [isPartialPaymentOpen, setIsPartialPaymentOpen] = useState(false);
  const [partialPayments, setPartialPayments] = useState<{ [key: number]: number }>({});

  // Calcula total restante (somando apenas o que não foi pago ainda)
  const totalRemaining = order.items?.reduce((acc, item) => {
    const remaining = item.quantity - (item.paid_quantity || 0);
    return acc + remaining * item.price;
  }, 0) || 0;

  const handlePartialPayment = async () => {
    const itemsToPay = Object.entries(partialPayments)
      .filter(([_, quantity]) => quantity > 0)
      .map(([itemId, quantity]) => ({ itemId: Number(itemId), quantity }));

    if (itemsToPay.length === 0) {
      alert("Selecione pelo menos um item para pagar.");
      return;
    }

    await window.db.payPartialOrderItems({ orderId: order.id, items: itemsToPay });
    setPartialPayments({});
    setIsPartialPaymentOpen(false);
    onItemAdded();
  };

  return (
    <Card gradient>
      <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600">
        <div className="flex justify-between items-start text-white">
          <div>
            <h3 className="text-lg font-semibold">Mesa {order.table_number}</h3>
            {order.customer_name && (
              <p className="text-blue-100 text-sm">{order.customer_name}</p>
            )}
          </div>
          <div className="text-right">
            <span className="text-blue-100 text-sm">Comanda #{order.id}</span>
            <div className="flex items-center text-blue-100 text-sm mt-1">
              <Clock className="w-3 h-3 mr-1" />
              {getTimeAgo(new Date(order.created_at))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
          {order.items?.map(item => {
            const remaining = item.quantity - (item.paid_quantity || 0);
            return (
              <div
                key={item.id}
                className="flex justify-between items-center p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  {/* Quantidade restante */}
                  <span className="text-gray-600">{remaining}x</span>
                  <span className="font-medium">{item.product_name}</span>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Valor restante */}
                  <span className="text-gray-600">
                    {formatPrice(item.price * remaining)}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(item.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      <CardFooter className="flex flex-col space-y-4 p-4 bg-gray-50">
        {/* TOTAL RESTANTE */}
        <div className="flex justify-between items-center w-full">
          <span className="font-semibold text-lg">Total a pagar:</span>
          <span className="text-lg font-bold text-blue-600">
            {formatPrice(totalRemaining)}
          </span>
        </div>

        {/* Botoes side-by-side, menores */}
        <div className="flex gap-2 items-center justify-between">
          <AddOrderItem orderId={order.id} onItemAdded={onItemAdded}>
            <Button
              className="px-2 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar
            </Button>
          </AddOrderItem>

          {/* Botão amarelo pro pagamento parcial */}
          <Button
            className="px-2 py-1 text-sm bg-yellow-500 hover:bg-yellow-600 text-white"
            onClick={() => setIsPartialPaymentOpen(true)}
          >
            <DollarSign className="w-4 h-4 mr-1" />
            Parcial
          </Button>

          {/* Botão verde pra fechar comanda */}
          <Button
            className="px-2 py-1 text-sm bg-green-500 text-white hover:bg-green-600"
            onClick={() => onCloseOrder(order.id)}
          >
            Fechar
          </Button>
        </div>
      </CardFooter>

      {/* Modal de pagamento parcial */}
      {isPartialPaymentOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-w-[90vw]">
            <h3 className="text-lg font-semibold mb-4">Pagamento Parcial</h3>
            {order.items.map(item => (
              <div
                key={item.id}
                className="flex justify-between items-center mb-2"
              >
                <span>
                  {item.product_name} (
                  {item.quantity - (item.paid_quantity || 0)} restantes)
                </span>
                <input
                  type="number"
                  min="1"
                  max={item.quantity - (item.paid_quantity || 0)}
                  value={partialPayments[item.id] || 0}
                  onChange={(e) => {
                    const value = Math.min(
                      Number(e.target.value),
                      item.quantity - (item.paid_quantity || 0)
                    );
                    setPartialPayments(prev => ({
                      ...prev,
                      [item.id]: value
                    }));
                  }}
                  className="w-16 border p-1 text-center"
                />
              </div>
            ))}
            <div className="flex justify-end space-x-3 mt-4">
              <Button
                variant="outline"
                onClick={() => setIsPartialPaymentOpen(false)}
              >
                Cancelar
              </Button>
              <Button variant="success" onClick={handlePartialPayment}>
                Confirmar Pagamento
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
