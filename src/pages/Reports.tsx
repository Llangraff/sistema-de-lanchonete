import { useState } from 'react';
import { getFormattedDate, formatCurrency } from '../utils/database';
import { Calendar, TrendingUp, Package, DollarSign, BarChart3, FileText, Download, ChevronDown, Filter } from 'lucide-react';

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

interface AdvancedFilters {
  category: string;
  priceRange: string;
  sortBy: string;
}

export default function Reports() {
  // Estados de data
  const [startDate, setStartDate] = useState(getFormattedDate(new Date()));
  const [endDate, setEndDate] = useState(getFormattedDate(new Date()));

  // Estado do relatório
  const [report, setReport] = useState<Report | null>(null);

  // Loading, erro e abertura de filtros avançados
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Estado dos filtros avançados
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    category: '',
    priceRange: '',
    sortBy: 'quantidade',
  });

  // Gera o relatório chamando o back-end
  const generateReport = async () => {
    if (!window.db) return;

    if (startDate > endDate) {
      setError('Data inicial não pode ser maior que a data final.');
      setReport(null);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Monta o objeto para enviar ao back
      const filters = {
        startDate,
        endDate,
        category: advancedFilters.category,
        priceRange: advancedFilters.priceRange,
        sortBy: advancedFilters.sortBy,
      };

      const data = await window.db.getReport(filters);
      setReport(data as Report);
    } catch (err: any) {
      console.error(err);
      setError('Ocorreu um erro ao gerar o relatório.');
      setReport(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Verifica se o relatório retornado está vazio
  const isReportEmpty =
    report &&
    report.total_orders === 0 &&
    (report.topProducts.length === 0 || !report.topProducts);

  // Define rapidamente um intervalo (ex: últimos 7 dias)
  const setQuickRange = (days: number) => {
    const now = new Date();
    const start = new Date();
    start.setDate(now.getDate() - days);

    setStartDate(getFormattedDate(start));
    setEndDate(getFormattedDate(now));
  };

  // Exemplo de exportação (ainda não implementada)
  const handleExport = () => {
    if (!report) return;
    alert('Exportar relatório em PDF/CSV (a implementar)!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <BarChart3 className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
              <p className="text-sm text-gray-500">Visualize o desempenho do seu negócio</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
            >
              <Filter className="h-4 w-4" />
              Filtros Avançados
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  showAdvancedFilters ? 'rotate-180' : ''
                }`}
              />
            </button>
            {report && !isLoading && !isReportEmpty && (
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" />
                Exportar
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Seção de Datas - Sempre Visível */}
          <div className="p-6 border-b border-gray-100">
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
                      className="w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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
                      className="w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={generateReport}
                  className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                  <FileText className="h-5 w-5" />
                  Gerar Relatório
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={() => setQuickRange(7)}
                className="px-4 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Últimos 7 dias
              </button>
              <button
                onClick={() => setQuickRange(30)}
                className="px-4 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Últimos 30 dias
              </button>
              <button
                onClick={() => setQuickRange(90)}
                className="px-4 py-2 text-sm bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Últimos 90 dias
              </button>
            </div>
          </div>

          {/* Filtros Avançados - Colapsável */}
          {showAdvancedFilters && (
            <div className="p-6 border-b border-gray-100 bg-gray-50">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Filtros Avançados</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Categoria */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Categoria</label>
                  <select
                    value={advancedFilters.category}
                    onChange={(e) =>
                      setAdvancedFilters((prev) => ({ ...prev, category: e.target.value }))
                    }
                    className="w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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

                {/* Faixa de Preço */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Faixa de Preço</label>
                  <select
                    value={advancedFilters.priceRange}
                    onChange={(e) =>
                      setAdvancedFilters((prev) => ({ ...prev, priceRange: e.target.value }))
                    }
                    className="w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="">Todos os preços</option>
                    <option value="0-15">Até R$ 15,00</option>
                    <option value="15-30">R$ 15,00 - R$ 30,00</option>
                    <option value="30+">Acima de R$ 30,00</option>
                  </select>
                </div>

                {/* Ordenar por */}
                <div className="space-y-2">
                  <label className="text-sm text-gray-600">Ordenar por</label>
                  <select
                    value={advancedFilters.sortBy}
                    onChange={(e) =>
                      setAdvancedFilters((prev) => ({ ...prev, sortBy: e.target.value }))
                    }
                    className="w-full rounded-lg border-gray-200 shadow-sm focus:border-blue-500 focus:ring-blue-500"
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

          {/* Relatório Exibido */}
          {report && !isLoading && !isReportEmpty && (
            <div className="p-6 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card 1: Total de Pedidos */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-sm relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <p className="text-blue-100">Total de Pedidos</p>
                      <TrendingUp className="h-5 w-5 text-blue-100" />
                    </div>
                    <p className="text-4xl font-bold mt-4">{report.total_orders}</p>
                  </div>
                  <div className="absolute right-0 bottom-0 opacity-10">
                    <TrendingUp className="h-24 w-24 -rotate-12" />
                  </div>
                </div>

                {/* Card 2: Receita Total */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-sm relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <p className="text-green-100">Receita Total</p>
                      <DollarSign className="h-5 w-5 text-green-100" />
                    </div>
                    <p className="text-4xl font-bold mt-4">
                      {formatCurrency(report.total_revenue || 0)}
                    </p>
                  </div>
                  <div className="absolute right-0 bottom-0 opacity-10">
                    <DollarSign className="h-24 w-24 -rotate-12" />
                  </div>
                </div>

                {/* Card 3: Itens Vendidos */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-sm relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center justify-between">
                      <p className="text-purple-100">Itens Vendidos</p>
                      <Package className="h-5 w-5 text-purple-100" />
                    </div>
                    <p className="text-4xl font-bold mt-4">{report.items_sold}</p>
                  </div>
                  <div className="absolute right-0 bottom-0 opacity-10">
                    <Package className="h-24 w-24 -rotate-12" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Produtos Mais Vendidos
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                          Produto
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                          Quantidade
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">
                          Receita
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.topProducts.map((product, index) => (
                        <tr
                          key={index}
                          className="border-t border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-6 py-4 text-gray-900">{product.name}</td>
                          <td className="px-6 py-4 text-gray-900">{product.quantity}</td>
                          <td className="px-6 py-4 text-gray-900">
                            {formatCurrency(product.revenue)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Caso não haja resultados */}
          {report && !isLoading && isReportEmpty && (
            <div className="p-12 flex flex-col items-center justify-center text-center">
              <div className="bg-yellow-50 rounded-full p-3 mb-4">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Nenhum registro encontrado
              </h3>
              <p className="text-gray-500">
                Não há dados disponíveis para o período selecionado.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
