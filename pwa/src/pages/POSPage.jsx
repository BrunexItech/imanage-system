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

// Mock categories - You'll replace with real categories from API
const CATEGORIES = [
  { id: 'all', label: 'All Products' },
  { id: 'food', label: 'Food & Beverages' },
  { id: 'electronics', label: 'Electronics' },
  { id: 'clothing', label: 'Clothing' },
  { id: 'household', label: 'Household' },
  { id: 'stationery', label: 'Stationery' },
];

export default function POSPage() {
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [quickQuantity, setQuickQuantity] = useState(1);

  useEffect(() => {
    loadProducts();
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

    // Apply category filter (if you have categories)
    if (selectedCategory !== 'all') {
      // This assumes products have a category field
      // You'll need to adjust based on your actual data structure
      filtered = filtered.filter(product => 
        product.category?.name?.toLowerCase() === selectedCategory.toLowerCase()
      );
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
    // This would trigger barcode scanner
    alert('Barcode scanner would open here. For now, type barcode in search.');
    setSearch('');
  };

  const handleCheckoutSuccess = () => {
    // Refresh products after sale
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

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
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
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        {/* Left Panel - Products (75%) */}
        <Grid item xs={12} md={9}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* Search and Quick Actions */}
            <Paper elevation={1} sx={{ p: 2, mb: 2, borderRadius: 2 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={6}>
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
                
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
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
                    <Box sx={{ flexGrow: 1 }} />
                    <Chip
                      icon={<FilterIcon />}
                      label="Filter"
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                </Grid>
              </Grid>
            </Paper>

            {/* Categories */}
            <Paper elevation={1} sx={{ p: 1, mb: 2, borderRadius: 2 }}>
              <Tabs
                value={selectedCategory}
                onChange={(e, newValue) => setSelectedCategory(newValue)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ minHeight: 40 }}
              >
                {CATEGORIES.map((cat) => (
                  <Tab 
                    key={cat.id}
                    label={cat.label} 
                    value={cat.id}
                    icon={<CategoryIcon />}
                    iconPosition="start"
                    sx={{ minHeight: 40, py: 0.5 }}
                  />
                ))}
              </Tabs>
            </Paper>

            {/* Product Grid */}
            <Paper 
              elevation={1} 
              sx={{ 
                flex: 1, 
                p: 2, 
                borderRadius: 2,
                overflow: 'auto',
                bgcolor: 'grey.50'
              }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress />
                </Box>
              ) : filteredProducts.length > 0 ? (
                <Grid container spacing={1.5}>
                  {filteredProducts.map((product) => (
                    <Grid item xs={6} sm={4} md={3} lg={2.4} key={product.id}>
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

                        {/* Price */}
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
                    Try a different search or category
                  </Typography>
                </Box>
              )}
            </Paper>
          </Box>
        </Grid>

        {/* Right Panel - Cart (25%) */}
        <Grid item xs={12} md={3}>
          <Cart onCheckoutSuccess={handleCheckoutSuccess} />
        </Grid>
      </Grid>

      {/* Bottom Status Bar */}
      <Paper elevation={2} sx={{ p: 1.5, mt: 2, borderRadius: 2 }}>
        <Grid container alignItems="center" spacing={1}>
          <Grid item xs>
            <Typography variant="caption" color="textSecondary">
              Total Products: {products.length} | Showing: {filteredProducts.length} | 
              Last updated: {new Date().toLocaleTimeString()}
            </Typography>
          </Grid>
          <Grid item>
            <Button
              variant="text"
              size="small"
              startIcon={<OfferIcon />}
              onClick={() => alert('Discount dialog would open here')}
            >
              Apply Discount
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}