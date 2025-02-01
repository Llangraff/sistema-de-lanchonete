import React, { useState } from 'react';

interface ProductFormProps {
  onSubmit: (product: { name: string; price: number; category: string }) => void;
}

export default function ProductForm({ onSubmit }: ProductFormProps) {
  const [product, setProduct] = useState({ name: '', price: '', category: 'espetinho' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name: product.name,
      price: parseFloat(product.price),
      category: product.category
    });
    setProduct({ name: '', price: '', category: 'espetinho' });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <input
          type="text"
          placeholder="Nome do produto"
          value={product.name}
          onChange={(e) => setProduct({ ...product, name: e.target.value })}
          className="w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          required
        />
        <input
          type="number"
          step="0.01"
          placeholder="Preço"
          value={product.price}
          onChange={(e) => setProduct({ ...product, price: e.target.value })}
          className="w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          required
        />
        <select
          value={product.category}
          onChange={(e) => setProduct({ ...product, category: e.target.value })}
          className="w-full rounded-md border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        >
          <option value="espetinho">Espetinho</option>
          <option value="bebida">Bebida</option>
          <option value="acompanhamento">Acompanhamento</option>
        </select>
      </div>
      <button 
        type="submit" 
        className="w-full bg-green-600 text-white py-3 rounded-md hover:bg-green-700 transition-colors font-semibold"
      >
        Adicionar Produto
      </button>
    </form>
  );
}
