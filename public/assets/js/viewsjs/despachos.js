// Verificar si Firebase ya está inicializado
let dbFinanzas;
try {
    // Verificar si firebase ya está disponible y tiene apps inicializadas
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        console.log('Usando instancia de Firebase existente en despachos.js');
        dbFinanzas = firebase.firestore();
    } else {
        // Solo inicializar si no está ya inicializado
        console.log('Inicializando Firebase en despachos.js');
        const firebaseConfig = {
            apiKey: "AIzaSyBy_V4hsuhMrbq7NBTMG289ievV-nhzf68",
            authDomain: "abigranos.firebaseapp.com",
            projectId: "abigranos",
            storageBucket: "abigranos.firebasestorage.app",
            messagingSenderId: "405475347978",
            appId: "1:405475347978:web:a0c9bb724903cca76b99f3"
        };

        firebase.initializeApp(firebaseConfig);
        dbFinanzas = firebase.firestore();
    }
} catch (error) {
    console.error('Error al configurar Firebase en despachos.js:', error);
}

const STATE_FINANZAS = {
    lotes: [] // Lotes disponibles para la venta
};

const FinanzasManager = {
    // Función que devuelve "V001" si no hay ventas previas o el siguiente código consecutivo
    obtenerNuevoCodigoVenta: function() {
        return dbFinanzas.collection('lotes')
            .get()
            .then(snapshot => {
                let maxNum = 0;
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    if (Array.isArray(data.ventas)) {
                        data.ventas.forEach(sale => {
                            const codigo = sale.codigoVenta || '';
                            if (codigo.startsWith('V')) {
                                const num = parseInt(codigo.substring(1), 10);
                                if (!isNaN(num) && num > maxNum) maxNum = num;
                            }
                        });
                    }
                });
                const nuevoNum = (maxNum + 1).toString().padStart(3, '0');
                return "V" + nuevoNum;
            });
    },

    cargarLotes: function() {
        dbFinanzas.collection('lotes')
            .where("estadodoc", "==", "activo")
            .get()
            .then(snapshot => {
                STATE_FINANZAS.lotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                FinanzasManager.renderLotes(STATE_FINANZAS.lotes);
            })
            .catch(error => {
                console.error("Error al cargar lotes:", error);
            });
    },

    renderLotes: function(lotes) {
        // Nuevo: Leer estado del toggle para ocultar lotes vendidos al 100%
        const hideSold = document.getElementById('toggleSoldOut') ? .checked;

        // Actualizar cabecera con columna "Ventas"
        const theadHTML = `
            <tr>
                <th>Selec.</th>
                <th>Código</th>
                <th>Fecha</th>
                <th>Productor</th>
                <th>Procedencia</th>
                <th>Peso Neto</th>
                <th>Precio/Kg</th>
                <th>Vendido</th>
                <th>Saldo</th>
                <th>Ventas</th>
                <th>Cantidad</th>
            </tr>`;
        let tbodyHTML = "";
        if (!lotes || lotes.length === 0) {
            tbodyHTML = `<tr><td colspan="11" class="text-center">No hay lotes disponibles</td></tr>`;
        } else {
            lotes.forEach(lote => {
                const fecha = lote.fecha ? lote.fecha.toDate().toLocaleDateString('es-PE') : 'N/A';
                const vendido = (lote.ventas && Array.isArray(lote.ventas)) ?
                    lote.ventas.reduce((sum, v) => sum + parseFloat(v.cantidad || 0), 0) :
                    0;
                const pesoNeto = lote.pesoNeto ? parseFloat(lote.pesoNeto) : 0;
                const saldo = pesoNeto - vendido;
                // Si se activa el filtro y el saldo es 0, omitir este lote
                if (hideSold && saldo <= 0) return;
                // Calcular porcentaje para progress bar (con protección contra división por 0)
                const porcentaje = pesoNeto > 0 ? ((saldo / pesoNeto) * 100).toFixed(0) : 0;
                // Crear resumen de ventas: concatenar código de cada venta y cantidad
                const ventasResumen = (lote.ventas && Array.isArray(lote.ventas)) ?
                    lote.ventas.map(v => `${v.codigoVenta} (${v.cantidad} kg)`).join(" | ") :
                    'N/A';
                tbodyHTML += `
                    <tr>
                        <td>
                            <input type="checkbox" class="lote-checkbox" value="${lote.id}">
                        </td>
                        <td>${lote.codigo || 'N/A'}</td>
                        <td>${fecha}</td>
                        <td class="text-nowrap">${lote.productor || 'N/A'}</td>
                        <td>${lote.procedencia || 'N/A'}</td>
                        <td>${pesoNeto ? pesoNeto + ' Kg' : 'N/A'}</td>
                        <td>${lote.precioKg ? 'S/. ' + numeral(lote.precioKg).format('0,0.00') : 'N/A'}</td>
                        <td>${numeral(vendido).format('0,0.00')}</td>
                        <td>
                          <div class="progress" style="height:20px;">
                            <div class="progress-bar bg-info" role="progressbar" style="width: ${porcentaje}%; color: black; white-space: nowrap; overflow: visible;" aria-valuenow="${porcentaje}" aria-valuemin="0" aria-valuemax="100">
                              ${porcentaje}% (${numeral(saldo/1000).format('0,0.00')} t)
                            </div>
                          </div>
                        </td>
                        <td>${ventasResumen}</td>
                        <td>
                          <input type="number" class="lote-cantidad form-control" min="0" max="${saldo}" step="0.01" placeholder="0">
                        </td>
                    </tr>
                `;
            });
        }
        const table = document.getElementById('lotesVentaTable');
        if (table) {
            table.innerHTML = `<thead>${theadHTML}</thead><tbody>${tbodyHTML}</tbody>`;
            if ($.fn.DataTable.isDataTable('#lotesVentaTable')) {
                $('#lotesVentaTable').DataTable().destroy();
            }
            $('#lotesVentaTable').DataTable({
                language: { url: 'https://cdn.datatables.net/plug-ins/1.12.1/i18n/es-ES.json' },
                order: []
            });
            // Añadir event listener a cada checkbox para llenar automáticamente su input
            document.querySelectorAll('.lote-checkbox').forEach(checkbox => {
                checkbox.addEventListener('change', (e) => {
                    const row = e.target.closest('tr');
                    const input = row.querySelector('.lote-cantidad');
                    if (e.target.checked) {
                        input.value = input.getAttribute('max');
                    } else {
                        input.value = "";
                    }
                });
            });
        }
    },

    registrarVenta: function(event) {
        event.preventDefault();
        const cliente = document.getElementById('cliente').value;
        // Se eliminó la obtención del campo "cantidad"

        // Recoger campos de la Orden de Compra
        const ordenCompraNumero = document.getElementById('ordenCompraNumero').value.trim();
        const ordenCompraFecha = document.getElementById('ordenCompraFecha').value;
        const ordenCompraObservaciones = document.getElementById('ordenCompraObservaciones').value.trim();
        const ordenCompra = {
            numero: ordenCompraNumero,
            fecha: ordenCompraFecha,
            observaciones: ordenCompraObservaciones
        };

        // Recoger lotes seleccionados y su cantidad
        const rows = document.querySelectorAll('#lotesVentaTable tbody tr');
        const lotesSeleccionados = [];
        rows.forEach(row => {
            const checkbox = row.querySelector('.lote-checkbox');
            if (checkbox && checkbox.checked) {
                const cantidadInput = row.querySelector('.lote-cantidad');
                const cantidad = cantidadInput ? parseFloat(cantidadInput.value) : 0;
                lotesSeleccionados.push({
                    id: checkbox.value,
                    cantidad: cantidad
                });
            }
        });

        // Calcular la suma de cantidades a partir de los lotes seleccionados
        const cantidadTotal = lotesSeleccionados.reduce((sum, lote) => sum + (lote.cantidad || 0), 0);

        if (!cliente || lotesSeleccionados.length === 0 || isNaN(cantidadTotal) || cantidadTotal <= 0) {
            showAlert("Por favor, complete todos los campos y seleccione al menos un lote con cantidad válida.", "danger");
            return;
        }

        // Obtener el nuevo código de venta consecutivo y proceder con la actualización
        FinanzasManager.obtenerNuevoCodigoVenta()
            .then(codigoVenta => {
                // Usar codigoVenta consecutivo, ej. "V001", "V002", ...
                const updatePromises = lotesSeleccionados.map(loteObj => {
                    const ventaDetalle = {
                        codigoVenta: codigoVenta,
                        cantidad: loteObj.cantidad,
                        cliente: cliente,
                        NCompra: ordenCompraNumero,
                        ordenCompra: ordenCompra,
                        // Usar firebase.firestore.Timestamp.now() en lugar de FieldValue.serverTimestamp()
                        timestamp: firebase.firestore.Timestamp.now()
                    };
                    return dbFinanzas.collection('lotes')
                        .doc(loteObj.id)
                        .update({
                            ventas: firebase.firestore.FieldValue.arrayUnion(ventaDetalle)
                        });
                });
                return Promise.all(updatePromises);
            })
            .then(() => {
                showAlert("Venta registrada correctamente en cada lote.", "success");
                document.getElementById('ventaForm').reset();
                document.querySelectorAll('.lote-checkbox').forEach(cb => cb.checked = false);
                document.querySelectorAll('.lote-cantidad').forEach(input => input.value = '');
                // Primero actualizamos los lotes
                return FinanzasManager.cargarLotes();
            })
            .then(() => {
                // Después actualizamos las ventas
                return FinanzasManager.cargarVentas();
            })
            .catch(error => {
                console.error("Error registrando la venta en los lotes:", error);
                showAlert("Error registrando la venta: " + error.message, "danger");
            });
    },

    // Actualizamos cargarVentas para extraer ventas y usar el campo "codigo" del lote
    cargarVentas: function() {
        dbFinanzas.collection('lotes')
            .onSnapshot(snapshot => {
                const salesMap = {};
                snapshot.docs.forEach(doc => {
                    const data = doc.data();
                    const loteCodigo = data.codigo || 'N/A';
                    if (Array.isArray(data.ventas)) {
                        data.ventas.forEach(sale => {
                            const codigo = sale.codigoVenta || 'N/A';
                            if (!salesMap[codigo]) {
                                salesMap[codigo] = {
                                    codigo: codigo,
                                    NCompra: sale.NCompra || 'N/A',
                                    cliente: sale.cliente || 'N/A',
                                    fecha: sale.timestamp ? sale.timestamp.toDate() : new Date(),
                                    // Usar "codigo" del lote en lugar de su id
                                    lotes: [{ codigo: loteCodigo, cantidad: sale.cantidad }],
                                    cantidadTotal: sale.cantidad || 0
                                };
                            } else {
                                salesMap[codigo].lotes.push({ codigo: loteCodigo, cantidad: sale.cantidad });
                                salesMap[codigo].cantidadTotal += sale.cantidad || 0;
                            }
                        });
                    }
                });
                const ventasArray = Object.values(salesMap);
                FinanzasManager.renderVentas(ventasArray);
            }, error => {
                console.error("Error al cargar ventas:", error);
            });
    },

    renderVentas: function(ventas) {
        let tbodyHTML = "";
        if (!ventas || ventas.length === 0) {
            tbodyHTML = '<tr><td colspan="7" class="text-center">No hay ventas registradas</td></tr>';
        } else {
            ventas.forEach(venta => {
                const fecha = venta.fecha ? venta.fecha.toLocaleDateString('es-PE') : 'N/A';
                const lotesInfo = venta.lotes && venta.lotes.length > 0 ?
                    venta.lotes.map(l => `Lote ${l.codigo}: ${l.cantidad} kg`).join("<br>") :
                    'N/A';
                tbodyHTML += `
                    <tr>
                        <td>${venta.codigo || 'N/A'}</td> <!-- Código de Venta -->
                        <td>${venta.NCompra}</td> <!-- NCompra -->
                        <td>${venta.cliente}</td>
                        <td>${fecha}</td>
                        <td>${lotesInfo}</td>
                        <td>${venta.cantidadTotal}</td>
                        <td>
                          <button class="btn btn-sm btn-danger delete-sale-btn" data-venta-codigo="${venta.codigo}">Eliminar</button>
                        </td>
                    </tr>
                `;
            });
        }
        const table = document.getElementById('ventasTable');
        if (table) {
            table.querySelector('tbody').innerHTML = tbodyHTML;
            if ($.fn.DataTable.isDataTable('#ventasTable')) {
                $('#ventasTable').DataTable().destroy();
            }
            $('#ventasTable').DataTable({
                language: { url: 'https://cdn.datatables.net/plug-ins/1.12.1/i18n/es-ES.json' },
                order: []
            });
            // Listener para los botones de eliminar venta
            document.querySelectorAll('.delete-sale-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const codigoVenta = this.getAttribute('data-venta-codigo');
                    document.getElementById('saleCodeToDelete').textContent = codigoVenta;
                    // Almacenar el código a eliminar en un atributo del botón de confirmación
                    document.getElementById('confirmDeleteSale').setAttribute('data-venta-codigo', codigoVenta);
                    // Mostrar el modal usando Bootstrap
                    new bootstrap.Modal(document.getElementById('deleteSaleModal')).show();
                });
            });
        }
    },

    // Modificar eliminarVenta para que solo elimine y retorne la promesa
    eliminarVenta: function(codigoVenta) {
        const updatePromises = [];
        STATE_FINANZAS.lotes.forEach(lote => {
            if (Array.isArray(lote.ventas)) {
                const ventasActualizadas = lote.ventas.filter(sale => sale.codigoVenta !== codigoVenta);
                if (ventasActualizadas.length !== lote.ventas.length) {
                    updatePromises.push(
                        dbFinanzas.collection('lotes')
                        .doc(lote.id)
                        .update({ ventas: ventasActualizadas })
                    );
                }
            }
        });
        return Promise.all(updatePromises);
    }
};

// Reemplaza la función showAlert existente por la siguiente versión:
function showAlert(message, type = "success") {
    let container = document.getElementById("alertContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "alertContainer";
        // Posición fija para evitar desplazar el contenido
        container.style.position = "fixed";
        container.style.top = "10px";
        container.style.left = "50%";
        container.style.transform = "translateX(-50%)";
        container.style.zIndex = "1050";
        container.style.pointerEvents = "none";
        document.body.appendChild(container);
    }
    const alertDiv = document.createElement("div");
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.role = "alert";
    // Permitir cerrar el alert manualmente sin afectar el layout
    alertDiv.style.pointerEvents = "auto";
    alertDiv.innerHTML = `${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>`;
    container.appendChild(alertDiv);
    // Autodesaparición después de 3 segundos
    setTimeout(() => {
        alertDiv.classList.remove("show");
        alertDiv.classList.add("hide");
        setTimeout(() => alertDiv.remove(), 500);
    }, 3000);
}

document.addEventListener('DOMContentLoaded', () => {
    FinanzasManager.cargarLotes();
    FinanzasManager.cargarVentas();
    document.getElementById('ventaForm')
        .addEventListener('submit', FinanzasManager.registrarVenta);
    const toggle = document.getElementById('toggleSoldOut');
    if (toggle) {
        toggle.addEventListener('change', FinanzasManager.cargarLotes);
    }
    const confirmBtn = document.getElementById('confirmDeleteSale');
    confirmBtn.addEventListener('click', function() {
        const codigoVenta = this.getAttribute('data-venta-codigo');
        FinanzasManager.eliminarVenta(codigoVenta)
            .then(() => {
                showAlert("Venta " + codigoVenta + " eliminada correctamente.", "success");
                return FinanzasManager.cargarLotes();
            })
            .then(() => {
                // Forzar la recarga de la tabla de ventas después de un breve retardo
                setTimeout(() => {
                    FinanzasManager.cargarVentas();
                    bootstrap.Modal.getInstance(document.getElementById('deleteSaleModal')).hide();
                }, 500);
            })
            .catch(error => {
                console.error("Error eliminando la venta:", error);
                showAlert("Error eliminando la venta: " + error.message, "danger");
            });
    });
});