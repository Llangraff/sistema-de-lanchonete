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
  // Métodos de estoque
  getInventoryItems: () => Promise<InventoryItem[]>;
  addInventoryItem: (item: { name: string; quantity: number; unit: string; min_quantity: number }) => Promise<void>;
  updateInventoryQuantity: (data: { id: number; quantity: number; type: string; description: string }) => Promise<void>;
  getInventoryTransactions: (itemId: number) => Promise<Transaction[]>;
  getLowStockItems: () => Promise<InventoryItem[]>;

  // ---- Novos métodos para Clientes e Transações de Clientes ----
  getCustomers: () => Promise<Customer[]>;
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<{ id: number }>;
  updateCustomer: (customer: Customer) => Promise<unknown>;
  deleteCustomer: (id: number) => Promise<unknown>;
  getCustomerTransactions: (customerId: number) => Promise<Transaction[]>;
  addCustomerTransaction: (transaction: any) => Promise<{ id: number; description: string; amount: number }>;
  getAllTransactions: () => Promise<Transaction[]>;
}

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

interface Order {
  id: number;
  tableNumber: number;
  customerName: string;
  // Outras propriedades conforme necessário
}

interface Report {
  total_orders: number;
  total_revenue: number;
  items_sold: number;
  topProducts: TopProduct[];
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
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
  // Para transações de estoque, use: inventory_item_id, etc.
  // Para transações de clientes, esse campo será ignorado e outras propriedades serão usadas
  created_at: string;
  amount: number;
  description: string;
  type: string;
  customer_id?: number;
}

interface Customer {
  id: number;
  name: string;
  contact: string;
  address: string;
  notes: string;
}

declare global {
  interface Window {
    db: IpcBridge;
  }
}

export {};
