import React, { useState } from 'react';
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
  TextField,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { useCartStore } from '../stores/cartStore';
import { syncService } from '../services/syncService';
import { useAuthStore } from '../stores/authStore';

export default function Cart({ onCheckoutSuccess }) {
  const { items, removeItem, updateQuantity, getSubtotal, clearCart } = useCartStore();
  const { business } = useAuthStore();
  
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [tenderAmount, setTenderAmount] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);

  const subtotal = getSubtotal();
  const totalAmount = subtotal; // No tax added

  const calculateChange = (tender) => {
    const tenderNum = parseFloat(tender) || 0;
    const change = tenderNum - totalAmount;
    setChangeAmount(change > 0 ? change : 0);
  };

  const handleTenderChange = (e) => {
    const value = e.target.value;
    setTenderAmount(value);
    calculateChange(value);
  };

  const handlePaymentMethodChange = (event, newMethod) => {
    if (newMethod !== null) {
      setPaymentMethod(newMethod);
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;
    
    // Validate tender amount
    const tenderNum = parseFloat(tenderAmount) || 0;
    if (paymentMethod === 'cash' && tenderNum < totalAmount) {
      alert('Tender amount is less than total');
      return;
    }

    const saleData = {
      business: business?.id || 1,
      receipt_number: `REC${Date.now()}`,
      customer_name: '',
      customer_phone: '',
      subtotal: subtotal.toFixed(2),
      tax_amount: '0.00', // No tax
      discount_amount: 0,
      total_amount: totalAmount.toFixed(2),
      amount_paid: paymentMethod === 'cash' ? tenderNum.toFixed(2) : totalAmount.toFixed(2),
      change_given: paymentMethod === 'cash' ? changeAmount.toFixed(2) : 0,
      payment_method: paymentMethod,
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
        setTenderAmount('');
        setChangeAmount(0);
        if (onCheckoutSuccess) onCheckoutSuccess(result);
        
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
      
      <List sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
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
      
      {/* Order Summary */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography>Subtotal:</Typography>
          <Typography fontWeight="bold">KES {subtotal.toFixed(2)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6">Total:</Typography>
          <Typography variant="h6" color="primary">
            KES {totalAmount.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* Payment Method */}
      <Typography variant="subtitle2" gutterBottom>
        Payment Method
      </Typography>
      <ToggleButtonGroup
        value={paymentMethod}
        exclusive
        onChange={handlePaymentMethodChange}
        fullWidth
        sx={{ mb: 2 }}
      >
        <ToggleButton value="cash" size="small">
          Cash
        </ToggleButton>
        <ToggleButton value="mobile_money" size="small">
          Mobile Money
        </ToggleButton>
        <ToggleButton value="card" size="small">
          Card
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Tender Amount & Change */}
      {paymentMethod === 'cash' && (
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Tender Amount"
            type="number"
            value={tenderAmount}
            onChange={handleTenderChange}
            InputProps={{ startAdornment: 'KES ' }}
            size="small"
            sx={{ mb: 1 }}
          />
          {changeAmount > 0 && (
            <Typography variant="body2" color="success.main">
              Change: KES {changeAmount.toFixed(2)}
            </Typography>
          )}
          {tenderAmount && parseFloat(tenderAmount) < totalAmount && (
            <Typography variant="body2" color="error">
              Amount insufficient
            </Typography>
          )}
        </Box>
      )}

      {/* Checkout Buttons */}
      <Box sx={{ mt: 'auto' }}>
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleCheckout}
          sx={{ mb: 1 }}
        >
          {navigator.onLine ? 'Process Sale' : 'Save Offline'}
        </Button>
        
        <Button
          variant="outlined"
          fullWidth
          onClick={clearCart}
        >
          Clear Cart
        </Button>
      </Box>
    </Paper>
  );
}