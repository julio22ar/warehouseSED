// scripts/pages/reports.js
import Auth from '../auth.js';
import { API_URL, ROLES } from '../utils/constants.js';

class ReportsPage {
    constructor() {
        this.charts = {};
        this.data = {
            inventory: [],
            movements: [],
            lowStock: [],
            categories: []
        };
        this.dateRange = {
            start: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
        };
        this.init();
    }

    async init() {
        // Verificar permisos
        if (!Auth.hasPermission('super_admin')) {
            window.location.href = '/pages/index.html';
            return;
        }

        // Inicializar fecha en los inputs
        document.getElementById('startDate').value = this.dateRange.start;
        document.getElementById('endDate').value = this.dateRange.end;

        // Actualizar nombre de usuario
        document.getElementById('userName').textContent = Auth.getCurrentUser().name;

        // Setup event listeners
        this.setupEventListeners();

        // Cargar datos
        await Promise.all([
            this.loadStats(),
            this.loadInventoryData(),
            this.loadMovements(),
            this.loadLowStock(),
            this.loadCategories()
        ]);

        // Inicializar gráficos
        this.initCharts();
    }

    setupEventListeners() {
        // Filtros de fecha
        document.getElementById('filterDates').addEventListener('click', () => {
            this.dateRange.start = document.getElementById('startDate').value;
            this.dateRange.end = document.getElementById('endDate').value;
            this.refreshData();
        });

        // Botones de exportación
        document.getElementById('exportPDF').addEventListener('click', () => this.exportReport('pdf'));
        document.getElementById('exportExcel').addEventListener('click', () => this.exportReport('excel'));

        // Modal
        document.querySelector('.modal-close')?.addEventListener('click', () => this.closeModal());
        
        // Logout
        document.querySelector('.btn-danger').addEventListener('click', () => Auth.logout());
    }

    async loadStats() {
        try {
            const response = await fetch(`${API_URL}/api/reports/general?start=${this.dateRange.start}&end=${this.dateRange.end}`);
            const data = await response.json();

            if (data.success) {
                document.getElementById('totalProductsValue').textContent = data.data.totalProducts.toLocaleString();
                document.getElementById('lowStockValue').textContent = data.data.lowStock.toLocaleString();
                document.getElementById('outOfStockValue').textContent = data.data.outOfStock.toLocaleString();
                document.getElementById('totalMovementsValue').textContent = data.data.totalMovements.toLocaleString();
            }
        } catch (error) {
            console.error('Error loading stats:', error);
            this.showError('Error al cargar estadísticas');
        }
    }

    async loadInventoryData() {
        try {
            const response = await fetch(`${API_URL}/api/products`);
            const data = await response.json();

            if (data.success) {
                this.data.inventory = data.data;
                this.updateInventoryChart();
            }
        } catch (error) {
            console.error('Error loading inventory:', error);
            this.showError('Error al cargar datos del inventario');
        }
    }

    async loadMovements() {
        try {
            const response = await fetch(
                `${API_URL}/api/inventory/movements?start=${this.dateRange.start}&end=${this.dateRange.end}`
            );
            const data = await response.json();

            if (data.success) {
                this.data.movements = data.data;
                this.renderMovementsTable();
            }
        } catch (error) {
            console.error('Error loading movements:', error);
            this.showError('Error al cargar movimientos');
        }
    }

    async loadLowStock() {
        try {
            const response = await fetch(`${API_URL}/api/products/low-stock`);
            const data = await response.json();

            if (data.success) {
                this.data.lowStock = data.data;
                this.renderLowStockTable();
            }
        } catch (error) {
            console.error('Error loading low stock:', error);
            this.showError('Error al cargar productos con bajo stock');
        }
    }

    async loadCategories() {
        try {
            const response = await fetch(`${API_URL}/api/categories/stats`);
            const data = await response.json();

            if (data.success) {
                this.data.categories = data.data;
                this.updateCategoriesChart();
            }
        } catch (error) {
            console.error('Error loading categories:', error);
            this.showError('Error al cargar categorías');
        }
    }

    initCharts() {
        // Gráfico de Inventario
        const inventoryCtx = document.getElementById('inventoryChart').getContext('2d');
        this.charts.inventory = new Chart(inventoryCtx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Stock Actual',
                    data: [],
                    backgroundColor: 'rgba(79, 70, 229, 0.6)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });

        // Gráfico de Categorías
        const categoriesCtx = document.getElementById('categoriesChart').getContext('2d');
        this.charts.categories = new Chart(categoriesCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        'rgba(79, 70, 229, 0.6)',
                        'rgba(16, 185, 129, 0.6)',
                        'rgba(245, 158, 11, 0.6)',
                        'rgba(239, 68, 68, 0.6)',
                        'rgba(107, 114, 128, 0.6)'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    updateInventoryChart() {
        const labels = this.data.inventory.map(item => item.name);
        const data = this.data.inventory.map(item => item.quantity);

        this.charts.inventory.data.labels = labels;
        this.charts.inventory.data.datasets[0].data = data;
        this.charts.inventory.update();
    }

    updateCategoriesChart() {
        const labels = this.data.categories.map(item => item.name);
        const data = this.data.categories.map(item => item.count);

        this.charts.categories.data.labels = labels;
        this.charts.categories.data.datasets[0].data = data;
        this.charts.categories.update();
    }

    renderMovementsTable() {
        const tbody = document.getElementById('movementsTableBody');
        tbody.innerHTML = this.data.movements.map(movement => `
            <tr>
                <td>${new Date(movement.created_at).toLocaleDateString()}</td>
                <td>${this.escapeHtml(movement.product_name)}</td>
                <td>
                    <span class="badge badge-${movement.type === 'entrada' ? 'success' : 'warning'}">
                        ${movement.type}
                    </span>
                </td>
                <td>${movement.quantity}</td>
            </tr>
        `).join('');
    }

    renderLowStockTable() {
        const tbody = document.getElementById('lowStockTableBody');
        tbody.innerHTML = this.data.lowStock.map(product => `
            <tr>
                <td>${this.escapeHtml(product.name)}</td>
                <td>${product.quantity}</td>
                <td>${product.minimum_stock}</td>
                <td>
                    <span class="badge badge-${this.getStockStatusClass(product)}">
                        ${this.getStockStatusText(product)}
                    </span>
                </td>
            </tr>
        `).join('');
    }

    async refreshData() {
        await Promise.all([
            this.loadStats(),
            this.loadMovements()
        ]);
    }

    async exportReport(type) {
        try {
            const response = await fetch(
                `${API_URL}/api/reports/export?type=${type}&start=${this.dateRange.start}&end=${this.dateRange.end}`,
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${sessionStorage.getItem('token')}`
                    }
                }
            );

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `reporte_${type}_${new Date().toISOString().split('T')[0]}.${type}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } else {
                throw new Error('Error al exportar el reporte');
            }
        } catch (error) {
            console.error('Error exporting report:', error);
            this.showError('Error al exportar el reporte');
        }
    }

    getStockStatusClass(product) {
        if (product.quantity <= 0) return 'danger';
        if (product.quantity < product.minimum_stock) return 'warning';
        return 'success';
    }

    getStockStatusText(product) {
        if (product.quantity <= 0) return 'Sin Stock';
        if (product.quantity < product.minimum_stock) return 'Stock Bajo';
        return 'En Stock';
    }

    showError(message) {
        // Implementar sistema de notificaciones
        alert(message);
    }

    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Inicializar la página cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.reportsPage = new ReportsPage();
});

export default ReportsPage;