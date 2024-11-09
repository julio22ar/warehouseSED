// scripts/pages/inventory.js
import Auth from '../auth.js';

class InventoryPage {
    constructor() {
        this.products = [];
        this.filteredProducts = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.init();
    }

    async init() {
        // Verificar autenticación
        const user = Auth.getCurrentUser();
        if (!user) {
            window.location.href = '/pages/login.html';
            return;
        }

        // Actualizar nombre de usuario
        document.getElementById('userName').textContent = user.name;

        // Setup event listeners
        this.setupEventListeners();

        // Cargar datos iniciales
        await Promise.all([
            this.loadStats(),
            this.loadProducts(),
            this.loadCategories()
        ]);
    }

    setupEventListeners() {
        // Búsqueda
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => this.handleSearch());
        }

        // Filtro de categorías
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', () => this.handleSearch());
        }

        // Filtro de estado
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => this.handleSearch());
        }

        // Logout
        const logoutBtn = document.querySelector('.btn-danger');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                Auth.logout();
            });
        }
    }

    async loadStats() {
        try {
            const response = await fetch('http://localhost:3000/api/inventory/stats');
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('totalProducts').textContent = data.data.totalProducts.toLocaleString();
                document.getElementById('lowStock').textContent = data.data.lowStock.toLocaleString();
                document.getElementById('categories').textContent = data.data.categories.toLocaleString();
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showError('Error al cargar estadísticas');
        }
    }

    async loadProducts() {
        try {
            const response = await fetch('http://localhost:3000/api/products');
            const data = await response.json();
            
            if (data.success) {
                this.products = data.data;
                this.filteredProducts = [...this.products];
                this.renderProducts();
                this.renderPagination();
            }
        } catch (error) {
            console.error('Error loading products:', error);
            this.showError('Error al cargar productos');
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('http://localhost:3000/api/categories');
            const data = await response.json();
            
            if (data.success) {
                const categoryFilter = document.getElementById('categoryFilter');
                categoryFilter.innerHTML = `
                    <option value="">Todas las categorías</option>
                    ${data.data.map(category => `
                        <option value="${category.id}">${category.name}</option>
                    `).join('')}
                `;
            }
        } catch (error) {
            console.error('Error loading categories:', error);
        }
    }

    handleSearch() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const categoryId = document.getElementById('categoryFilter').value;
        const status = document.getElementById('statusFilter').value;

        this.filteredProducts = this.products.filter(product => {
            const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                                product.location?.toLowerCase().includes(searchTerm);
            const matchesCategory = !categoryId || product.category_id === parseInt(categoryId);
            const matchesStatus = !status || this.getProductStatus(product) === status;

            return matchesSearch && matchesCategory && matchesStatus;
        });

        this.currentPage = 1;
        this.renderProducts();
        this.renderPagination();
    }

    getProductStatus(product) {
        if (product.quantity <= 0) return 'out_stock';
        if (product.quantity < product.minimum_stock) return 'low_stock';
        return 'in_stock';
    }

    renderProducts() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedProducts = this.filteredProducts.slice(startIndex, endIndex);

        const tbody = document.getElementById('inventoryTableBody');
        tbody.innerHTML = paginatedProducts.map(product => `
            <tr>
                <td>${product.id}</td>
                <td>${this.escapeHtml(product.name)}</td>
                <td>${this.escapeHtml(product.category_name || 'Sin categoría')}</td>
                <td>${product.quantity}</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(product)}">
                        ${this.getStatusText(product)}
                    </span>
                </td>
                <td>${this.escapeHtml(product.location || '-')}</td>
                <td>
                    <div class="action-buttons">
                        <button class="btn btn-icon" title="Ver detalles" onclick="viewProduct(${product.id})">👁️</button>
                        ${Auth.hasPermission('EDIT_PRODUCT') ? `
                            <button class="btn btn-icon" title="Editar" onclick="editProduct(${product.id})">✏️</button>
                        ` : ''}
                        ${Auth.hasPermission('DELETE_PRODUCT') ? `
                            <button class="btn btn-icon" title="Eliminar" onclick="deleteProduct(${product.id})">🗑️</button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    renderPagination() {
        const totalPages = Math.ceil(this.filteredProducts.length / this.itemsPerPage);
        const pagination = document.getElementById('pagination');
        
        let paginationHTML = '';
        
        if (totalPages > 1) {
            paginationHTML += `
                <button onclick="changePage(1)" ${this.currentPage === 1 ? 'disabled' : ''}>
                    Primera
                </button>
                <button onclick="changePage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>
                    Anterior
                </button>
            `;

            for (let i = 1; i <= totalPages; i++) {
                if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                    paginationHTML += `
                        <button onclick="changePage(${i})" 
                                class="${i === this.currentPage ? 'active' : ''}">
                            ${i}
                        </button>
                    `;
                } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                    paginationHTML += '<span>...</span>';
                }
            }

            paginationHTML += `
                <button onclick="changePage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Siguiente
                </button>
                <button onclick="changePage(${totalPages})" ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Última
                </button>
            `;
        }

        pagination.innerHTML = paginationHTML;
    }

    getStatusClass(product) {
        if (product.quantity <= 0) return 'status-out-stock';
        if (product.quantity < product.minimum_stock) return 'status-low-stock';
        return 'status-in-stock';
    }

    getStatusText(product) {
        if (product.quantity <= 0) return 'Sin Stock';
        if (product.quantity < product.minimum_stock) return 'Stock Bajo';
        return 'En Stock';
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    showError(message) {
        // Implementar sistema de notificaciones
        alert(message);
    }

    changePage(page) {
        this.currentPage = page;
        this.renderProducts();
        this.renderPagination();
    }
}

// Inicializar la página cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.inventoryPage = new InventoryPage();
});

// Funciones globales para los botones de acción
window.viewProduct = (id) => {
    // Implementar vista detallada del producto
    console.log('Ver producto:', id);
};

window.editProduct = (id) => {
    // Implementar edición de producto
    console.log('Editar producto:', id);
};

window.deleteProduct = (id) => {
    // Implementar eliminación de producto
    if (confirm('¿Está seguro de eliminar este producto?')) {
        console.log('Eliminar producto:', id);
    }
};

window.changePage = (page) => {
    window.inventoryPage.changePage(page);
};

export default InventoryPage;