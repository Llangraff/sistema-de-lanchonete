import React, { useState, useEffect, ReactNode } from 'react';
import { PlusCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardContent, CardFooter, CardTitle } from './ui/Card';

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

interface AddOrderItemProps {
  orderId: number;
  onItemAdded: () => void;
  children?: ReactNode;
}

export default function AddOrderItem({ orderId, onItemAdded, children }: AddOrderItemProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (window.db) {
      loadProducts();
    }
  }, []);

  const loadProducts = async () => {
    if (!window.db) return;
    const products = await window.db.getProducts();
    setProducts(products);
    if (products.length > 0) {
      setSelectedProduct(products[0].id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.db) return;
    await window.db.addOrderItem({
      orderId,
      productId: selectedProduct,
      quantity
    });
    setQuantity(1);
    setIsOpen(false);
    onItemAdded();
  };

  return (
    <>
      {children ? (
        <div onClick={() => setIsOpen(true)}>{children}</div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          className="flex items-center justify-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Adicionar Item</span>
        </Button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto">
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md mx-auto z-[101]">
            <Card className="w-full bg-white shadow-xl mx-4">
              <CardHeader>
                <CardTitle>Adicionar Item ao Pedido</CardTitle>
              </CardHeader>
              
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Produto
                    </label>
                    <select
                      value={selectedProduct}
                      onChange={(e) => setSelectedProduct(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 p-2.5 bg-white"
                    >
                      {products.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} - R$ {product.price.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Number(e.target.value))}
                      className="w-full rounded-lg border border-gray-200 p-2.5 bg-white"
                    />
                  </div>
                </CardContent>
                
                <CardFooter className="flex justify-end space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">
                    Adicionar
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </div>
      )}
    </>
  );
  
}
