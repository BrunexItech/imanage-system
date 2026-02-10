import React, { useState, useEffect } from 'react';
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
  Button,
  InputAdornment,
  Badge,
  useMediaQuery,
  useTheme,
  SwipeableDrawer,
  Drawer,
} from '@mui/material';
import {
  Search as SearchIcon,
  QrCodeScanner as BarcodeIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Category as CategoryIcon,
  Receipt as ReceiptIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { useCartStore } from '../stores/cartStore';
import { productAPI } from '../services/api';
import Cart from '../components/Cart';

export default function POSPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  
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
    // On mobile, open cart drawer after adding item
    if (isMobile) {
      setCartDrawerOpen(true);
    }
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
    // On mobile, open cart drawer after quantity change
    if (isMobile && increment > 0) {
      setCartDrawerOpen(true);
    }
  };

  const handleBarcodeScan = () => {
    alert('Barcode scanner would open here. For now, type barcode in search.');
    setSearch('');
  };

  const handleCheckoutSuccess = () => {
    loadProducts();
    // Close cart drawer on mobile after checkout
    if (isMobile) {
      setCartDrawerOpen(false);
    }
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

  // Calculate cart styles - ONLY FOR DESKTOP
  const getCartStyles = () => {
    // This function now ONLY applies to desktop/tablet
    if (!isMobile) {
      return {
        position: 'fixed',
        right: 16,
        top: 100,
        height: 'calc(100vh - 116px)',
        width: isTablet ? '35%' : '30%',
        zIndex: 1000,
        overflowY: 'auto',
        boxShadow: '0px 4px 20px rgba(0,0,0,0.1)',
        borderRadius: 2,
        // Add border as requested
        border: '2px solid #1976d2', // Blue border, can change to gold: '#FFD700'
      };
    }
    return {}; // Mobile will use drawer instead
  };

  // Cart toggle for mobile
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
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Header - Fixed at top */}
      <Paper elevation={1} sx={{ 
        p: 2, 
        borderRadius: 2, 
        flexShrink: 0,
        mx: 2,
        mt: 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" fontWeight="bold">
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
            {/* Mobile Cart Toggle Button */}
            {isMobile && (
              <IconButton 
                color="primary" 
                onClick={() => setCartDrawerOpen(true)}
                sx={{ 
                  position: 'relative',
                  border: '2px solid #1976d2',
                  borderRadius: 2,
                  p: 1,
                  mr: 1,
                }}
              >
                <Badge badgeContent={getTotalItems()} color="primary">
                  <CartIcon />
                </Badge>
              </IconButton>
            )}
            
            <Badge badgeContent={getTotalItems()} color="primary">
              <ReceiptIcon color="action" />
            </Badge>
            <Typography variant="body2" color="textSecondary">
              {getTotalItems()} items in cart
            </Typography>
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 2, flexShrink: 0, mx: 2 }}>
          {error}
        </Alert>
      )}

      {/* Main Content Area */}
      <Box sx={{ 
        display: 'flex',
        flex: 1,
        minHeight: 0,
        position: 'relative',
        mt: 2,
        overflow: 'hidden',
      }}>
        {/* Products Section */}
        <Box sx={{ 
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          ml: 2,
          // Desktop/Tablet margin for cart - UNCHANGED
          mr: isMobile ? 2 : (isTablet ? 'calc(38% + 20px)' : 'calc(33% + 20px)'),
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {/* Search and Quick Actions */}
          <Box sx={{ 
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            mb: 2,
          }}>
            <Paper elevation={1} sx={{ 
              p: 2, 
              borderRadius: 2, 
              flexShrink: 0,
              width: isMobile ? '100%' : (isTablet ? '85%' : '80%'),
              boxSizing: 'border-box',
            }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={7}>
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
                </Grid>
                
                <Grid item xs={12} md={5}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
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
                </Grid>
              </Grid>
            </Paper>
          </Box>

          {/* Categories */}
          <Box sx={{ 
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            mb: 2,
          }}>
            <Paper elevation={1} sx={{ 
              p: 1, 
              borderRadius: 2, 
              flexShrink: 0,
              width: isMobile ? '100%' : (isTablet ? '85%' : '80%'),
              boxSizing: 'border-box',
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
                      sx={{ minHeight: 40, py: 0.5, fontSize: '0.875rem' }}
                    />
                  ))}
                </Tabs>
              )}
            </Paper>
          </Box>

          {/* Product Grid */}
          <Paper 
            elevation={1} 
            sx={{ 
              flex: 1,
              p: 2, 
              borderRadius: 2,
              overflow: 'auto',
              bgcolor: 'grey.50',
              minHeight: 0,
              width: '100%',
              boxSizing: 'border-box',
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
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
                          height: 32,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
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
                        <Typography variant="body1" fontWeight="bold" color="primary">
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

        {/* Desktop Cart - Fixed Position (UNCHANGED) */}
        {!isMobile && (
          <Box sx={getCartStyles()}>
            <Box sx={{ 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
            }}>
              <Cart onCheckoutSuccess={handleCheckoutSuccess} />
            </Box>
          </Box>
        )}

        {/* Mobile Cart Drawer */}
        {isMobile && (
          <Drawer
            anchor="right"
            open={cartDrawerOpen}
            onClose={toggleCartDrawer(false)}
            PaperProps={{
              sx: {
                width: '100%',
                maxWidth: '100%',
                height: '100%',
                borderLeft: '3px solid #1976d2', // Blue border, can change to '#FFD700' for gold
                boxShadow: '-5px 0px 15px rgba(0,0,0,0.3)',
                '& .MuiPaper-root': {
                  borderRadius: 0,
                }
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
                bgcolor: '#f5f5f5',
              }}>
                <Typography variant="h6" fontWeight="bold">
                  Shopping Cart ({getTotalItems()} items)
                </Typography>
                <IconButton onClick={() => setCartDrawerOpen(false)}>
                  <RemoveIcon />
                </IconButton>
              </Box>
              
              {/* Cart Content - Full Height */}
              <Box sx={{ 
                flex: 1,
                overflow: 'auto',
                height: '100%',
              }}>
                <Cart onCheckoutSuccess={handleCheckoutSuccess} />
              </Box>
            </Box>
          </Drawer>
        )}
      </Box>
    </Box>
  );
}