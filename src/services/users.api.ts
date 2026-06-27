import { api } from './http';

export const userApi = {
  getUsers:   () => api.get('/users'),
  getRoles:   () => api.get('/users/roles'),
  getLogs:    () => api.get('/users/logs'),
  createUser: (data: { name: string; email: string; phone: string; roleId: string }) =>
    api.post('/users', data),
  updateUser: (id: string, data: { name: string; email: string; phone: string; roleId: string }) =>
    api.put(`/users/${id}`, data),
  deleteUser:  (id: string) => api.delete(`/users/${id}`),
  createRole:  (data: { name: string; description: string }) => api.post('/users/roles', data),
  updateRole:  (roleId: string, data: { name: string; description: string }) =>
    api.put(`/users/roles/${roleId}`, data),
  toggleBlock: (userId: string, action: 'block' | 'unblock') =>
    api.post(`/users/${userId}/${action}`),
};
