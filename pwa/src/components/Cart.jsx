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
  useTheme,
  useMediaQuery,
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
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
      <Paper elevation={3} sx={{ 
        p: 3, 
        height: '100%',
        display: 'flex', 
        flexDirection: 'column', 
        justifyContent: 'center', 
        alignItems: 'center',
        borderRadius: 2
      }}>
        <Typography variant="h6" gutterBottom color="primary" sx={{ mb: 2 }}>
          🛒 Cart Empty
        </Typography>
        <Typography variant="body2" color="textSecondary" align="center">
          Add products from the products panel
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
          <Chip 
            label={navigator.onLine ? '🟢 Online' : '🟡 Offline'} 
            size="small"
            color={navigator.onLine ? 'success' : 'warning'}
            variant="outlined"
            sx={{ mr: 1 }}
          />
          <Typography variant="caption" color="textSecondary">
            Ready to accept payments
          </Typography>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ 
      p: isMobile ? 2 : 2.5, 
      height: '100%',
      display: 'flex', 
      flexDirection: 'column',
      borderRadius: 2
    }}>
      {/* Cart Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: isMobile ? 1.5 : 2 
      }}>
        <Box>
          <Typography variant={isMobile ? "subtitle1" : "h6"} fontWeight="bold" color="primary">
            Shopping Cart
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {items.reduce((sum, item) => sum + item.quantity, 0)} items • KES {subtotal.toFixed(2)}
          </Typography>
        </Box>
        <Chip 
          label={navigator.onLine ? '🟢 Online' : '🟡 Offline'} 
          size={isMobile ? "small" : "medium"}
          color={navigator.onLine ? 'success' : 'warning'}
          variant="outlined"
        />
      </Box>
      
      {/* Cart Items List - Scrollable */}
      <List sx={{ 
        flex: 1, 
        overflowY: 'auto',
        mb: isMobile ? 1.5 : 2, 
        bgcolor: 'grey.50', 
        borderRadius: 1, 
        p: 1,
        '&::-webkit-scrollbar': { width: 6 },
        '&::-webkit-scrollbar-track': { bgcolor: 'grey.100', borderRadius: 3 },
        '&::-webkit-scrollbar-thumb': { bgcolor: 'grey.400', borderRadius: 3 },
      }}>
        {items.map((item) => (
          <ListItem
            key={item.product.id}
            sx={{
              bgcolor: 'white',
              mb: 1,
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200',
              py: isMobile ? 1 : 1.5,
              px: isMobile ? 1 : 1.5,
              transition: 'all 0.2s',
              '&:hover': {
                borderColor: 'primary.light',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.1)',
              },
            }}
            secondaryAction={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <IconButton
                  size={isMobile ? "small" : "medium"}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQuantity(item.product.id, item.quantity - 1);
                  }}
                  sx={{ 
                    border: '1px solid', 
                    borderColor: 'grey.300',
                    width: isMobile ? 28 : 32,
                    height: isMobile ? 28 : 32,
                    bgcolor: 'white',
                    '&:hover': { 
                      bgcolor: 'grey.50',
                      borderColor: 'grey.400'
                    }
                  }}
                >
                  <RemoveIcon fontSize={isMobile ? "small" : "medium"} />
                </IconButton>
                
                <Typography component="span" sx={{ 
                  mx: 1, 
                  minWidth: isMobile ? 24 : 28, 
                  textAlign: 'center', 
                  fontWeight: 'bold',
                  color: 'primary.main',
                  fontSize: isMobile ? '0.875rem' : '1rem'
                }}>
                  {item.quantity}
                </Typography>
                
                <IconButton
                  size={isMobile ? "small" : "medium"}
                  onClick={(e) => {
                    e.stopPropagation();
                    updateQuantity(item.product.id, item.quantity + 1);
                  }}
                  sx={{ 
                    border: '1px solid', 
                    borderColor: 'grey.300',
                    width: isMobile ? 28 : 32,
                    height: isMobile ? 28 : 32,
                    bgcolor: 'white',
                    '&:hover': { 
                      bgcolor: 'grey.50',
                      borderColor: 'grey.400'
                    }
                  }}
                >
                  <AddIcon fontSize={isMobile ? "small" : "medium"} />
                </IconButton>
                
                <IconButton
                  edge="end"
                  size={isMobile ? "small" : "medium"}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeItem(item.product.id);
                  }}
                  sx={{ 
                    ml: 1,
                    color: 'error.main',
                    bgcolor: 'error.light',
                    width: isMobile ? 28 : 32,
                    height: isMobile ? 28 : 32,
                    '&:hover': { 
                      bgcolor: 'error.main',
                      color: 'white'
                    }
                  }}
                >
                  <DeleteIcon fontSize={isMobile ? "small" : "medium"} />
                </IconButton>
              </Box>
            }
          >
            <ListItemText
              primary={
                <Typography 
                  variant={isMobile ? "body2" : "body1"} 
                  fontWeight="medium"
                  sx={{ 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    pr: 2
                  }}
                >
                  {item.product.name}
                </Typography>
              }
              secondary={
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                  <Typography variant={isMobile ? "caption" : "body2"} color="textSecondary">
                    KES {(Number(item.unitPrice) || 0).toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">×</Typography>
                  <Typography variant={isMobile ? "caption" : "body2"} color="textSecondary">
                    {item.quantity}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">=</Typography>
                  <Typography 
                    component="span" 
                    fontWeight="bold" 
                    color="primary" 
                    sx={{ 
                      ml: 0.5,
                      fontSize: isMobile ? '0.875rem' : '1rem'
                    }}
                  >
                    KES {(Number(item.unitPrice) * item.quantity || 0).toFixed(2)}
                  </Typography>
                </Box>
              }
              sx={{ pr: isMobile ? 10 : 14 }}
            />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: isMobile ? 1.5 : 2 }} />
      
      {/* Order Summary */}
      <Box sx={{ mb: isMobile ? 2 : 3 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 1.5 
        }}>
          <Typography variant={isMobile ? "body2" : "body1"}>Subtotal:</Typography>
          <Typography 
            variant={isMobile ? "body2" : "body1"} 
            fontWeight="bold"
            sx={{ fontSize: isMobile ? '1rem' : '1.1rem' }}
          >
            KES {subtotal.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 2,
          p: 1.5,
          bgcolor: 'primary.light',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'primary.main'
        }}>
          <Typography variant={isMobile ? "subtitle1" : "h6"}>Total Amount:</Typography>
          <Typography 
            variant={isMobile ? "h6" : "h5"} 
            fontWeight="bold" 
            color="primary.dark"
            sx={{ fontSize: isMobile ? '1.25rem' : '1.5rem' }}
          >
            KES {totalAmount.toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* Payment Method */}
      <Typography 
        variant={isMobile ? "body2" : "subtitle1"} 
        fontWeight="medium" 
        gutterBottom
        sx={{ color: 'text.primary', mb: 1.5 }}
      >
        Select Payment Method
      </Typography>
      <ToggleButtonGroup
        value={paymentMethod}
        exclusive
        onChange={handlePaymentMethodChange}
        fullWidth
        size={isMobile ? "small" : "medium"}
        sx={{ mb: isMobile ? 2 : 3 }}
      >
        <ToggleButton 
          value="cash" 
          sx={{ 
            py: isMobile ? 0.75 : 1,
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            '&.Mui-selected': { 
              bgcolor: 'primary.main', 
              color: 'white',
              '&:hover': { bgcolor: 'primary.dark' }
            },
            borderColor: 'grey.300'
          }}
        >
          <AttachMoneyIcon sx={{ mr: 1, fontSize: isMobile ? 16 : 18 }} />
          Cash
        </ToggleButton>
        <ToggleButton 
          value="mobile_money" 
          sx={{ 
            py: isMobile ? 0.75 : 1,
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            '&.Mui-selected': { 
              bgcolor: 'secondary.main', 
              color: 'white',
              '&:hover': { bgcolor: 'secondary.dark' }
            },
            borderColor: 'grey.300'
          }}
        >
          <AccountBalanceWalletIcon sx={{ mr: 1, fontSize: isMobile ? 16 : 18 }} />
          M-Pesa
        </ToggleButton>
        <ToggleButton 
          value="card" 
          sx={{ 
            py: isMobile ? 0.75 : 1,
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            '&.Mui-selected': { 
              bgcolor: 'success.main', 
              color: 'white',
              '&:hover': { bgcolor: 'success.dark' }
            },
            borderColor: 'grey.300'
          }}
        >
          <CreditCardIcon sx={{ mr: 1, fontSize: isMobile ? 16 : 18 }} />
          Card
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Tender Amount & Change */}
      {paymentMethod === 'cash' && (
        <Box sx={{ mb: isMobile ? 2 : 3 }}>
          <Typography 
            variant={isMobile ? "caption" : "subtitle2"} 
            gutterBottom
            fontWeight="medium"
            sx={{ color: 'text.primary', mb: 1 }}
          >
            Enter Tender Amount
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
                    p: isMobile ? '3px 8px' : '4px 12px', 
                    borderRadius: 1,
                    fontWeight: 'bold',
                    fontSize: isMobile ? '0.75rem' : '0.875rem',
                    minWidth: 45,
                    textAlign: 'center'
                  }}>
                    KES
                  </Box>
                </InputAdornment>
              ),
              sx: { 
                '& input': { 
                  fontSize: isMobile ? '1rem' : '1.1rem', 
                  fontWeight: 'bold',
                  textAlign: 'right',
                  paddingRight: 2
                },
                borderRadius: 1
              }
            }}
            size={isMobile ? "small" : "medium"}
            sx={{ mb: 1.5 }}
          />
          
          {changeAmount > 0 && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              p: isMobile ? 1 : 1.5,
              bgcolor: 'success.light',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'success.main',
              mb: 1
            }}>
              <Typography 
                variant={isMobile ? "caption" : "body2"} 
                fontWeight="medium"
                sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
              >
                Change Due:
              </Typography>
              <Typography 
                variant={isMobile ? "body2" : "body1"} 
                fontWeight="bold" 
                color="success.dark"
                sx={{ fontSize: isMobile ? '0.875rem' : '1rem' }}
              >
                KES {changeAmount.toFixed(2)}
              </Typography>
            </Box>
          )}
          
          {tenderAmount && parseFloat(tenderAmount) < totalAmount && (
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              p: isMobile ? 0.75 : 1,
              bgcolor: 'error.light',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'error.main'
            }}>
              <Typography 
                variant={isMobile ? "caption" : "body2"} 
                color="error.main" 
                fontWeight="medium"
                sx={{ fontSize: isMobile ? '0.75rem' : '0.875rem' }}
              >
                ⚠️ Insufficient by KES {(totalAmount - parseFloat(tenderAmount)).toFixed(2)}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {/* Checkout Buttons */}
      <Box sx={{ 
        mt: 'auto', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: isMobile ? 1 : 1.5 
      }}>
        <Button
          variant="contained"
          fullWidth
          size={isMobile ? "medium" : "large"}
          onClick={handleCheckout}
          sx={{ 
            py: isMobile ? 1 : 1.5,
            fontSize: isMobile ? '0.875rem' : '1rem',
            fontWeight: 'bold',
            borderRadius: 2,
            background: 'linear-gradient(45deg, #1976d2 30%, #2196f3 90%)',
            boxShadow: '0 3px 5px 2px rgba(33, 150, 243, .3)',
            '&:hover': { 
              background: 'linear-gradient(45deg, #1565c0 30%, #1976d2 90%)',
              boxShadow: '0 5px 8px 2px rgba(33, 150, 243, .4)'
            }
          }}
        >
          {navigator.onLine ? 'PROCESS SALE' : 'SAVE OFFLINE'}
        </Button>
        
        <Button
          variant="outlined"
          fullWidth
          size={isMobile ? "medium" : "large"}
          onClick={clearCart}
          sx={{ 
            py: isMobile ? 0.75 : 1,
            fontSize: isMobile ? '0.875rem' : '0.9rem',
            borderWidth: 2,
            borderColor: 'grey.400',
            color: 'text.secondary',
            borderRadius: 2,
            '&:hover': { 
              borderWidth: 2,
              borderColor: 'error.main',
              color: 'error.main',
              bgcolor: 'error.light'
            }
          }}
        >
          Clear Cart
        </Button>
      </Box>
    </Paper>
  );
}