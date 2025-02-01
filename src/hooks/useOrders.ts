import { useState, useEffect, useCallback } from 'react';
import { debounce } from '@/lib/utils';

interface Order {
  id: number;
  table_number: number;
  customer_name?: string;
  status: string;
  total: number;
  items: OrderItem[];
  created_at: string;
}

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  price: number;
}

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!window.db) return;
    try {
      setLoading(true);
      const fetchedOrders = await window.db.getOrders();
      setOrders(fetchedOrders);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  }, []);

  const createOrder = async (tableNumber: number, customerName?: string) => {
    if (!window.db) return;
    try {
      await window.db.createOrder({ tableNumber, customerName: customerName ?? '' });

      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pedido');
      throw err;
    }
  };

  const closeOrder = async (orderId: number) => {
    if (!window.db) return;
    try {
      await window.db.closeOrder(orderId);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao fechar pedido');
      throw err;
    }
  };

  const addOrderItem = async (orderId: number, productId: number, quantity: number) => {
    if (!window.db) return;
    try {
      await window.db.addOrderItem({ orderId, productId, quantity });
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar item');
      throw err;
    }
  };

  const removeOrderItem = async (itemId: number) => {
    if (!window.db) return;
    try {
      await window.db.removeOrderItem(itemId);
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover item');
      throw err;
    }
  };

  // Debounced version of loadOrders for frequent updates
  const debouncedLoadOrders = debounce(loadOrders, 500);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  return {
    orders,
    loading,
    error,
    createOrder,
    closeOrder,
    addOrderItem,
    removeOrderItem,
    refreshOrders: debouncedLoadOrders,
  };
}