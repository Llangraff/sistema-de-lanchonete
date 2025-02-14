import { Link, useLocation } from 'react-router-dom';
import { ClipboardList, Package, BarChart2, BoxIcon, User } from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();

  const links = [
    { path: '/', label: 'Comandas', icon: ClipboardList },
    { path: '/products', label: 'Produtos', icon: Package },
    { path: '/inventory', label: 'Estoque', icon: BoxIcon },
    { path: '/reports', label: 'Relatórios', icon: BarChart2 },
    { path: '/customers', label: 'Clientes', icon: User }
  ];

  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-blue-800 to-blue-900 text-white flex flex-col shadow-lg">
      <div className="p-6 border-b border-blue-700">
        <h1 className="text-2xl font-bold">Langraff Sistemas</h1>
        <p className="text-blue-300 text-sm mt-1">Sistema de Gestão v2.0</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-1">
          {links.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            return (
              <li key={path}>
                <Link
                  to={path}
                  className={`flex items-center p-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-700 text-white shadow-md'
                      : 'text-blue-200 hover:bg-blue-700 hover:text-white'
                  }`}
                >
                  <Icon size={20} className="mr-3 transition-transform duration-200 transform hover:scale-110" />
                  <span className="font-medium">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-6 border-t border-blue-700">
        <p className="text-xs text-blue-300">
          © {new Date().getFullYear()} Espetinhos Manager
        </p>
      </div>
    </aside>
  );
}
