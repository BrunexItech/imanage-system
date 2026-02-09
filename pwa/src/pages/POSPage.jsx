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
} from '@mui/material';
import {
  Search as SearchIcon,
  QrCodeScanner as BarcodeIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Category as CategoryIcon,
  LocalOffer as OfferIcon,
  Receipt as ReceiptIcon,
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

  // Calculate responsive cart width and products margin
  const getCartStyles = () => {
    if (isMobile) {
      return {
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '50vh',
        width: '100%',
        zIndex: 1000,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        boxShadow: '0px -4px 20px rgba(0,0,0,0.15)',
      };
    } else if (isTablet) {
      return {
        position: 'fixed',
        right: 16,
        top: 100,
        height: 'calc(100vh - 120px)',
        width: 'calc(33.333% - 20px)', // md=4 => 33.333%
        zIndex: 1000,
      };
    } else {
      return {
        position: 'fixed',
        right: 16,
        top: 100,
        height: 'calc(100vh - 120px)',
        width: 'calc(25% - 20px)', // lg=3 => 25%
        zIndex: 1000,
      };
    }
  };

  // Calculate responsive products area margin
  const getProductsMargin = () => {
    if (isMobile) {
      return { marginRight: 0, marginBottom: '50vh' }; // Space for bottom cart
    } else if (isTablet) {
      return { marginRight: 'calc(33.333% + 8px)' }; // md=4 + spacing
    } else {
      return { marginRight: 'calc(25% + 8px)' }; // lg=3 + spacing
    }
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      position: 'relative',
    }}>
      {/* Header - Fixed at top */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2, flexShrink: 0 }}>
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
        <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
          {error}
        </Alert>
      )}

      {/* Main Content Area - Products take full width with right margin for cart */}
      <Box sx={{ 
        flex: 1,
        minHeight: 0,
        ...getProductsMargin(),
        transition: 'margin 0.3s ease',
      }}>
        {/* Search and Quick Actions - Fixed */}
        <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2, flexShrink: 0 }}>
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

        {/* Categories - Fixed */}
        <Paper elevation={1} sx={{ p: 1, mb: 2, borderRadius: 2, flexShrink: 0 }}>
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

        {/* Product Grid - Scrollable content */}
        <Paper 
          elevation={1} 
          sx={{ 
            height: isMobile ? 'calc(100vh - 320px)' : 'calc(100vh - 240px)',
            p: 2, 
            borderRadius: 2,
            overflow: 'auto',
            bgcolor: 'grey.50',
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
                  sx={{
                    // Ensure proper column count on all screens
                    ...(isMobile && { xs: 6 }),
                    ...(isTablet && { md: 4 }),
                    ...(!isMobile && !isTablet && { lg: 3 }),
                  }}
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

      {/* Cart - Fixed Position (Outside the products flow) */}
      <Box sx={getCartStyles()}>
        <Box sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          ...(isMobile && { 
            '& .MuiPaper-root': { 
              borderTopLeftRadius: 16, 
              borderTopRightRadius: 16,
              height: '100%',
            } 
          }),
        }}>
          <Cart onCheckoutSuccess={handleCheckoutSuccess} />
        </Box>
      </Box>

      {/* Bottom Status Bar - Fixed at bottom */}
      <Paper elevation={2} sx={{ 
        p: 1.5, 
        mt: 2, 
        borderRadius: 2, 
        flexShrink: 0,
        position: 'relative',
        zIndex: 500,
        marginRight: isMobile ? 0 : getProductsMargin().marginRight,
      }}>
        <Grid container alignItems="center" spacing={1}>
          <Grid item xs>
            <Typography variant="caption" color="textSecondary">
              Products: {products.length} | Showing: {filteredProducts.length} | 
              Updated: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="text"
              size="small"
              startIcon={<OfferIcon />}
              onClick={() => alert('Discount dialog would open here')}
              sx={{ fontSize: '0.75rem' }}
            >
              Apply Discount
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}