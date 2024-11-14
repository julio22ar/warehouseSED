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
        
        if (!Auth.isAuthenticated()) {
            window.location.href = '/pages/login.html';
            return;
        }

        const user = Auth.getCurrentUser();
        console.log('Current user role:', user?.role);

        if (!Auth.hasPermission('MANAGE_USERS')) {
            console.log('User does not have MANAGE_USERS permission');
            Auth.redirectToDefaultRoute();
            return;
        }

        console.log('User has permission, continuing initialization');
        document.getElementById('userName').textContent = user.name;
        this.setupEventListeners();
        await this.loadUsers();
    }

    setupEventListeners() {
        // Búsqueda
        document.getElementById('searchInput')?.addEventListener('input', () => this.handleSearch());
        
        // Filtro de rol
        document.getElementById('roleFilter')?.addEventListener('change', () => this.handleSearch());
        
        // Modal y botones relacionados
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            addUserBtn.addEventListener('click', () => this.openAddModal());
        }
    
        const saveUserBtn = document.getElementById('saveUserBtn');
        if (saveUserBtn) {
            saveUserBtn.addEventListener('click', () => this.handleSaveUser());
        }
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeModal());
        }
        const closeBtn = document.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        // Cerrar sesión
        document.getElementById('logoutBtn')?.addEventListener('click', () => Auth.logout());
        
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

    handleSearch() {
        const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || '';
        const roleFilter = document.getElementById('roleFilter')?.value || 'all';
        
        this.filteredUsers = this.users.filter(user => {
            const matchesSearch = user.username.toLowerCase().includes(searchTerm) || 
                                user.name.toLowerCase().includes(searchTerm);
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            
            return matchesSearch && matchesRole;
        });
        
        this.currentPage = 1;
        this.renderUsers();
        this.renderPagination();
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
        const modal = document.getElementById('userModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden'; // Opcional: evita el scroll
        }
    }
    
    closeModal() {
        const modal = document.getElementById('userModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = ''; // Opcional: restaura el scroll
            document.getElementById('userForm').reset();
        }
    }

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
        alert(message);
    }

    showSuccess(message) {
        alert(message);
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
        const paginationContainer = document.getElementById('pagination');
        
        if (!paginationContainer) return;
        
        let paginationHTML = '';
        
        paginationHTML += `
            <button class="btn btn-pagination" 
                    onclick="window.usersPage.changePage(${this.currentPage - 1})" 
                    ${this.currentPage === 1 ? 'disabled' : ''}>
                Anterior
            </button>
        `;
        
        for (let i = 1; i <= totalPages; i++) {
            paginationHTML += `
                <button class="btn btn-pagination ${this.currentPage === i ? 'active' : ''}" 
                        onclick="window.usersPage.changePage(${i})">
                    ${i}
                </button>
            `;
        }
        
        paginationHTML += `
            <button class="btn btn-pagination" 
                    onclick="window.usersPage.changePage(${this.currentPage + 1})" 
                    ${this.currentPage === totalPages ? 'disabled' : ''}>
                Siguiente
            </button>
        `;
        
        paginationContainer.innerHTML = paginationHTML;
    }

    changePage(page) {
        const totalPages = Math.ceil(this.filteredUsers.length / this.itemsPerPage);
        
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        
        this.currentPage = page;
        this.renderUsers();
        this.renderPagination();
    }
}

// Inicializar la página
document.addEventListener('DOMContentLoaded', () => {
    window.usersPage = new UsersPage();
});

export default UsersPage;