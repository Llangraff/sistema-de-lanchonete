import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import { Customers } from './pages/Customers'; // Importação corrigida

const App: React.FC = () => {
  return (
    <Router>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <div className="fixed inset-y-0">
          <Sidebar />
        </div>
        <div className="flex-1 ml-64">
          <main className="h-screen overflow-y-auto">
            <div className="container mx-auto px-6 py-8">
              <Routes>
                <Route path="/" element={<Orders />} />
                <Route path="/products" element={<Products />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/customers" element={<Customers />} />
              </Routes>
            </div>
          </main>
        </div>
      </div>
    </Router>
  );
};

export default App;
