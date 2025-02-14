import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  PlusCircle,
  Search,
  Edit2,
  FileText,
  CreditCard,
  X,
  Users,
  DollarSign,
  Calendar,
  Phone,
  MapPin,
  StickyNote,
  AlertTriangle,
  ArrowUpDown,
  Wallet,
  UserPlus,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

// Types
interface Customer {
  id: number;
  name: string;
  contact: string;
  address: string;
  notes: string;
}

interface Transaction {
  id: number;
  amount: number;
  description: string;
  type: 'credit' | 'payment';
  created_at: string;
  customer_id?: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

// Função auxiliar para converter datas (substitui o espaço por 'T')
const parseDate = (dateStr: string): Date => {
  if (!dateStr || typeof dateStr !== 'string') return new Date();
  return new Date(dateStr.replace(' ', 'T'));
};

// Customer Status Badge Component
function CustomerStatusBadge({ balance }: { balance: number }) {
  const getStatusColor = (balance: number) => {
    if (balance <= 0) return 'bg-green-100 text-green-800';
    if (balance < 1000) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getStatusText = (balance: number) => {
    if (balance <= 0) return 'Em dia';
    if (balance < 1000) return 'Pendente';
    return 'Atrasado';
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(balance)}`}>
      {getStatusText(balance)}
    </span>
  );
}

// Enhanced Customer Card Component (com botão de deletar)
function CustomerCard({
  customer,
  onViewStatement,
  onAddTransaction,
  onEdit,
  onDelete,
  balance
}: {
  customer: Customer;
  onViewStatement: (customer: Customer) => void;
  onAddTransaction: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  balance: number;
}) {
  return (
    <Card className="hover:shadow-lg transition-all duration-200 transform hover:-translate-y-1">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold text-gray-900">{customer.name}</CardTitle>
            <CustomerStatusBadge balance={balance} />
          </div>
          <div className="flex space-x-1">
            <Button
              onClick={() => onViewStatement(customer)}
              title="Ver extrato"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-blue-50 transition-colors"
            >
              <FileText size={16} className="text-blue-600" />
            </Button>
            <Button
              onClick={() => onAddTransaction(customer)}
              title="Nova transação"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-green-50 transition-colors"
            >
              <CreditCard size={16} className="text-green-600" />
            </Button>
            <Button
              onClick={() => onEdit(customer)}
              title="Editar"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-gray-50 transition-colors"
            >
              <Edit2 size={16} className="text-gray-600" />
            </Button>
            <Button
              onClick={() => onDelete(customer)}
              title="Excluir"
              variant="ghost"
              className="h-8 w-8 p-0 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={16} className="text-red-600" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <Phone size={14} className="mr-2 flex-shrink-0" />
            <span className="truncate">{customer.contact || 'Sem contato'}</span>
          </div>
          {customer.address && (
            <div className="flex items-center text-sm text-gray-600">
              <MapPin size={14} className="mr-2 flex-shrink-0" />
              <span className="truncate">{customer.address}</span>
            </div>
          )}
          {customer.notes && (
            <div className="flex items-center text-sm text-gray-600">
              <StickyNote size={14} className="mr-2 flex-shrink-0" />
              <span className="truncate">{customer.notes}</span>
            </div>
          )}
          <div className="pt-2 flex justify-between items-center text-sm">
            <span className="text-gray-500">Saldo:</span>
            <span className={`font-medium ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.abs(balance))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced Transaction Table Component with Sorting
function TransactionTable({ transactions }: { transactions: Transaction[] }) {
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      if (sortField === 'date') {
        return sortDirection === 'desc'
          ? parseDate(b.created_at).getTime() - parseDate(a.created_at).getTime()
          : parseDate(a.created_at).getTime() - parseDate(b.created_at).getTime();
      } else {
        return sortDirection === 'desc'
          ? b.amount - a.amount
          : a.amount - b.amount;
      }
    });
  }, [transactions, sortField, sortDirection]);

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => toggleSort('date')}
            >
              <div className="flex items-center space-x-1">
                <span>Data</span>
                <ArrowUpDown size={14} className={sortField === 'date' ? 'text-blue-600' : 'text-gray-400'} />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Descrição
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Tipo
            </th>
            <th
              className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
              onClick={() => toggleSort('amount')}
            >
              <div className="flex items-center justify-end space-x-1">
                <span>Valor</span>
                <ArrowUpDown size={14} className={sortField === 'amount' ? 'text-blue-600' : 'text-gray-400'} />
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedTransactions.map((transaction) => {
            const isPayment = transaction.type.toLowerCase() === 'payment';
            return (
              <tr key={transaction.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {parseDate(transaction.created_at).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{transaction.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      isPayment ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {isPayment ? 'Pagamento' : 'Pedido'}
                  </span>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${isPayment ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(transaction.amount)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Statistics Component
function CustomerStatistics({ customers, transactions }: { customers: Customer[]; transactions: Transaction[] }) {
  const stats = useMemo(() => {
    const totalCustomers = customers.length;
    const totalTransactions = transactions.length;
    const totalRevenue = transactions.filter(t => t.type === 'credit').reduce((acc, t) => acc + t.amount, 0);
    const totalPayments = transactions.filter(t => t.type === 'payment').reduce((acc, t) => acc + t.amount, 0);

    return {
      totalCustomers,
      totalTransactions,
      totalRevenue,
      totalPayments,
      pendingAmount: totalRevenue - totalPayments
    };
  }, [customers, transactions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Total de Clientes</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.totalCustomers}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-gray-600">Total de Transações</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">{stats.totalTransactions}</span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Total Recebido</span>
            </div>
            <span className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalPayments)}
            </span>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wallet className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-gray-600">Total Pendente</span>
            </div>
            <span className="text-2xl font-bold text-red-600">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.pendingAmount)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Modal para cadastrar novo cliente
function NewCustomerModal({
  isOpen,
  onClose,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Customer) => void;
}) {
  const [formData, setFormData] = useState({ name: '', contact: '', address: '', notes: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await window.db.addCustomer(formData);
      const newCustomer: Customer = { id: result.id, ...formData };
      onSave(newCustomer);
      setFormData({ name: '', contact: '', address: '', notes: '' });
      onClose();
    } catch (error) {
      console.error("Erro ao adicionar cliente:", error);
      alert("Erro ao adicionar cliente.");
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Novo Cliente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contato</label>
            <input
              type="text"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Telefone ou e-mail"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={2}
              placeholder="Endereço completo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={2}
              placeholder="Informações adicionais"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" onClick={onClose} variant="outline">Cancelar</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal para editar um cliente existente
function EditCustomerModal({
  isOpen,
  onClose,
  customer,
  onSave
}: {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer;
  onSave: (customer: Customer) => void;
}) {
  const [formData, setFormData] = useState({
    name: customer.name,
    contact: customer.contact,
    address: customer.address,
    notes: customer.notes
  });

  useEffect(() => {
    setFormData({
      name: customer.name,
      contact: customer.contact,
      address: customer.address,
      notes: customer.notes
    });
  }, [customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await window.db.updateCustomer({ id: customer.id, ...formData });
      onSave({ id: customer.id, ...formData });
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar cliente:", error);
      alert("Erro ao atualizar cliente.");
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Editar Cliente</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contato</label>
            <input
              type="text"
              value={formData.contact}
              onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              placeholder="Telefone ou e-mail"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={2}
              placeholder="Endereço completo"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              rows={2}
              placeholder="Informações adicionais"
            />
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" onClick={onClose} variant="outline">Cancelar</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Atualizar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal para adicionar transação com busca refinada por produto
type TransactionItem = { product_id: number; quantity: number };

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transaction: Transaction) => void;
  customerId: number;
}

function TransactionModal({ isOpen, onClose, onSave, customerId }: TransactionModalProps) {
  const [type, setType] = useState<'credit' | 'payment'>('credit');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [productItems, setProductItems] = useState<TransactionItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState('');
  const [productSearchQueries, setProductSearchQueries] = useState<string[]>([]);

  const computeTotal = () => {
    return productItems.reduce((total, item) => {
      const product = products.find(p => p.id === item.product_id);
      return product ? total + product.price * item.quantity : total;
    }, 0);
  };

  useEffect(() => {
    async function fetchProducts() {
      try {
        const data = await window.db.getProducts();
        setProducts(data);
      } catch (err) {
        console.error("Erro ao carregar produtos:", err);
      }
    }
    fetchProducts();
  }, []);

  const addProductRow = () => {
    if (products.length === 0) return;
    setProductItems(prev => [...prev, { product_id: products[0].id, quantity: 1 }]);
    setProductSearchQueries(prev => [...prev, ""]);
  };

  const updateProductRow = (index: number, field: 'product_id' | 'quantity', value: number) => {
    setProductItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const updateProductSearchQuery = (index: number, query: string) => {
    setProductSearchQueries(prev => {
      const updated = [...prev];
      updated[index] = query;
      return updated;
    });
    const filtered = products.filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
    if (filtered.length > 0) {
      updateProductRow(index, 'product_id', filtered[0].id);
    }
  };

  const removeProductRow = (index: number) => {
    setProductItems(prev => prev.filter((_, i) => i !== index));
    setProductSearchQueries(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (type === 'payment') {
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
          setError("Informe um valor válido para o pagamento.");
          return;
        }
        const response = await window.db.addCustomerTransaction({
          customer_id: customerId,
          items: [],
          type: 'payment',
          amount
        });
        onSave({
          id: response.id,
          amount,
          description: response.description,
          type: 'payment',
          created_at: new Date().toISOString(),
          customer_id: customerId
        });
        setPaymentAmount('');
      } else {
        if (productItems.length === 0) {
          setError("Adicione pelo menos um produto.");
          return;
        }
        if (productItems.some(item => item.quantity <= 0)) {
          setError("Quantidade deve ser maior que zero.");
          return;
        }
        const totalAmount = computeTotal();
        const description = productItems.map(item => {
          const product = products.find(p => p.id === item.product_id);
          return product ? `${product.name} x ${item.quantity}` : "";
        }).join(", ");
        const response = await window.db.addCustomerTransaction({
          customer_id: customerId,
          items: productItems,
          type: 'credit',
          amount: totalAmount
        });
        onSave({
          id: response.id,
          amount: totalAmount,
          description,
          type: 'credit',
          created_at: new Date().toISOString(),
          customer_id: customerId
        });
        setProductItems([]);
        setProductSearchQueries([]);
      }
      onClose();
    } catch (err) {
      console.error("Erro ao registrar transação:", err);
      setError("Erro ao registrar transação.");
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Nova Transação</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Transação</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'credit' | 'payment')}
              className={`w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${type === 'credit' ? 'border-red-500' : 'border-green-500'}`}
            >
              <option value="credit">Pedido (Débito)</option>
              <option value="payment">Pagamento</option>
            </select>
          </div>
          {type === 'payment' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor do Pagamento</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-green-500 sm:text-sm">R$</span>
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full rounded-md border-green-500 shadow-sm focus:border-green-600 focus:ring-green-600 pl-10"
                  placeholder="0,00"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">Produtos</label>
                <Button type="button" onClick={addProductRow} variant="outline" size="sm" className="flex items-center space-x-1">
                  <PlusCircle size={16} />
                  <span>Adicionar Produto</span>
                </Button>
              </div>
              {productItems.map((item, index) => {
                const filteredProducts = products.filter(p =>
                  p.name.toLowerCase().includes(productSearchQueries[index]?.toLowerCase() || "")
                );
                return (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="flex flex-col">
                      <input
                        type="text"
                        placeholder="Buscar produto"
                        value={productSearchQueries[index] || ""}
                        onChange={(e) => updateProductSearchQuery(index, e.target.value)}
                        className="mb-1 p-1 border rounded"
                      />
                      <select
                        value={item.product_id}
                        onChange={(e) => updateProductRow(index, 'product_id', parseInt(e.target.value, 10))}
                        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        {filteredProducts.length > 0 ? (
                          filteredProducts.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} (R$ {product.price.toFixed(2)})
                            </option>
                          ))
                        ) : (
                          <option value={item.product_id}>Nenhum produto encontrado</option>
                        )}
                      </select>
                    </div>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateProductRow(index, 'quantity', parseInt(e.target.value, 10))}
                      className="w-24 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <Button type="button" onClick={() => removeProductRow(index)} variant="outline" size="sm" className="h-9 w-9 p-0">
                      <X size={16} />
                    </Button>
                  </div>
                );
              })}
              {productItems.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(computeTotal())}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">{error}</p>
                </div>
              </div>
            </div>
          )}
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" onClick={onClose} variant="outline">Cancelar</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'paid'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'balance'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isEditCustomerModalOpen, setIsEditCustomerModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const customerBalances = useMemo(() => {
    const balances: { [key: number]: number } = {};
    customers.forEach(customer => {
      const customerTransactions = transactions.filter(t => t.customer_id === customer.id);
      const balance = customerTransactions.reduce((acc, t) => {
        return acc + (t.type === 'credit' ? t.amount : -t.amount);
      }, 0);
      balances[customer.id] = balance;
    });
    return balances;
  }, [customers, transactions]);

  const filteredCustomers = useMemo(() => {
    let filtered = customers.filter(customer => {
      const matchesSearch =
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.contact.toLowerCase().includes(searchQuery.toLowerCase());
      if (filterStatus === 'all') return matchesSearch;
      const balance = customerBalances[customer.id] || 0;
      if (filterStatus === 'pending') return matchesSearch && balance > 0;
      return matchesSearch && balance <= 0;
    });
    return filtered.sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc'
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else {
        const balanceA = customerBalances[a.id] || 0;
        const balanceB = customerBalances[b.id] || 0;
        return sortOrder === 'asc' ? balanceA - balanceB : balanceB - balanceA;
      }
    });
  }, [customers, searchQuery, filterStatus, sortBy, sortOrder, customerBalances]);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [customersData, transactionsData] = await Promise.all([
        window.db.getCustomers(),
        window.db.getAllTransactions()
      ]);
      setCustomers(customersData);
      setTransactions(transactionsData);
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  const handleViewStatement = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsStatementModalOpen(true);
    setIsTransactionModalOpen(false);
  }, []);

  const handleAddTransaction = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setIsTransactionModalOpen(true);
    setIsStatementModalOpen(false);
  }, []);

  const handleEditCustomer = useCallback((customer: Customer) => {
    setCustomerToEdit(customer);
    setIsEditCustomerModalOpen(true);
  }, []);

  const handleDeleteCustomer = useCallback((customer: Customer) => {
    if (window.confirm(`Tem certeza que deseja excluir o cliente ${customer.name}?`)) {
      window.db.deleteCustomer(customer.id)
        .then(() => {
          setCustomers(prev => prev.filter(c => c.id !== customer.id));
        })
        .catch((err: any) => {
          console.error("Erro ao excluir cliente:", err);
          alert("Erro ao excluir cliente.");
        });
    }
  }, []);

  const addCustomer = useCallback((customer: Customer) => {
    setCustomers(prev => [customer, ...prev]);
  }, []);

  const updateCustomerInList = useCallback((updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(c => (c.id === updatedCustomer.id ? updatedCustomer : c)));
  }, []);

  const addTransaction = useCallback((transaction: Transaction) => {
    setTransactions(prev => [transaction, ...prev]);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Users className="mr-2" size={24} />
                Clientes
              </h1>
              <p className="text-sm text-gray-500">
                Gerencie seus clientes e transações
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={handleRefresh}
                variant="outline"
                className={`${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={refreshing}
              >
                <RefreshCw size={20} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
              <Button
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <UserPlus size={20} />
                <span>Novo Cliente</span>
              </Button>
            </div>
          </div>

          {/* Statistics */}
          <CustomerStatistics customers={customers} transactions={transactions} />

          {/* Filters and Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative col-span-1 md:col-span-2">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nome ou contato..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | 'pending' | 'paid')}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
            >
              <option value="all">Todos os status</option>
              <option value="pending">Pendentes</option>
              <option value="paid">Em dia</option>
            </select>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as 'name' | 'balance');
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg"
            >
              <option value="name-asc">Nome (A-Z)</option>
              <option value="name-desc">Nome (Z-A)</option>
              <option value="balance-asc">Saldo (Menor-Maior)</option>
              <option value="balance-desc">Saldo (Maior-Menor)</option>
            </select>
          </div>

          {/* Customers Grid */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Carregando clientes...</p>
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-sm">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum cliente encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchQuery ? 'Tente uma busca diferente ou altere os filtros' : 'Comece adicionando um novo cliente'}
              </p>
              {searchQuery && (
                <div className="mt-6">
                  <Button
                    onClick={() => {
                      setSearchQuery('');
                      setFilterStatus('all');
                    }}
                    variant="outline"
                  >
                    Limpar filtros
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCustomers.map(customer => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onViewStatement={handleViewStatement}
                  onAddTransaction={handleAddTransaction}
                  onEdit={handleEditCustomer}
                  onDelete={handleDeleteCustomer}
                  balance={customerBalances[customer.id] || 0}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <NewCustomerModal
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onSave={addCustomer}
      />

      {customerToEdit && (
        <EditCustomerModal
          isOpen={isEditCustomerModalOpen}
          onClose={() => setIsEditCustomerModalOpen(false)}
          customer={customerToEdit}
          onSave={updateCustomerInList}
        />
      )}

      {selectedCustomer && (
        <>
          <TransactionModal
            isOpen={isTransactionModalOpen}
            onClose={() => setIsTransactionModalOpen(false)}
            onSave={addTransaction}
            customerId={selectedCustomer.id}
          />

          <div
            className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${
              isStatementModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } transition-opacity duration-200`}
          >
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.name}</h2>
                    <p className="text-gray-600 flex items-center">
                      <Phone size={16} className="mr-1" />
                      {selectedCustomer.contact || 'Sem contato'}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsStatementModalOpen(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          <span className="ml-2 text-sm font-medium text-blue-900">Última transação</span>
                        </div>
                        <span className="text-sm text-blue-900">
                          {transactions[0]
                            ? parseDate(transactions[0].created_at).toLocaleDateString('pt-BR')
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DollarSign className="h-5 w-5 text-green-600" />
                          <span className="ml-2 text-sm font-medium text-green-900">Total pago</span>
                        </div>
                        <span className="text-sm text-green-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            transactions.filter(t => t.type === 'payment').reduce((acc, t) => acc + t.amount, 0)
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DollarSign className="h-5 w-5 text-red-600" />
                          <span className="ml-2 text-sm font-medium text-red-900">Total devido</span>
                        </div>
                        <span className="text-sm text-red-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            customerBalances[selectedCustomer.id] || 0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  <TransactionTable transactions={transactions.filter(t => t.customer_id === selectedCustomer.id)} />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Customers;
