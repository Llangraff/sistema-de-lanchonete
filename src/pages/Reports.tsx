import React, { useState, useEffect, useMemo } from 'react';
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
  LineChart,
  Wallet,
  LayoutDashboard,
  RefreshCw,
} from 'lucide-react';
import { getFormattedDate, formatCurrency } from '../utils/database';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Importações para gráficos
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

//
// Função auxiliar para mapear classes de gradiente para o Tailwind CSS
//
const getGradientClasses = (gradientFrom: string, gradientTo: string) => {
  const gradientFromMapping: { [key: string]: string } = {
    'blue-600': 'from-blue-600',
    'green-600': 'from-green-600',
    'pink-600': 'from-pink-600',
    'blue-700': 'from-blue-700',
    'red-600': 'from-red-600',
    'purple-600': 'from-purple-600',
    'indigo-600': 'from-indigo-600',
  };
  const gradientToMapping: { [key: string]: string } = {
    'blue-700': 'to-blue-700',
    'green-700': 'to-green-700',
    'pink-700': 'to-pink-700',
    'blue-800': 'to-blue-800',
    'red-700': 'to-red-700',
    'purple-800': 'to-purple-800',
    'indigo-700': 'to-indigo-700',
  };
  return `${gradientFromMapping[gradientFrom] || ''} ${gradientToMapping[gradientTo] || ''}`;
};

//
// Tipos dos dados
//
interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface OrdersReport {
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

// Tipo para o relatório consolidado
interface ConsolidatedReport {
  total_orders: number;
  total_revenue: number;
  items_sold: number;
  topProducts: TopProduct[];
}

//
// Componentes de Card
//
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
    )} text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}
  >
    <div className="relative z-10 flex items-center justify-between">
      <p className="text-white text-sm font-medium">{title}</p>
      <Icon className="h-5 w-5 text-white opacity-75" />
    </div>
    <p className="mt-4 text-4xl font-bold">{value}</p>
    <div className="absolute bottom-0 right-0 opacity-10 transform rotate-12">
      <Icon className="h-32 w-32" />
    </div>
  </div>
);

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
    )} text-white transform transition-all duration-300 hover:scale-105 hover:shadow-xl`}
  >
    <div className="relative z-10 flex items-center justify-between">
      <p className="text-white text-sm font-medium">{title}</p>
      <Icon className="h-5 w-5 text-white opacity-75" />
    </div>
    <p className="mt-4 text-4xl font-bold">{value}</p>
    <div className="absolute bottom-0 right-0 opacity-10 transform rotate-12">
      <Icon className="h-32 w-32" />
    </div>
  </div>
);

//
// Componentes de Gráficos
//

// Componente de gráfico de produtos tipo Doughnut
const ProductDoughnutChart: React.FC<{ data: ProductData[]; metric: 'quantity' | 'revenue' }> = ({
  data,
  metric,
}) => {
  const colors = [
    '#4F46E5', // blue-600
    '#10B981', // green-500
    '#F59E0B', // yellow-500
    '#EF4444', // red-500
    '#8B5CF6', // purple-500
    '#EC4899', // pink-500
    '#3B82F6', // blue-500
    '#F97316', // orange-500
  ];
  const chartData = {
    labels: data.map(item => item.name),
    datasets: [
      {
        data: data.map(item => (metric === 'quantity' ? item.total_quantity : item.revenue)),
        backgroundColor: data.map((_, index) => colors[index % colors.length]),
        borderColor: '#fff',
        borderWidth: 2,
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          boxWidth: 12,
          padding: 10,
        },
      },
      title: {
        display: true,
        text:
          metric === 'quantity'
            ? 'Distribuição de Vendas (Quantidade)'
            : 'Distribuição de Vendas (Receita)',
        font: { size: 16, weight: 'bold' as const },
        padding: { bottom: 20 },
      },
    },
  };
  return (
    <div className="w-full h-[400px] p-4">
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

// Botão de Tabulação
const TabButton: React.FC<{
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}> = ({ active, icon: Icon, label, onClick }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-6 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
      active ? 'bg-blue-50 text-blue-700 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    }`}
  >
    <Icon className={`h-4 w-4 ${active ? 'text-blue-700' : 'text-gray-400'}`} />
    {label}
  </button>
);

//
// Função para exportar dados em CSV
//
const exportCSV = (report: ConsolidatedReport) => {
  const csvRows = [
    ['Total de Pedidos', report.total_orders],
    ['Receita Total', report.total_revenue],
    ['Itens Vendidos', report.items_sold],
  ];
  const csvContent = csvRows.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'relatorio_geral.csv';
  link.click();
};

//
// Componente principal ReportsDashboard
//
const ReportsDashboard: React.FC = () => {
  // Estados para datas, filtros e relatórios
  const [startDate, setStartDate] = useState(getFormattedDate(new Date()));
  const [endDate, setEndDate] = useState(getFormattedDate(new Date()));
  const [report, setReport] = useState<ConsolidatedReport | null>(null);
  const [cashFlow, setCashFlow] = useState<CashFlow | null>(null);
  const [productReport, setProductReport] = useState<ProductReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'cashflow' | 'products'>('overview');
  const [advancedFilters, setAdvancedFilters] = useState({
    category: '',
    priceRange: '',
    sortBy: 'quantidade',
  });
  const [productMetric, setProductMetric] = useState<'quantity' | 'revenue'>('quantity');
  const [chartType, setChartType] = useState<'doughnut' | 'bar'>('doughnut');

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState('entrada');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionCategory, setTransactionCategory] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');

  // Função de range rápido de datas
  const setQuickRange = (days: number) => {
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - days);
    setStartDate(getFormattedDate(start));
    setEndDate(getFormattedDate(now));
  };

  // Gera o relatório consolidado chamando o novo método getConsolidatedReport
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
      // Chama o método consolidado do preload
      const data = await (window.db as any).getConsolidatedReport(filters);
      setReport(data as ConsolidatedReport);
      localStorage.setItem('advancedFilters', JSON.stringify(advancedFilters));
    } catch (err) {
      console.error(err);
      setError('Ocorreu um erro ao gerar o relatório.');
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Busca o fluxo de caixa
  const fetchCashFlow = async () => {
    if (!window.db) return;
    try {
      const data = await (window.db as any).getCashFlow();
      setCashFlow(data as CashFlow);
    } catch (err) {
      console.error(err);
      setError('Erro ao buscar fluxo de caixa.');
      setCashFlow(null);
    }
  };

  // Busca o relatório de produtos (baseado apenas nos pedidos)
  const fetchProductReport = async () => {
    if (!window.db) return;
    try {
      const filters = {
        startDate,
        endDate,
        category: advancedFilters.category,
      };
      const data = await (window.db as any).getProductReport(filters);
      setProductReport(data as ProductReport);
    } catch (err) {
      console.error(err);
    }
  };

  // Exportar PDF
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
      pdf.save('relatorio_geral.pdf');
    } catch (err) {
      console.error(err);
      alert('Erro ao exportar o relatório.');
    }
  };

  // Exportar CSV
  const handleExportCSV = () => {
    if (!report) return;
    exportCSV(report);
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
      await (window.db as any).addCashTransaction({
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

  // Carrega filtros avançados salvos
  useEffect(() => {
    const savedFilters = localStorage.getItem('advancedFilters');
    if (savedFilters) {
      setAdvancedFilters(JSON.parse(savedFilters));
    }
  }, []);

  // Sempre que as datas ou filtros mudarem, gera o relatório e atualiza fluxo de caixa/produtos
  useEffect(() => {
    generateReport();
    fetchCashFlow();
    fetchProductReport();
  }, [startDate, endDate, advancedFilters]);

  // Atualiza automaticamente quando há novas transações de clientes
  useEffect(() => {
    if (window.db && window.db.onCustomerTransactionUpdated) {
      window.db.onCustomerTransactionUpdated(() => {
        generateReport();
        fetchCashFlow();
        fetchProductReport();
      });
    }
  }, []);

  const isReportEmpty =
    report &&
    report.total_orders === 0 &&
    (!report.topProducts || report.topProducts.length === 0);

  // Alterna o tipo de gráfico na aba de produtos
  const toggleChartType = () => {
    setChartType(prev => (prev === 'doughnut' ? 'bar' : 'doughnut'));
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-blue-600 to-blue-700">
              <BarChart3 className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800">
                Relatórios & Análises
              </h1>
              <p className="text-sm text-gray-600">
                Visualize e analise o desempenho do seu negócio (Pedidos + Transações de Clientes)
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {report && !isLoading && !isReportEmpty && (
              <>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <Download className="h-4 w-4" />
                  Exportar PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <Download className="h-4 w-4" />
                  Exportar CSV
                </button>
              </>
            )}
            <button
              onClick={() => setIsTransactionModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 shadow-sm hover:shadow-md"
            >
              <PlusCircle className="h-4 w-4" />
              Nova Transação
            </button>
          </div>
        </div>

        {/* Tabs de Navegação */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-2">
          <div className="flex gap-2 overflow-x-auto">
            <TabButton
              active={activeTab === 'overview'}
              icon={LayoutDashboard}
              label="Visão Geral"
              onClick={() => setActiveTab('overview')}
            />
            <TabButton
              active={activeTab === 'cashflow'}
              icon={Wallet}
              label="Fluxo de Caixa"
              onClick={() => setActiveTab('cashflow')}
            />
            <TabButton
              active={activeTab === 'products'}
              icon={LineChart}
              label="Análise de Produtos"
              onClick={() => setActiveTab('products')}
            />
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div id="reportContent" className="space-y-6">
          {/* Filtros de Data e Filtros Avançados */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Calendar className="h-4 w-4" />
                        Data Inicial
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Calendar className="h-4 w-4" />
                        Data Final
                      </label>
                      <input
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
                    className="w-full flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    <FileText className="h-5 w-5" />
                    Gerar Relatório
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4">
                <button
                  onClick={() => setQuickRange(7)}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all duration-300"
                >
                  Últimos 7 dias
                </button>
                <button
                  onClick={() => setQuickRange(30)}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all duration-300"
                >
                  Últimos 30 dias
                </button>
                <button
                  onClick={() => setQuickRange(90)}
                  className="px-4 py-2 text-sm rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all duration-300"
                >
                  Últimos 90 dias
                </button>
              </div>
            </div>
            {/* Filtros Avançados */}
            <div className="border-t border-gray-200">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="w-full px-6 py-3 text-left flex items-center justify-between text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all duration-300"
              >
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
                  Filtros Avançados
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-gray-400 transition-transform duration-300 ${showAdvancedFilters ? 'rotate-180' : ''}`}
                />
              </button>
              {showAdvancedFilters && (
                <div className="p-6 bg-gray-50 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Categoria</label>
                      <select
                        value={advancedFilters.category}
                        onChange={(e) =>
                          setAdvancedFilters(prev => ({ ...prev, category: e.target.value }))
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
                      <label className="text-sm font-medium text-gray-700">Faixa de Preço</label>
                      <select
                        value={advancedFilters.priceRange}
                        onChange={(e) =>
                          setAdvancedFilters(prev => ({ ...prev, priceRange: e.target.value }))
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
                      <label className="text-sm font-medium text-gray-700">Ordenar por</label>
                      <select
                        value={advancedFilters.sortBy}
                        onChange={(e) =>
                          setAdvancedFilters(prev => ({ ...prev, sortBy: e.target.value }))
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
            </div>
          </div>

          {report && !isLoading && isReportEmpty && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <div className="mx-auto w-16 h-16 bg-yellow-50 rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum registro encontrado</h3>
              <p className="text-gray-500">Não há dados disponíveis para o período selecionado.</p>
            </div>
          )}

          {!isLoading && (
            <div className="space-y-6">
              {activeTab === 'overview' && report && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
                  {report.total_orders > 0 && (
                    <ReportCard
                      title="Ticket Médio"
                      value={formatCurrency(report.total_revenue / report.total_orders)}
                      icon={DollarSign}
                      gradientFrom="indigo-600"
                      gradientTo="indigo-700"
                    />
                  )}
                </div>
              )}

              {activeTab === 'cashflow' && cashFlow && (
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
              )}

              {activeTab === 'products' && productReport && productReport.productsData.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-6">Análise de Produtos</h2>
                  <div className="mb-4 flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Métrica:</span>
                      <select
                        value={productMetric}
                        onChange={(e) => setProductMetric(e.target.value as 'quantity' | 'revenue')}
                        className="rounded-lg border border-gray-300 p-2"
                      >
                        <option value="quantity">Quantidade Vendida</option>
                        <option value="revenue">Receita Gerada</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Tipo de Gráfico:</span>
                      <button
                        onClick={() => setChartType(prev => (prev === 'doughnut' ? 'bar' : 'doughnut'))}
                        className="px-3 py-1 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors text-sm"
                      >
                        {chartType === 'doughnut' ? 'Doughnut' : 'Barras'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {productReport.topProduct && (
                      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                        <h3 className="text-sm font-medium text-green-100 mb-4">Produto Mais Vendido</h3>
                        <p className="text-2xl font-bold mb-2">{productReport.topProduct.name}</p>
                        <div className="flex items-center gap-4">
                          <p className="text-green-100">
                            Quantidade: {productReport.topProduct.total_quantity}
                          </p>
                          <p className="text-green-100">
                            Receita: {formatCurrency(productReport.topProduct.revenue)}
                          </p>
                        </div>
                      </div>
                    )}
                    {productReport.bottomProduct && (
                      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white">
                        <h3 className="text-sm font-medium text-red-100 mb-4">Produto Menos Vendido</h3>
                        <p className="text-2xl font-bold mb-2">{productReport.bottomProduct.name}</p>
                        <div className="flex items-center gap-4">
                          <p className="text-red-100">
                            Quantidade: {productReport.bottomProduct.total_quantity}
                          </p>
                          <p className="text-red-100">
                            Receita: {formatCurrency(productReport.bottomProduct.revenue)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {chartType === 'doughnut' ? (
                    <ProductDoughnutChart data={productReport.productsData} metric={productMetric} />
                  ) : (
                    <ProductDoughnutChart data={productReport.productsData} metric={productMetric} />
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal para transação de caixa */}
      {isTransactionModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Nova Transação</h3>
                <button
                  onClick={() => setIsTransactionModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <form onSubmit={handleAddTransaction} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Tipo de Transação</label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Valor</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={transactionAmount}
                      onChange={(e) => setTransactionAmount(e.target.value)}
                      className="w-full pl-10 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="0,00"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Categoria</label>
                  <input
                    type="text"
                    value={transactionCategory}
                    onChange={(e) => setTransactionCategory(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Ex: Vendas, Despesas, etc."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Descrição</label>
                  <textarea
                    value={transactionDescription}
                    onChange={(e) => setTransactionDescription(e.target.value)}
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    rows={3}
                    placeholder="Detalhes da transação..."
                  ></textarea>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsTransactionModalOpen(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-300"
                  >
                    Registrar Transação
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
