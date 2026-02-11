import React, { useState, useEffect, useRef } from 'react';
import {
  Grid,
  TextField,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Tabs,
  Tab,
  InputAdornment,
  Badge,
  useMediaQuery,
  useTheme,
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import {
  Search as SearchIcon,
  QrCodeScanner as BarcodeIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Category as CategoryIcon,
  ShoppingCart as CartIcon,
  Close as CloseIcon,
  Print as PrintIcon,
  WhatsApp as WhatsAppIcon,
} from '@mui/icons-material';
import { useReactToPrint } from 'react-to-print';
import { useCartStore } from '../stores/cartStore';
import { productAPI } from '../services/api';
import Cart from '../components/Cart';
import ReceiptTemplate from '../components/ReceiptTemplate';
import receiptService from '../services/receiptService';

export default function POSPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const cartItems = useCartStore((state) => state.items);
  const clearCart = useCartStore((state) => state.clearCart);
  
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quickQuantity, setQuickQuantity] = useState(1);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  
  // NEW: Receipt states
  const [receiptData, setReceiptData] = useState(null);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [saleCompleted, setSaleCompleted] = useState(false);
  const receiptRef = useRef();

  // NEW: Print handler
  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
    documentTitle: `Receipt-${receiptData?.sale?.receipt_number || 'sale'}`,
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [search, selectedCategory, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getProducts();
      setProducts(response.data);
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await productAPI.getCategories();
      const allCategories = [{ id: 'all', name: 'All Products' }, ...response.data];
      setCategories(allCategories);
    } catch (err) {
      console.error('Failed to load categories, using default');
      setCategories([
        { id: 'all', name: 'All Products' },
        { id: 'food', name: 'Food & Beverages' },
        { id: 'electronics', name: 'Electronics' },
        { id: 'other', name: 'Other' },
      ]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;

    if (search) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sku.toLowerCase().includes(search.toLowerCase()) ||
        (product.barcode && product.barcode.includes(search))
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => {
        if (product.category) {
          return typeof product.category === 'object' 
            ? product.category.id === selectedCategory || product.category.name === selectedCategory
            : product.category === selectedCategory;
        }
        return false;
      });
    }

    setFilteredProducts(filtered);
  };

  const handleProductClick = (product) => {
    addItem(product, quickQuantity);
  };

  const handleQuantityClick = (product, increment) => {
    const currentItems = useCartStore.getState().items;
    const existingItem = currentItems.find(item => item.product.id === product.id);
    
    if (existingItem) {
      const newQuantity = Math.max(1, existingItem.quantity + increment);
      updateQuantity(product.id, newQuantity);
    } else {
      addItem(product, Math.max(1, increment));
    }
  };

  const handleBarcodeScan = () => {
    alert('Barcode scanner would open here. For now, type barcode in search.');
    setSearch('');
  };

  // NEW: Handle successful checkout - generate receipt
  const handleCheckoutSuccess = async (saleResponse) => {
    try {
      // Load business data
      const business = await receiptService.loadBusinessData();
      
      // Get cart items for receipt
      const items = cartItems.map(item => ({
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.selling_price,
        total_price: item.quantity * item.product.selling_price,
      }));
      
      // Calculate totals
      const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);
      const tax = subtotal * (business?.tax_rate || 16) / 100;
      const total = subtotal + tax;
      
      // Create sale data object
      const saleData = {
        receipt_number: saleResponse?.data?.receipt_number || `RCP-${Date.now().toString().slice(-8)}`,
        created_at: new Date().toISOString(),
        cashier: { name: useCartStore.getState().user?.first_name || 'Staff' },
        customer_name: saleResponse?.data?.customer_name || 'Walk-in Customer',
        customer_phone: saleResponse?.data?.customer_phone || '',
        subtotal: subtotal,
        tax_amount: tax,
        discount_amount: saleResponse?.data?.discount_amount || 0,
        total_amount: total,
        amount_paid: saleResponse?.data?.amount_paid || total,
        change_given: saleResponse?.data?.change_given || 0,
      };
      
      // Generate receipt data
      const data = receiptService.generateReceiptData(saleData, items, business);
      setReceiptData(data);
      setSaleCompleted(true);
      setShowReceiptDialog(true);
      
      // Refresh products and clear cart
      loadProducts();
      clearCart();
      if (isMobile) {
        setCartDrawerOpen(false);
      }
    } catch (error) {
      console.error('Failed to generate receipt:', error);
      // Still show success but without receipt
      setSaleCompleted(true);
      setShowReceiptDialog(true);
    }
  };

  // NEW: WhatsApp handler
  const handleWhatsApp = () => {
    if (!receiptData?.sale?.customer_phone) {
      alert('Customer phone number required for WhatsApp receipt');
      return;
    }
    
    const text = generateWhatsAppText(receiptData);
    const phone = receiptData.sale.customer_phone.replace(/\D/g, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // NEW: Generate WhatsApp text
  const generateWhatsAppText = (data) => {
    const { business, sale, items, totals } = data;
    
    let text = `*${business.name}*\n`;
    text += `${business.address || ''}\n`;
    if (business.phone) text += `Tel: ${business.phone}\n`;
    text += `\n`;
    text += `Receipt: ${sale.receipt_number}\n`;
    text += `Date: ${sale.date}\n`;
    text += `Cashier: ${sale.cashier}\n`;
    text += `Customer: ${sale.customer_name}\n`;
    if (sale.customer_phone) text += `Tel: ${sale.customer_phone}\n`;
    text += `\n*ITEMS*\n`;
    
    items.forEach(item => {
      text += `${item.name} x${item.quantity} @ ${item.price.toFixed(2)} = ${item.total.toFixed(2)}\n`;
    });
    
    text += `\nSubtotal: ${totals.subtotal.toFixed(2)}`;
    if (totals.discount > 0) text += `\nDiscount: -${totals.discount.toFixed(2)}`;
    text += `\nTax: ${totals.tax.toFixed(2)}`;
    text += `\n*TOTAL: ${totals.total.toFixed(2)}*`;
    text += `\nPaid: ${totals.paid.toFixed(2)}`;
    text += `\nChange: ${totals.change.toFixed(2)}`;
    text += `\n\n${business.footer || 'Thank you for your business!'}`;
    
    return text;
  };

  // NEW: Close receipt dialog
  const handleCloseReceipt = () => {
    setShowReceiptDialog(false);
    setSaleCompleted(false);
  };

  const getStockColor = (product) => {
    if (product.current_stock <= 0) return 'error';
    if (product.current_stock <= product.minimum_stock) return 'warning';
    return 'success';
  };

  const getStockText = (product) => {
    if (product.current_stock <= 0) return 'Out of Stock';
    if (product.current_stock <= product.minimum_stock) return 'Low Stock';
    return 'In Stock';
  };

  const toggleCartDrawer = (open) => (event) => {
    if (
      event &&
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return;
    }
    setCartDrawerOpen(open);
  };

  return (
    <Box sx={{ 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <Paper elevation={1} sx={{ 
        p: { xs: 1.5, sm: 2 },
        borderRadius: 2,
        mb: 2,
        flexShrink: 0,
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h6" fontWeight="bold">
              Point of Sale
            </Typography>
            <Chip 
              label={navigator.onLine ? '🟢 Online' : '🟡 Offline'} 
              size="small"
              color={navigator.onLine ? 'success' : 'warning'}
              variant="outlined"
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isMobile ? (
              <IconButton 
                color="primary" 
                onClick={() => setCartDrawerOpen(true)}
                sx={{ 
                  border: '2px solid #1976d2',
                  borderRadius: 2,
                  p: 1,
                }}
              >
                <Badge badgeContent={totalItems} color="primary">
                  <CartIcon />
                </Badge>
              </IconButton>
            ) : (
              <>
                <Badge badgeContent={totalItems} color="primary" sx={{ mr: 1 }}>
                  <CartIcon color="action" />
                </Badge>
                <Typography variant="body2" color="textSecondary">
                  {totalItems} items
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
          {error}
        </Alert>
      )}

      {/* Main Content Area */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        gap: { xs: 2, md: 3 },
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* Products Section */}
        <Box sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {/* Search Bar */}
          <Paper elevation={1} sx={{ 
            p: 2,
            borderRadius: 2,
            mb: 2,
          }}>
            <TextField
              fullWidth
              placeholder="Search by name, SKU, or scan barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleBarcodeScan} size="small">
                      <BarcodeIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Paper>

          {/* Quick Quantity and Categories */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: 2,
          }}>
            {/* Quick Quantity */}
            <Paper elevation={1} sx={{ 
              p: 1.5,
              borderRadius: 2,
              flex: { xs: 1, sm: 'none' },
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>
                <Typography variant="body2" color="textSecondary" sx={{ mr: 1 }}>
                  Quick Qty:
                </Typography>
                {[1, 2, 5, 10].map((qty) => (
                  <Chip
                    key={qty}
                    label={`+${qty}`}
                    size="small"
                    variant={quickQuantity === qty ? 'filled' : 'outlined'}
                    color={quickQuantity === qty ? 'primary' : 'default'}
                    onClick={() => setQuickQuantity(qty)}
                    clickable
                  />
                ))}
              </Box>
            </Paper>

            {/* Categories */}
            <Paper elevation={1} sx={{ 
              p: 0.5,
              borderRadius: 2,
              flex: 1,
              minWidth: 0,
            }}>
              {loadingCategories ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : (
                <Tabs
                  value={selectedCategory}
                  onChange={(e, newValue) => setSelectedCategory(newValue)}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ minHeight: 40 }}
                >
                  {categories.map((cat) => (
                    <Tab 
                      key={cat.id}
                      label={cat.name}
                      value={cat.id}
                      icon={<CategoryIcon />}
                      iconPosition="start"
                      sx={{ 
                        minHeight: 40, 
                        py: 0.5, 
                        fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        minWidth: 'auto',
                        px: 1,
                      }}
                    />
                  ))}
                </Tabs>
              )}
            </Paper>
          </Box>

          {/* Products Grid */}
          <Paper 
            elevation={1}
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 2,
              overflow: 'auto',
              bgcolor: 'grey.50',
              minHeight: 0,
            }}
          >
            {loading ? (
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100%' 
              }}>
                <CircularProgress />
              </Box>
            ) : filteredProducts.length > 0 ? (
              <Grid container spacing={1.5}>
                {filteredProducts.map((product) => (
                  <Grid item 
                    xs={6}
                    sm={4}
                    md={4}
                    lg={3}
                    xl={2}
                    key={product.id}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        border: `1px solid ${
                          product.current_stock <= 0 ? '#ff9800' :
                          product.current_stock <= product.minimum_stock ? '#f44336' : 
                          '#e0e0e0'
                        }`,
                        borderRadius: 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: 2,
                          bgcolor: 'background.paper',
                        },
                        position: 'relative',
                      }}
                      onClick={() => handleProductClick(product)}
                    >
                      {/* Stock Badge */}
                      <Chip
                        label={getStockText(product)}
                        size="small"
                        color={getStockColor(product)}
                        sx={{ 
                          position: 'absolute', 
                          top: 8, 
                          right: 8,
                          fontSize: '0.6rem',
                          height: 20,
                        }}
                      />

                      {/* Product Info */}
                      <Typography 
                        variant="body2" 
                        fontWeight="medium"
                        sx={{ 
                          mb: 0.5,
                          lineHeight: 1.2,
                          minHeight: 32,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                        }}
                      >
                        {product.name}
                      </Typography>
                      
                      <Typography 
                        variant="caption" 
                        color="textSecondary" 
                        sx={{ 
                          fontSize: '0.7rem',
                          mb: 1,
                        }}
                      >
                        SKU: {product.sku}
                      </Typography>

                      {/* Price and Actions */}
                      <Box sx={{ mt: 'auto', pt: 1 }}>
                        <Typography 
                          variant="body1" 
                          fontWeight="bold" 
                          color="primary"
                          sx={{ fontSize: { xs: '0.875rem', sm: '1rem' } }}
                        >
                          KES {product.selling_price}
                        </Typography>
                        
                        {/* Quick Actions */}
                        <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuantityClick(product, -1);
                            }}
                            sx={{ 
                              bgcolor: 'grey.100',
                              p: 0.5,
                              minWidth: 30,
                              '&:hover': { bgcolor: 'grey.200' }
                            }}
                          >
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuantityClick(product, 1);
                            }}
                            sx={{ 
                              bgcolor: 'grey.100',
                              p: 0.5,
                              minWidth: 30,
                              '&:hover': { bgcolor: 'grey.200' }
                            }}
                          >
                            <AddIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', p: 4 }}>
                <SearchIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                <Typography variant="body1" color="textSecondary">
                  No products found
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {search ? 'Try a different search' : 'Add products from Django admin'}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Desktop Cart Section */}
        {!isMobile && (
          <Box sx={{
            width: { md: '35%', lg: '30%', xl: '25%' },
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            overflow: 'hidden',
          }}>
            <Paper
              elevation={1}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 2,
                border: '2px solid #1976d2',
                overflow: 'hidden',
                minHeight: 0,
                height: '100%',
              }}
            >
              <Box sx={{ 
                height: '100%',
                overflow: 'auto',
                minHeight: 0,
              }}>
                <Cart onCheckoutSuccess={handleCheckoutSuccess} />
              </Box>
            </Paper>
          </Box>
        )}
      </Box>

      {/* Mobile Cart Drawer */}
      {isMobile && (
        <Drawer
          anchor="bottom"
          open={cartDrawerOpen}
          onClose={toggleCartDrawer(false)}
          PaperProps={{
            sx: {
              height: '85%',
              borderTopLeftRadius: 16,
              borderTopRightRadius: 16,
              borderTop: '3px solid #1976d2',
              overflow: 'hidden',
            }
          }}
        >
          <Box sx={{ 
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Drawer Header */}
            <Box sx={{ 
              p: 2,
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              bgcolor: 'background.paper',
            }}>
              <Typography variant="h6" fontWeight="bold">
                Shopping Cart ({totalItems} items)
              </Typography>
              <IconButton onClick={() => setCartDrawerOpen(false)} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
            
            {/* Cart Content */}
            <Box sx={{ 
              flex: 1,
              overflow: 'auto',
              minHeight: 0,
            }}>
              <Cart onCheckoutSuccess={handleCheckoutSuccess} />
            </Box>
          </Box>
        </Drawer>
      )}

      {/* NEW: Receipt Dialog */}
      <Dialog
        open={showReceiptDialog}
        onClose={handleCloseReceipt}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            overflow: 'hidden',
          }
        }}
      >
        <DialogTitle sx={{ 
          bgcolor: saleCompleted ? 'success.main' : 'primary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}>
          {saleCompleted ? '✓ Sale Completed!' : 'Receipt'}
        </DialogTitle>
        
        <DialogContent sx={{ p: 0, bgcolor: '#f5f5f5' }}>
          {receiptData && (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center',
              p: 2,
            }}>
              <ReceiptTemplate ref={receiptRef} data={receiptData} />
            </Box>
          )}
        </DialogContent>
        
        <DialogActions sx={{ 
          p: 2, 
          gap: 1,
          borderTop: '1px solid #e0e0e0',
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}>
          <Button
            variant="contained"
            startIcon={<PrintIcon />}
            onClick={handlePrint}
            sx={{ minWidth: 120 }}
          >
            Print
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<WhatsAppIcon />}
            onClick={handleWhatsApp}
            sx={{ minWidth: 120 }}
            color="success"
          >
            WhatsApp
          </Button>
          
          <Button
            variant="text"
            onClick={handleCloseReceipt}
            sx={{ minWidth: 100 }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}