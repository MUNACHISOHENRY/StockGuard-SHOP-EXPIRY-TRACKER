import {
    collection,
    deleteDoc,
    doc,
    DocumentData,
    onSnapshot,
    QuerySnapshot,
    setDoc,
    updateDoc
} from 'firebase/firestore';
import { Product } from '../types';
import { getDb } from './firebaseConfig';

const COLLECTION_NAME = 'products';

/**
 * Subscribe to real-time product updates from Firestore.
 * Returns an unsubscribe function.
 */
export const subscribeToProducts = (
    onUpdate: (products: Product[]) => void,
    onError?: (error: Error) => void
): (() => void) => {
    const db = getDb();
    const colRef = collection(db, COLLECTION_NAME);

    const unsubscribe = onSnapshot(
        colRef,
        (snapshot: QuerySnapshot<DocumentData>) => {
            const products: Product[] = snapshot.docs.map((doc) => ({
                ...(doc.data() as Omit<Product, 'id'>),
                id: doc.id,
            }));
            onUpdate(products);
        },
        (error) => {
            console.error('Firestore subscription error:', error);
            onError?.(error);
        }
    );

    return unsubscribe;
};

/**
 * Add a new product to Firestore.
 */
export const addProduct = async (product: Product): Promise<void> => {
    const db = getDb();
    const { id, ...data } = product;
    await setDoc(doc(db, COLLECTION_NAME, id), data);
};

/**
 * Update an existing product in Firestore.
 */
export const updateProduct = async (id: string, data: Partial<Product>): Promise<void> => {
    const db = getDb();
    const { id: _, ...updateData } = data as any;
    await updateDoc(doc(db, COLLECTION_NAME, id), updateData);
};

/**
 * Delete a product from Firestore.
 */
export const deleteProduct = async (id: string): Promise<void> => {
    const db = getDb();
    await deleteDoc(doc(db, COLLECTION_NAME, id));
};

/**
 * Seed demo data into Firestore (used for initial setup or reset).
 */
export const seedDemoData = async (products: Product[]): Promise<void> => {
    const db = getDb();
    const promises = products.map((product) => {
        const { id, ...data } = product;
        return setDoc(doc(db, COLLECTION_NAME, id), data);
    });
    await Promise.all(promises);
};
