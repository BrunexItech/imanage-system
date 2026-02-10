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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'lg'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));
  
  const [cartOpen, setCartOpen] = useState(false);
  
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
      // Add "All Products" as first category
      const allCategories = [{ id: 'all', name: 'All Products' }, ...response.data];
      setCategories(allCategories);
    } catch (err) {
      console.error('Failed to load categories, using default');
      // Fallback to default categories if API fails
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

    // Apply search filter
    if (search) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sku.toLowerCase().includes(search.toLowerCase()) ||
        (product.barcode && product.barcode.includes(search))
      );
    }

    // Apply category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(product => {
        // Handle both category object and category name
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

  const handleCheckoutSuccess = () => {
    loadProducts();
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

  // Calculate cart styles - RESPONSIVE
  const getCartStyles = () => {
    if (isMobile) {
      return {
        display: 'none', // Hidden on mobile - shown in drawer
      };
    } else if (isTablet) {
      return {
        position: 'fixed',
        right: 12,
        top: 100,
        height: 'calc(100vh - 120px)',
        width: '35%',
        zIndex: 1000,
        overflowY: 'auto',
        boxShadow: '0px 4px 20px rgba(0,0,0,0.1)',
        borderRadius: 2,
      };
    } else {
      return {
        position: 'fixed',
        right: 16,
        top: 100,
        height: 'calc(100vh - 116px)',
        width: '30%',
        zIndex: 1000,
        overflowY: 'auto',
        boxShadow: '0px 4px 20px rgba(0,0,0,0.1)',
        borderRadius: 2,
      };
    }
  };

  // Responsive product grid columns
  const getGridColumns = () => {
    if (isMobile) return { xs: 6, sm: 4 }; // 2 columns on mobile
    if (isTablet) return { xs: 6, sm: 4, md: 4 }; // 3 columns on tablet
    return { xs: 6, sm: 4, md: 4, lg: 3 }; // 4 columns on desktop
  };

  // Mobile cart toggle
  const toggleCart = () => {
    setCartOpen(!cartOpen);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Header - Fixed at top - RESPONSIVE */}
      <Paper elevation={1} sx={{ 
        p: isMobile ? 1.5 : 2, 
        borderRadius: 2, 
        flexShrink: 0,
        mx: isMobile ? 1 : 2,
        mt: isMobile ? 1 : 2,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 1 : 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 1 : 2 }}>
            <Typography variant={isMobile ? "h6" : "h5"} fontWeight="bold">
              Point of Sale
            </Typography>
            <Chip 
              label={navigator.onLine ? '🟢 Online' : '🟡 Offline'} 
              size={isMobile ? "small" : "medium"}
              color={navigator.onLine ? 'success' : 'warning'}
              variant="outlined"
            />
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: isMobile ? 1 : 2 }}>
            {/* Mobile Cart Button */}
            {isMobile && (
              <IconButton 
                color="primary" 
                onClick={toggleCart}
                sx={{ position: 'relative' }}
              >
                <Badge badgeContent={getTotalItems()} color="primary">
                  <CartIcon />
                </Badge>
              </IconButton>
            )}
            
            {/* Desktop Cart Badge */}
            {!isMobile && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Badge badgeContent={getTotalItems()} color="primary">
                  <ReceiptIcon color="action" />
                </Badge>
                <Typography variant={isMobile ? "caption" : "body2"} color="textSecondary">
                  {getTotalItems()} items in cart
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ 
          mb: 2, 
          flexShrink: 0, 
          mx: isMobile ? 1 : 2,
          fontSize: isMobile ? '0.875rem' : '1rem',
          p: isMobile ? 1 : 2 
        }}>
          {error}
        </Alert>
      )}

      {/* Main Content Area */}
      <Box sx={{ 
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        flex: 1,
        minHeight: 0,
        position: 'relative',
        mt: isMobile ? 1 : 2,
        overflow: 'hidden',
      }}>
        {/* Products Section - RESPONSIVE */}
        <Box sx={{ 
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          ml: isMobile ? 1 : 2,
          mr: isMobile ? 1 : (isTablet ? 'calc(37% + 16px)' : 'calc(32% + 16px)'),
          overflow: 'hidden',
          minWidth: 0,
        }}>
          {/* Search and Quick Actions - RESPONSIVE */}
          <Box sx={{ 
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            mb: isMobile ? 1 : 2,
          }}>
            <Paper elevation={1} sx={{ 
              p: isMobile ? 1.5 : 2, 
              borderRadius: 2, 
              flexShrink: 0,
              width: isMobile ? '100%' : (isTablet ? '90%' : '85%'),
              boxSizing: 'border-box',
            }}>
              <Grid container spacing={isMobile ? 1 : 2} alignItems="center">
                <Grid item xs={12} md={isMobile ? 12 : 7}>
                  <TextField
                    fullWidth
                    placeholder="Search by name, SKU, or barcode..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize={isMobile ? "small" : "medium"} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton onClick={handleBarcodeScan} size={isMobile ? "small" : "medium"}>
                            <BarcodeIcon fontSize={isMobile ? "small" : "medium"} />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    size={isMobile ? "small" : "medium"}
                  />
                </Grid>
                
                <Grid item xs={12} md={isMobile ? 12 : 5}>
                  <Box sx={{ display: 'flex', gap: isMobile ? 0.5 : 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant={isMobile ? "caption" : "body2"} color="textSecondary" sx={{ mr: isMobile ? 0.5 : 1 }}>
                      Quick Qty:
                    </Typography>
                    {[1, 2, 5, 10].map((qty) => (
                      <Chip
                        key={qty}
                        label={`+${qty}`}
                        size={isMobile ? "small" : "medium"}
                        variant={quickQuantity === qty ? 'filled' : 'outlined'}
                        color={quickQuantity === qty ? 'primary' : 'default'}
                        onClick={() => setQuickQuantity(qty)}
                        clickable
                        sx={{ fontSize: isMobile ? '0.7rem' : '0.875rem' }}
                      />
                    ))}
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </Box>

          {/* Categories - RESPONSIVE */}
          <Box sx={{ 
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            mb: isMobile ? 1 : 2,
          }}>
            <Paper elevation={1} sx={{ 
              p: isMobile ? 0.5 : 1, 
              borderRadius: 2, 
              flexShrink: 0,
              width: isMobile ? '100%' : (isTablet ? '90%' : '85%'),
              boxSizing: 'border-box',
            }}>
              {loadingCategories ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 1 }}>
                  <CircularProgress size={isMobile ? 16 : 20} />
                </Box>
              ) : (
                <Tabs
                  value={selectedCategory}
                  onChange={(e, newValue) => setSelectedCategory(newValue)}
                  variant="scrollable"
                  scrollButtons={isMobile ? "auto" : "auto"}
                  sx={{ minHeight: isMobile ? 36 : 40 }}
                >
                  {categories.map((cat) => (
                    <Tab 
                      key={cat.id}
                      label={isMobile ? cat.name.split(' ')[0] : cat.name}
                      value={cat.id}
                      icon={isMobile ? <CategoryIcon fontSize="small" /> : <CategoryIcon />}
                      iconPosition="start"
                      sx={{ 
                        minHeight: isMobile ? 36 : 40, 
                        py: isMobile ? 0.25 : 0.5, 
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        minWidth: 'auto',
                        px: isMobile ? 1 : 2,
                      }}
                    />
                  ))}
                </Tabs>
              )}
            </Paper>
          </Box>

          {/* Product Grid - RESPONSIVE */}
          <Paper 
            elevation={1} 
            sx={{ 
              flex: 1,
              p: isMobile ? 1 : 2, 
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
                <CircularProgress size={isMobile ? 40 : 60} />
              </Box>
            ) : filteredProducts.length > 0 ? (
              <Grid container spacing={isMobile ? 1 : 1.5}>
                {filteredProducts.map((product) => (
                  <Grid item 
                    {...getGridColumns()}
                    key={product.id}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: isMobile ? 1 : 1.5,
                        cursor: 'pointer',
                        border: `1px solid ${
                          product.current_stock <= 0 ? '#ff9800' :
                          product.current_stock <= product.minimum_stock ? '#f44336' : 
                          '#e0e0e0'
                        }`,
                        borderRadius: isMobile ? 1 : 2,
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.2s',
                        '&:hover': {
                          transform: isMobile ? 'none' : 'translateY(-2px)',
                          boxShadow: isMobile ? 1 : 2,
                          bgcolor: 'background.paper',
                        },
                        position: 'relative',
                      }}
                      onClick={() => handleProductClick(product)}
                    >
                      {/* Stock Badge - RESPONSIVE */}
                      <Chip
                        label={getStockText(product)}
                        size="small"
                        color={getStockColor(product)}
                        sx={{ 
                          position: 'absolute', 
                          top: isMobile ? 4 : 8, 
                          right: isMobile ? 4 : 8,
                          fontSize: isMobile ? '0.55rem' : '0.6rem',
                          height: isMobile ? 16 : 20,
                        }}
                      />

                      {/* Product Info - RESPONSIVE */}
                      <Typography 
                        variant={isMobile ? "caption" : "body2"} 
                        fontWeight="medium"
                        sx={{ 
                          mb: isMobile ? 0.25 : 0.5,
                          lineHeight: 1.2,
                          height: isMobile ? 28 : 32,
                          overflow: 'hidden',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          fontSize: isMobile ? '0.75rem' : '0.875rem',
                        }}
                      >
                        {product.name}
                      </Typography>
                      
                      <Typography 
                        variant="caption" 
                        color="textSecondary" 
                        sx={{ 
                          fontSize: isMobile ? '0.65rem' : '0.7rem',
                          mb: isMobile ? 0.5 : 1,
                        }}
                      >
                        SKU: {product.sku}
                      </Typography>

                      {/* Price and Actions - RESPONSIVE */}
                      <Box sx={{ mt: 'auto', pt: isMobile ? 0.5 : 1 }}>
                        <Typography variant={isMobile ? "body2" : "body1"} fontWeight="bold" color="primary" sx={{ fontSize: isMobile ? '0.8rem' : '1rem' }}>
                          KES {product.selling_price}
                        </Typography>
                        
                        {/* Quick Actions - RESPONSIVE */}
                        <Box sx={{ display: 'flex', gap: isMobile ? 0.25 : 0.5, mt: isMobile ? 0.5 : 1 }}>
                          <IconButton
                            size={isMobile ? "small" : "small"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuantityClick(product, -1);
                            }}
                            sx={{ 
                              bgcolor: 'grey.100',
                              p: isMobile ? 0.25 : 0.5,
                              minWidth: isMobile ? 24 : 30,
                              '&:hover': { bgcolor: 'grey.200' }
                            }}
                          >
                            <RemoveIcon fontSize={isMobile ? "small" : "small"} />
                          </IconButton>
                          
                          <IconButton
                            size={isMobile ? "small" : "small"}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleQuantityClick(product, 1);
                            }}
                            sx={{ 
                              bgcolor: 'grey.100',
                              p: isMobile ? 0.25 : 0.5,
                              minWidth: isMobile ? 24 : 30,
                              '&:hover': { bgcolor: 'grey.200' }
                            }}
                          >
                            <AddIcon fontSize={isMobile ? "small" : "small"} />
                          </IconButton>
                        </Box>
                      </Box>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            ) : (
              <Box sx={{ textAlign: 'center', p: isMobile ? 2 : 4 }}>
                <SearchIcon sx={{ fontSize: isMobile ? 36 : 48, color: 'grey.400', mb: 2 }} />
                <Typography variant={isMobile ? "body2" : "body1"} color="textSecondary">
                  No products found
                </Typography>
                <Typography variant={isMobile ? "caption" : "body2"} color="textSecondary">
                  {search ? 'Try a different search' : 'Add products from Django admin'}
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>

        {/* Cart - Desktop/Tablet Fixed Position */}
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
        <Drawer
          anchor="right"
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          PaperProps={{
            sx: {
              width: isMobile ? '100%' : '400px',
              height: '100%',
              borderTopLeftRadius: 16,
              borderBottomLeftRadius: 16,
            }
          }}
        >
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="h6" fontWeight="bold">
                Cart ({getTotalItems()} items)
              </Typography>
              <IconButton onClick={() => setCartOpen(false)}>
                <RemoveIcon />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              <Cart onCheckoutSuccess={handleCheckoutSuccess} />
            </Box>
          </Box>
        </Drawer>
      </Box>
    </Box>
  );
}