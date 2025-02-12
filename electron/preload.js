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

  // Inventory Methods
  getInventoryItems: () => ipcRenderer.invoke('get-inventory-items'),
  addInventoryItem: (item) => ipcRenderer.invoke('add-inventory-item', item),
  updateInventoryQuantity: (data) => ipcRenderer.invoke('update-inventory-quantity', data),
  getInventoryTransactions: (itemId) => ipcRenderer.invoke('get-inventory-transactions', itemId),
  getLowStockItems: () => ipcRenderer.invoke('get-low-stock-items'),
  updateInventoryItem: (item) => ipcRenderer.invoke('update-inventory-item', item),
  deleteInventoryItem: (itemId) => ipcRenderer.invoke('delete-inventory-item', itemId),
  // Adicionando método para desativar o alerta de estoque individualmente:
  toggleLowStockAlert: (data) => ipcRenderer.invoke('toggle-low-stock-alert', data),

  // Cash Flow Methods
  getCashFlow: () => ipcRenderer.invoke('get-cash-flow'),
  addCashTransaction: (transaction) => ipcRenderer.invoke('add-cash-transaction', transaction),
});
