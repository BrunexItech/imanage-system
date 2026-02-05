import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createJSONStorage } from 'zustand/middleware';

// Shopping cart store for POS
export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      
      // Add item to cart
      addItem: (product, quantity = 1) => {
        const items = [...get().items];
        const existingIndex = items.findIndex(item => item.product.id === product.id);
        
        if (existingIndex >= 0) {
          items[existingIndex].quantity += quantity;
        } else {
          items.push({
            product,
            quantity,
            unitPrice: product.selling_price,
            costPrice: product.cost_price,
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
        const items = get().items.map(item =>
          item.product.id === productId ? { ...item, quantity } : item
        );
        set({ items });
      },
      
      // Clear cart
      clearCart: () => set({ items: [] }),
      
      // Calculate subtotal
      getSubtotal: () => {
        return get().items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      },
      
      // Calculate total items
      getTotalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);