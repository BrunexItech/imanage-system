import api from './api';

export const employeeAPI = {
  // Get all employees for current business
  getEmployees: () => api.get('/auth/users/'),
  
  // Get single employee
  getEmployee: (id) => api.get(`/auth/users/${id}/`),
  
  // Create new employee (cashier/manager/supervisor)
  createEmployee: (data) => api.post('/auth/users/create/', data),
  
  // Update employee
  updateEmployee: (id, data) => api.patch(`/auth/users/${id}/`, data),
  
  // Deactivate/reactivate employee
  toggleEmployeeStatus: (id, isActive) => 
    api.patch(`/auth/users/${id}/`, { is_active: isActive }),
  
  // Reset password (sets temporary password)
  resetPassword: (id, tempPassword) => 
    api.post(`/auth/users/${id}/reset-password/`, { password: tempPassword }),
};