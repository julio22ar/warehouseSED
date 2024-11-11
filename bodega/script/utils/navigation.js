// scripts/utils/navigation.js
const Navigation = {
    routes: {
        login: '/pages/login.html',
        inventory: '/pages/inventory.html',  // Esta será nuestra página principal
        users: '/pages/users.html',
        reports: '/pages/reports.html'
    },

    getCurrentPage() {
        return window.location.pathname;
    },

    isAuthenticated() {
        return sessionStorage.getItem('token') !== null;
    },

    requireAuth(allowedRoles = []) {
        if (!this.isAuthenticated()) {
            this.redirectToLogin();
            return false;
        }

        if (allowedRoles.length > 0) {
            const user = JSON.parse(sessionStorage.getItem('user'));
            if (!allowedRoles.includes(user.role)) {
                this.redirectToUnauthorized();
                return false;
            }
        }

        return true;
    },

    redirectToLogin() {
        window.location.href = this.routes.login;
    },

    redirectToHome() {           // Cambiado para usar inventory como página principal
        window.location.href = this.routes.inventory;
    },

    redirectToUnauthorized() {
        // Implementar página de no autorizado
        console.error('No autorizado');
    },

    setupNavigation() {
        const currentPage = this.getCurrentPage();
        
        // Si no está autenticado y no está en login, redirigir a login
        if (!this.isAuthenticated() && currentPage !== this.routes.login) {
            this.redirectToLogin();
            return;
        }

        // Si está autenticado y está en login, redirigir a inventory
        if (this.isAuthenticated() && currentPage === this.routes.login) {
            this.redirectToHome();
            return;
        }
    }
};

export default Navigation;