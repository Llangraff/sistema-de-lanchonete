const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('db', {
  // Product Methods
  getProducts: () => ipcRenderer.invoke('get-products'),
  addProduct: (product) => ipcRenderer.invoke('add-product', product),
  updateProduct: (product) => ipcRenderer.invoke('update-product', product),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),
  payPartialOrderItems: (data) => ipcRenderer.invoke('pay-partial-order-items', data),

  // Order Methods
  getOrders: () => ipcRenderer.invoke('get-orders'),
  createOrder: (data) => ipcRenderer.invoke('create-order', data),
  closeOrder: (orderId) => ipcRenderer.invoke('close-order', orderId),
  addOrderItem: (item) => ipcRenderer.invoke('add-order-item', item),
  removeOrderItem: (itemId) => ipcRenderer.invoke('remove-order-item', itemId),

  // Report Methods
  getReport: (filters) => ipcRenderer.invoke('get-report', filters),
  getBeverageReport: (filters) => ipcRenderer.invoke('get-beverage-report', filters),
  getProductReport: (filters) => ipcRenderer.invoke('get-product-report', filters),
  getConsolidatedReport: (filters) => ipcRenderer.invoke('get-consolidated-report', filters),

  // Inventory Methods
  getInventoryItems: () => ipcRenderer.invoke('get-inventory-items'),
  addInventoryItem: (item) => ipcRenderer.invoke('add-inventory-item', item),
  updateInventoryQuantity: (data) => ipcRenderer.invoke('update-inventory-quantity', data),
  getInventoryTransactions: (itemId) => ipcRenderer.invoke('get-inventory-transactions', itemId),
  getLowStockItems: () => ipcRenderer.invoke('get-low-stock-items'),
  updateInventoryItem: (item) => ipcRenderer.invoke('update-inventory-item', item),
  deleteInventoryItem: (itemId) => ipcRenderer.invoke('delete-inventory-item', itemId),
  toggleLowStockAlert: (data) => ipcRenderer.invoke('toggle-low-stock-alert', data),
  // Novo: Método para buscar produto pelo código de barras
  getProductByBarcode: (barcode) => ipcRenderer.invoke('get-product-by-barcode', barcode),
  // Novo: Método para desativar alertas de estoque globalmente
  disableAllStockAlerts: () => ipcRenderer.invoke('disable-all-stock-alerts'),

  // Cash Flow Methods
  getCashFlow: () => ipcRenderer.invoke('get-cash-flow'),
  addCashTransaction: (transaction) => ipcRenderer.invoke('add-cash-transaction', transaction),

  // Customer Methods
  getCustomers: () => ipcRenderer.invoke('get-customers'),
  addCustomer: (customer) => ipcRenderer.invoke('add-customer', customer),
  getCustomerTransactions: (customerId) => ipcRenderer.invoke('get-customer-transactions', customerId),
  addCustomerTransaction: (transaction) => ipcRenderer.invoke('add-customer-transaction', transaction),
  updateCustomer: (customer) => ipcRenderer.invoke('update-customer', customer),
  deleteCustomer: (id) => ipcRenderer.invoke('delete-customer', id),

  // Método para obter todas as transações
  getAllTransactions: () => ipcRenderer.invoke('get-all-transactions'),

  // Novo: Função para escutar atualizações de transações de clientes
  onCustomerTransactionUpdated: (callback) => ipcRenderer.on('customer-transaction-updated', callback)
});
