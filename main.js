const TASA_CAMBIO_EUR = 0.92;

const ZONAS_ENVIO = {
    Centro: 1.80,
    Norte: 2.50,
    Sur: 3.00,
    Valles: 3.50
};

let carrito = [];
let mostrarEnEuros = false;

async function cargarClima() {
    const contenedor = document.getElementById('clima-contenido');
    const lat = -0.1807;
    const lon = -78.4678;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=America%2FGuayaquil`;

    try {
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error('No se pudo obtener el clima');

        const datos = await respuesta.json();
        const temperatura = Math.round(datos.current.temperature_2m);
        const codigo = datos.current.weather_code;
        const { texto, icono } = interpretarCodigoClima(codigo);

        const ahora = new Date();
        const horaFormateada = ahora.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });

        contenedor.innerHTML = `
            <p class="clima-temp"><i class="fas ${icono}"></i> ${temperatura}°C</p>
            <p class="clima-desc">${texto}</p>
            <p class="clima-recomendacion">${generarRecomendacionClima(codigo, ahora.getHours())}</p>
            <p class="clima-hora">Lectura tomada a las ${horaFormateada}</p>
        `;
    } catch (error) {
        console.error('Error al cargar el clima:', error);
        contenedor.innerHTML = `
            <p class="clima-temp"><i class="fas fa-cloud-sun"></i> --°C</p>
            <p class="clima-desc">Lectura no disponible</p>
            <p class="clima-recomendacion">La bitácora sigue abierta: cualquier clima es bueno para un lote fresco.</p>
        `;
    }
}

function interpretarCodigoClima(codigo) {
    const tabla = {
        0: { texto: 'Despejado', icono: 'fa-sun' },
        1: { texto: 'Mayormente despejado', icono: 'fa-sun' },
        2: { texto: 'Parcialmente nublado', icono: 'fa-cloud-sun' },
        3: { texto: 'Nublado', icono: 'fa-cloud' },
        45: { texto: 'Neblina', icono: 'fa-smog' },
        48: { texto: 'Neblina densa', icono: 'fa-smog' },
        51: { texto: 'Llovizna ligera', icono: 'fa-cloud-rain' },
        53: { texto: 'Llovizna moderada', icono: 'fa-cloud-rain' },
        61: { texto: 'Lluvia ligera', icono: 'fa-cloud-showers-heavy' },
        63: { texto: 'Lluvia moderada', icono: 'fa-cloud-showers-heavy' },
        65: { texto: 'Lluvia fuerte', icono: 'fa-cloud-showers-heavy' },
        80: { texto: 'Chubascos', icono: 'fa-cloud-rain' },
        95: { texto: 'Tormenta eléctrica', icono: 'fa-bolt' }
    };
    return tabla[codigo] || { texto: 'Condición variable', icono: 'fa-cloud-sun' };
}

function generarRecomendacionClima(codigo, hora) {
    if (codigo >= 51) {
        return 'Lluvia en Quito: buen momento para una taza recién colada del Lote 07.';
    }
    if (codigo === 0 || codigo === 1) {
        return 'Cielo despejado: prueba el Lote 21 en frío, resalta sus notas florales.';
    }
    if (hora >= 15 && hora <= 18) {
        return 'Ronda de la tarde: ideal para registrar notas de cata con el Kit de Cata en Casa.';
    }
    return 'Condiciones estables para tostar y catar con calma.';
}

function inicializarFiltros() {
    const buscador = document.getElementById('buscador');
    const filtroOrigen = document.getElementById('filtro-origen');

    const filtrarProductos = () => {
        const busqueda = buscador.value.toLowerCase();
        const origenSeleccionado = filtroOrigen.value;
        const productos = document.querySelectorAll('.tarjeta-cafe');

        productos.forEach(producto => {
            const nombre = producto.dataset.nombre.toLowerCase();
            const origen = producto.dataset.origen;

            const coincideBusqueda = nombre.includes(busqueda);
            const coincideOrigen = (origenSeleccionado === 'todos' || origen === origenSeleccionado);

            if (coincideBusqueda && coincideOrigen) {
                producto.classList.remove('oculto');
            } else {
                producto.classList.add('oculto');
            }
        });
    };

    buscador.addEventListener('input', filtrarProductos);
    filtroOrigen.addEventListener('change', filtrarProductos);
}

function inicializarCarrito() {
    document.querySelectorAll('.btn-agregar').forEach(boton => {
        boton.addEventListener('click', () => {
            const { id, nombre, precio } = boton.dataset;
            agregarAlCarrito(id, nombre, parseFloat(precio));
        });
    });

    document.getElementById('select-zona').addEventListener('change', actualizarTotales);
    document.getElementById('btn-convertir').addEventListener('click', alternarMoneda);
}

function agregarAlCarrito(id, nombre, precio) {
    const itemExistente = carrito.find(item => item.id === id);
    if (itemExistente) {
        itemExistente.cantidad += 1;
    } else {
        carrito.push({ id, nombre, precio, cantidad: 1 });
    }
    renderizarCarrito();
    actualizarTotales();
}

function modificarCantidad(id, cambio) {
    const item = carrito.find(item => item.id === id);
    if (!item) return;

    item.cantidad += cambio;
    if (item.cantidad <= 0) {
        carrito = carrito.filter(i => i.id !== id);
    }
    renderizarCarrito();
    actualizarTotales();
}

function renderizarCarrito() {
    const lista = document.getElementById('lista-carrito');

    if (carrito.length === 0) {
        lista.innerHTML = '<li class="carrito-vacio">Aún no has registrado cafés o sets en tu pedido.</li>';
        return;
    }

    lista.innerHTML = carrito.map(item => {
        const subtotalItemUSD = item.precio * item.cantidad;
        return `
            <li class="carrito-item">
                <div class="item-info">
                    <strong>${item.nombre}</strong>
                    <small>Precio: ${formatoMoneda(item.precio)} c/u</small>
                </div>
                <div class="item-acciones">
                    <button class="btn-accion-carrito" onclick="modificarCantidad('${item.id}', -1)" aria-label="Disminuir">-</button>
                    <span>${item.cantidad}</span>
                    <button class="btn-accion-carrito" onclick="modificarCantidad('${item.id}', 1)" aria-label="Aumentar">+</button>
                    <span>${formatoMoneda(subtotalItemUSD)}</span>
                </div>
            </li>
        `;
    }).join('');
}

function calcularSubtotal() {
    return carrito.reduce((acumulado, item) => acumulado + (item.precio * item.cantidad), 0);
}

function calcularEnvio() {
    if (carrito.length === 0) return 0;
    const zona = document.getElementById('select-zona').value;
    return ZONAS_ENVIO[zona] || 0;
}

function actualizarTotales() {
    const subtotal = calcularSubtotal();
    const envio = calcularEnvio();
    const total = subtotal + envio;

    document.getElementById('subtotal').textContent = formatoMoneda(subtotal);
    document.getElementById('envio').textContent = formatoMoneda(envio);
    document.getElementById('total').textContent = formatoMoneda(total);

    const totalConvertido = document.getElementById('total-convertido');
    if (total > 0) {
        totalConvertido.textContent = mostrarEnEuros
            ? `≈ $${total.toFixed(2)} USD`
            : `≈ €${(total * TASA_CAMBIO_EUR).toFixed(2)} EUR`;
    } else {
        totalConvertido.textContent = '';
    }
}

function formatoMoneda(valorUSD) {
    if (mostrarEnEuros) {
        return `€${(valorUSD * TASA_CAMBIO_EUR).toFixed(2)}`;
    }
    return `$${valorUSD.toFixed(2)}`;
}

function alternarMoneda() {
    mostrarEnEuros = !mostrarEnEuros;
    const boton = document.getElementById('btn-convertir');
    boton.textContent = mostrarEnEuros ? 'Pagar en USD ($)' : 'Pagar en EUR (€)';

    renderizarCarrito();
    actualizarTotales();
}

window.modificarCantidad = modificarCantidad;

function inicializarFormulario() {
    const formulario = document.getElementById('formulario-contacto');

    formulario.addEventListener('submit', (e) => {
        e.preventDefault();
        let esValido = true;

        const nombre = document.getElementById('nombre');
        const email = document.getElementById('email');
        const telefono = document.getElementById('telefono');
        const mensaje = document.getElementById('mensaje');

        if (nombre.value.trim().length < 3) {
            document.getElementById('error-nombre').textContent = "Ingresa un nombre válido.";
            esValido = false;
        } else {
            document.getElementById('error-nombre').textContent = "";
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.value.trim())) {
            document.getElementById('error-email').textContent = "Ingresa un correo válido.";
            esValido = false;
        } else {
            document.getElementById('error-email').textContent = "";
        }

        if (telefono.value.trim().length < 7) {
            document.getElementById('error-telefono').textContent = "Ingresa un teléfono correcto.";
            esValido = false;
        } else {
            document.getElementById('error-telefono').textContent = "";
        }

        if (mensaje.value.trim().length < 5) {
            document.getElementById('error-mensaje-texto').textContent = "Indícanos más detalles.";
            esValido = false;
        } else {
            document.getElementById('error-mensaje-texto').textContent = "";
        }

        if (esValido) {
            if (carrito.length === 0) {
                alert("Registra al menos un café o set antes de continuar.");
                return;
            }

            const subtotal = calcularSubtotal();
            const envio = calcularEnvio();
            const total = subtotal + envio;
            const zona = document.getElementById('select-zona').value || 'Sin especificar';

            let detallePedido = carrito.map(item => `- ${item.nombre} (x${item.cantidad})`).join('%0A');
            let monedaFinal = mostrarEnEuros ? "EUR" : "USD";
            let totalFormateado = formatoMoneda(total);

            let textoWhatsApp = `¡Hola! Quiero levantar un pedido en Quito Coffee Roasters.%0A%0A` +
                                `*Cliente:* ${nombre.value}%0A` +
                                `*Teléfono:* ${telefono.value}%0A` +
                                `*Zona de Envío:* ${zona}%0A%0A` +
                                `*Lotes solicitados:*%0A${detallePedido}%0A%0A` +
                                `*Total del pedido:* ${totalFormateado} ${monedaFinal}%0A` +
                                `*Indicaciones:* ${mensaje.value}`;

            const urlWhatsApp = `https://wa.me/593999999999?text=${textoWhatsApp}`;

            const feedback = document.getElementById('feedback-formulario');
            feedback.innerHTML = "Pedido registrado en la bitácora. Redireccionando a WhatsApp...";
            feedback.className = "feedback-mensaje exito";

            setTimeout(() => {
                window.open(urlWhatsApp, '_blank');
                formulario.reset();
                carrito = [];
                renderizarCarrito();
                actualizarTotales();
                feedback.className = "feedback-mensaje";
                feedback.innerHTML = "";
            }, 2000);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    cargarClima();
    inicializarFiltros();
    inicializarCarrito();
    inicializarFormulario();
});
