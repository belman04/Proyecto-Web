const express = require("express"); // importa el módulo express para crear la aplicación
const mysql = require("mysql"); // importa el módulo mysql para la conexión a la base de datos
const path = require('path'); // importa el módulo path para manejar rutas de archivos
const session = require('express-session'); // importa el módulo express-session para gestionar sesiones
const app = express(); // crea una nueva aplicación express

mysql://root:aCGUwsecPYJKEBStaXTYeoClxZSGONeu@autorack.proxy.rlwy.net:26029/railway

// middleware para manejar los datos de formularios
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// configuración de la sesión
app.use(session({
    secret: 'ceroalnueve',  
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }  
}));

// configuración de la vista y archivos estáticos (directamente desde la carpeta 'views')
app.set('view engine', 'ejs');

// configurar Express para servir archivos estáticos desde 'views'
app.use(express.static(path.join(__dirname, 'views')));  // Servir archivos estáticos desde 'views'

const { PORT, DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = require('./config'); // Importar configuraciones

// configuración de la conexión a la base de datos
let conexion = mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  port: DB_PORT
});

// conexión a la base de datos
conexion.connect((err) => {
    if (err) throw err;
    console.log('Conectado a la base de datos MySQL');
});

// ruta principal para la página de inicio
app.get('/', (req, res) => {
    console.log(req.session.user);
    res.render('index', { user: req.session.user });  // Renderiza el archivo 'index.ejs'
});

// ruta para el menú
app.get('/menu', (req, res) => {
    res.render('menu', { user: req.session.user });  // Pasa la sesión al renderizar
});

// ruta para la página de reservas
app.get('/reserv', (req, res) => {
    res.render('reserv', { user: req.session.user });
});

// ruta para la página de contacto
app.get('/contact', (req, res) => {
    res.render('contact', { user: req.session.user });
});

// ruta para el login de usuario
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.json({ success: false, message: 'Faltan datos obligatorios.' });
    }

    // Consulta para verificar si el usuario existe y la contraseña es correcta
    const query = 'SELECT id_usuario, nombre, correo FROM usuarios WHERE correo = ? AND contrasena = ?';
    conexion.query(query, [email, password], (err, results) => {  
        if (err) throw err;

        if (results.length > 0) {
            req.session.user = {
                id: results[0].id_usuario,
                nombre: results[0].nombre,
                correo: results[0].correo
            };
            res.json({ success: true, message: 'Usuario autenticado' });
        } else {
            res.json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
    });
});

// ruta para registrar un nuevo usuario
app.post('/register', (req, res) => {
    const { nameR, emailR, phoneR, passwordR } = req.body;
    
    const insertQuery = 'INSERT INTO usuarios (nombre, correo, telefono, contrasena) VALUES (?, ?, ?, ?)';
    conexion.query(insertQuery, [nameR, emailR, phoneR, passwordR], (err, results) => {
        if (err) throw err;

        // Responder con éxito
        res.json({ success: true, message: 'Usuario registrado correctamente.' });
    });
});

// ruta para cerrar sesión
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('No se pudo cerrar sesión');
        }
        res.redirect('/');
    });
});

// ruta para obtener productos
app.get('/products', (req, res) => {
    const query = `
        SELECT id_producto, nombre, precio, 
               CONCAT('http://localhost:3000/img/', img) AS img 
        FROM productos
    `;
    
    conexion.query(query, (err, results) => {
        if (err) {
            console.error('Error al obtener productos:', err);
            return res.status(500).json({ 
                success: false, 
                message: 'Error al cargar los productos' 
            });
        }
        res.json(results);
    });
});

// ruta para procesar un nuevo pedido
app.post('/orders', (req, res) => {
    if (!req.session.user) {
        console.error("Error: Usuario no autenticado");
        return res.status(401).json({ success: false, message: "Debes iniciar sesión para hacer un pedido" });
    }
    
    const { cart } = req.body;
    const userId = req.session.user.id;
    const date = new Date();

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
        return res.status(400).json({ 
            success: false, 
            message: "El carrito está vacío o tiene un formato inválido" 
        });
    }

    // Calcular el total del pedido
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // Iniciar transacción
    conexion.beginTransaction((err) => {
        if (err) {
            console.error("Error al iniciar transacción:", err);
            return res.status(500).json({ 
                success: false, 
                message: "Error al procesar el pedido" 
            });
        }

        // Insertar el pedido
        const insertOrderQuery = `
            INSERT INTO pedidos (fk_id_usuario, fecha, estado, total) 
            VALUES (?, ?, "en proceso", ?)
        `;
        conexion.query(insertOrderQuery, [userId, date, total], (err, result) => {
            if (err) {
                console.error("Error al insertar pedido:", err);
                return conexion.rollback(() => {
                    res.status(500).json({ 
                        success: false, 
                        message: "Error al procesar el pedido" 
                    });
                });
            }

            const orderId = result.insertId;

            // Insertar los productos del pedido
            const productsData = cart.map(item => [orderId, item.id, item.price, item.quantity]);
            const insertProductsQuery = `
                INSERT INTO pedido_productos (fk_id_pedido, fk_id_producto, precio_unitario, cantidad)
                VALUES ?
            `;
            conexion.query(insertProductsQuery, [productsData], (err) => {
                if (err) {
                    console.error("Error al insertar productos del pedido:", err);
                    return conexion.rollback(() => {
                        res.status(500).json({ 
                            success: false, 
                            message: "Error al procesar los productos del pedido" 
                        });
                    });
                }

                // Confirmar transacción
                conexion.commit((err) => {
                    if (err) {
                        console.error("Error al confirmar transacción:", err);
                        return conexion.rollback(() => {
                            res.status(500).json({ 
                                success: false, 
                                message: "Error al confirmar el pedido" 
                            });
                        });
                    }

                    res.json({ 
                        success: true, 
                        message: "Pedido procesado correctamente",
                        orderId: orderId
                    });
                });
            });
        });
    });
});

// ruta para mostrar los pedidos
app.get('/pedidos', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // redirige si no está autenticado
    }

    const userId = req.session.user.id;

    // consulta para obtener los pedidos del usuario con detalles de los platillos
    const query = `
        SELECT 
            p.id_pedido, 
            p.fecha, 
            p.estado, 
            pr.nombre AS nombre_platillo, 
            pr.precio, 
            SUM(pp.cantidad) AS cantidad_total, 
            SUM(pp.cantidad * pr.precio) AS subtotal
        FROM pedidos p
        JOIN pedido_productos pp ON p.id_pedido = pp.fk_id_pedido
        JOIN productos pr ON pp.fk_id_producto = pr.id_producto
        WHERE p.fk_id_usuario = ?
        GROUP BY p.id_pedido, pr.id_producto
        ORDER BY p.id_pedido;
    `;

    conexion.query(query, [userId], (err, results) => {
        if (err) {
            console.error("Error al obtener los pedidos:", err);
            return res.status(500).send("Error al obtener los pedidos");
        }

        // agrupar los resultados por id_pedido
        const pedidos = [];
        let currentPedido = null;

        results.forEach(pedido => {
            // Si encontramos un nuevo pedido, lo agregamos
            if (!currentPedido || currentPedido.id_pedido !== pedido.id_pedido) {
                if (currentPedido) {
                    pedidos.push(currentPedido);  // Agrega el pedido anterior
                }
                currentPedido = {
                    id_pedido: pedido.id_pedido,
                    fecha: pedido.fecha,
                    estado: pedido.estado,
                    platillos: [{
                        nombre: pedido.nombre_platillo,
                        precio: pedido.precio,
                        cantidad: pedido.cantidad_total,
                        subtotal: pedido.subtotal
                    }],
                    total: pedido.subtotal
                };
            } else {
                // si es el mismo pedido, agregamos el platillo
                currentPedido.platillos.push({
                    nombre: pedido.nombre_platillo,
                    precio: pedido.precio,
                    cantidad: pedido.cantidad_total,
                    subtotal: pedido.subtotal
                });
                currentPedido.total += pedido.subtotal;  // sumar el subtotal de este platillo al total
            }
        });

        if (currentPedido) {
            pedidos.push(currentPedido);  // agregar el último pedido
        }

        // enviar la respuesta con los pedidos y sus platillos
        res.render('pedidos', { 
            user: req.session.user,
            pedidos: pedidos
        });
    });
});

// ruta para cancelar un pedido (eliminando el pedido)
app.post('/cancelar-pedido', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login'); // redirige si no está autenticado
    }

    const userId = req.session.user.id;
    const pedidoId = req.body.pedidoId; // el ID del pedido a eliminar

    conexion.beginTransaction((err) => {
        if (err) {
            return res.status(500).send("Error al iniciar la transacción");
        }

        // primero eliminamos los productos asociados con el pedido
        const queryEliminarProductos = 'DELETE FROM pedido_productos WHERE fk_id_pedido = ?';
        conexion.query(queryEliminarProductos, [pedidoId], (err, result) => {
            if (err) {
                return conexion.rollback(() => {
                    console.error("Error al eliminar productos del pedido:", err);
                    return res.status(500).send("Error al cancelar el pedido");
                });
            }

            // ahora eliminamos el pedido de la tabla `pedidos`
            const queryEliminarPedido = 'DELETE FROM pedidos WHERE id_pedido = ? AND fk_id_usuario = ?';
            conexion.query(queryEliminarPedido, [pedidoId, userId], (err, result) => {
                if (err) {
                    return conexion.rollback(() => {
                        console.error("Error al eliminar el pedido:", err);
                        return res.status(500).send("Error al cancelar el pedido");
                    });
                }

                conexion.commit((err) => {
                    if (err) {
                        return conexion.rollback(() => {
                            console.error("Error al confirmar la transacción:", err);
                            return res.status(500).send("Error al cancelar el pedido");
                        });
                    }

                    // redirigir a la página de pedidos después de eliminar el pedido
                    res.redirect('/pedidos');
                });
            });
        });
    });
});



// ruta para obtener un pedido específico
app.get('/orders/:id', (req, res) => {
    const orderId = req.params.id;

    const getOrderQuery = `
        SELECT p.id_pedido, p.fecha, p.total, pr.nombre, pr.descripcion, 
               pp.cantidad, pp.precio_unitario, pr.id_producto
        FROM pedidos p
        JOIN pedido_productos pp ON p.id_pedido = pp.fk_id_pedido
        JOIN productos pr ON pp.fk_id_producto = pr.id_producto
        WHERE p.id_pedido = ?
    `;

    conexion.query(getOrderQuery, [orderId], (err, results) => {
        if (err) {
            console.error("Error al obtener pedido:", err);
            return res.status(500).json({ success: false, message: "Error al obtener pedido" });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: "Pedido no encontrado" });
        }

        const products = results.map(row => ({
            id: row.id_producto,
            name: row.nombre || "Producto sin nombre",
            description: row.descripcion || "Sin descripción",
            quantity: row.cantidad || 0,
            price: row.precio_unitario || 0,
        }));
    
        // Construcción del objeto del pedido
        const order = {
            id: results[0].id_pedido,
            date: results[0].fecha,
            total: results[0].total,
            products: products,
        };
    
        res.json(order);
    });
});


// ruta para actualizar un pedido
app.put('/orders/:id', (req, res) => {
    const orderId = req.params.id; // ID del pedido a actualizar
    const updatedOrder = req.body.cart; // productos actualizados recibidos del cuerpo de la solicitud

    console.log("Productos recibidos en el PUT:", updatedOrder);  // verifica los productos recibidos

    if (!updatedOrder || updatedOrder.length === 0) {
        return res.status(400).json({ success: false, message: 'No se proporcionaron productos para actualizar.' });
    }

    // obtener el usuario del pedido
    const userQuery = 'SELECT fk_id_usuario FROM pedidos WHERE id_pedido = ?';
    conexion.query(userQuery, [orderId], (err, results) => {
        if (err) {
            console.error('Error al obtener el usuario:', err);
            return res.status(500).json({ success: false, message: 'Error al obtener el usuario del pedido.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Pedido no encontrado.' });
        }

        // eliminar los productos actuales en la tabla `pedido_productos`
        const deleteProductsQuery = 'DELETE FROM pedido_productos WHERE fk_id_pedido = ?';
        conexion.query(deleteProductsQuery, [orderId], (err, results) => {
            if (err) {
                console.error('Error al eliminar productos existentes:', err);
                return res.status(500).json({ success: false, message: 'Error al eliminar productos existentes.' });
            }

            // insertar los nuevos productos
            const insertProductQuery = 'INSERT INTO pedido_productos (fk_id_pedido, fk_id_producto, cantidad, precio_unitario) VALUES (?, ?, ?, ?)';
            updatedOrder.forEach(product => {
                console.log(product.id); // Verifica el id aquí
                conexion.query(insertProductQuery, [orderId, product.id, product.quantity, product.price], (err, results) => {
                    if (err) {
                        console.error('Error al insertar productos:', err);
                        return res.status(500).json({ success: false, message: 'Error al insertar productos.' });
                    }
                });
            });

            // calcular el nuevo total del pedido
            let total = 0;
            updatedOrder.forEach(product => {
                total += product.price * product.quantity;
            });

            // actualizar el total en la tabla `pedidos`
            const updateOrderQuery = 'UPDATE pedidos SET total = ? WHERE id_pedido = ?';
            conexion.query(updateOrderQuery, [total, orderId], (err, results) => {
                if (err) {
                    console.error('Error al actualizar el total del pedido:', err);
                    return res.status(500).json({ success: false, message: 'Error al actualizar el total del pedido.' });
                }

                // responder con éxito si todo está correcto
                res.json({ success: true, message: 'Pedido actualizado correctamente.' });
            });
        });
    });
});


// iniciar el servidor

// app.listen(3000, () => {
//     console.log("Servidor creado http://localhost:3000");
//   });

app.listen(PORT, () => {
  console.log(`Servidor creado en http://localhost:${PORT}`);
});
