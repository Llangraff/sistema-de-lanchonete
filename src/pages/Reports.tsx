import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  TrendingUp,
  DollarSign,
  BarChart3,
  FileText,
  Download,
  ChevronDown,
  Filter,
  PlusCircle,
  X,
} from 'lucide-react';
import { getFormattedDate, formatCurrency } from '../utils/database';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Mapeamento estático para as classes de gradiente, garantindo que o Tailwind as reconheça
const getGradientClasses = (gradientFrom: string, gradientTo: string) => {
  const gradientFromMapping: { [key: string]: string } = {
    'blue-600': 'from-blue-600',
    'green-600': 'from-green-600',
    'pink-600': 'from-pink-600',
    'blue-700': 'from-blue-700',
    'red-600': 'from-red-600',
    'purple-600': 'from-purple-600',
  };

  const gradientToMapping: { [key: string]: string } = {
    'blue-700': 'to-blue-700',
    'green-700': 'to-green-700',
    'pink-700': 'to-pink-700',
    'blue-800': 'to-blue-800',
    'red-700': 'to-red-700',
    'purple-800': 'to-purple-800',
  };

  return `${gradientFromMapping[gradientFrom] || ''} ${gradientToMapping[gradientTo] || ''}`;
};

// Tipos para os dados do relatório
interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface Report {
  total_orders: number;
  total_revenue: number;
  items_sold: number;
  topProducts: TopProduct[];
}

interface CashFlow {
  total_entries: number;
  total_exits: number;
  balance: number;
}

interface ProductData {
  name: string;
  total_quantity: number;
  revenue: number;
}

interface ProductReport {
  productsData: ProductData[];
  topProduct: ProductData | null;
  bottomProduct: ProductData | null;
}

// Componente para os cards do relatório geral
const ReportCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  gradientFrom: string;
  gradientTo: string;
}> = ({ title, value, icon: Icon, gradientFrom, gradientTo }) => (
  <div
    className={`relative overflow-hidden rounded-xl p-6 shadow-lg bg-gradient-to-br ${getGradientClasses(
      gradientFrom,
      gradientTo
    )} text-white`}
  >
    <div className="relative z-10 flex items-center justify-between">
      <p className="text-white text-sm">{title}</p>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <p className="mt-4 text-4xl font-bold">{value}</p>
    <div className="absolute bottom-0 right-0 opacity-10">
      <Icon className="h-24 w-24 -rotate-12" />
    </div>
  </div>
);

// Componente para os cards do fluxo de caixa
const CashFlowCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  gradientFrom: string;
  gradientTo: string;
}> = ({ title, value, icon: Icon, gradientFrom, gradientTo }) => (
  <div
    className={`relative overflow-hidden rounded-xl p-6 shadow-lg bg-gradient-to-br ${getGradientClasses(
      gradientFrom,
      gradientTo
    )} text-white`}
  >
    <div className="relative z-10 flex items-center justify-between">
      <p className="text-white text-sm">{title}</p>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <p className="mt-4 text-4xl font-bold">{value}</p>
    <div className="absolute bottom-0 right-0 opacity-10">
      <Icon className="h-24 w-24 -rotate-12" />
    </div>
  </div>
);

// Componente para o gráfico de produtos
const ProductChart: React.FC<{ data: ProductData[] }> = ({ data }) => {
  const chartData = {
    labels: data.map((item) => item.name),
    datasets: [
      {
        label: 'Quantidade Vendida',
        data: data.map((item) => item.total_quantity),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
    ],
  };

  const options = {
    plugins: {
      title: {
        display: true,
        text: 'Vendas dos Produtos',
        font: { size: 18 },
      },
      legend: { display: false },
    },
    maintainAspectRatio: false,
  };

  return (
    <div className="w-full h-64">
      <Bar data={chartData} options={options} />
    </div>
  );
};

const ReportsDashboard: React.FC = () => {
  // Estados básicos
  const [startDate, setStartDate] = useState(getFormattedDate(new Date()));
  const [endDate, setEndDate] = useState(getFormattedDate(new Date()));
  const [report, setReport] = useState<Report | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlow | null>(null);
  const [productReport, setProductReport] = useState<ProductReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showAdvancedReport, setShowAdvancedReport] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    category: '',
    priceRange: '',
    sortBy: 'quantidade',
  });
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState('entrada');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');

  // Função para gerar o relatório geral
  const generateReport = async () => {
    if (!window.db) return;
    if (new Date(startDate) > new Date(endDate)) {
      setError('Data inicial não pode ser maior que a data final.');
      setReport(null);
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const filters = {
        startDate,
        endDate,
        category: advancedFilters.category,
        priceRange: advancedFilters.priceRange,
        sortBy: advancedFilters.sortBy,
      };
      const data = await window.db.getReport(filters);
      setReport(data as Report);
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao gerar o relatório.');
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Busca fluxo de caixa
  const fetchCashFlow = async () => {
    if (!window.db) return;
    try {
      const data = await window.db.getCashFlow();
      setCashFlow(data);
    } catch (err) {
      console.error(err);
      setError('Erro ao buscar fluxo de caixa.');
      setCashFlow(null);
    }
  };

  // Busca relatório avançado de produtos
  const fetchProductReport = async () => {
    if (!window.db) return;
    try {
      const filters = {
        startDate,
        endDate,
        category: advancedFilters.category,
      };
      const data = await window.db.getProductReport(filters);
      setProductReport(data);
    } catch (err) {
      console.error(err);
    }
  };

  const setQuickRange = (days: number) => {
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - days);
    setStartDate(getFormattedDate(start));
    setEndDate(getFormattedDate(now));
  };

  // Função de exportação para PDF
  const handleExport = async () => {
    if (!report) return;
    const reportContent = document.getElementById('reportContent');
    if (!reportContent) return;
    try {
      const canvas = await html2canvas(reportContent, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('report.pdf');
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar o relatório.');
    }
  };

  // Função para registrar uma transação de caixa
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.db) return;
    const amount = parseFloat(transactionAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Informe um valor válido para a transação.');
      return;
    }
    try {
      await window.db.addCashTransaction({
        type: transactionType,
        amount,
        category: transactionCategory,
        description: transactionDescription,
      });
      await fetchCashFlow();
      setIsTransactionModalOpen(false);
      setTransactionAmount('');
      setTransactionCategory('');
      setTransactionDescription('');
      setTransactionType('entrada');
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar a transação.');
    }
  };

  useEffect(() => {
    generateReport();
    fetchCashFlow();
    fetchProductReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, advancedFilters]);

  const isReportEmpty =
    report &&
    report.total_orders === 0 &&
    (!report.topProducts || report.topProducts.length === 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-700">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
                Relatórios & Fluxo de Caixa
              </h1>
              <p className="text-sm text-gray-600">
                Visualize o desempenho do seu negócio e o caixa diário
              </p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-700 hover:bg-gray-50 transition-colors shadow"
            >
              <Filter className="h-4 w-4" />
              Filtros Avançados
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}
              />
            </button>
            {report && !isLoading && !isReportEmpty && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors shadow"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
            )}
            <button
              onClick={() => setShowAdvancedReport(!showAdvancedReport)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors shadow"
            >
              {showAdvancedReport ? 'Ocultar Relatório Avançado' : 'Mostrar Relatório Avançado'}
            </button>
            <button
              onClick={() => setIsTransactionModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow"
            >
              <PlusCircle className="h-4 w-4" />
              Nova Transação
            </button>
          </div>
        </div>

        {/* Conteúdo do Relatório para Exportação */}
        <div id="reportContent">
          {/* Datas e Range Rápido */}
          <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="start"
                        className="flex items-center gap-2 text-sm font-medium text-gray-700"
                      >
                        <Calendar className="h-4 w-4" />
                        Data Inicial
                      </label>
                      <input
                        id="start"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="end"
                        className="flex items-center gap-2 text-sm font-medium text-gray-700"
                      >
                        <Calendar className="h-4 w-4" />
                        Data Final
                      </label>
                      <input
                        id="end"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={generateReport}
                    className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow"
                  >
                    <FileText className="h-5 w-5" />
                    Gerar Relatório
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => setQuickRange(7)}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  Últimos 7 dias
                </button>
                <button
                  onClick={() => setQuickRange(30)}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  Últimos 30 dias
                </button>
                <button
                  onClick={() => setQuickRange(90)}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  Últimos 90 dias
                </button>
              </div>
            </div>

            {/* Filtros Avançados */}
            {showAdvancedFilters && (
              <div className="p-6 border-b border-gray-200 bg-gray-50">
                <h3 className="text-sm font-medium text-gray-700 mb-4">Filtros Avançados</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">Categoria</label>
                    <select
                      value={advancedFilters.category}
                      onChange={(e) =>
                        setAdvancedFilters((prev) => ({ ...prev, category: e.target.value }))
                      }
                      className="w-full rounded-lg border-gray-300 shadow-sm px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Todas as categorias</option>
                      <option value="espetinho">Espetinho</option>
                      <option value="bebida">Bebida</option>
                      <option value="acompanhamento">Acompanhamento</option>
                      <option value="comida">Comida</option>
                      <option value="diversos">Diversos</option>
                      <option value="refeição">Refeição</option>
                      <option value="salgados">Salgados</option>
                      <option value="porcao">Porção</option>
                      <option value="doce">Doce</option>
                      <option value="sobremesa">Sobremesa</option>
                      <option value="lanche">Lanche</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">Faixa de Preço</label>
                    <select
                      value={advancedFilters.priceRange}
                      onChange={(e) =>
                        setAdvancedFilters((prev) => ({ ...prev, priceRange: e.target.value }))
                      }
                      className="w-full rounded-lg border-gray-300 shadow-sm px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="">Todos os preços</option>
                      <option value="0-15">Até R$ 15,00</option>
                      <option value="15-30">R$ 15,00 - R$ 30,00</option>
                      <option value="30+">Acima de R$ 30,00</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-gray-600">Ordenar por</label>
                    <select
                      value={advancedFilters.sortBy}
                      onChange={(e) =>
                        setAdvancedFilters((prev) => ({ ...prev, sortBy: e.target.value }))
                      }
                      className="w-full rounded-lg border-gray-300 shadow-sm px-4 py-2 focus:border-blue-500 focus:ring-blue-500"
                    >
                      <option value="quantidade">Quantidade Vendida</option>
                      <option value="receita">Maior Receita</option>
                      <option value="preco">Maior Preço</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mx-6 mt-6 flex items-center gap-2 text-red-600 bg-red-50 p-4 rounded-lg">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </div>
            )}

            {isLoading && (
              <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Relatório Geral */}
            {report && !isLoading && (
              <div className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <ReportCard
                    title="Total de Pedidos"
                    value={report.total_orders}
                    icon={TrendingUp}
                    gradientFrom="blue-600"
                    gradientTo="blue-700"
                  />
                  <ReportCard
                    title="Receita Total"
                    value={formatCurrency(report.total_revenue || 0)}
                    icon={DollarSign}
                    gradientFrom="green-600"
                    gradientTo="green-700"
                  />
                  <ReportCard
                    title="Itens Vendidos"
                    value={report.items_sold ?? 0}
                    icon={BarChart3}
                    gradientFrom="pink-600"
                    gradientTo="pink-700"
                  />
                </div>
              </div>
            )}

            {/* Fluxo de Caixa */}
            {cashFlow && (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <CashFlowCard
                    title="Entradas"
                    value={formatCurrency(cashFlow.total_entries)}
                    icon={DollarSign}
                    gradientFrom="blue-700"
                    gradientTo="blue-800"
                  />
                  <CashFlowCard
                    title="Saídas"
                    value={formatCurrency(cashFlow.total_exits)}
                    icon={DollarSign}
                    gradientFrom="red-600"
                    gradientTo="red-700"
                  />
                  <CashFlowCard
                    title="Saldo"
                    value={formatCurrency(cashFlow.balance)}
                    icon={DollarSign}
                    gradientFrom="purple-600"
                    gradientTo="purple-800"
                  />
                </div>
              </div>
            )}

            {report && !isLoading && isReportEmpty && (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <div className="bg-yellow-50 rounded-full p-3 mb-4">
                  <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum registro encontrado</h3>
                <p className="text-gray-500">Não há dados disponíveis para o período selecionado.</p>
              </div>
            )}

            {/* Relatório Avançado de Produtos */}
            {showAdvancedReport && productReport && productReport.productsData.length > 0 && (
              <div className="p-6 space-y-8 bg-white rounded-xl shadow border border-gray-200 mt-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Relatório Avançado de Produtos</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {productReport.topProduct && (
                    <div className="relative overflow-hidden rounded-xl p-6 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
                      <p className="text-green-100 text-sm">Produto Mais Vendido</p>
                      <p className="mt-4 text-xl font-semibold">{productReport.topProduct.name}</p>
                      <p className="mt-2 text-lg">Qtd: {productReport.topProduct.total_quantity}</p>
                    </div>
                  )}
                  {productReport.bottomProduct && (
                    <div className="relative overflow-hidden rounded-xl p-6 shadow-lg bg-gradient-to-br from-red-500 to-red-600 text-white">
                      <p className="text-red-100 text-sm">Produto Menos Vendido</p>
                      <p className="mt-4 text-xl font-semibold">{productReport.bottomProduct.name}</p>
                      <p className="mt-2 text-lg">Qtd: {productReport.bottomProduct.total_quantity}</p>
                    </div>
                  )}
                </div>
                <div className="mt-6">
                  <ProductChart data={productReport.productsData} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para adicionar transação via Portal */}
      {isTransactionModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-semibold text-gray-900">Nova Transação</h3>
                <button
                  onClick={() => setIsTransactionModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Tipo</label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Valor</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionAmount}
                    onChange={(e) => setTransactionAmount(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Ex: 100.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Categoria (opcional)</label>
                  <input
                    type="text"
                    value={transactionCategory}
                    onChange={(e) => setTransactionCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Ex: despesa, venda"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Descrição</label>
                  <textarea
                    value={transactionDescription}
                    onChange={(e) => setTransactionDescription(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 p-2 focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                    placeholder="Detalhes da transação..."
                  ></textarea>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsTransactionModalOpen(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Registrar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ReportsDashboard;
