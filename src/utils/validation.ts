export const validateProduct = (product: { name: string; price: number; category: string }) => {
  if (!product.name || product.name.trim().length === 0) {
    throw new Error('Nome do produto é obrigatório');
  }
  if (!product.price || product.price <= 0) {
    throw new Error('Preço deve ser maior que zero');
  }
  if (!product.category) {
    throw new Error('Categoria é obrigatória');
  }
};

export const validateOrderItem = (item: { orderId: number; productId: number; quantity: number }) => {
  if (!item.orderId) {
    throw new Error('ID do pedido é obrigatório');
  }
  if (!item.productId) {
    throw new Error('ID do produto é obrigatório');
  }
  if (!item.quantity || item.quantity <= 0) {
    throw new Error('Quantidade deve ser maior que zero');
  }
};