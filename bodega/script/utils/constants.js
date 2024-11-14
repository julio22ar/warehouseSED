// scripts/utils/constants.js
export const API_URL = 'http://localhost:3000';

export const ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    USER: 'user'
};


export const PERMISSIONS = {
    // Permisos de inventario
    VIEW_INVENTORY: ['user', 'admin', 'super_admin'],
    SEARCH_PRODUCTS: ['user', 'admin', 'super_admin'],
    ADD_PRODUCT: ['admin', 'super_admin'],
    EDIT_PRODUCT: ['admin', 'super_admin'],
    DELETE_PRODUCT: ['admin','super_admin'],
    
    // Permisos de usuarios
    VIEW_USERS: ['super_admin'],
    MANAGE_USERS: ['super_admin'],
    
    // Permisos de reportes
    VIEW_REPORTS: [ 'super_admin'],
    EXPORT_REPORTS: [ 'super_admin']
};

export const ROUTES = {
    LOGIN: '/pages/login.html',
    INVENTORY: '/pages/inventory.html',
    REPORTS: '/pages/reports.html',
    USERS: '/pages/users.html',
};

export const DEFAULT_ROUTES = {
    'super_admin': '/pages/reports.html',
    'admin': '/pages/inventory.html',
    'user': '/pages/inventory.html'
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