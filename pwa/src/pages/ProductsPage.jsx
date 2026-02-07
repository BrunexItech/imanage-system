import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Inventory as InventoryIcon,
  LocalOffer as PriceIcon,
  Storage as StockIcon,
} from '@mui/icons-material';
import { productAPI } from '../services/api';

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
    calculateStats();
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

  const filterProducts = () => {
    if (!search) {
      setFilteredProducts(products);
      return;
    }

    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase()) ||
      product.description?.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredProducts(filtered);
  };

  const calculateStats = () => {
    if (!products.length) return;

    const totalProducts = products.length;
    const lowStock = products.filter(p => p.current_stock <= p.minimum_stock && p.current_stock > 0).length;
    const outOfStock = products.filter(p => p.current_stock <= 0).length;
    const inStock = totalProducts - lowStock - outOfStock;

    setStats({
      totalProducts,
      lowStock,
      outOfStock,
      inStock,
      totalValue: products.reduce((sum, p) => sum + (p.current_stock * p.cost_price), 0),
    });
  };

  const getStockStatus = (product) => {
    if (product.current_stock <= 0) {
      return { label: 'Out of Stock', color: 'error', icon: <CancelIcon /> };
    }
    if (product.current_stock <= product.minimum_stock) {
      return { label: 'Low Stock', color: 'warning', icon: <WarningIcon /> };
    }
    return { label: 'In Stock', color: 'success', icon: <CheckCircleIcon /> };
  };

  const getFilteredByTab = () => {
    switch (activeTab) {
      case 1: // Low Stock
        return filteredProducts.filter(p => p.current_stock <= p.minimum_stock && p.current_stock > 0);
      case 2: // Out of Stock
        return filteredProducts.filter(p => p.current_stock <= 0);
      case 3: // In Stock
        return filteredProducts.filter(p => p.current_stock > p.minimum_stock);
      default: // All
        return filteredProducts;
    }
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const displayedProducts = getFilteredByTab();

  if (loading && !products.length) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Product Management
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Monitor inventory levels and product status
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <InventoryIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      {stats.totalProducts}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Products
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon color="success" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      {stats.inStock}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      In Stock
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <WarningIcon color="warning" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      {stats.lowStock}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Low Stock
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PriceIcon color="secondary" sx={{ fontSize: 40, mr: 2 }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      KES {stats.totalValue.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Inventory Value
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Search and Filter */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search products by name, SKU, or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FilterIcon color="action" />
              <Typography variant="body2" color="textSecondary">
                Filter by:
              </Typography>
              <Tabs
                value={activeTab}
                onChange={handleTabChange}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ minHeight: 40, ml: 2 }}
              >
                <Tab label="All" />
                <Tab label="Low Stock" />
                <Tab label="Out of Stock" />
                <Tab label="In Stock" />
              </Tabs>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Products Table */}
      <Paper elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: 'grey.50' }}>
              <TableRow>
                <TableCell><strong>SKU</strong></TableCell>
                <TableCell><strong>Product Name</strong></TableCell>
                <TableCell><strong>Category</strong></TableCell>
                <TableCell align="right"><strong>Cost Price</strong></TableCell>
                <TableCell align="right"><strong>Selling Price</strong></TableCell>
                <TableCell align="center"><strong>Current Stock</strong></TableCell>
                <TableCell align="center"><strong>Min Stock</strong></TableCell>
                <TableCell align="center"><strong>Status</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {displayedProducts.map((product) => {
                const status = getStockStatus(product);
                return (
                  <TableRow 
                    key={product.id}
                    hover
                    sx={{ 
                      '&:last-child td, &:last-child th': { border: 0 },
                      bgcolor: product.current_stock <= 0 ? 'error.light' : 
                               product.current_stock <= product.minimum_stock ? 'warning.light' : 'inherit'
                    }}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {product.sku}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {product.name}
                      </Typography>
                      {product.description && (
                        <Typography variant="caption" color="textSecondary" display="block">
                          {product.description.length > 50 
                            ? `${product.description.substring(0, 50)}...` 
                            : product.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={product.category?.name || 'Uncategorized'} 
                        size="small" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2">
                        KES {product.cost_price}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight="bold" color="primary">
                        KES {product.selling_price}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <StockIcon sx={{ mr: 1, color: 'action.active', fontSize: 16 }} />
                        <Typography variant="body2">
                          {product.current_stock}
                        </Typography>
                      </Box>
                      {product.maximum_stock > 0 && (
                        <LinearProgress 
                          variant="determinate" 
                          value={(product.current_stock / product.maximum_stock) * 100}
                          sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                          color={status.color}
                        />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2">
                        {product.minimum_stock}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        icon={status.icon}
                        label={status.label}
                        color={status.color}
                        size="small"
                        variant="filled"
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {displayedProducts.length === 0 && (
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <InventoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography variant="body1" color="textSecondary">
              No products found
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {search ? 'Try a different search' : 'Add products from Django admin'}
            </Typography>
          </Box>
        )}
      </Paper>

      {/* Summary Footer */}
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2" color="textSecondary">
          Showing {displayedProducts.length} of {products.length} products
          {search && ` • "${search}"`}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Last updated: {new Date().toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );
}