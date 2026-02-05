import React from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Divider,
  Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useCartStore } from '../stores/cartStore';
import { salesAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { syncService } from '../services/syncService';

export default function Cart({ onCheckoutSuccess }) {
  const { items, removeItem, updateQuantity, getSubtotal, clearCart } = useCartStore();
  const { user, business } = useAuthStore();

  const handleCheckout = async () => {
    if (items.length === 0) return;

    const subtotal = getSubtotal();
    const taxRate = business?.tax_rate || 16.0;
    const taxAmount = (subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;

    console.log('Business from auth store:', business);
    console.log('Business ID:', business?.id);

    const saleData = {
      business: business?.id || 1,
      receipt_number: `REC${Date.now()}`,
      customer_name: '',
      customer_phone: '',
      subtotal: subtotal.toFixed(2),
      tax_amount: taxAmount.toFixed(2),
      discount_amount: 0,
      total_amount: totalAmount.toFixed(2),
      amount_paid: totalAmount.toFixed(2),
      change_given: 0,
      items: items.map(item => ({
        product: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        cost_price: item.costPrice,
      })),
      is_offline_sale: !navigator.onLine,
      offline_id: `offline_${Date.now()}`,
    };

    try {
      const result = await syncService.queueSale(saleData);
      
      if (result.success) {
        clearCart();
        if (onCheckoutSuccess) onCheckoutSuccess(result);
        
        // Show success message
        alert(result.synced ? 'Sale completed!' : 'Sale saved offline - will sync later');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Checkout failed: ' + error.message);
    }
  };

  if (items.length === 0) {
    return (
      <Paper elevation={3} sx={{ p: 3, height: '100%' }}>
        <Typography variant="h6" gutterBottom>
          Cart
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Add products to cart
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h6" gutterBottom>
        Cart ({items.reduce((sum, item) => sum + item.quantity, 0)} items)
      </Typography>
      
      <List sx={{ flexGrow: 1, overflow: 'auto' }}>
        {items.map((item) => (
          <ListItem
            key={item.product.id}
            secondaryAction={
              <Box>
                <IconButton
                  size="small"
                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                >
                  <RemoveIcon />
                </IconButton>
                <Typography component="span" sx={{ mx: 1 }}>
                  {item.quantity}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                >
                  <AddIcon />
                </IconButton>
                <IconButton
                  edge="end"
                  onClick={() => removeItem(item.product.id)}
                  sx={{ ml: 1 }}
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            }
          >
            <ListItemText
              primary={item.product.name}
              secondary={`KES ${item.unitPrice} × ${item.quantity} = KES ${(item.unitPrice * item.quantity).toFixed(2)}`}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />
      
      <Box sx={{ mt: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography>Subtotal:</Typography>
          <Typography fontWeight="bold">KES {getSubtotal().toFixed(2)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography>Tax ({(business?.tax_rate || 16)}%):</Typography>
          <Typography>KES {((getSubtotal() * (business?.tax_rate || 16)) / 100).toFixed(2)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h6">Total:</Typography>
          <Typography variant="h6" color="primary">
            KES {(getSubtotal() + (getSubtotal() * (business?.tax_rate || 16)) / 100).toFixed(2)}
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleCheckout}
          disabled={false}
        >
          {navigator.onLine ? 'Process Sale' : 'Save Offline'}
        </Button>
        
        <Button
          variant="outlined"
          fullWidth
          sx={{ mt: 1 }}
          onClick={clearCart}
        >
          Clear Cart
        </Button>
      </Box>
    </Paper>
  );
}