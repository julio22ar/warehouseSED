// scripts/utils/constants.js
export const API_URL = 'http://localhost:3000';

export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    USER: 'user'
};

export const ROUTES = {
    LOGIN: '/pages/login.html',
    INVENTORY: '/pages/inventory.html',
    REPORTS: '/pages/reports.html',
    USERS: '/pages/users.html',
    SETTINGS: '/pages/settings.html'
};

export const STATUS = {
    IN_STOCK: 'in_stock',
    LOW_STOCK: 'low_stock',
    OUT_OF_STOCK: 'out_of_stock'
};

export const CATEGORIES = [
    { id: 1, name: 'Electrónicos' },
    { id: 2, name: 'Muebles' },
    { id: 3, name: 'Papelería' },
    { id: 4, name: 'Herramientas' },
    { id: 5, name: 'Otros' }
];

export const MESSAGES = {
    ERROR: {
        LOGIN_FAILED: 'Usuario o contraseña incorrectos',
        SESSION_EXPIRED: 'Su sesión ha expirado',
        UNAUTHORIZED: 'No tiene permisos para realizar esta acción',
        NETWORK_ERROR: 'Error de conexión'
    },
    SUCCESS: {
        ITEM_CREATED: 'Elemento creado exitosamente',
        ITEM_UPDATED: 'Elemento actualizado exitosamente',
        ITEM_DELETED: 'Elemento eliminado exitosamente'
    }
};