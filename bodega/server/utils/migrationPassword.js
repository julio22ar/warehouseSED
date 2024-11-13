// server/utils/migratePasswords.js
const pool = require('../config/database');
const hashHelper = require('./hashHelper');

async function migratePasswords() {
    let connection;
    try {
        connection = await pool.getConnection();
        
        // Iniciar transacción
        await connection.beginTransaction();

        // Obtener usuarios cuyas contraseñas no están hasheadas (menos de 60 caracteres)
        const [users] = await connection.execute(
            'SELECT id, password FROM users WHERE LENGTH(password) < 60'
        );

        console.log(`Encontrados ${users.length} usuarios para migrar`);

        // Hashear cada contraseña
        for (const user of users) {
            const hashedPassword = await hashHelper.hashPassword(user.password);
            await connection.execute(
                'UPDATE users SET password = ? WHERE id = ?',
                [hashedPassword, user.id]
            );
            console.log(`Migrada contraseña para usuario ID: ${user.id}`);
        }

        // Commit de la transacción
        await connection.commit();
        console.log('Migración completada exitosamente');

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Error durante la migración:', error);
    } finally {
        if (connection) {
            connection.release();
        }
        process.exit();
    }
}

migratePasswords();