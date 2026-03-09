import React from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import AddItem from '../components/AddItem';
import { MainLayoutContext } from '../components/layouts/MainLayout';
import { useMutateProducts } from '../hooks/useMutateProducts';
import { Product } from '../types';

const AddItemPage: React.FC = () => {
    const navigate = useNavigate();
    const { addToast } = useOutletContext<MainLayoutContext>();
    const { addProduct } = useMutateProducts();

    const handleAddItem = async (newProduct: Omit<Product, 'id' | 'addedDate'>) => {
        const product: Product = {
            ...newProduct,
            id: crypto.randomUUID(),
            addedDate: new Date().toISOString()
        };

        try {
            await addProduct(product);
            addToast('success', `"${product.name}" added to inventory`);
            navigate('/inventory');
        } catch {
            addToast('error', "Failed to add item.");
        }
    };

    return (
        <AddItem
            onAdd={handleAddItem}
            onCancel={() => navigate('/inventory')}
        />
    );
};

export default AddItemPage;
