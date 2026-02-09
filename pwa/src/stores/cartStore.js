import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Shopping cart store for POS
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      // Add item to cart - FIXED: Extract only serializable properties
      addItem: (product, quantity = 1) => {
        // Extract only serializable properties from product to avoid persist issues
        const serializableProduct = {
          id: product.id,
          name: product.name || '',
          sku: product.sku || '',
          selling_price: Number(product.selling_price) || 0,
          cost_price: Number(product.cost_price) || 0,
          current_stock: product.current_stock || 0,
          minimum_stock: product.minimum_stock || 0,
          barcode: product.barcode || '',
          // Add category info if available
          category: product.category ? 
            (typeof product.category === 'object' ? 
              { id: product.category.id, name: product.category.name } : 
              product.category) 
            : null
        };
        
        const items = [...get().items];
        const existingIndex = items.findIndex(item => item.product.id === product.id);
        
        if (existingIndex >= 0) {
          items[existingIndex].quantity += quantity;
        } else {
          items.push({
            product: serializableProduct,  // Use serializable product instead of full object
            quantity,
            unitPrice: Number(product.selling_price) || 0,
            costPrice: Number(product.cost_price) || 0,
          });
        }
        
        set({ items });
      },
      
      // Remove item from cart
      removeItem: (productId) => {
        set({ items: get().items.filter(item => item.product.id !== productId) });
      },
      
      // Update quantity
      updateQuantity: (productId, quantity) => {
        // Ensure quantity is at least 1
        const newQuantity = Math.max(1, quantity);
        const items = get().items.map(item =>
          item.product.id === productId ? { ...item, quantity: newQuantity } : item
        );
        set({ items });
      },
      
      // Clear cart
      clearCart: () => set({ items: [] }),
      
      // Calculate subtotal
      getSubtotal: () => {
        return get().items.reduce((sum, item) => {
          return sum + (item.unitPrice * item.quantity);
        }, 0);
      },
      
      // Calculate total items
      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
      // FIX: Force localStorage instead of broken IndexedDB
      getStorage: () => localStorage,
      // Optional: Add safe serialization
      partialize: (state) => ({
        items: state.items.map(item => ({
          ...item,
          // Ensure all values are serializable
          product: {
            ...item.product,
            selling_price: Number(item.product.selling_price) || 0,
            cost_price: Number(item.product.cost_price) || 0,
            current_stock: Number(item.product.current_stock) || 0,
            minimum_stock: Number(item.product.minimum_stock) || 0
          },
          unitPrice: Number(item.unitPrice) || 0,
          costPrice: Number(item.costPrice) || 0
        }))
      }),
    }
  )
);