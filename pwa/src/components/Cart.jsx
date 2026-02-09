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

  // Your existing checkout logic - unchanged
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
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom color="primary">
          🛒 Cart Empty
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Add products from the products panel
        </Typography>
        <Chip 
          label={navigator.onLine ? '🟢 Online' : '🟡 Offline'} 
          size="small"
          color={navigator.onLine ? 'success' : 'default'}
          variant="outlined"
        />
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
      {/* Cart Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight="bold" color="primary">
            Order Summary
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {items.length} {items.length === 1 ? 'item' : 'items'} in cart
          </Typography>
        </Box>
        <Chip 
          label={navigator.onLine ? 'Online' : 'Offline'} 
          size="small"
          color={navigator.onLine ? 'success' : 'default'}
          variant="outlined"
        />
      </Box>
      
      {/* Cart Items - Scrollable with fixed height */}
      <Box sx={{ 
        mb: 2, 
        border: '1px solid', 
        borderColor: 'grey.200', 
        borderRadius: 1,
        overflow: 'hidden'
      }}>
        <List sx={{ 
          maxHeight: 250, 
          overflowY: 'auto',
          p: 0,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: '#f1f1f1' },
          '&::-webkit-scrollbar-thumb': { background: '#888', borderRadius: 3 },
        }}>
          {items.map((item) => (
            <ListItem
              key={item.product.id}
              sx={{
                borderBottom: '1px solid',
                borderColor: 'grey.100',
                py: 1.5,
                '&:last-child': { borderBottom: 0 }
              }}
              secondaryAction={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton
                    size="small"
                    onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                    sx={{ 
                      border: '1px solid', 
                      borderColor: 'grey.300',
                      width: 30,
                      height: 30,
                    }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  
                  <Typography sx={{ 
                    minWidth: 24, 
                    textAlign: 'center', 
                    fontWeight: 'bold',
                    color: 'primary.main'
                  }}>
                    {item.quantity}
                  </Typography>
                  
                  <IconButton
                    size="small"
                    onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                    sx={{ 
                      border: '1px solid', 
                      borderColor: 'grey.300',
                      width: 30,
                      height: 30,
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <Typography variant="body2" fontWeight="medium" noWrap sx={{ maxWidth: 150 }}>
                    {item.product.name}
                  </Typography>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="caption" color="textSecondary">
                      KES {Number(item.unitPrice).toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">×</Typography>
                    <Typography variant="caption" color="textSecondary">{item.quantity}</Typography>
                    <Typography variant="caption" color="textSecondary">=</Typography>
                    <Typography variant="body2" fontWeight="bold" color="primary">
                      KES {(Number(item.unitPrice) * item.quantity).toFixed(2)}
                    </Typography>
                  </Box>
                }
                sx={{ pr: 12 }}
              />
              <IconButton
                size="small"
                onClick={() => removeItem(item.product.id)}
                sx={{ 
                  ml: 1,
                  color: 'error.main',
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Order Summary */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body1">Subtotal:</Typography>
          <Typography variant="body1" fontWeight="bold">
            KES {subtotal.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          p: 1.5,
          bgcolor: 'primary.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'primary.100'
        }}>
          <Typography variant="h6">Total:</Typography>
          <Typography variant="h5" fontWeight="bold" color="primary">
            KES {totalAmount.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Payment Method */}
      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
        Payment Method
      </Typography>
      <ToggleButtonGroup
        value={paymentMethod}
        exclusive
        onChange={handlePaymentMethodChange}
        fullWidth
        sx={{ mb: 2 }}
      >
        <ToggleButton 
          value="cash" 
          sx={{ 
            py: 1,
            '&.Mui-selected': { 
              bgcolor: 'primary.main', 
              color: 'white',
            }
          }}
        >
          <AttachMoneyIcon sx={{ mr: 1 }} />
          Cash
        </ToggleButton>
        <ToggleButton 
          value="mobile_money" 
          sx={{ 
            py: 1,
            '&.Mui-selected': { 
              bgcolor: 'secondary.main', 
              color: 'white',
            }
          }}
        >
          <AccountBalanceWalletIcon sx={{ mr: 1 }} />
          M-Pesa
        </ToggleButton>
        <ToggleButton 
          value="card" 
          sx={{ 
            py: 1,
            '&.Mui-selected': { 
              bgcolor: 'success.main', 
              color: 'white',
            }
          }}
        >
          <CreditCardIcon sx={{ mr: 1 }} />
          Card
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Tender Amount & Change - Only for Cash */}
      {paymentMethod === 'cash' && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom fontWeight="medium">
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
                    bgcolor: 'grey.900', 
                    color: 'white', 
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 0.5,
                    fontWeight: 'bold',
                    fontSize: '0.875rem'
                  }}>
                    KES
                  </Box>
                </InputAdornment>
              ),
              sx: { 
                '& input': { 
                  fontWeight: 'bold',
                  textAlign: 'right',
                  fontSize: '1.1rem'
                }
              }
            }}
            sx={{ mb: 1 }}
          />
          
          {changeAmount > 0 && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              p: 1.5,
              bgcolor: 'success.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'success.200'
            }}>
              <Typography variant="body2" fontWeight="medium">
                Change Due:
              </Typography>
              <Typography variant="body1" fontWeight="bold" color="success.main">
                KES {changeAmount.toFixed(2)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Checkout Buttons */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleCheckout}
          sx={{ 
            py: 1.5,
            fontWeight: 'bold',
            fontSize: '1rem',
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
            borderColor: 'grey.400',
            color: 'text.secondary',
          }}
        >
          Clear Cart
        </Button>
      </Box>
    </Paper>
  );
}