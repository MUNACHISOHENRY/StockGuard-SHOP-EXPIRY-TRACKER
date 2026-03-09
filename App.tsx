import React from 'react';
import { Route, Routes } from 'react-router-dom';
import MainLayout from './components/layouts/MainLayout';

// Pages
import AddItemPage from './pages/AddItemPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import ProductDetailsPage from './pages/ProductDetailsPage';

const App: React.FC = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/add" element={<AddItemPage />} />
        <Route path="/inventory/:id" element={<ProductDetailsPage />} />
      </Route>
    </Routes>
  );
};

export default App;