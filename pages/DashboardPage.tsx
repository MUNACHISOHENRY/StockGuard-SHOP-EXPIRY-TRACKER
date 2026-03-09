import React from 'react';
import Dashboard from '../components/Dashboard';
import { useProducts } from '../hooks/useProducts';

const DashboardPage: React.FC = () => {
    const { data: products = [] } = useProducts();

    return <Dashboard products={products} />;
};

export default DashboardPage;
