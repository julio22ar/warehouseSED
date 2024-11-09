// scripts/auth.js
const Auth = {
    login: function(authData) {
        // Guardar datos de autenticación
        sessionStorage.setItem('token', authData.token);
        sessionStorage.setItem('user', JSON.stringify(authData.user));
    },

    isAuthenticated: function() {
        return sessionStorage.getItem('token') !== null;
    },

    getCurrentUser: function() {
        try {
            const userStr = sessionStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    },

    hasPermission: function(requiredRole) {
        const user = this.getCurrentUser();
        if (!user) return false;

        const roleHierarchy = {
            'super_admin': 3,
            'admin': 2,
            'user': 1
        };

        return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
    },

    logout: function() {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.location.href = '/pages/login.html';
    }
};

export default Auth;