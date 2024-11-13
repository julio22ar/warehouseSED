const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10; // Puedes ajustar según necesidades de seguridad/rendimiento

const hashHelper = {
    /**
     * Hashea una contraseña de forma segura
     * @param {string} password - Contraseña en texto plano
     * @returns {Promise<string>} Hash de la contraseña
     */
    async hashPassword(password) {
        try {
            const salt = await bcrypt.genSalt(SALT_ROUNDS);
            return await bcrypt.hash(password, salt);
        } catch (error) {
            console.error('Error al hashear la contraseña:', error);
            throw new Error('Error en el proceso de hash');
        }
    },

    /**
     * Verifica si una contraseña coincide con su hash
     * @param {string} inputPassword - Contraseña ingresada
     * @param {string} storedHash - Hash almacenado
     * @returns {Promise<boolean>} true si coinciden
     */
    async verifyPassword(inputPassword, storedHash) {
        try {
            return await bcrypt.compare(inputPassword, storedHash);
        } catch (error) {
            console.error('Error al verificar la contraseña:', error);
            throw new Error('Error en la verificación de contraseña');
        }
    }
};

module.exports = hashHelper;