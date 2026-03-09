import { PackageOpen } from 'lucide-react';
import React from 'react';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { MainLayoutContext } from '../components/layouts/MainLayout';
import ProductDetails from '../components/ProductDetails';
import { useMutateProducts } from '../hooks/useMutateProducts';
import { useProducts } from '../hooks/useProducts';
import { Product } from '../types';

const ProductDetailsPage: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { addToast } = useOutletContext<MainLayoutContext>();

    const { data: products = [] } = useProducts();
    const { updateProduct, updateQuantity } = useMutateProducts();

    const product = products.find(p => p.id === id);

    const handleUpdateProduct = async (updatedProduct: Product) => {
        try {
            await updateProduct(updatedProduct);
            addToast('success', `"${updatedProduct.name}" updated`);
        } catch {
            addToast('error', "Failed to update product.");
        }
    };

    const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
        try {
            await updateQuantity({ id: productId, quantity: newQuantity });
        } catch {
            addToast('error', "Failed to update quantity.");
        }
    };

    if (!product) {
        return (
            <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
                <PackageOpen size={48} className="text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Product Not Found</h3>
                <p className="text-sm text-gray-500 mb-6 max-w-sm text-center">
                    The product you're looking for doesn't exist or has been deleted from your inventory.
                </p>
                <button
                    onClick={() => navigate('/inventory')}
                    className="px-6 py-2.5 bg-primary-600 text-white font-bold rounded-xl shadow-sm hover:bg-primary-700 hover:shadow-md transition-all active:scale-95"
                >
                    Return to Inventory
                </button>
            </div>
        );
    }

    return (
        <ProductDetails
            product={product}
            allProducts={products}
            onBack={() => navigate('/inventory')}
            onUpdateProduct={handleUpdateProduct}
            onUpdateQuantity={handleUpdateQuantity}
            onSelectProduct={(p) => navigate(`/inventory/${p.id}`)}
        />
    );
};

export default ProductDetailsPage;
