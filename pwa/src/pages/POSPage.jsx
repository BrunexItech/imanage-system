import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  TextField,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  Paper,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../stores/cartStore';
import { productAPI } from '../services/api';
import Cart from '../components/Cart';

export default function POSPage() {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (search) {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.sku.toLowerCase().includes(search.toLowerCase()) ||
        product.barcode.includes(search)
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(products);
    }
  }, [search, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const response = await productAPI.getProducts();
      setProducts(response.data);
      setFilteredProducts(response.data);
    } catch (err) {
      setError('Failed to load products');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleProductClick = (product) => {
    addItem(product, 1);
  };

  const handleCheckoutSuccess = (result) => {
    console.log('Checkout successful:', result);
    // Could show receipt or reset
  };

  return (
    <Container maxWidth="xl" sx={{ py: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => navigate('/')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5">
          Point of Sale
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Typography variant="body2" color={navigator.onLine ? 'success.main' : 'warning.main'}>
          {navigator.onLine ? '🟢 Online' : '🟡 Offline'}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Product Grid - 8 columns */}
        <Grid item xs={12} md={8}>
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <TextField
              fullWidth
              placeholder="Search products by name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          </Paper>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filteredProducts.map((product) => (
                <Grid item xs={6} sm={4} md={3} key={product.id}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 2,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' },
                      border: product.current_stock <= 0 ? '2px solid #ff9800' : 'none',
                    }}
                    onClick={() => handleProductClick(product)}
                  >
                    <Typography variant="body2" noWrap>
                      {product.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" display="block">
                      {product.sku}
                    </Typography>
                    <Typography variant="body1" fontWeight="bold" sx={{ mt: 1 }}>
                      KES {product.selling_price}
                    </Typography>
                    <Typography
                      variant="caption"
                      color={product.current_stock <= 0 ? 'warning.main' : 'textSecondary'}
                    >
                      Stock: {product.current_stock}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}

          {!loading && filteredProducts.length === 0 && (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="body1" color="textSecondary">
                No products found
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Add products in Django admin or adjust search
              </Typography>
            </Box>
          )}
        </Grid>

        {/* Cart - 4 columns */}
        <Grid item xs={12} md={4}>
          <Cart onCheckoutSuccess={handleCheckoutSuccess} />
        </Grid>
      </Grid>
    </Container>
  );
}