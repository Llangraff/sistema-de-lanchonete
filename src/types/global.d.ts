interface IpcBridge {
  updateProduct(product: Product): Promise<unknown>;
  getProducts: () => Promise<Product[]>;
  addProduct: (product: any) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
  getOrders: () => Promise<Order[]>;
  createOrder: (data: { tableNumber: number; customerName: string }) => Promise<void>;
  closeOrder: (orderId: number) => Promise<void>;
  addOrderItem: (item: { orderId: number; productId: number; quantity: number }) => Promise<void>;
  removeOrderItem: (itemId: number) => Promise<void>;
  getReport: (dates: { startDate: string; endDate: string }) => Promise<Report>;
  // Inventory types
  getInventoryItems: () => Promise<InventoryItem[]>;
  addInventoryItem: (item: { name: string; quantity: number; unit: string; min_quantity:cd number }) => Promise<void>;
  updateInventoryQuantity: (data: { id: number; quantity: number; type: string; description: string }) => Promise<void>;
  getInventoryTransactions: (itemId: number) => Promise<Transaction[]>;
  getLowStockItems: () => Promise<InventoryItem[]>;

}

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  min_quantity: number;
  created_at: string;
}

interface Transaction {
  id: number;
  inventory_item_id: number;
  quantity: number;
  type: string;
  description: string;
  created_at: string;
}

declare global {
  interface Window {
    db: IpcBridge;
  }
}

export {};