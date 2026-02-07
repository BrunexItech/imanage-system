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
  };

  return (
    <Container maxWidth="xl" sx={{ py: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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

      <Grid container spacing={2} sx={{ flex: 1, minHeight: 0 }}>
        {/* Product Grid - 7 columns */}
        <Grid item xs={12} md={7}>
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
            <Grid container spacing={1} sx={{ height: 'calc(100vh - 200px)', overflow: 'auto' }}>
              {filteredProducts.map((product) => (
                <Grid item xs={6} sm={4} md={3} lg={2} key={product.id}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 1.5,
                      cursor: 'pointer',
                      '&:hover': { backgroundColor: 'action.hover' },
                      border: product.current_stock <= 0 ? '2px solid #ff9800' : 
                               product.current_stock <= product.minimum_stock ? '2px solid #f44336' : 'none',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                    onClick={() => handleProductClick(product)}
                  >
                    <Typography variant="body2" noWrap fontWeight="medium">
                      {product.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" display="block" noWrap>
                      {product.sku}
                    </Typography>
                    <Box sx={{ mt: 'auto', pt: 1 }}>
                      <Typography variant="body1" fontWeight="bold" color="primary">
                        KES {product.selling_price}
                      </Typography>
                      <Typography
                        variant="caption"
                        color={product.current_stock <= 0 ? 'warning.main' : 
                               product.current_stock <= product.minimum_stock ? 'error.main' : 'textSecondary'}
                      >
                        Stock: {product.current_stock}
                      </Typography>
                    </Box>
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

        {/* Cart & Payment - 5 columns */}
        <Grid item xs={12} md={5}>
          <Cart onCheckoutSuccess={handleCheckoutSuccess} />
        </Grid>
      </Grid>
    </Container>
  );
}