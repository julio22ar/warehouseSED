// scripts/pages/users.js
import Auth from '../auth.js';
import { PERMISSIONS } from '../utils/constants.js';
import PermissionsManager from '../utils/permissions.js';

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
        // Verificar permisos
        if (!Auth.hasPermission('super_admin')) {
            window.location.href = '/pages/index.html';
            return;
        }

        // Actualizar nombre de usuario
        document.getElementById('userName').textContent = Auth.getCurrentUser().name;

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
        
        // Logout
        document.querySelector('.btn-danger')?.addEventListener('click', () => Auth.logout());
    }

    async loadUsers() {
        try {
            const response = await fetch('http://localhost:3000/api/users');
            const data = await response.json();
            
            if (data.success) {
                this.users = data.data;
                this.filteredUsers = [...this.users];
                this.renderUsers();
                this.renderPagination();
            }
        } catch (error) {
            console.error('Error loading users:', error);
            this.showError('Error al cargar usuarios');
        }
    }

    handleSearch() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase();
        const roleFilter = document.getElementById('roleFilter')?.value;

        this.filteredUsers = this.users.filter(user => {
            const matchesSearch = user.username.toLowerCase().includes(searchTerm) ||
                                user.name.toLowerCase().includes(searchTerm);
            const matchesRole = !roleFilter || user.role === roleFilter;

            return matchesSearch && matchesRole;
        });

        this.currentPage = 1;
        this.renderUsers();
        this.renderPagination();
    }

    async handleSaveUser() {
        const form = document.getElementById('userForm');
        const formData = new FormData(form);
        const userData = Object.fromEntries(formData.entries());

        try {
            const url = this.currentUserId 
                ? `http://localhost:3000/api/users/${this.currentUserId}`
                : 'http://localhost:3000/api/users';
            
            const method = this.currentUserId ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();

            if (data.success) {
                this.closeModal();
                await this.loadUsers();
                this.showSuccess(this.currentUserId ? 'Usuario actualizado' : 'Usuario creado');
            } else {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error('Error saving user:', error);
            this.showError('Error al guardar el usuario');
        }
    }

    async deleteUser(id) {
        if (confirm('¿Está seguro de eliminar este usuario?')) {
            try {
                const response = await fetch(`http://localhost:3000/api/users/${id}`, {
                    method: 'DELETE'
                });

                const data = await response.json();

                if (data.success) {
                    await this.loadUsers();
                    this.showSuccess('Usuario eliminado');
                } else {
                    throw new Error(data.error);
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

    getRoleBadge(role) {
        const badges = {
            'super_admin': '<span class="badge badge-primary">Super Admin</span>',
            'admin': '<span class="badge badge-success">Admin</span>',
            'user': '<span class="badge badge-info">Usuario</span>'
        };
        return badges[role] || role;
    }

    // ... (métodos auxiliares como escapeHtml, showError, showSuccess)
}

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    window.usersPage = new UsersPage();
});

export default UsersPage;