import { businessAPI } from './api';

class ReceiptService {
  constructor() {
    this.businessData = null;
  }

  async loadBusinessData() {
    try {
      const response = await businessAPI.getBusiness();
      this.businessData = response.data[0] || response.data;
      return this.businessData;
    } catch (error) {
      console.error('Failed to load business data:', error);
      return null;
    }
  }

  getBusinessData() {
    return this.businessData;
  }

  formatCurrency(amount) {
    return `KES ${parseFloat(amount).toFixed(2)}`;
  }

  formatDate(date) {
    return new Date(date).toLocaleString('en-KE', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  }

  generateReceiptNumber() {
    return 'R' + Date.now().toString().slice(-8);
  }

  generateReceiptData(sale, items, business) {
    return {
      business: {
        name: business?.name || 'Business Name',
        address: business?.address || '',
        phone: business?.phone || '',
        email: business?.email || '',
        tax_rate: business?.tax_rate || 16,
        footer: business?.receipt_footer || 'Thank you for your business!'
      },
      sale: {
        receipt_number: sale.receipt_number || this.generateReceiptNumber(),
        date: this.formatDate(sale.created_at || new Date()),
        cashier: sale.cashier?.name || 'Staff',
        customer_name: sale.customer_name || 'Walk-in Customer',
        customer_phone: sale.customer_phone || '',
      },
      items: items.map(item => ({
        name: item.product_name || item.name,
        quantity: item.quantity,
        price: item.unit_price || item.price,
        total: item.total_price || (item.quantity * (item.unit_price || item.price))
      })),
      totals: {
        subtotal: sale.subtotal || items.reduce((sum, item) => sum + (item.total_price || 0), 0),
        tax: sale.tax_amount || 0,
        discount: sale.discount_amount || 0,
        total: sale.total_amount || items.reduce((sum, item) => sum + (item.total_price || 0), 0),
        paid: sale.amount_paid || 0,
        change: sale.change_given || 0
      }
    };
  }
}

export default new ReceiptService();