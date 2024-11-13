const http = require('http');
const fs = require('fs').promises;
const path = require('path');
const pool = require('./config/database');
require('dotenv').config();
const hashHelper = require('./utils/hashHelper');

// Mapa de tipos MIME
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif'
};

// Función para obtener el tipo MIME
function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    return MIME_TYPES[ext] || 'application/octet-stream';
}

// Función para servir archivos estáticos
async function serveStaticFile(req, res) {
    try {
        // Obtener la ruta del archivo
        const filePath = path.join(__dirname, '..', req.url);
        
        // Verificar si el archivo existe y obtener sus datos
        const data = await fs.readFile(filePath);
        
        // Obtener el tipo MIME
        const contentType = getMimeType(filePath);
        
        // Enviar la respuesta
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
        return true;
    } catch (error) {
        return false;
    }
}


// Función para validar token
function validateToken(req) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return false;
    
    const token = authHeader.split(' ')[1]; // Bearer <token>
    return token && token.startsWith('token-'); // Validación básica
}

// Middleware para procesar el body de las peticiones
async function getRequestBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(JSON.parse(body));
            } catch (error) {
                resolve({});
            }
        });
    });
}

const server = http.createServer(async (req, res) => {
    // Configurar headers CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST, GET, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    try {
          // Intentar servir archivo estático primero
          if (req.url.match(/\.(css|js|png|jpg|jpeg|gif)$/)) {
            const isServed = await serveStaticFile(req, res);
            if (isServed) return;
        }

        const url = new URL(req.url, `http://${req.headers.host}`);
        const path = url.pathname;

        // Ruta de login
if (path === '/auth/login' && req.method === 'POST') {
    const body = await getRequestBody(req);
    
    try {
        const [users] = await pool.execute(
            'SELECT * FROM users WHERE username = ?',
            [body.username]
        );

        if (users.length === 0) {
            res.writeHead(401);
            res.end(JSON.stringify({
                success: false,
                error: 'Usuario o contraseña incorrectos'
            }));
            return;
        }

        const user = users[0];
        const passwordMatch = await hashHelper.verifyPassword(body.password, user.password);

        if (passwordMatch) {
            const token = 'token-' + Date.now() + '-' + Math.random().toString(36).substring(7);
            
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                data: {
                    user: {
                        id: user.id,
                        username: user.username,
                        name: user.name,
                        role: user.role
                    },
                    token: token
                }
            }));
        } else {
            res.writeHead(401);
            res.end(JSON.stringify({
                success: false,
                error: 'Usuario o contraseña incorrectos'
            }));
        }
    } catch (error) {
        console.error('Error en login:', error);
        res.writeHead(500);
        res.end(JSON.stringify({
            success: false,
            error: 'Error en la autenticación'
        }));
    }
}

        // Ruta para obtener productos
        else if (path === '/api/products' && req.method === 'GET') {
            if (!validateToken(req)) {
                res.writeHead(401);
                res.end(JSON.stringify({
                    success: false,
                    error: 'No autorizado'
                }));
                return;
            }

            const [products] = await pool.execute(`
                SELECT p.*, c.name as category_name 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id
            `);
            
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                data: products
            }));
        }

        // Ruta para crear producto
        else if (path === '/api/products' && req.method === 'POST') {
            if (!validateToken(req)) {
                res.writeHead(401);
                res.end(JSON.stringify({
                    success: false,
                    error: 'No autorizado'
                }));
                return;
            }

            const body = await getRequestBody(req);
            
            // Validar datos requeridos
            if (!body.name || !body.quantity || !body.minimum_stock) {
                res.writeHead(400);
                res.end(JSON.stringify({
                    success: false,
                    error: 'Faltan campos requeridos'
                }));
                return;
            }

            // Insertar el nuevo producto
            const [result] = await pool.execute(
                'INSERT INTO products (name, description, category_id, quantity, minimum_stock, location) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    body.name,
                    body.description || null,
                    body.category_id || null,
                    body.quantity,
                    body.minimum_stock,
                    body.location || null
                ]
            );
            
            res.writeHead(201);
            res.end(JSON.stringify({
                success: true,
                data: {
                    id: result.insertId,
                    ...body
                },
                message: 'Producto creado exitosamente'
            }));
        }

        // Ruta para obtener un producto específico
        else if (path.match(/^\/api\/products\/\d+$/) && req.method === 'GET') {
            if (!validateToken(req)) {
                res.writeHead(401);
                res.end(JSON.stringify({
                    success: false,
                    error: 'No autorizado'
                }));
                return;
            }

            const productId = path.split('/')[3];
            const [products] = await pool.execute(
                'SELECT p.*, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?',
                [productId]
            );

            if (products.length > 0) {
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    data: products[0]
                }));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({
                    success: false,
                    error: 'Producto no encontrado'
                }));
            }
        }

        // Ruta para eliminar un producto
        else if (path.match(/^\/api\/products\/\d+$/) && req.method === 'DELETE') {
            if (!validateToken(req)) {
                res.writeHead(401);
                res.end(JSON.stringify({
                    success: false,
                    error: 'No autorizado'
                }));
                return;
            }

            const productId = path.split('/')[3];
            
            const [result] = await pool.execute(
                'DELETE FROM products WHERE id = ?',
                [productId]
            );

            if (result.affectedRows > 0) {
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    message: 'Producto eliminado exitosamente'
                }));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({
                    success: false,
                    error: 'Producto no encontrado'
                }));
            }
        }

        // Ruta para actualizar producto
        else if (path.match(/^\/api\/products\/\d+$/) && req.method === 'PUT') {
            if (!validateToken(req)) {
                res.writeHead(401);
                res.end(JSON.stringify({
                    success: false,
                    error: 'No autorizado'
                }));
                return;
            }

            const productId = path.split('/')[3];
            const body = await getRequestBody(req);
            
            // Validar datos requeridos
            if (!body.name || !body.quantity || !body.minimum_stock) {
                res.writeHead(400);
                res.end(JSON.stringify({
                    success: false,
                    error: 'Faltan campos requeridos'
                }));
                return;
            }

            const [result] = await pool.execute(
                'UPDATE products SET name = ?, description = ?, category_id = ?, quantity = ?, minimum_stock = ?, location = ? WHERE id = ?',
                [
                    body.name,
                    body.description || null,
                    body.category_id || null,
                    body.quantity,
                    body.minimum_stock,
                    body.location || null,
                    productId
                ]
            );

            if (result.affectedRows > 0) {
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    data: {
                        id: productId,
                        ...body
                    },
                    message: 'Producto actualizado exitosamente'
                }));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({
                    success: false,
                    error: 'Producto no encontrado'
                }));
            }
        }

        // Ruta para estadísticas del inventario
        else if (path === '/api/inventory/stats' && req.method === 'GET') {
            if (!validateToken(req)) {
                res.writeHead(401);
                res.end(JSON.stringify({
                    success: false,
                    error: 'No autorizado'
                }));
                return;
            }

            const [totalProducts] = await pool.execute('SELECT COUNT(*) as total FROM products');
            const [lowStock] = await pool.execute(
                'SELECT COUNT(*) as total FROM products WHERE quantity < minimum_stock'
            );
            const [categories] = await pool.execute('SELECT COUNT(*) as total FROM categories');
            
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                data: {
                    totalProducts: totalProducts[0].total,
                    lowStock: lowStock[0].total,
                    categories: categories[0].total
                }
            }));
        }

        // Ruta para obtener categorías
        else if (path === '/api/categories' && req.method === 'GET') {
            if (!validateToken(req)) {
                res.writeHead(401);
                res.end(JSON.stringify({
                    success: false,
                    error: 'No autorizado'
                }));
                return;
            }

            const [categories] = await pool.execute('SELECT * FROM categories');
            
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                data: categories
            }));
        }

        // Ruta para productos con bajo stock
        else if (path === '/api/products/low-stock' && req.method === 'GET') {
            if (!validateToken(req)) {
                res.writeHead(401);
                res.end(JSON.stringify({
                    success: false,
                    error: 'No autorizado'
                }));
                return;
            }

            const [products] = await pool.execute(`
                SELECT p.*, c.name as category_name 
                FROM products p 
                LEFT JOIN categories c ON p.category_id = c.id 
                WHERE p.quantity < p.minimum_stock
            `);
            
            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                data: products
            }));
        }
        else if (path === '/api/users' && req.method === 'GET') {
            if (!validateToken(req)) {
                res.writeHead(401);
                res.end(JSON.stringify({
                    success: false,
                    error: 'No autorizado'
                }));
                return;
            }
        
            try {
                const [users] = await pool.execute(
                    'SELECT id, username, name, role, created_at FROM users'
                );
                
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    data: users
                }));
            } catch (error) {
                console.error('Error fetching users:', error);
                res.writeHead(500);
                res.end(JSON.stringify({
                    success: false,
                    error: 'Error al obtener usuarios'
                }));
            }
        }
        
     // Ruta para crear usuario
else if (path === '/api/users' && req.method === 'POST') {
    if (!validateToken(req)) {
        res.writeHead(401);
        res.end(JSON.stringify({
            success: false,
            error: 'No autorizado'
        })); 
        return;
    }

    const body = await getRequestBody(req);
    
    if (!body.username || !body.name || !body.password || !body.role) {
        res.writeHead(400);
        res.end(JSON.stringify({
            success: false,
            error: 'Faltan campos requeridos'
        }));
        return;
    }

    try {
        const hashedPassword = await hashHelper.hashPassword(body.password);
        
        const [result] = await pool.execute(
            'INSERT INTO users (username, name, password, role) VALUES (?, ?, ?, ?)',
            [body.username, body.name, hashedPassword, body.role]
        );
        
        res.writeHead(201);
        res.end(JSON.stringify({
            success: true,
            data: {
                id: result.insertId,
                username: body.username,
                name: body.name,
                role: body.role
            }
        }));
    } catch (error) {
        console.error('Error al crear usuario:', error);
        const statusCode = error.code === 'ER_DUP_ENTRY' ? 400 : 500;
        const errorMessage = error.code === 'ER_DUP_ENTRY' 
            ? 'El nombre de usuario ya existe'
            : 'Error al crear el usuario';
            
        res.writeHead(statusCode);
        res.end(JSON.stringify({
            success: false,
            error: errorMessage
        }));
    }
}
        // Ruta para actualizar usuario
        else if (path.match(/^\/api\/users\/\d+$/) && req.method === 'PUT') {
            if (!validateToken(req)) {
                res.writeHead(401);
                res.end(JSON.stringify({
                    success: false,
                    error: 'No autorizado'
                }));
                return;
            }
        
            const userId = path.split('/')[3];
            const body = await getRequestBody(req);
            
            if (!body.username || !body.name || !body.role) {
                res.writeHead(400);
                res.end(JSON.stringify({
                    success: false,
                    error: 'Faltan campos requeridos'
                }));
                return;
            }
        
            try {
                let query = 'UPDATE users SET username = ?, name = ?, role = ?';
                let params = [body.username, body.name, body.role];
                
                if (body.password) {
                    query += ', password = ?';
                    params.push(body.password);
                }
                
                query += ' WHERE id = ?';
                params.push(userId);
        
                const [result] = await pool.execute(query, params);
        
                if (result.affectedRows === 0) {
                    res.writeHead(404);
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Usuario no encontrado'
                    }));
                    return;
                }
        
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    message: 'Usuario actualizado exitosamente'
                }));
            } catch (error) {
                if (error.code === 'ER_DUP_ENTRY') {
                    res.writeHead(400);
                    res.end(JSON.stringify({
                        success: false,
                        error: 'El nombre de usuario ya existe'
                    }));
                    return;
                }
                throw error;
            }
        }
        else if (req.url.endsWith('.css')) {
            try {
                // Construir la ruta del archivo CSS
                const cssPath = path.join(__dirname, '..', req.url);
                const cssContent = await require('fs').promises.readFile(cssPath, 'utf8');
                
                res.writeHead(200, { 'Content-Type': 'text/css' });
                res.end(cssContent);
            } catch (error) {
                console.error('Error loading CSS:', error);
                res.writeHead(404);
                res.end();
            }
        }
        // Ruta para eliminar usuario
        else if (path.match(/^\/api\/users\/\d+$/) && req.method === 'DELETE') {
            if (!validateToken(req)) {
                res.writeHead(401);
                res.end(JSON.stringify({
                    success: false,
                    error: 'No autorizado'
                }));
                return;
            }
        
            const userId = path.split('/')[3];
            
            try {
                const [result] = await pool.execute(
                    'DELETE FROM users WHERE id = ?',
                    [userId]
                );
        
                if (result.affectedRows === 0) {
                    res.writeHead(404);
                    res.end(JSON.stringify({
                        success: false,
                        error: 'Usuario no encontrado'
                    }));
                    return;
                }
        
                res.writeHead(200);
                res.end(JSON.stringify({
                    success: true,
                    message: 'Usuario eliminado exitosamente'
                }));
            } catch (error) {
                throw error;
            }
        }
        // Ruta no encontrada
        else {
            res.writeHead(404);
            res.end(JSON.stringify({
                success: false,
                error: 'Ruta no encontrada'
            }));
        }
    } catch (error) {
        console.error('Server error:', error);
        res.writeHead(500);
        res.end(JSON.stringify({
            success: false,
            error: 'Error interno del servidor'
        }));
    }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
});