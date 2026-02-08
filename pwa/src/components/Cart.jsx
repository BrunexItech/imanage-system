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
      <Paper elevation={3} sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="h6" gutterBottom>
          🛒 Cart Empty
        </Typography>
        <Typography variant="body2" color="textSecondary" align="center">
          Add products from the left panel
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2.5, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Cart Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          Cart ({items.reduce((sum, item) => sum + item.quantity, 0)} items)
        </Typography>
        <Chip 
          label={navigator.onLine ? '🟢 Online' : '🟡 Offline'} 
          size="small"
          color={navigator.onLine ? 'success' : 'warning'}
          variant="outlined"
        />
      </Box>
      
      {/* Cart Items List */}
      <List sx={{ flexGrow: 1, overflow: 'auto', mb: 2, bgcolor: 'grey.50', borderRadius: 1, p: 1 }}>
        {items.map((item) => (
          <ListItem
            key={item.product.id}
            sx={{
              bgcolor: 'white',
              mb: 1,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200',
            }}
            secondaryAction={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  size="small"
                  onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                  sx={{ 
                    border: '1px solid', 
                    borderColor: 'grey.300',
                    width: 28,
                    height: 28,
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  <RemoveIcon fontSize="small" />
                </IconButton>
                
                <Typography component="span" sx={{ mx: 1, minWidth: 24, textAlign: 'center', fontWeight: 'bold' }}>
                  {item.quantity}
                </Typography>
                
                <IconButton
                  size="small"
                  onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                  sx={{ 
                    border: '1px solid', 
                    borderColor: 'grey.300',
                    width: 28,
                    height: 28,
                    '&:hover': { bgcolor: 'grey.100' }
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                
                <IconButton
                  edge="end"
                  onClick={() => removeItem(item.product.id)}
                  sx={{ 
                    ml: 1,
                    color: 'error.main',
                    '&:hover': { bgcolor: 'error.light' }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            <ListItemText
              primary={
                <Typography variant="body2" fontWeight="medium" noWrap>
                  {item.product.name}
                </Typography>
              }
              secondary={
                <Typography variant="caption" color="textSecondary">
                  KES {parseFloat(item.unitPrice).toFixed(2)} × {item.quantity} = 
                  <Typography component="span" fontWeight="bold" color="primary" sx={{ ml: 0.5 }}>
                    KES {(item.unitPrice * item.quantity).toFixed(2)}
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="body1">Subtotal:</Typography>
          <Typography variant="body1" fontWeight="bold">
            KES {subtotal.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Total:</Typography>
          <Typography variant="h5" fontWeight="bold" color="primary">
            KES {totalAmount.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* Payment Method */}
      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
        Payment Method
      </Typography>
      <ToggleButtonGroup
        value={paymentMethod}
        exclusive
        onChange={handlePaymentMethodChange}
        fullWidth
        sx={{ mb: 3 }}
      >
        <ToggleButton 
          value="cash" 
          sx={{ 
            py: 1,
            '&.Mui-selected': { 
              bgcolor: 'primary.main', 
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' }
            }
          }}
        >
          <AttachMoneyIcon sx={{ mr: 1, fontSize: 18 }} />
          Cash
        </ToggleButton>
        <ToggleButton 
          value="mobile_money" 
          sx={{ 
            py: 1,
            '&.Mui-selected': { 
              bgcolor: 'secondary.main', 
              color: 'white',
              '&:hover': { bgcolor: 'secondary.dark' }
            }
          }}
        >
          <AccountBalanceWalletIcon sx={{ mr: 1, fontSize: 18 }} />
          M-Pesa
        </ToggleButton>
        <ToggleButton 
          value="card" 
          sx={{ 
            py: 1,
            '&.Mui-selected': { 
              bgcolor: 'success.main', 
              color: 'white',
              '&:hover': { bgcolor: 'success.dark' }
            }
          }}
        >
          <CreditCardIcon sx={{ mr: 1, fontSize: 18 }} />
          Card
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Tender Amount & Change */}
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
                  <Box sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white', 
                    p: '4px 8px', 
                    borderRadius: 1,
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}>
                    KES
                  </Box>
                </InputAdornment>
              ),
              sx: { 
                '& input': { 
                  fontSize: '1.1rem', 
                  fontWeight: 'bold',
                  textAlign: 'right'
                }
              }
            }}
            size="medium"
            sx={{ mb: 1.5 }}
          />
          
          {changeAmount > 0 && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              p: 1.5,
              bgcolor: 'success.light',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'success.main'
            }}>
              <Typography variant="body2" fontWeight="medium">
                Change Due:
              </Typography>
              <Typography variant="body1" fontWeight="bold" color="success.dark">
                KES {changeAmount.toFixed(2)}
              </Typography>
            </Box>
          )}
          
          {tenderAmount && parseFloat(tenderAmount) < totalAmount && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mt: 1,
              p: 1,
              bgcolor: 'error.light',
              borderRadius: 1
            }}>
              <Typography variant="body2" color="error.main" fontWeight="medium">
                ⚠️ Amount insufficient by KES {(totalAmount - parseFloat(tenderAmount)).toFixed(2)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Checkout Buttons */}
      <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleCheckout}
          sx={{ 
            py: 1.5,
            fontSize: '1rem',
            fontWeight: 'bold',
            boxShadow: 2,
            '&:hover': { boxShadow: 4 }
          }}
        >
          {navigator.onLine ? 'PROCESS SALE' : 'SAVE OFFLINE'}
        </Button>
        
        <Button
          variant="outlined"
          fullWidth
          onClick={clearCart}
          sx={{ 
            py: 1,
            borderWidth: 2,
            '&:hover': { borderWidth: 2 }
          }}
        >
          Clear Cart
        </Button>
      </Box>
    </Paper>
  );
}