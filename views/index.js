function openPopup() {
    document.getElementById("loginPopup").style.display = "flex";  // Muestra el popup
}

// Función para cerrar el popup
function closePopup() {
    document.getElementById("loginPopup").style.display = "none";  // Oculta el popup
}


loginButton.addEventListener("click", function () {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        alert("Por favor, completa todos los campos.");
        return; // Detén la ejecución si los campos están vacíos
    }

    fetch("https://proyecto-web-production-0a7f.up.railway.app/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }) // Enviar valores correctos
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Usuario autenticado correctamente.");
            window.location.reload(); // Recargar la página actual
        } else {
            alert("Usuario o contraseña incorrectos.");
        }
    })
    .catch(error => {
        console.error("Error al autenticar:", error);
    });
});


function openRegisterPopup() {
    document.getElementById("registerPopup").style.display = "flex";
}

// Función para cerrar el popup de registro
function closeRegisterPopup() {
    document.getElementById("registerPopup").style.display = "none";
}

// Enviar los datos del formulario al servidor
document.getElementById("registerForm").addEventListener("submit", function (e) {
    e.preventDefault(); // Prevenir el comportamiento predeterminado de envío de formulario

    const nameR = document.getElementById("nameR").value;
    const emailR = document.getElementById("emailR").value;
    const phoneR = document.getElementById("phoneR").value;
    const passwordR = document.getElementById("passwordR").value;

    // Realizar la solicitud POST al servidor
    fetch("https://proyecto-web-production-0a7f.up.railway.app/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ nameR, emailR, phoneR, passwordR })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert("Usuario registrado correctamente.");
            closeRegisterPopup(); // Cerrar el popup de registro
        } else {
            alert(data.message); // Mostrar el mensaje de error
        }
    })
    .catch(error => {
        console.error("Error al registrar:", error);
    });
});

function openOrderPopup() {
    document.getElementById("orderPopup").style.display = "flex";
}

function closeOrderPopup() {
    document.getElementById("orderPopup").style.display = "none";
}


//hacer pedido
document.addEventListener("DOMContentLoaded", function () {
    const orderSummary = document.getElementById("orderSummary").querySelector("tbody");
    const totalAmount = document.getElementById("totalAmount");

    let order = []; // Lista de productos seleccionados

    // Cargar productos desde el servidor
    function loadProducts() {
        fetch("https://proyecto-web-production-0a7f.up.railway.app//products")
            .then(response => response.json())
            .then(products => {
                const productsContainer = document.getElementById("productsContainer");
                productsContainer.innerHTML = ""; // Limpiar contenedor

                products.forEach(product => {
                    const productElement = document.createElement("div");
                    productElement.className = "product-item";
                    productElement.innerHTML = `
                        <img src="${product.img}" alt="${product.nombre}" />
                        <p>${product.nombre}</p>
                        <p>$${product.precio.toFixed(2)}</p>
                    `;

                    productElement.addEventListener("click", () => {
                        addToOrder(product);
                    });

                    productsContainer.appendChild(productElement);
                });
            })
            .catch(error => console.error("Error al cargar productos:", error));
    }

    // Añadir producto al pedido
    function addToOrder(product) {
        const existingProduct = order.find(item => item.id === product.id_producto);
        if (existingProduct) {
            existingProduct.quantity++;
        } else {
            order.push({
                id: product.id_producto,
                name: product.nombre,
                price: product.precio,
                quantity: 1
            });
        }
        updateOrderSummary();
    }

    // Actualizar tabla de resumen del pedido
    function updateOrderSummary() {
        orderSummary.innerHTML = ""; // Limpiar tabla
        let total = 0;

        order.forEach(item => {
            const subtotal = item.price * item.quantity;
            total += subtotal;

            const row = document.createElement("tr");
            row.innerHTML = `
                <td>${item.name}</td>
                <td>$${item.price.toFixed(2)}</td>
                <td>${item.quantity}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td><button onclick="removeFromOrder(${item.id})">Eliminar</button></td>
            `;
            orderSummary.appendChild(row);
        });

        totalAmount.textContent = total.toFixed(2);
    }

    // Eliminar producto del pedido
    window.removeFromOrder = function (productId) {
        order = order.filter(item => item.id !== productId);
        updateOrderSummary();
    };

    // Enviar pedido al servidor
    window.sendOrder = function () {
        if (order.length === 0) {
            alert("No has seleccionado ningún producto.");
            return;
        }

        fetch("https://proyecto-web-production-0a7f.up.railway.app/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ cart: order })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert("Pedido enviado correctamente.");
                    closePopup('orderPopup');
                    order = []; // Reiniciar pedido
                    updateOrderSummary();
                } else {
                    alert("Hubo un problema al enviar el pedido.");
                }
            })
            .catch(error => console.error("Error al enviar pedido:", error));
    };

    // Cargar productos al abrir el pop-up
    loadProducts();
});



//editar pedido
let currentOrder = [];  // Mantener este array global
let currentOrderId = null;

// Función para abrir el popup de edición
function openEditOrderPopup(orderId) {
    currentOrderId = orderId; // Guarda el ID en una variable global
    console.log("orderId recibido:", orderId);  // Agregar este log
    document.getElementById("editOrderPopup").style.display = "flex";
    loadOrder(orderId);  // Cargar los productos del pedido a editar
}
// Función para cerrar el popup de edición
function closeEditOrderPopup() {
    document.getElementById("editOrderPopup").style.display = "none";
}

// Función para cargar la orden a editar
function loadOrder(orderId) {
    fetch(`https://proyecto-web-production-0a7f.up.railway.app/orders/${orderId}`)
        .then(response => response.json())
        .then(order => {
            if (order.success === false) {
                alert("No se pudo cargar el pedido.");
                return;
            }

            // Mantener los productos en el pedido actual
            currentOrder = order.products.map(product => ({
                id: product.id, 
                name: product.name,
                price: product.price,
                quantity: product.quantity
            }));

            // Cargar productos en el resumen
            updateEditOrderSummary();
        })
        .catch(error => console.error("Error al cargar el pedido:", error));
}

// Función para actualizar el resumen de la orden
function updateEditOrderSummary() {
    const orderSummary = document.getElementById("editOrderSummary").querySelector("tbody");
    orderSummary.innerHTML = "";  // Limpiar la tabla actual
    let total = 0;

    currentOrder.forEach(item => {
        const subtotal = item.price * item.quantity;
        total += subtotal;

        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${item.name}</td>
            <td>$${item.price.toFixed(2)}</td>
            <td>
                <button onclick="decreaseQuantity(${item.id})">-</button>
                ${item.quantity}
                <button onclick="increaseQuantity(${item.id})">+</button>
            </td>
            <td>$${subtotal.toFixed(2)}</td>
            <td><button onclick="removeFromEditOrder(${item.id})">Eliminar</button></td>
        `;
        orderSummary.appendChild(row);
    });

    const totalAmount = document.getElementById("editTotalAmount");
    totalAmount.textContent = total.toFixed(2);
}

// Incrementar cantidad
window.increaseQuantity = function(productId) {
    const product = currentOrder.find(item => item.id === productId);
    if (product) {
        product.quantity++;
        updateEditOrderSummary();
    }
};

// Decrementar cantidad
window.decreaseQuantity = function(productId) {
    const product = currentOrder.find(item => item.id === productId);
    if (product && product.quantity > 1) {
        product.quantity--;
        updateEditOrderSummary();
    }
};

// Eliminar producto del pedido en edición
window.removeFromEditOrder = function(productId) {
    currentOrder = currentOrder.filter(item => item.id !== productId);
    updateEditOrderSummary();
};


// Guardar cambios del pedido
window.updateOrder = function(event) {
    event.preventDefault();

    console.log("Datos del pedido a actualizar antes del PUT:", currentOrder);

    if (currentOrder.length === 0) {
        alert("No puedes guardar un pedido vacío.");
        return;
    }
    if (!currentOrderId) {
        console.error("No se encontró el orderId");
        return;
    }

    const updatedOrderData = {
        cart: currentOrder.map(product => ({
            id: product.id,           // ID del producto
            quantity: product.quantity, // Cantidad del producto
            price: product.price       // Precio del producto
        }))
    };    

    console.log("ID del pedido:", currentOrderId);
    fetch(`https://proyecto-web-production-0a7f.up.railway.app/orders/${currentOrderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedOrderData)
    }).then(response => {
        if (response.ok) {
            alert("Pedido actualizado con éxito");
            console.log("Pedido actualizado con éxito");
            closeEditOrderPopup();
        } else {
            console.error("Error al actualizar el pedido");
        }
    });
}


// Cargar productos disponibles
function loadProducts() {
    fetch("https://proyecto-web-production-0a7f.up.railway.app/products")
        .then(response => response.json())
        .then(products => {
            const productsContainer = document.getElementById("availableProductsContainer");
            productsContainer.innerHTML = ""; // Limpiar contenedor

            products.forEach(product => {
                const productElement = document.createElement("div");
                productElement.className = "product-item";
                productElement.innerHTML = `
                    <img src="${product.img}" alt="${product.nombre}" />
                    <p>${product.nombre}</p>
                    <p>$${product.precio.toFixed(2)}</p>
                `;

                productElement.addEventListener("click", () => {
                    addToEditOrder(product);
                });

                productsContainer.appendChild(productElement);
            });
        })
        .catch(error => console.error("Error al cargar productos:", error));
}

// Añadir producto al pedido en edición
function addToEditOrder(product) {
    const existingProduct = currentOrder.find(item => item.id === product.id_producto);
    if (existingProduct) {
        existingProduct.quantity++;  // Si ya está, solo aumentamos la cantidad
    } else {
        currentOrder.push({
            id: product.id_producto,
            name: product.nombre,
            price: product.precio,
            quantity: 1
        });
    }
    updateEditOrderSummary();
}

// Esperar a que el DOM se haya cargado antes de ejecutar la lógica
document.addEventListener("DOMContentLoaded", function () {
    // Llamar a la función para cargar los productos disponibles
    loadProducts();
});
