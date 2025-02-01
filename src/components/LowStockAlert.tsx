
import { AlertTriangle } from 'lucide-react';

interface LowStockAlertProps {
  items: Array<{
    id: number;
    name: string;
    quantity: number;
    unit: string;
    min_quantity: number;
  }>;
}

export default function LowStockAlert({ items }: LowStockAlertProps) {
  if (items.length === 0) return null;

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg animate-pulse">
      <div className="flex items-center">
        <AlertTriangle className="text-yellow-400 mr-3" size={24} />
        <h2 className="text-lg font-semibold text-yellow-800">Alerta de Estoque Baixo</h2>
      </div>
      <div className="mt-2 space-y-1">
        {items.map(item => (
          <p key={item.id} className="text-yellow-700">
            {item.name} - {item.quantity} {item.unit} (Mínimo: {item.min_quantity} {item.unit})
          </p>
        ))}
      </div>
    </div>
  );
}