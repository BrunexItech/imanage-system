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
  Avatar,
  Tooltip,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  LockReset as ResetIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../stores/authStore';
import { employeeAPI } from '../services/employeeAPI';

export default function EmployeesPage() {
  const { user, business } = useAuthStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    role: 'cashier',
    password: '',
  });
  const [tempPassword, setTempPassword] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const canManageEmployees = user?.role === 'owner' || user?.role === 'manager';

  useEffect(() => {
    if (!canManageEmployees) return;
    fetchEmployees();
  }, [canManageEmployees]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await employeeAPI.getEmployees();
      const filtered = response.data.filter(emp => emp.id !== user?.id);
      setEmployees(filtered);
    } catch (error) {
      showSnackbar('Failed to load employees', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddDialog = () => {
    setDialogMode('add');
    setFormData({
      email: '',
      first_name: '',
      last_name: '',
      phone_number: '',
      role: 'cashier',
      password: generateTempPassword(),
    });
    setOpenDialog(true);
  };

  const handleOpenEditDialog = (employee) => {
    setDialogMode('edit');
    setSelectedEmployee(employee);
    setFormData({
      email: employee.email,
      first_name: employee.first_name,
      last_name: employee.last_name,
      phone_number: employee.phone_number || '',
      role: employee.role,
      password: '',
    });
    setOpenDialog(true);
  };

  const handleOpenResetDialog = (employee) => {
    setDialogMode('reset');
    setSelectedEmployee(employee);
    setTempPassword(generateTempPassword());
    setOpenDialog(true);
  };

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password + '!2';
  };

  const handleSubmit = async () => {
    try {
      if (dialogMode === 'add') {
        await employeeAPI.createEmployee(formData);
        showSnackbar('Employee created successfully', 'success');
      } else if (dialogMode === 'edit') {
        await employeeAPI.updateEmployee(selectedEmployee.id, formData);
        showSnackbar('Employee updated successfully', 'success');
      } else if (dialogMode === 'reset') {
        await employeeAPI.resetPassword(selectedEmployee.id, tempPassword);
        showSnackbar(`Password reset successful. New password: ${tempPassword}`, 'success');
      }
      setOpenDialog(false);
      fetchEmployees();
    } catch (error) {
      const msg = error.response?.data?.error || 'Operation failed';
      showSnackbar(msg, 'error');
    }
  };

  const handleToggleStatus = async (employee) => {
    try {
      await employeeAPI.toggleEmployeeStatus(employee.id, !employee.is_active);
      showSnackbar(
        employee.is_active ? 'Employee deactivated' : 'Employee activated',
        'success'
      );
      fetchEmployees();
    } catch (error) {
      showSnackbar('Failed to update status', 'error');
    }
  };

  const showSnackbar = (message, severity) => {
    setSnackbar({ open: true, message, severity });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'owner': return 'primary';
      case 'manager': return 'secondary';
      case 'supervisor': return 'info';
      case 'cashier': return 'default';
      default: return 'default';
    }
  };

  // Mobile card view render
  const renderMobileView = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {employees.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">
            No employees found. Click "Add Employee" to create your first staff member.
          </Typography>
        </Paper>
      ) : (
        employees.map((emp) => (
          <Card key={emp.id} elevation={2} sx={{ borderRadius: 2 }}>
            <CardContent>
              {/* Header with avatar and name */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.light', width: 48, height: 48 }}>
                    <PersonIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {emp.first_name} {emp.last_name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {emp.email}
                    </Typography>
                  </Box>
                </Box>
                <Chip
                  label={emp.role.toUpperCase()}
                  color={getRoleColor(emp.role)}
                  size="small"
                />
              </Box>

              <Divider sx={{ my: 1.5 }} />

              {/* Details grid */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Phone
                  </Typography>
                  <Typography variant="body2">
                    {emp.phone_number || 'No phone'}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Status
                  </Typography>
                  <Chip
                    label={emp.is_active ? 'Active' : 'Inactive'}
                    color={emp.is_active ? 'success' : 'error'}
                    size="small"
                    sx={{ height: 24 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="textSecondary" display="block">
                    Shift
                  </Typography>
                  {emp.current_shift_open ? (
                    <Chip label="On Shift" color="warning" size="small" sx={{ height: 24 }} />
                  ) : (
                    <Chip label="Off Duty" variant="outlined" size="small" sx={{ height: 24 }} />
                  )}
                </Grid>
              </Grid>

              {/* Actions */}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => handleOpenEditDialog(emp)}
                >
                  Edit
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="warning"
                  startIcon={<ResetIcon />}
                  onClick={() => handleOpenResetDialog(emp)}
                >
                  Reset
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color={emp.is_active ? 'error' : 'success'}
                  startIcon={<DeleteIcon />}
                  onClick={() => handleToggleStatus(emp)}
                >
                  {emp.is_active ? 'Deactivate' : 'Activate'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );

  // Desktop table view render
  const renderDesktopView = () => (
    <TableContainer component={Paper} elevation={2} sx={{ overflowX: 'auto' }}>
      <Table sx={{ minWidth: 900 }}>
        <TableHead>
          <TableRow sx={{ bgcolor: 'grey.50' }}>
            <TableCell>Employee</TableCell>
            <TableCell>Contact</TableCell>
            <TableCell>Role</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Shift</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {employees.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                <Typography color="textSecondary">
                  No employees found. Click "Add Employee" to create your first staff member.
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            employees.map((emp) => (
              <TableRow key={emp.id} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                      <PersonIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" fontWeight="bold">
                        {emp.first_name} {emp.last_name}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {emp.email}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {emp.phone_number || '—'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={emp.role.toUpperCase()}
                    color={getRoleColor(emp.role)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={emp.is_active ? 'Active' : 'Inactive'}
                    color={emp.is_active ? 'success' : 'error'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {emp.current_shift_open ? (
                    <Chip label="On Shift" color="warning" size="small" />
                  ) : (
                    <Chip label="Off Duty" variant="outlined" size="small" />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Edit">
                    <IconButton size="small" onClick={() => handleOpenEditDialog(emp)} sx={{ mr: 0.5 }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Reset Password">
                    <IconButton size="small" onClick={() => handleOpenResetDialog(emp)} sx={{ mr: 0.5 }} color="warning">
                      <ResetIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={emp.is_active ? 'Deactivate' : 'Activate'}>
                    <IconButton size="small" onClick={() => handleToggleStatus(emp)} color={emp.is_active ? 'error' : 'success'}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  if (!canManageEmployees) {
    return (
      <Box sx={{ p: { xs: 2, sm: 3 } }}>
        <Alert severity="error" sx={{ width: '100%' }}>
          You don't have permission to manage employees. Only owners and managers can access this page.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ 
      height: '100%', 
      overflow: 'auto', 
      p: { xs: 2, sm: 3 } 
    }}>
      {/* Header - Responsive */}
      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'stretch', sm: 'center' }, 
        mb: 3,
        gap: 2
      }}>
        <Box>
          <Typography variant={isMobile ? "h5" : "h4"} fontWeight="bold" gutterBottom>
            Employee Management
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {business?.name} • Manage your staff and their roles
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAddDialog}
          size={isMobile ? "medium" : "large"}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Add Employee
        </Button>
      </Box>

      {/* Content - Responsive switching between mobile cards and desktop table */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Mobile/Tablet: Card View */}
          {(isMobile || isTablet) && renderMobileView()}
          
          {/* Desktop: Table View */}
          {!isMobile && !isTablet && renderDesktopView()}
        </>
      )}

      {/* Add/Edit Dialog - Fully responsive */}
      <Dialog 
        open={openDialog && dialogMode !== 'reset'} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: isMobile ? { m: 0, height: '100%', maxHeight: '100%', borderRadius: 0 } : {}
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          {dialogMode === 'add' ? 'Add New Employee' : 'Edit Employee'}
        </DialogTitle>
        <DialogContent dividers={isMobile}>
          <Box sx={{ 
            pt: { xs: 1, sm: 2 }, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: 2.5 
          }}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              size={isMobile ? "small" : "medium"}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={dialogMode === 'edit'}
              required
            />
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2 
            }}>
              <TextField
                label="First Name"
                fullWidth
                size={isMobile ? "small" : "medium"}
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
              <TextField
                label="Last Name"
                fullWidth
                size={isMobile ? "small" : "medium"}
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </Box>
            <TextField
              label="Phone Number"
              fullWidth
              size={isMobile ? "small" : "medium"}
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              placeholder="Optional"
            />
            <FormControl fullWidth size={isMobile ? "small" : "medium"}>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                label="Role"
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <MenuItem value="cashier">Cashier</MenuItem>
                <MenuItem value="supervisor">Supervisor</MenuItem>
                <MenuItem value="manager">Manager</MenuItem>
              </Select>
            </FormControl>
            {dialogMode === 'add' && (
              <TextField
                label="Temporary Password"
                fullWidth
                size={isMobile ? "small" : "medium"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                helperText="Employee will change this on first login"
                required
              />
            )}
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
            disabled={!formData.email || !formData.first_name || !formData.last_name}
          >
            {dialogMode === 'add' ? 'Create Employee' : 'Update Employee'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Reset Password Dialog - Fully responsive */}
      <Dialog 
        open={openDialog && dialogMode === 'reset'} 
        onClose={() => setOpenDialog(false)} 
        maxWidth="sm" 
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: isMobile ? { m: 0, height: '100%', maxHeight: '100%', borderRadius: 0 } : {}
        }}
      >
        <DialogTitle>Reset Password</DialogTitle>
        <DialogContent dividers={isMobile}>
          <Box sx={{ pt: { xs: 1, sm: 2 } }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              New password for {selectedEmployee?.first_name} {selectedEmployee?.last_name}
            </Alert>
            <TextField
              label="New Temporary Password"
              fullWidth
              size={isMobile ? "small" : "medium"}
              value={tempPassword}
              onChange={(e) => setTempPassword(e.target.value)}
              helperText="Share this password securely with the employee"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpenDialog(false)} fullWidth={isMobile}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} variant="contained" color="warning" fullWidth={isMobile}>
            Reset Password
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
  );
}