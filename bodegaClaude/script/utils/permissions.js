// scripts/utils/permissions.js
import { PERMISSIONS } from './constants.js';
import Auth from '../auth.js';

class PermissionsManager {
    static hasPermission(permission) {
        const user = Auth.getCurrentUser();
        if (!user) return false;

        return PERMISSIONS[permission]?.includes(user.role) || false;
    }

    static updateUIBasedOnPermissions() {
        // Ocultar/mostrar elementos basados en permisos
        document.querySelectorAll('[data-permission]').forEach(element => {
            const permission = element.dataset.permission;
            if (!this.hasPermission(permission)) {
                element.style.display = 'none';
            }
        });
    }

    static setupActionButtons(tableRow, item) {
        const actions = document.createElement('td');
        actions.className = 'actions-cell';

        // Botón de Ver (todos pueden ver)
        actions.innerHTML = `
            <button class="btn btn-info btn-sm" onclick="viewItem(${item.id})">
                Ver
            </button>
        `;

        // Botón de Editar (admin y super_admin)
        if (this.hasPermission('EDIT_PRODUCT')) {
            actions.innerHTML += `
                <button class="btn btn-primary btn-sm" onclick="editItem(${item.id})">
                    Editar
                </button>
            `;
        }

        // Botón de Eliminar (solo super_admin)
        if (this.hasPermission('DELETE_PRODUCT')) {
            actions.innerHTML += `
                <button class="btn btn-danger btn-sm" onclick="deleteItem(${item.id})">
                    Eliminar
                </button>
            `;
        }

        return actions;
    }
}

export default PermissionsManager;