import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Product } from '../types';

const STORAGE_KEY = 'stockguard_inventory';

const persistProducts = (products: Product[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
};

export const useMutateProducts = () => {
    const queryClient = useQueryClient();
    const queryKey = ['products'];

    const addProduct = useMutation({
        mutationFn: async (product: Product) => product,
        onMutate: async (newProduct) => {
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<Product[]>(queryKey);
            const updated = previous ? [newProduct, ...previous] : [newProduct];
            queryClient.setQueryData<Product[]>(queryKey, updated);
            persistProducts(updated);
            return { previous };
        },
        onError: (_err, _newProduct, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous);
                persistProducts(context.previous);
            }
        },
    });

    const updateProduct = useMutation({
        mutationFn: async (updatedProduct: Product) => updatedProduct,
        onMutate: async (updatedProduct) => {
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<Product[]>(queryKey);
            const updated = previous ? previous.map(p => p.id === updatedProduct.id ? updatedProduct : p) : [];
            queryClient.setQueryData<Product[]>(queryKey, updated);
            persistProducts(updated);
            return { previous };
        },
        onError: (_err, _updatedProduct, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous);
                persistProducts(context.previous);
            }
        },
    });

    const deleteProduct = useMutation({
        mutationFn: async (id: string) => id,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<Product[]>(queryKey);
            const updated = previous ? previous.filter(p => p.id !== id) : [];
            queryClient.setQueryData<Product[]>(queryKey, updated);
            persistProducts(updated);
            return { previous };
        },
        onError: (_err, _id, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous);
                persistProducts(context.previous);
            }
        },
    });

    const updateQuantity = useMutation({
        mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => ({ id, quantity }),
        onMutate: async ({ id, quantity }) => {
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<Product[]>(queryKey);
            const updated = previous ? previous.map(p => p.id === id ? { ...p, quantity } : p) : [];
            queryClient.setQueryData<Product[]>(queryKey, updated);
            persistProducts(updated);
            return { previous };
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) {
                queryClient.setQueryData(queryKey, context.previous);
                persistProducts(context.previous);
            }
        },
    });

    return {
        addProduct: addProduct.mutateAsync,
        updateProduct: updateProduct.mutateAsync,
        deleteProduct: deleteProduct.mutateAsync,
        updateQuantity: updateQuantity.mutateAsync,
    };
};
