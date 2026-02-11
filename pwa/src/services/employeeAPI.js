import api from './api';

export const employeeAPI = {
  // Get all employees for current business
  getEmployees: () => api.get('/accounts/users/'),
  
  // Get single employee
  getEmployee: (id) => api.get(`/accounts/users/${id}/`),
  
  // Create new employee (cashier/manager/supervisor)
  createEmployee: (data) => api.post('/accounts/users/', data),
  
  // Update employee
  updateEmployee: (id, data) => api.put(`/accounts/users/${id}/`, data),
  
  // Deactivate/reactivate employee
  toggleEmployeeStatus: (id, isActive) => 
    api.patch(`/accounts/users/${id}/`, { is_active: isActive }),
  
  // Reset password (sets temporary password)
  resetPassword: (id, tempPassword) => 
    api.post(`/accounts/users/${id}/reset-password/`, { password: tempPassword }),
};