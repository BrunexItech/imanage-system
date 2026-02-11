import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  CircularProgress,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Divider,
  LinearProgress,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  Category as CategoryIcon,
  Search as SearchIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { productAPI } from '../services/api';

export default function ProductManagementPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const { user, business } = useAuthStore();

  // States
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    cost_price: '',
    selling_price: '',
    current_stock: '',
    minimum_stock: '10',
    maximum_stock: '1000',
    description: '',
  });
  const [categoryFormData, setCategoryFormData] = useState({
    name: '',
    description: '',
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Permissions
  const canEdit = user?.role === 'owner' || user?.role === 'manager' || user?.role === 'supervisor';
  const canDelete = user?.role === 'owner' || user?.role === 'manager';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [productsRes, categoriesRes] = await Promise.all([
        productAPI.getProducts(),
        productAPI.getCategories()
      ]);
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      showSnackbar('Failed to load inventory data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setFormData({
      name: '',
      sku: generateSKU(),
      barcode: generateBarcode(),
      category: '',
      cost_price: '',
      selling_price: '',
      current_stock: '0',
      minimum_stock: '10',
      maximum_stock: '1000',
      description: '',
    });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (product) => {
    setDialogMode('edit');
    setSelectedProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode,
      category: product.category || '',
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      current_stock: product.current_stock,
      minimum_stock: product.minimum_stock,
      maximum_stock: product.maximum_stock,
      description: product.description || '',
    });
    setOpenDialog(true);
  };

  const handleOpenCategoryDialog = () => {
    setDialogMode('category');
    setCategoryFormData({ name: '', description: '' });
    setOpenDialog(true);
  };

  const generateSKU = () => {
    const prefix = business?.name?.substring(0, 3).toUpperCase() || 'PRD';
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `${prefix}${random}`;
  };

  const generateBarcode = () => {
    return Math.floor(Math.random() * 9000000000000 + 1000000000000).toString();
  };

  const handleSubmit = async () => {
    try {
      if (dialogMode === 'add') {
        await productAPI.createProduct(formData);
        showSnackbar('Product added successfully', 'success');
      } else if (dialogMode === 'edit') {
        await productAPI.updateProduct(selectedProduct.id, formData);
        showSnackbar('Product updated successfully', 'success');
      } else if (dialogMode === 'category') {
        await productAPI.createCategory(categoryFormData);
        showSnackbar('Category added successfully', 'success');
      }
      setOpenDialog(false);
      fetchData();
    } catch (error) {
      showSnackbar(error.response?.data?.error || 'Operation failed', 'error');
    }
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`Delete ${product.name}? This action cannot be undone.`)) return;
    try {
      await productAPI.deleteProduct(product.id);
      showSnackbar('Product deleted successfully', 'success');
      fetchData();
    } catch (error) {
      showSnackbar('Failed to delete product', 'error');
    }
  };

  const handleStockAdjustment = async (product, adjustment) => {
    const newStock = product.current_stock + adjustment;
    if (newStock < 0) {
      showSnackbar('Stock cannot be negative', 'warning');
      return;
    }
    try {
      await productAPI.updateProduct(product.id, {
        ...product,
        current_stock: newStock
      });
      showSnackbar(`Stock updated: ${product.current_stock} → ${newStock}`, 'success');
      fetchData();
    } catch (error) {
      showSnackbar('Failed to update stock', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchTerm));
    
    if (tabValue === 0) return matchesSearch;
    if (tabValue === 1) return matchesSearch && p.is_low_stock;
    if (tabValue === 2) return matchesSearch && p.is_out_of_stock;
    return matchesSearch;
  });

  // Stats
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.is_low_stock).length;
  const outOfStockCount = products.filter(p => p.is_out_of_stock).length;
  const totalValue = products.reduce((sum, p) => sum + (p.current_stock * p.cost_price), 0);

  // Mobile card view
  const renderMobileCard = (product) => (
    <Card key={product.id} elevation={2} sx={{ mb: 2, borderRadius: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              {product.name}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              SKU: {product.sku} • {product.barcode?.slice(-4)}
            </Typography>
          </Box>
          <Chip
            label={product.status}
            color={product.status === 'active' ? 'success' : 'default'}
            size="small"
            sx={{ height: 24 }}
          />
        </Box>

        <Typography variant="body2" color="primary" sx={{ mb: 1.5 }}>
          {product.category_name || 'Uncategorized'}
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant="caption" color="textSecondary" display="block">
              Cost
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              KES {product.cost_price}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="textSecondary" display="block">
              Selling
            </Typography>
            <Typography variant="body2" fontWeight="bold" color="primary">
              KES {product.selling_price}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="textSecondary" display="block">
              Margin
            </Typography>
            <Typography variant="body2" color="success.main">
              +KES {product.profit_margin}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="textSecondary" display="block">
              In Stock
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="h6" fontWeight="bold" sx={{ 
                color: product.is_low_stock ? 'warning.main' : 'inherit',
                fontSize: '1.25rem'
              }}>
                {product.current_stock}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                / {product.minimum_stock} min
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="textSecondary" display="block">
              Stock Value
            </Typography>
            <Typography variant="body2">
              KES {(product.current_stock * product.cost_price).toLocaleString()}
            </Typography>
          </Grid>
        </Grid>

        {canEdit && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
            <Button
              size="small"
              variant="outlined"
              color="warning"
              onClick={() => handleStockAdjustment(product, -1)}
              disabled={product.current_stock <= 0}
            >
              -1
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="success"
              onClick={() => handleStockAdjustment(product, 1)}
            >
              +1
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => handleOpenEditDialog(product)}
            >
              Edit
            </Button>
            {canDelete && (
              <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => handleDeleteProduct(product)}
              >
                Delete
              </Button>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  // Desktop table view
  const renderDesktopTable = () => (
    <TableContainer component={Paper} elevation={2} sx={{ overflowX: 'auto' }}>
      <Table sx={{ minWidth: 1200 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell>Product</TableCell>
            <TableCell>SKU/Barcode</TableCell>
            <TableCell>Category</TableCell>
            <TableCell align="right">Cost</TableCell>
            <TableCell align="right">Selling</TableCell>
            <TableCell align="right">Stock</TableCell>
            <TableCell align="right">Value</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {filteredProducts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                <Typography color="textSecondary">
                  No products found. Click "Add Product" to create one.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            filteredProducts.map((product) => (
              <TableRow key={product.id} hover>
                <TableCell>
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold">
                      {product.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {product.description?.substring(0, 50)}
                      {product.description?.length > 50 && '...'}
                    </Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{product.sku}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {product.barcode}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={product.category_name || 'Uncategorized'} 
                    size="small" 
                    variant="outlined"
                  />
                </TableCell>
                <TableCell align="right">
                  KES {product.cost_price}
                </TableCell>
                <TableCell align="right">
                  <Typography fontWeight="bold" color="primary">
                    KES {product.selling_price}
                  </Typography>
                  <Typography variant="caption" color="success.main" display="block">
                    +KES {product.profit_margin}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
                    <Typography 
                      fontWeight="bold"
                      sx={{ color: product.is_low_stock ? 'warning.main' : 'inherit' }}
                    >
                      {product.current_stock}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      / {product.minimum_stock}
                    </Typography>
                    {product.is_low_stock && (
                      <Tooltip title="Low Stock">
                        <WarningIcon color="warning" fontSize="small" />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell align="right">
                  KES {(product.current_stock * product.cost_price).toLocaleString()}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5 }}>
                    {canEdit && (
                      <>
                        <Tooltip title="Decrease Stock">
                          <IconButton 
                            size="small" 
                            onClick={() => handleStockAdjustment(product, -1)}
                            disabled={product.current_stock <= 0}
                            color="warning"
                          >
                            -1
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Increase Stock">
                          <IconButton 
                            size="small" 
                            onClick={() => handleStockAdjustment(product, 1)}
                            color="success"
                          >
                            +1
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <IconButton 
                            size="small" 
                            onClick={() => handleOpenEditDialog(product)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                    {canDelete && (
                      <Tooltip title="Delete">
                        <IconButton 
                          size="small" 
                          onClick={() => handleDeleteProduct(product)}
                          color="error"
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Box sx={{ 
      height: '100%', 
      width: '100%',
      overflow: 'auto'
    }}>
      <Box sx={{ 
        p: { xs: 2, sm: 3 }
      }}>
        {/* Header Section */}
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'stretch', md: 'center' },
          mb: 3,
          gap: 2
        }}>
          <Box>
            <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" gutterBottom>
              Inventory Management
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {business?.name} • Manage products and stock levels
            </Typography>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 1 
          }}>
            <Button
              variant="outlined"
              startIcon={<CategoryIcon />}
              onClick={handleOpenCategoryDialog}
              fullWidth={isMobile}
              size={isMobile ? "medium" : "medium"}
            >
              Add Category
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddDialog}
              fullWidth={isMobile}
              size={isMobile ? "medium" : "large"}
            >
              Add Product
            </Button>
          </Box>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6} md={3}>
            <Card elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ 
                    bgcolor: 'primary.light', 
                    p: 1, 
                    borderRadius: 2,
                    display: 'flex'
                  }}>
                    <InventoryIcon color="primary" />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                      {totalProducts}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Total Products
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card elevation={1} sx={{ borderRadius: 2, bgcolor: lowStockCount > 0 ? 'warning.light' : 'inherit' }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ 
                    bgcolor: 'warning.light', 
                    p: 1, 
                    borderRadius: 2,
                    display: 'flex'
                  }}>
                    <WarningIcon color="warning" />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                      {lowStockCount}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Low Stock
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ 
                    bgcolor: 'error.light', 
                    p: 1, 
                    borderRadius: 2,
                    display: 'flex'
                  }}>
                    <DeleteIcon color="error" />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                      {outOfStockCount}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Out of Stock
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={6} md={3}>
            <Card elevation={1} sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box sx={{ 
                    bgcolor: 'success.light', 
                    p: 1, 
                    borderRadius: 2,
                    display: 'flex'
                  }}>
                    <MoneyIcon color="success" />
                  </Box>
                  <Box>
                    <Typography variant="h6" fontWeight="bold" sx={{ fontSize: { xs: '1.1rem', sm: '1.5rem' } }}>
                      KES {totalValue.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Stock Value
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Search and Filters */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name, SKU, or barcode..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <Tabs
                value={tabValue}
                onChange={(e, v) => setTabValue(v)}
                variant={isMobile ? "fullWidth" : "standard"}
                sx={{
                  '& .MuiTab-root': {
                    fontSize: { xs: '0.75rem', sm: '0.875rem' },
                    minWidth: { xs: 'auto', sm: 120 },
                  }
                }}
              >
                <Tab label="All Products" />
                <Tab 
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      Low Stock
                      {lowStockCount > 0 && (
                        <Chip 
                          label={lowStockCount} 
                          size="small" 
                          color="warning" 
                          sx={{ ml: 0.5, height: 20 }}
                        />
                      )}
                    </Box>
                  } 
                />
                <Tab label="Out of Stock" />
              </Tabs>
            </Grid>
          </Grid>
        </Paper>

        {/* Products List */}
        {loading ? (
          <Box sx={{ width: '100%', p: 4 }}>
            <LinearProgress />
          </Box>
        ) : (
          <>
            {(isMobile || isTablet) ? (
              <Box>
                {filteredProducts.length === 0 ? (
                  <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <InventoryIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography color="textSecondary">
                      No products found matching your criteria
                    </Typography>
                  </Paper>
                ) : (
                  filteredProducts.map(renderMobileCard)
                )}
              </Box>
            ) : (
              renderDesktopTable()
            )}
          </>
        )}

        {/* Add/Edit Product Dialog */}
        <Dialog 
          open={openDialog && dialogMode !== 'category'} 
          onClose={() => setOpenDialog(false)} 
          maxWidth="md" 
          fullWidth
          fullScreen={isMobile}
          PaperProps={{
            sx: isMobile ? { m: 0, height: '100%', maxHeight: '100%', borderRadius: 0 } : {}
          }}
        >
          <DialogTitle sx={{ pb: 1 }}>
            {dialogMode === 'add' ? 'Add New Product' : 'Edit Product'}
          </DialogTitle>
          <DialogContent dividers={isMobile}>
            <Box sx={{ 
              pt: { xs: 1, sm: 2 },
              display: 'flex',
              flexDirection: 'column',
              gap: 2.5
            }}>
              <TextField
                label="Product Name"
                fullWidth
                size={isMobile ? "small" : "medium"}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="SKU"
                    fullWidth
                    size={isMobile ? "small" : "medium"}
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Barcode"
                    fullWidth
                    size={isMobile ? "small" : "medium"}
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size={isMobile ? "small" : "medium"}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={formData.category}
                      label="Category"
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <MenuItem value="">Uncategorized</MenuItem>
                      {categories.map((cat) => (
                        <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Divider sx={{ my: 1 }} />

              <Typography variant="subtitle2" fontWeight="bold">
                Pricing
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={4}>
                  <TextField
                    label="Cost Price"
                    type="number"
                    fullWidth
                    size={isMobile ? "small" : "medium"}
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">KES</InputAdornment>,
                    }}
                    required
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField
                    label="Selling Price"
                    type="number"
                    fullWidth
                    size={isMobile ? "small" : "medium"}
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: e.target.value })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">KES</InputAdornment>,
                    }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    label="Profit Margin"
                    fullWidth
                    size={isMobile ? "small" : "medium"}
                    value={formData.selling_price && formData.cost_price 
                      ? `KES ${(parseFloat(formData.selling_price) - parseFloat(formData.cost_price)).toFixed(2)}`
                      : '—'}
                    disabled
                    InputProps={{
                      startAdornment: <InputAdornment position="start">≈</InputAdornment>,
                    }}
                  />
                </Grid>
              </Grid>

              <Divider sx={{ my: 1 }} />

              <Typography variant="subtitle2" fontWeight="bold">
                Stock Management
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4} sm={3}>
                  <TextField
                    label="Current Stock"
                    type="number"
                    fullWidth
                    size={isMobile ? "small" : "medium"}
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={4} sm={3}>
                  <TextField
                    label="Min Stock"
                    type="number"
                    fullWidth
                    size={isMobile ? "small" : "medium"}
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                    helperText="Low stock alert"
                  />
                </Grid>
                <Grid item xs={4} sm={3}>
                  <TextField
                    label="Max Stock"
                    type="number"
                    fullWidth
                    size={isMobile ? "small" : "medium"}
                    value={formData.maximum_stock}
                    onChange={(e) => setFormData({ ...formData, maximum_stock: e.target.value })}
                  />
                </Grid>
              </Grid>

              <TextField
                label="Description"
                multiline
                rows={3}
                fullWidth
                size={isMobile ? "small" : "medium"}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional product description"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenDialog(false)} fullWidth={isMobile}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              fullWidth={isMobile}
              disabled={!formData.name || !formData.sku || !formData.cost_price || !formData.selling_price}
            >
              {dialogMode === 'add' ? 'Add Product' : 'Update Product'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Category Dialog */}
        <Dialog 
          open={openDialog && dialogMode === 'category'} 
          onClose={() => setOpenDialog(false)} 
          maxWidth="sm" 
          fullWidth
          fullScreen={isMobile}
          PaperProps={{
            sx: isMobile ? { m: 0, height: '100%', maxHeight: '100%', borderRadius: 0 } : {}
          }}
        >
          <DialogTitle>Add Category</DialogTitle>
          <DialogContent dividers={isMobile}>
            <Box sx={{ pt: { xs: 1, sm: 2 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Category Name"
                fullWidth
                size={isMobile ? "small" : "medium"}
                value={categoryFormData.name}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, name: e.target.value })}
                required
              />
              <TextField
                label="Description"
                multiline
                rows={2}
                fullWidth
                size={isMobile ? "small" : "medium"}
                value={categoryFormData.description}
                onChange={(e) => setCategoryFormData({ ...categoryFormData, description: e.target.value })}
                placeholder="Optional description"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setOpenDialog(false)} fullWidth={isMobile}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              variant="contained"
              fullWidth={isMobile}
              disabled={!categoryFormData.name}
            >
              Create Category
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ 
            vertical: isMobile ? 'top' : 'bottom', 
            horizontal: isMobile ? 'center' : 'right' 
          }}
        >
          <Alert 
            onClose={() => setSnackbar({ ...snackbar, open: false })} 
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
}