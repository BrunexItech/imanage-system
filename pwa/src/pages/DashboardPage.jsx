import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  LinearProgress,
  Chip,
  Paper,
} from '@mui/material';
import {
  PointOfSale as PosIcon,
  Inventory as InventoryIcon,
  Sync as SyncIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  AttachMoney as MoneyIcon,
  ShoppingCart as CartIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { syncService } from '../services/syncService';
import { dashboardAPI } from '../services/api';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user, business } = useAuthStore();
  const [syncStatus, setSyncStatus] = useState({ pending: 0, syncing: false });
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardStats();
    checkSyncStatus();

    // Poll sync status every 10 seconds
    const interval = setInterval(checkSyncStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getStats();
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSyncStatus = async () => {
    const pending = await syncService.getPendingCount();
    const isSyncing = syncService.isSyncing; // FIXED: Changed from syncService.isSyncing()
    setSyncStatus({ pending, syncing: isSyncing });
  };

  const handleForceSync = async () => {
    try {
      setSyncStatus(prev => ({ ...prev, syncing: true }));
      await syncService.forceSync();
      await checkSyncStatus();
      loadDashboardStats();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncStatus(prev => ({ ...prev, syncing: false }));
    }
  };

  const handleOpenPOS = () => {
    navigate('/pos');
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  if (loading && !dashboardStats) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {getGreeting()}, {user?.first_name}!
        </Typography>
        <Typography variant="body1" color="textSecondary">
          {business?.name || 'Your Business'} Dashboard
        </Typography>
      </Box>

      {/* Sync Status Banner */}
      {syncStatus.pending > 0 && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mb: 3,
            bgcolor: syncStatus.syncing ? 'info.light' : 'warning.light',
            borderLeft: `4px solid ${syncStatus.syncing ? '#1976d2' : '#ff9800'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <SyncIcon color={syncStatus.syncing ? 'info' : 'warning'} />
            <Box>
              <Typography variant="subtitle1" fontWeight="medium">
                {syncStatus.syncing ? 'Syncing data...' : `${syncStatus.pending} pending syncs`}
              </Typography>
              <Typography variant="body2">
                {syncStatus.syncing 
                  ? 'Please wait while data is being synchronized' 
                  : 'Some transactions are waiting to sync to the cloud'}
              </Typography>
            </Box>
          </Box>
          {!syncStatus.syncing && syncStatus.pending > 0 && (
            <Button
              variant="contained"
              size="small"
              startIcon={<SyncIcon />}
              onClick={handleForceSync}
              disabled={!navigator.onLine}
            >
              Sync Now
            </Button>
          )}
        </Paper>
      )}

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <MoneyIcon color="primary" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    KES {dashboardStats?.today_sales?.toLocaleString() || '0'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Today's Sales
                  </Typography>
                </Box>
              </Box>
              <Chip 
                label="+12%" 
                size="small" 
                color="success" 
                variant="outlined"
                icon={<TrendingUpIcon />}
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CartIcon color="secondary" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {dashboardStats?.today_transactions || '0'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Transactions
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color="textSecondary">
                Avg: KES {dashboardStats?.avg_transaction?.toFixed(2) || '0'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <InventoryIcon color="warning" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {dashboardStats?.low_stock_items || '0'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Low Stock Items
                  </Typography>
                </Box>
              </Box>
              {dashboardStats?.low_stock_items > 0 && (
                <Chip 
                  label="Needs attention" 
                  size="small" 
                  color="warning" 
                  variant="outlined"
                  icon={<WarningIcon />}
                />
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SyncIcon color="info" sx={{ fontSize: 40, mr: 2 }} />
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {syncStatus.pending}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Pending Syncs
                  </Typography>
                </Box>
              </Box>
              <Typography variant="caption" color={navigator.onLine ? 'success.main' : 'warning.main'}>
                {navigator.onLine ? '🟢 Online' : '🟡 Offline'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Actions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box sx={{
                  bgcolor: 'primary.light',
                  p: 1.5,
                  borderRadius: 2,
                  mr: 2,
                }}>
                  <PosIcon color="primary" sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Point of Sale
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Process sales, handle payments, manage transactions
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="body2" color="textSecondary" paragraph sx={{ flexGrow: 1 }}>
                Quickly start processing customer transactions with our optimized POS interface. 
                Works both online and offline with automatic synchronization.
              </Typography>
              
              <Button
                variant="contained"
                fullWidth
                size="large"
                startIcon={<PosIcon />}
                onClick={handleOpenPOS}
                disabled={!user?.role || !['cashier', 'supervisor'].includes(user.role)}
                sx={{ mt: 'auto' }}
              >
                Open POS Terminal
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Box sx={{
                  bgcolor: 'secondary.light',
                  p: 1.5,
                  borderRadius: 2,
                  mr: 2,
                }}>
                  <InventoryIcon color="secondary" sx={{ fontSize: 32 }} />
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    Product Management
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    View inventory, check stock levels, manage products
                  </Typography>
                </Box>
              </Box>
              
              <Typography variant="body2" color="textSecondary" paragraph sx={{ flexGrow: 1 }}>
                Monitor your inventory status, check low stock alerts, and view product performance. 
                Keep track of what's selling and what needs restocking.
              </Typography>
              
              <Button
                variant="outlined"
                fullWidth
                size="large"
                startIcon={<InventoryIcon />}
                onClick={() => navigate('/products')}
                sx={{ mt: 'auto' }}
              >
                View Products
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Tips */}
      <Paper elevation={0} sx={{ p: 3, mt: 4, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          💡 Quick Tips
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="body2">
              • Use <strong>search</strong> in POS for quick product lookup
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2">
              • Check <strong>sync status</strong> regularly when online
            </Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="body2">
              • Monitor <strong>low stock</strong> items to avoid runouts
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
}