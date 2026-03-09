import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import InventoryList from '../components/InventoryList';
import { MainLayoutContext } from '../components/layouts/MainLayout';
import { useMutateProducts } from '../hooks/useMutateProducts';
import { useProducts } from '../hooks/useProducts';
import { Product } from '../types';

const InventoryPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useOutletContext<MainLayoutContext>();
    const { data: products = [] } = useProducts();
    const { deleteProduct, updateQuantity } = useMutateProducts();

    const handleDeleteItem = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        const itemName = products.find(p => p.id === id)?.name || 'Item';
        try {
            await deleteProduct(id);
            addToast('info', `"${itemName}" removed from inventory`);
        } catch {
            addToast('error', "Failed to delete item.");
        }
    };

    const handleUpdateQuantity = async (id: string, newQuantity: number) => {
        try {
            await updateQuantity({ id, quantity: newQuantity });
        } catch {
            addToast('error', "Failed to update quantity.");
        }
    };

    const handleProductSelect = (product: Product) => {
        navigate(`/inventory/${product.id}`);
    };

    return (
        <InventoryList
            products={products}
            onDelete={handleDeleteItem}
            onUpdateQuantity={handleUpdateQuantity}
            onSelectProduct={handleProductSelect}
            onAddItem={() => navigate('/inventory/add')}
        />
    );
};

export default InventoryPage;
