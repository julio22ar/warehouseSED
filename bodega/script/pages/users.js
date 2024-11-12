// scripts/pages/users.js
import Auth from '../auth.js';
import { PERMISSIONS } from '../utils/constants.js';

class UsersPage {
    constructor() {
        this.users = [];
        this.filteredUsers = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentUserId = null;
        this.init();
    }

    async init() {
        console.log('Starting users page initialization');
        
        // Verificar autenticación
        if (!Auth.isAuthenticated()) {
            window.location.href = '/pages/login.html';
            return;
        }

        const user = Auth.getCurrentUser();
        console.log('Current user role:', user?.role);

        // Verificar permisos usando MANAGE_USERS
        if (!Auth.hasPermission('MANAGE_USERS')) {
            console.log('User does not have MANAGE_USERS permission');
            Auth.redirectToDefaultRoute();
            return;
        }

        console.log('User has permission, continuing initialization');

        // Actualizar nombre de usuario
        document.getElementById('userName').textContent = user.name;

        // Setup event listeners
        this.setupEventListeners();

        // Cargar datos iniciales
        await this.loadUsers();
    }

    setupEventListeners() {
        // Búsqueda
        document.getElementById('searchInput')?.addEventListener('input', () => this.handleSearch());
        
        // Filtro de rol
        document.getElementById('roleFilter')?.addEventListener('change', () => this.handleSearch());
        
        // Modal
        document.getElementById('addUserBtn')?.addEventListener('click', () => this.openAddModal());
        document.getElementById('saveUserBtn')?.addEventListener('click', () => this.handleSaveUser());
        document.querySelector('.modal-close')?.addEventListener('click', () => this.closeModal());
        
        // Configurar botones de acción globales
        window.editUser = (id) => this.openEditModal(this.users.find(u => u.id === id));
        window.deleteUser = (id) => this.deleteUser(id);
        window.changePage = (page) => this.changePage(page);
    }

    async loadUsers() {
        try {
            const token = sessionStorage.getItem('token');
            const response = await fetch('http://localhost:3000/api/users', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                this.users = data.data;
                this.filteredUsers = [...this.users];
                this.renderUsers();
                this.renderPagination();
            } else {
                throw new Error(data.message || 'Error loading users');
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Error al cargar usuarios');
        }
    }

    async handleSaveUser() {
        try {
            const form = document.getElementById('userForm');
            const formData = new FormData(form);
            const userData = Object.fromEntries(formData.entries());
            
            const token = sessionStorage.getItem('token');
            const url = this.currentUserId 
                ? `http://localhost:3000/api/users/${this.currentUserId}`
                : 'http://localhost:3000/api/users';
            
            const method = this.currentUserId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.success) {
                this.closeModal();
                await this.loadUsers();
                this.showSuccess(this.currentUserId ? 'Usuario actualizado' : 'Usuario creado');
            } else {
                throw new Error(data.message || 'Error saving user');
            }
        } catch (error) {
            console.error('Error saving user:', error);
            this.showError('Error al guardar el usuario');
        }
    }

    async deleteUser(id) {
        if (confirm('¿Está seguro de eliminar este usuario?')) {
            try {
                const token = sessionStorage.getItem('token');
                const response = await fetch(`http://localhost:3000/api/users/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (data.success) {
                    await this.loadUsers();
                    this.showSuccess('Usuario eliminado');
                } else {
                    throw new Error(data.message || 'Error deleting user');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                this.showError('Error al eliminar el usuario');
            }
        }
    }

    renderUsers() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedUsers = this.filteredUsers.slice(startIndex, endIndex);

        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = paginatedUsers.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${this.escapeHtml(user.username)}</td>
                <td>${this.escapeHtml(user.name)}</td>
                <td>${this.getRoleBadge(user.role)}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-icon" onclick="editUser(${user.id})">✏️</button>
                        <button class="btn btn-icon" onclick="deleteUser(${user.id})">🗑️</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    openAddModal() {
        this.currentUserId = null;
        document.getElementById('modalTitle').textContent = 'Agregar Usuario';
        document.getElementById('userForm').reset();
        document.getElementById('password').required = true;
        this.showModal();
    }

    openEditModal(user) {
        if (!user) return;
        
        this.currentUserId = user.id;
        document.getElementById('modalTitle').textContent = 'Editar Usuario';
        
        const form = document.getElementById('userForm');
        form.username.value = user.username;
        form.name.value = user.name;
        form.role.value = user.role;
        form.password.required = false;
        
        this.showModal();
    }

    showModal() {
        document.getElementById('userModal').classList.add('show');
    }

    closeModal() {
        document.getElementById('userModal').classList.remove('show');
        document.getElementById('userForm').reset();
    }

    // Métodos auxiliares
    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    getRoleBadge(role) {
        const badges = {
            'super_admin': '<span class="badge badge-primary">Super Admin</span>',
            'admin': '<span class="badge badge-success">Admin</span>',
            'user': '<span class="badge badge-info">Usuario</span>'
        };
        return badges[role] || role;
    }

    showError(message) {
        alert(message); // Reemplazar con un sistema de notificaciones mejor
    }

    showSuccess(message) {
        alert(message); // Reemplazar con un sistema de notificaciones mejor
    }
}

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    window.usersPage = new UsersPage();
});

export default UsersPage;