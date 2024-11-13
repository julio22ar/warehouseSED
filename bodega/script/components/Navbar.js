import Auth from '../auth.js';

class Navbar {
    constructor() {
        this.user = Auth.getCurrentUser();
    }

    render() {
        const navbar = document.createElement('nav');
        navbar.className = 'navbar';
        
        navbar.innerHTML = `
            <div class="navbar-content">
                <h1>Sistema de Inventario</h1>
                <div class="user-info">
                    <span>${this.user?.name || 'Usuario'}</span>
                    <button class="btn btn-danger" id="logoutBtn">Cerrar Sesión</button>
                </div>
            </div>
        `;

        // Importante: Agregar el evento después de crear el elemento
        const logoutBtn = navbar.querySelector('#logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                Auth.logout();
            });
        }

        return navbar;
    }
}

export default Navbar;