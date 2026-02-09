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
  InputAdornment,
  Chip,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import CreditCardIcon from '@mui/icons-material/CreditCard';
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
  const totalAmount = subtotal;

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
      tax_amount: '0.00',
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
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom align="center">
          🛒 Cart Empty
        </Typography>
        <Typography variant="body2" color="textSecondary" align="center">
          Add products from the products panel
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2 }}>
      {/* Cart Header - SIMPLIFIED */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          Cart ({items.reduce((sum, item) => sum + item.quantity, 0)} items)
        </Typography>
        <Chip 
          label={navigator.onLine ? 'Online' : 'Offline'} 
          size="small"
          color={navigator.onLine ? 'success' : 'default'}
          variant="outlined"
        />
      </Box>
      
      {/* Cart Items List - FIXED LAYOUT */}
      <List sx={{ mb: 2, maxHeight: 300, overflow: 'auto' }}>
        {items.map((item) => (
          <ListItem
            key={item.product.id}
            sx={{ py: 1 }}
            secondaryAction={
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton
                  size="small"
                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
                
                <Typography sx={{ mx: 1, minWidth: 24, textAlign: 'center', fontWeight: 'bold' }}>
                  {item.quantity}
                </Typography>
                
                <IconButton
                  size="small"
                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                
                <IconButton
                  edge="end"
                  onClick={() => removeItem(item.product.id)}
                  sx={{ ml: 1, color: 'error.main' }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            <ListItemText
              primary={
                <Typography variant="body2" fontWeight="medium">
                  {item.product.name}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="textSecondary">
                  KES {(Number(item.unitPrice) || 0).toFixed(2)} × {item.quantity} = 
                  <Typography component="span" fontWeight="bold" color="primary" sx={{ ml: 0.5 }}>
                    KES {(Number(item.unitPrice) * item.quantity || 0).toFixed(2)}
                  </Typography>
                </Typography>
              }
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />
      
      {/* Order Summary */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body1">Subtotal:</Typography>
          <Typography variant="body1" fontWeight="bold">
            KES {subtotal.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Total:</Typography>
          <Typography variant="h6" fontWeight="bold" color="primary">
            KES {totalAmount.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* Payment Method - SIMPLIFIED */}
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
          <AttachMoneyIcon sx={{ mr: 1, fontSize: 16 }} />
          Cash
        </ToggleButton>
        <ToggleButton value="mobile_money" size="small">
          <AccountBalanceWalletIcon sx={{ mr: 1, fontSize: 16 }} />
          M-Pesa
        </ToggleButton>
        <ToggleButton value="card" size="small">
          <CreditCardIcon sx={{ mr: 1, fontSize: 16 }} />
          Card
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Tender Amount & Change - SIMPLIFIED */}
      {paymentMethod === 'cash' && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Tender Amount
          </Typography>
          <TextField
            fullWidth
            type="number"
            value={tenderAmount}
            onChange={handleTenderChange}
            placeholder="0.00"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    KES
                  </Typography>
                </InputAdornment>
              ),
            }}
            size="small"
            sx={{ mb: 1 }}
          />
          
          {changeAmount > 0 && (
            <Box sx={{ p: 1, bgcolor: 'success.light', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight="medium" color="success.dark">
                Change Due: KES {changeAmount.toFixed(2)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Checkout Buttons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Button
          variant="contained"
          fullWidth
          size="medium"
          onClick={handleCheckout}
          sx={{ fontWeight: 'bold' }}
        >
          {navigator.onLine ? 'PROCESS SALE' : 'SAVE OFFLINE'}
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