
import { Link, useLocation } from 'react-router-dom';
import { ClipboardList, Package, BarChart2, BoxIcon } from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();

  const links = [
    { path: '/', label: 'Comandas', icon: ClipboardList },
    { path: '/products', label: 'Produtos', icon: Package },
    { path: '/inventory', label: 'Estoque', icon: BoxIcon },
    { path: '/reports', label: 'Relatórios', icon: BarChart2 }
  ];

  return (
    <div className="w-64 bg-gradient-to-b from-blue-800 to-blue-900 text-white h-full flex flex-col">
      <div className="p-6">
        <h1 className="text-2xl font-bold">Espetinhos Manager</h1>
        <p className="text-blue-200 text-sm mt-1">Sistema de Gestão v1.0</p>
      </div>
      
      <nav className="flex-1 p-6 space-y-2">
        {links.map(({ path, label, icon: Icon }) => (
          <Link
            key={path}
            to={path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
              location.pathname === path
                ? 'bg-blue-700 text-white'
                : 'text-blue-100 hover:bg-blue-700/50'
            }`}
          >
            <Icon size={20} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}