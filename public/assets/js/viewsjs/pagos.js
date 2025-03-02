//avisar que se inición comercial.js
console.log('Iniciando comercial.js');

// ============= CONFIGURACIÓN FIREBASE =============
// Verificar si Firebase ya está inicializado
let db;
try {
    // Verificar si firebase ya está disponible y tiene apps inicializadas
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        console.log('Usando instancia de Firebase existente en pagos.js');
        db = firebase.firestore();
    } else {
        // Solo inicializar si no está ya inicializado
        console.log('Inicializando Firebase en pagos.js');
        const firebaseConfig = {
            apiKey: "AIzaSyBy_V4hsuhMrbq7NBTMG289ievV-nhzf68",
            authDomain: "abigranos.firebaseapp.com",
            projectId: "abigranos",
            storageBucket: "abigranos.firebasestorage.app",
            messagingSenderId: "405475347978",
            appId: "1:405475347978:web:a0c9bb724903cca76b99f3"
        };

        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
    }
} catch (error) {
    console.error('Error al configurar Firebase en pagos.js:', error);
}

// ============= VARIABLES GLOBALES =============
const STATE = {
    lotes: [],
    lotesComerciales: [],
    servicios: [],
    filtroLotes: 'todos',
    filtroServicios: 'todos',
    loteActual: null,
    servicioActual: null,
    productores: {}
};

// ============= REFERENCIAS DOM =============
const DOM = {
    loadingSpinner: document.getElementById('loadingSpinner'),
    connectionStatus: document.getElementById('connectionStatus'),
    tablaLotesComercial: document.getElementById('tablaLotesComercial'),
    cardViewLotesComercial: document.getElementById('cardViewLotesComercial'),
    tablaPagosProductores: document.getElementById('tablaPagosProductores'),
    tablaServicios: document.getElementById('tablaServicios'),
    modalRegistrarPago: document.getElementById('modalRegistrarPago'),
    modalHistorialPagos: document.getElementById('modalHistorialPagos'),
    modalPagoServicio: document.getElementById('modalPagoServicio'),
    btnTodos: document.getElementById('btnTodos'),
    btnPagados: document.getElementById('btnPagados'),
    btnParciales: document.getElementById('btnParciales'),
    btnPendientes: document.getElementById('btnPendientes'),
    btnTodosServicios: document.getElementById('btnTodosServicios'),
    btnPagadosServicios: document.getElementById('btnPagadosServicios'),
    btnPendientesServicios: document.getElementById('btnPendientesServicios')
};

// ============= UTILIDADES =============
const UTILS = {
    formatNumber: (number) => numeral(number).format('0,0.00'),

    getFechaLocal: () => {
        const today = new Date();
        const offset = today.getTimezoneOffset();
        return new Date(today.getTime() - (offset * 60000));
    },

    actualizarEstadoConexion: (online) => {
        const badge = DOM.connectionStatus.querySelector('.badge');
        badge.className = 'badge bg-' + (online ? 'success' : 'danger');
        badge.textContent = online ? 'Online' : 'Offline';
    },

    calcularEstadoPago: (lote) => {
        console.log('Calculando estado de pago para lote:', lote.codigo);
        console.log('Datos completos del lote:', lote);

        // En cargios.js, el monto total es costoLote
        const montoTotal = lote.costoLote || 0;

        // Verificar si hay pagos en la estructura correcta
        // Primero verificamos si hay un campo 'pagos' como array
        let pagado = 0;
        if (lote.pagos && Array.isArray(lote.pagos)) {
            pagado = lote.pagos.reduce((sum, pago) => sum + (pago.monto || 0), 0);
        }
        // Si no hay pagos como array, verificamos si hay montoAdelanto
        else if (lote.montoAdelanto) {
            pagado = parseFloat(lote.montoAdelanto) || 0;
        }

        // También verificamos la condición de ingreso
        if (lote.condicionIngreso === 'pagado') {
            pagado = montoTotal;
        }

        const pendiente = montoTotal - pagado;

        let estado = 'pendiente';
        if (pagado >= montoTotal) {
            estado = 'pagado';
        } else if (pagado > 0) {
            estado = 'parcial';
        }

        const resultado = {
            montoTotal,
            pagado,
            pendiente,
            estado
        };

        console.log('Resultado del cálculo:', resultado);
        return resultado;
    },

    calcularEstadoServicio: (servicio) => {
        return servicio.pagado ? 'pagado' : 'pendiente';
    },

    obtenerMetodoPagoTexto: (metodo) => {
        const metodos = {
            'efectivo': 'Efectivo',
            'transferencia': 'Transferencia',
            'cheque': 'Cheque',
            'yape': 'Yape',
            'plin': 'Plin'
        };
        return metodos[metodo] || metodo;
    }
};

// ============= GESTIÓN DE LOTES COMERCIALES =============
const LotesComercialManager = {
    // Añadir variable global para rastrear instancias de DataTable
    dataTableInstances: {},

    cargar: function() {
        DOM.loadingSpinner.style.display = 'flex';
        try {
            console.log('Iniciando carga de lotes comerciales...');

            // Consultar lotes activos
            db.collection('lotes')
                .where("estadodoc", "==", "activo")
                .get()
                .then(function(snapshot) {
                    console.log('Resultado de la consulta:', snapshot.size, 'documentos encontrados');

                    STATE.lotes = snapshot.docs.map(function(doc) {
                        return {
                            id: doc.id,
                            ...doc.data()
                        };
                    });

                    // Procesar lotes para vista comercial
                    STATE.lotesComerciales = STATE.lotes.map(function(lote) {
                        const estadoPago = UTILS.calcularEstadoPago(lote);
                        return {
                            ...lote,
                            ...estadoPago
                        };
                    });

                    // Actualizar estadísticas
                    LotesComercialManager.actualizarEstadisticas();

                    // Filtrar y mostrar lotes sin usar DataTables
                    var filtroActual = sessionStorage.getItem('filtroLotes') || 'todos';
                    LotesComercialManager.filtrarSinDataTable(filtroActual);

                    // Procesar datos para la vista de pagos a productores
                    LotesComercialManager.procesarProductores();
                })
                .catch(function(error) {
                    console.error('Error al cargar lotes:', error);
                    showBootstrapAlert('Error al cargar los datos de lotes', 'danger');
                })
                .finally(function() {
                    DOM.loadingSpinner.style.display = 'none';
                });
        } catch (error) {
            console.error('Error al cargar lotes:', error);
            showBootstrapAlert('Error al cargar los datos de lotes', 'danger');
            DOM.loadingSpinner.style.display = 'none';
        }
    },

    actualizarEstadisticas: function() {
        // Calcular totales
        const totalLotes = STATE.lotesComerciales.length;
        const totalPeso = STATE.lotesComerciales.reduce(function(sum, lote) {
            return sum + (lote.pesoNeto || 0);
        }, 0);
        const totalMonto = STATE.lotesComerciales.reduce(function(sum, lote) {
            return sum + (lote.costoLote || 0);
        }, 0);
        const totalPagado = STATE.lotesComerciales.reduce(function(sum, lote) {
            return sum + lote.pagado;
        }, 0);
        const totalPendiente = STATE.lotesComerciales.reduce(function(sum, lote) {
            return sum + lote.pendiente;
        }, 0);

        // Calcular total de servicios pendientes
        const totalServiciosPendientes = STATE.servicios
            .filter(function(servicio) {
                return !servicio.pagado;
            })
            .reduce(function(sum, servicio) {
                return sum + servicio.monto;
            }, 0);

        // Calcular porcentajes
        const porcentajePagado = totalMonto > 0 ? (totalPagado / totalMonto) * 100 : 0;
        const porcentajePendiente = totalMonto > 0 ? (totalPendiente / totalMonto) * 100 : 0;

        // Actualizar elementos del DOM
        document.getElementById('totalLotes').textContent = totalLotes;
        document.getElementById('totalPesoLotes').textContent = UTILS.formatNumber(totalPeso) + ' Kg';
        document.getElementById('totalPendiente').textContent = 'S/. ' + UTILS.formatNumber(totalPendiente);
        document.getElementById('porcentajePendiente').textContent = UTILS.formatNumber(porcentajePendiente) + '% del total';
        document.getElementById('progressPendiente').style.width = porcentajePendiente + '%';
        document.getElementById('totalPagado').textContent = 'S/. ' + UTILS.formatNumber(totalPagado);
        document.getElementById('porcentajePagado').textContent = UTILS.formatNumber(porcentajePagado) + '% del total';
        document.getElementById('progressPagado').style.width = porcentajePagado + '%';
        document.getElementById('serviciosPendientes').textContent = 'S/. ' + UTILS.formatNumber(totalServiciosPendientes);

        // Calcular porcentaje de servicios pendientes respecto al total de gastos
        const totalGastos = STATE.lotesComerciales.reduce(function(sum, lote) {
            return sum + (lote.GastosT || 0);
        }, 0);
        const porcentajeServicios = totalGastos > 0 ? (totalServiciosPendientes / totalGastos) * 100 : 0;
        document.getElementById('porcentajeServicios').textContent = UTILS.formatNumber(porcentajeServicios) + '% del total de gastos';
        document.getElementById('progressServicios').style.width = porcentajeServicios + '%';
    },

    filtrar: function(filtro) {
        console.log('Aplicando filtro:', filtro);
        STATE.filtroLotes = filtro;

        // Guardar el filtro en sessionStorage para mantenerlo si hay recarga
        sessionStorage.setItem('filtroLotes', filtro);

        // Aplicar filtro
        var lotesFiltrados = [];
        switch (filtro) {
            case 'pagados':
                lotesFiltrados = STATE.lotesComerciales.filter(function(lote) {
                    return lote.estado === 'pagado';
                });
                break;
            case 'parciales':
                lotesFiltrados = STATE.lotesComerciales.filter(function(lote) {
                    return lote.estado === 'parcial';
                });
                break;
            case 'pendientes':
                lotesFiltrados = STATE.lotesComerciales.filter(function(lote) {
                    return lote.estado === 'pendiente';
                });
                break;
            default:
                lotesFiltrados = STATE.lotesComerciales;
        }

        console.log('Filtro aplicado: ' + filtro + '. Mostrando ' + lotesFiltrados.length + ' lotes.');

        // Actualizar UI
        LotesComercialManager.renderLotes(lotesFiltrados);

        // Actualizar estado de botones
        if (DOM.btnTodos) DOM.btnTodos.classList.toggle('active', filtro === 'todos');
        if (DOM.btnPagados) DOM.btnPagados.classList.toggle('active', filtro === 'pagados');
        if (DOM.btnParciales) DOM.btnParciales.classList.toggle('active', filtro === 'parciales');
        if (DOM.btnPendientes) DOM.btnPendientes.classList.toggle('active', filtro === 'pendientes');

        return false; // Evitar comportamiento por defecto
    },

    renderLotes: function(lotes) {
        console.log('Renderizando lotes:', lotes.length, 'lotes a mostrar');

        // Construir el HTML de la tabla
        let theadHTML = `
            <tr>
                <th>Código</th>
                <th>Fecha</th>
                <th>Productor</th>
                <th>Procedencia</th>
                <th>Peso</th>
                <th>Costo Total</th>
                <th>Pagado</th>
                <th>Pendiente</th>
                <th>Estado</th>
                <th>Acciones</th>
            </tr>`;
        let tbodyHTML = '';
        if (lotes.length === 0) {
            tbodyHTML = '<tr><td colspan="10" class="text-center">No hay lotes disponibles</td></tr>';
        } else {
            lotes.forEach(lote => {
                const fecha = lote.fecha ? lote.fecha.toDate().toLocaleDateString('es-PE') : 'N/A';
                let estadoClase = '';
                let estadoTexto = '';
                switch (lote.estado) {
                    case 'pagado':
                        estadoClase = 'bg-success';
                        estadoTexto = 'Pagado';
                        break;
                    case 'parcial':
                        estadoClase = 'bg-warning';
                        estadoTexto = 'Parcial';
                        break;
                    default:
                        estadoClase = 'bg-danger';
                        estadoTexto = 'Pendiente';
                }
                tbodyHTML += `
                    <tr>
                        <td><strong>${lote.codigo || 'N/A'}</strong></td>
                        <td>${fecha}</td>
                        <td>${lote.productor || 'N/A'}</td>
                        <td>${lote.procedencia || 'N/A'}</td>
                        <td>${UTILS.formatNumber(lote.pesoNeto || 0)} Kg</td>
                        <td>S/. ${UTILS.formatNumber(lote.montoTotal || 0)}</td>
                        <td>S/. ${UTILS.formatNumber(lote.pagado || 0)}</td>
                        <td>S/. ${UTILS.formatNumber(lote.pendiente || 0)}</td>
                        <td><span class="badge ${estadoClase} status-badge">${estadoTexto}</span></td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-success" onclick="LotesComercialManager.registrarPago('${lote.id}')" title="Registrar Pago">
                                    <i class="bi bi-cash"></i>
                                </button>
                                <button class="btn btn-outline-info" onclick="LotesComercialManager.verHistorialPagos('${lote.id}')" title="Ver Historial">
                                    <i class="bi bi-clock-history"></i>
                                </button>
                            </div>
                        </td>
                    </tr>`;
            });
        }
        // Actualizar la tabla
        const table = document.getElementById('lotesComercialTable');
        if (table) {
            table.innerHTML = `<thead class="sticky-top bg-light">${theadHTML}</thead><tbody>${tbodyHTML}</tbody>`;
            // Si ya existe DataTable, destruirlo
            if ($.fn.dataTable.isDataTable('#lotesComercialTable')) {
                $('#lotesComercialTable').DataTable().destroy();
            }
            // Inicializar DataTable con opciones (incluyendo idioma)
            $('#lotesComercialTable').DataTable({
                language: { url: 'https://cdn.datatables.net/plug-ins/1.12.1/i18n/es-ES.json' },
                order: [] // Permite ordenarlo mediante DataTables
            });
        }
    },

    procesarProductores: function() {
        // Agrupar lotes por productor
        STATE.productores = {};

        for (var i = 0; i < STATE.lotesComerciales.length; i++) {
            var lote = STATE.lotesComerciales[i];
            var productor = lote.productor || 'Sin Productor';

            if (!STATE.productores[productor]) {
                STATE.productores[productor] = {
                    nombre: productor,
                    lotes: [],
                    pesoTotal: 0,
                    montoTotal: 0,
                    pagado: 0,
                    pendiente: 0
                };
            }

            STATE.productores[productor].lotes.push(lote);
            STATE.productores[productor].pesoTotal += lote.pesoNeto || 0;
            STATE.productores[productor].montoTotal += lote.montoTotal || 0;
            STATE.productores[productor].pagado += lote.pagado || 0;
            STATE.productores[productor].pendiente += lote.pendiente || 0;
        }

        // Renderizar tabla de productores
        DOM.tablaPagosProductores.innerHTML = '';

        for (var productor in STATE.productores) {
            if (STATE.productores.hasOwnProperty(productor)) {
                var prod = STATE.productores[productor];
                DOM.tablaPagosProductores.innerHTML += '<tr>' +
                    '<td>' + prod.nombre + '</td>' +
                    '<td>' + prod.lotes.length + '</td>' +
                    '<td>' + UTILS.formatNumber(prod.pesoTotal) + ' Kg</td>' +
                    '<td>S/. ' + UTILS.formatNumber(prod.montoTotal) + '</td>' +
                    '<td>S/. ' + UTILS.formatNumber(prod.pagado) + '</td>' +
                    '<td>S/. ' + UTILS.formatNumber(prod.pendiente) + '</td>' +
                    '<td>' +
                    '<button class="btn btn-sm btn-outline-info" onclick="LotesComercialManager.verLotesProductor(\'' + prod.nombre + '\')">' +
                    '<i class="bi bi-list-ul me-1"></i>Ver Lotes' +
                    '</button>' +
                    '</td>' +
                    '</tr>';
            }
        }

        // Inicializar DataTable
        setTimeout(function() {
            if ($.fn.dataTable.isDataTable('#pagosProductoresTable')) {
                $('#pagosProductoresTable').DataTable().destroy();
            }
            $('#pagosProductoresTable').DataTable({
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.12.1/i18n/es-ES.json'
                }
            });
        }, 100);
    },

    verLotesProductor: function(productor) {
        // Filtrar lotes del productor
        var lotes = STATE.lotesComerciales.filter(function(lote) {
            return lote.productor === productor;
        });

        // Mostrar en la pestaña de lotes
        document.getElementById('lotes-tab').click();

        // Renderizar solo los lotes de este productor
        LotesComercialManager.renderLotes(lotes);

        // Mostrar mensaje
        showBootstrapAlert('Mostrando ' + lotes.length + ' lotes del productor: ' + productor, 'info');
    },

    registrarPago: function(loteId) {
        try {
            console.log('Iniciando registro de pago para lote:', loteId);

            // Buscar el lote
            var lote = STATE.lotesComerciales.find(function(l) { return l.id === loteId; });
            if (!lote) {
                throw new Error('Lote no encontrado');
            }

            console.log('Lote encontrado:', lote);
            STATE.loteActual = lote;

            // Verificar el HTML para ver los IDs correctos
            console.log('Elementos del formulario en el DOM:');
            console.log('pagoLoteId:', document.getElementById('pagoLoteId'));

            // Llenar el formulario con verificación de existencia
            function setValueIfExists(id, value) {
                var element = document.getElementById(id);
                if (element) element.value = value;
                else console.warn('Elemento ' + id + ' no encontrado');
            }

            setValueIfExists('pagoLoteId', lote.id);
            setValueIfExists('pagoLoteCodigo', lote.codigo || '');
            setValueIfExists('pagoProductor', lote.productor || '');
            setValueIfExists('pagoMontoTotal', UTILS.formatNumber(lote.montoTotal || 0));
            setValueIfExists('pagoYaPagado', UTILS.formatNumber(lote.pagado || 0));
            setValueIfExists('pagoPendiente', UTILS.formatNumber(lote.pendiente || 0));
            setValueIfExists('pagoFecha', UTILS.getFechaLocal().toISOString().split('T')[0]);
            setValueIfExists('pagoMetodo', '');
            setValueIfExists('pagoMonto', lote.pendiente.toFixed(2));
            setValueIfExists('pagoComprobante', '');
            setValueIfExists('pagoObservaciones', '');

            // Mostrar modal
            var modal = new bootstrap.Modal(DOM.modalRegistrarPago);
            modal.show();

        } catch (error) {
            console.error('Error al preparar registro de pago:', error);
            showBootstrapAlert('Error al preparar el registro de pago: ' + error.message, 'danger');
        }
    },

    guardarPago: function() {
        DOM.loadingSpinner.style.display = 'flex';

        var self = this;

        // Usamos promesas en lugar de async/await para mayor compatibilidad
        try {
            // Obtener valores con verificación
            function getValue(id) {
                var element = document.getElementById(id);
                return element ? element.value : null;
            }

            var loteId = getValue('pagoLoteId');
            var fecha = getValue('pagoFecha');
            var metodo = getValue('pagoMetodo');
            var montoStr = getValue('pagoMonto');
            var comprobante = getValue('pagoComprobante');
            var observaciones = getValue('pagoObservaciones');

            if (!loteId) throw new Error('ID de lote no encontrado');
            if (!fecha) throw new Error('Fecha no especificada');
            if (!metodo) throw new Error('Método de pago no especificado');

            var monto = parseFloat(montoStr);
            if (isNaN(monto) || monto <= 0) {
                throw new Error('Monto inválido');
            }

            console.log('Guardando pago para lote:', loteId, {
                fecha: fecha,
                metodo: metodo,
                monto: monto,
                comprobante: comprobante,
                observaciones: observaciones
            });

            // Crear objeto de pago (sin usar serverTimestamp dentro del objeto de pago)
            var pago = {
                fecha: firebase.firestore.Timestamp.fromDate(new Date(fecha)),
                metodo: metodo,
                monto: monto,
                comprobante: comprobante || '',
                observaciones: observaciones || ''
            };

            // Obtener referencia al lote
            var loteRef = db.collection('lotes').doc(loteId);

            // Actualizar en Firestore usando promesas
            db.runTransaction(function(transaction) {
                return transaction.get(loteRef).then(function(loteDoc) {
                    if (!loteDoc.exists) {
                        throw new Error('El lote no existe');
                    }

                    var loteData = loteDoc.data();

                    // Verificar si ya existe el array de pagos, si no, crearlo
                    var pagos = loteData.pagos || [];

                    // Agregar el nuevo pago
                    pagos.push(pago);

                    // Si es el primer pago y no hay montoAdelanto, actualizar condicionIngreso
                    var condicionIngreso = loteData.condicionIngreso || 'credito';
                    var montoAdelanto = parseFloat(loteData.montoAdelanto) || 0;

                    // Calcular total pagado
                    var totalPagado = 0;
                    for (var i = 0; i < pagos.length; i++) {
                        totalPagado += pagos[i].monto;
                    }

                    // Actualizar condición según el total pagado
                    if (totalPagado >= (loteData.costoLote || 0)) {
                        condicionIngreso = 'pagado';
                    } else if (totalPagado > 0) {
                        condicionIngreso = 'adelanto';
                        montoAdelanto = totalPagado;
                    }

                    // Actualizar el lote (con serverTimestamp solo en el campo updatedAt)
                    transaction.update(loteRef, {
                        pagos: pagos,
                        condicionIngreso: condicionIngreso,
                        montoAdelanto: montoAdelanto,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
            }).then(function() {
                // Cerrar modal
                var modal = bootstrap.Modal.getInstance(DOM.modalRegistrarPago);
                modal.hide();

                // Recargar datos
                return LotesComercialManager.cargar();
            }).then(function() {
                showBootstrapAlert('Pago registrado correctamente', 'success');
            }).catch(function(error) {
                console.error('Error al guardar pago:', error);
                showBootstrapAlert('Error al guardar el pago: ' + error.message, 'danger');
            }).finally(function() {
                DOM.loadingSpinner.style.display = 'none';
            });
        } catch (error) {
            console.error('Error al procesar formulario:', error);
            showBootstrapAlert('Error al procesar el formulario: ' + error.message, 'danger');
            DOM.loadingSpinner.style.display = 'none';
        }
    },

    verHistorialPagos: function(loteId) {
        try {
            // Buscar el lote
            var lote = STATE.lotesComerciales.find(function(l) { return l.id === loteId; });
            if (!lote) {
                throw new Error('Lote no encontrado');
            }

            STATE.loteActual = lote;

            // Llenar información del lote
            document.getElementById('historialLoteCodigo').textContent = lote.codigo || '';
            document.getElementById('historialLoteProductor').textContent = lote.productor || '';
            document.getElementById('historialLoteFecha').textContent = lote.fecha ? lote.fecha.toDate().toLocaleDateString('es-PE') : 'N/A';
            document.getElementById('historialLoteTotal').textContent = 'S/. ' + UTILS.formatNumber(lote.montoTotal || 0);

            // Llenar timeline de pagos
            var timelinePagos = document.getElementById('timelinePagos');
            timelinePagos.innerHTML = '';

            if (lote.pagos && lote.pagos.length > 0) {
                // Ordenar pagos por fecha, del más reciente al más antiguo
                var pagosOrdenados = lote.pagos.slice().sort(function(a, b) {
                    return b.fecha.toDate() - a.fecha.toDate();
                });

                for (var i = 0; i < pagosOrdenados.length; i++) {
                    var pago = pagosOrdenados[i];
                    var fecha = pago.fecha.toDate().toLocaleDateString('es-PE');
                    var hora = pago.fecha.toDate().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
                    var metodoTexto = UTILS.obtenerMetodoPagoTexto(pago.metodo);

                    timelinePagos.innerHTML += '<div class="timeline-container ' + (i % 2 === 0 ? 'left' : 'right') + '">' +
                        '<div class="timeline-content">' +
                        '<h6 class="mb-1">S/. ' + UTILS.formatNumber(pago.monto) + '</h6>' +
                        '<p class="mb-1"><i class="bi bi-calendar me-2"></i>' + fecha + ' - ' + hora + '</p>' +
                        '<p class="mb-1"><i class="bi bi-credit-card me-2"></i>' + metodoTexto + '</p>' +
                        (pago.comprobante ? '<p class="mb-1"><i class="bi bi-receipt me-2"></i>Comprobante: ' + pago.comprobante + '</p>' : '') +
                        (pago.observaciones ? '<p class="mb-1"><i class="bi bi-chat-left-text me-2"></i>' + pago.observaciones + '</p>' : '') +
                        '</div>' +
                        '</div>';
                }
            } else {
                timelinePagos.innerHTML = '<div class="alert alert-info">' +
                    '<i class="bi bi-info-circle me-2"></i>No hay pagos registrados para este lote.' +
                    '</div>';
            }

            // Actualizar resumen
            document.getElementById('historialTotalPagado').textContent = 'S/. ' + UTILS.formatNumber(lote.pagado || 0);
            document.getElementById('historialPendiente').textContent = 'S/. ' + UTILS.formatNumber(lote.pendiente || 0);

            var progreso = lote.montoTotal > 0 ? (lote.pagado / lote.montoTotal) * 100 : 0;
            document.getElementById('historialProgreso').style.width = progreso + '%';
            document.getElementById('historialProgresoTexto').textContent = UTILS.formatNumber(progreso) + '%';

            // Mostrar modal
            var modal = new bootstrap.Modal(DOM.modalHistorialPagos);
            modal.show();

        } catch (error) {
            console.error('Error al cargar historial de pagos:', error);
            showBootstrapAlert('Error al cargar el historial de pagos', 'danger');
        }
    },

    // Reemplazar la función renderLotesSinDataTable para evitar problemas con DataTables
    renderLotesSinDataTable: function(lotes) {
        console.log('Renderizando lotes sin DataTable:', lotes.length, 'lotes a mostrar');

        // Primero eliminar completamente cualquier tabla existente
        if (DOM.tablaLotesComercial) {
            while (DOM.tablaLotesComercial.firstChild) {
                DOM.tablaLotesComercial.removeChild(DOM.tablaLotesComercial.firstChild);
            }
        }

        // Limpiar contenedor de tarjetas
        if (DOM.cardViewLotesComercial) {
            DOM.cardViewLotesComercial.innerHTML = '';
        }

        // Crear un contenedor div para la tabla
        var contenedorTabla = document.createElement('div');
        contenedorTabla.className = 'table-responsive';
        contenedorTabla.id = 'tableContainer_' + new Date().getTime(); // ID único
        DOM.tablaLotesComercial.appendChild(contenedorTabla);

        // Crear la tabla con ID único para evitar referencias cruzadas
        var tablaID = 'lotesTable_' + new Date().getTime();
        var tabla = document.createElement('table');
        tabla.id = tablaID;
        tabla.className = 'table table-striped table-hover';
        contenedorTabla.appendChild(tabla);

        // Crear estructura de la tabla
        var thead = document.createElement('thead');
        var tbody = document.createElement('tbody');
        tabla.appendChild(thead);
        tabla.appendChild(tbody);

        // Añadir encabezados
        var tr = document.createElement('tr');
        ['Código', 'Fecha', 'Productor', 'Procedencia', 'Peso', 'Total', 'Pagado', 'Pendiente', 'Estado', 'Acciones']
        .forEach(function(texto) {
            var th = document.createElement('th');
            th.textContent = texto;
            tr.appendChild(th);
        });
        thead.appendChild(tr);

        // Si no hay lotes, mostrar mensaje
        if (lotes.length === 0) {
            console.log('No hay lotes para mostrar');
            var trEmpty = document.createElement('tr');
            var tdEmpty = document.createElement('td');
            tdEmpty.colSpan = 10;
            tdEmpty.className = 'text-center';
            tdEmpty.textContent = 'No hay lotes disponibles';
            trEmpty.appendChild(tdEmpty);
            tbody.appendChild(trEmpty);

            DOM.cardViewLotesComercial.innerHTML = '<div class="alert alert-info">No hay lotes disponibles</div>';
        } else {
            // Renderizar cada lote como fila
            lotes.forEach(function(lote) {
                // Crear fila
                var tr = document.createElement('tr');

                // Datos y formato
                var fecha = lote.fecha ? lote.fecha.toDate().toLocaleDateString('es-PE') : 'N/A';
                var estadoClase = lote.estado === 'pagado' ? 'bg-success' :
                    lote.estado === 'parcial' ? 'bg-warning' : 'bg-danger';
                var estadoTexto = lote.estado === 'pagado' ? 'Pagado' :
                    lote.estado === 'parcial' ? 'Parcial' : 'Pendiente';

                // Añadir celdas con datos
                tr.innerHTML =
                    '<td><strong>' + (lote.codigo || 'N/A') + '</strong></td>' +
                    '<td>' + fecha + '</td>' +
                    '<td>' + (lote.productor || 'N/A') + '</td>' +
                    '<td>' + (lote.procedencia || 'N/A') + '</td>' +
                    '<td>' + UTILS.formatNumber(lote.pesoNeto || 0) + ' Kg</td>' +
                    '<td>S/. ' + UTILS.formatNumber(lote.montoTotal || 0) + '</td>' +
                    '<td>S/. ' + UTILS.formatNumber(lote.pagado || 0) + '</td>' +
                    '<td>S/. ' + UTILS.formatNumber(lote.pendiente || 0) + '</td>' +
                    '<td><span class="badge ' + estadoClase + ' status-badge">' + estadoTexto + '</span></td>' +
                    '<td>' +
                    '<div class="btn-group btn-group-sm">' +
                    '<button class="btn btn-outline-success" onclick="LotesComercialManager.registrarPago(\'' + lote.id + '\')" title="Registrar Pago">' +
                    '<i class="bi bi-cash"></i>' +
                    '</button>' +
                    '<button class="btn btn-outline-info" onclick="LotesComercialManager.verHistorialPagos(\'' + lote.id + '\')" title="Ver Historial">' +
                    '<i class="bi bi-clock-history"></i>' +
                    '</button>' +
                    '</div>' +
                    '</td>';

                tbody.appendChild(tr);

                // También añadir a vista de tarjetas (código simplificado)
                DOM.cardViewLotesComercial.innerHTML += '<div class="lote-card">...</div>';
            });
        }

        console.log('Renderizado de lotes completado');
    },

    // Añadir una función para filtrar sin manipular DataTable
    filtrarSinDataTable: function(filtro) {
        console.log('Aplicando filtro sin DataTable:', filtro);
        STATE.filtroLotes = filtro;
        sessionStorage.setItem('filtroLotes', filtro);

        // Aplicar filtro
        var lotesFiltrados = [];
        switch (filtro) {
            case 'pagados':
                lotesFiltrados = STATE.lotesComerciales.filter(function(lote) {
                    return lote.estado === 'pagado';
                });
                break;
            case 'parciales':
                lotesFiltrados = STATE.lotesComerciales.filter(function(lote) {
                    return lote.estado === 'parcial';
                });
                break;
            case 'pendientes':
                lotesFiltrados = STATE.lotesComerciales.filter(function(lote) {
                    return lote.estado === 'pendiente';
                });
                break;
            default:
                lotesFiltrados = STATE.lotesComerciales;
        }

        // Actualizar UI sin manipular DataTable
        LotesComercialManager.renderLotesSinDataTable(lotesFiltrados);

        // Actualizar estado de botones
        if (DOM.btnTodos) DOM.btnTodos.classList.toggle('active', filtro === 'todos');
        if (DOM.btnPagados) DOM.btnPagados.classList.toggle('active', filtro === 'pagados');
        if (DOM.btnParciales) DOM.btnParciales.classList.toggle('active', filtro === 'parciales');
        if (DOM.btnPendientes) DOM.btnPendientes.classList.toggle('active', filtro === 'pendientes');
    }
};

// ============= GESTIÓN DE SERVICIOS =============
const ServiciosManager = {
        cargar: function() {
            DOM.loadingSpinner.style.display = 'flex';
            try {
                // Obtener todos los lotes para extraer los servicios
                const servicios = [];

                STATE.lotes.forEach(lote => {
                    if (lote.gastos && Array.isArray(lote.gastos)) {
                        lote.gastos.forEach(gasto => {
                            servicios.push({
                                id: `${lote.id}_${servicios.length}`, // ID compuesto
                                loteId: lote.id,
                                loteCodigo: lote.codigo,
                                proveedor: gasto.responsable || 'No especificado',
                                tipo: gasto.tipo || 'Otro',
                                fecha: gasto.fecha ? new Date(gasto.fecha) : null,
                                motivo: gasto.motivo || '',
                                monto: gasto.monto || 0,
                                pagado: gasto.pagado || false,
                                pagos: gasto.pagos || []
                            });
                        });
                    }
                });

                STATE.servicios = servicios;

                // Filtrar y mostrar servicios según el filtro actual
                ServiciosManager.filtrar(STATE.filtroServicios);

                // Actualizar estadísticas
                LotesComercialManager.actualizarEstadisticas();

            } catch (error) {
                console.error('Error al cargar servicios:', error);
                showBootstrapAlert('Error al cargar los datos de servicios', 'danger');
            } finally {
                DOM.loadingSpinner.style.display = 'none';
            }
        },

        filtrar: function(filtro) {
            STATE.filtroServicios = filtro;

            // Aplicar filtro
            let serviciosFiltrados = [];
            switch (filtro) {
                case 'pagados':
                    serviciosFiltrados = STATE.servicios.filter(servicio => servicio.pagado);
                    break;
                case 'pendientes':
                    serviciosFiltrados = STATE.servicios.filter(servicio => !servicio.pagado);
                    break;
                default:
                    serviciosFiltrados = STATE.servicios;
            }

            // Actualizar UI
            ServiciosManager.renderServicios(serviciosFiltrados);

            // Actualizar estado de botones
            DOM.btnTodosServicios.classList.toggle('active', filtro === 'todos');
            DOM.btnPagadosServicios.classList.toggle('active', filtro === 'pagados');
            DOM.btnPendientesServicios.classList.toggle('active', filtro === 'pendientes');
        },

        renderServicios: function(servicios) {
                // Limpiar contenedores
                DOM.tablaServicios.innerHTML = '';

                // Renderizar cada servicio
                servicios.forEach(servicio => {
                    const fecha = servicio.fecha ? servicio.fecha.toLocaleDateString('es-PE') : 'N/A';
                    const tipoTexto = servicio.tipo ? (servicio.tipo.charAt(0).toUpperCase() + servicio.tipo.slice(1)) : 'Otro';

                    DOM.tablaServicios.innerHTML += `
                <tr>
                    <td><strong>${servicio.loteCodigo || 'N/A'}</strong></td>
                    <td>${fecha}</td>
                    <td>${servicio.proveedor || 'N/A'}</td>
                    <td>${tipoTexto}</td>
                    <td>${UTILS.formatNumber(servicio.monto || 0)}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-success" onclick="ServiciosManager.registrarPago('${servicio.id}')" title="Registrar Pago">
                                <i class="bi bi-cash"></i>
                            </button>
                            <button class="btn btn-outline-info" onclick="ServiciosManager.verHistorialPagos('${servicio.id}')" title="Ver Historial">
                                <i class="bi bi-clock-history"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
                });

                // Inicializar DataTable
                setTimeout(function() {
                            if ($.fn.dataTable.isDataTable('#serviciosTable')) {
                                $('#serviciosTable').DataTable().destroy();
                            }
                            $('#serviciosTable').DataTable({
                                language: {
                                    url: 'https://cdn.datatables.net/plug-ins/1.12.1/i18n/es-ES.json'
                                }
                            });
                        },

                        registrarPago: function(servicioId) {
                            try {
                                // Buscar el servicio
                                const servicio = STATE.servicios.find(s => s.id === servicioId);
                                if (!servicio) {
                                    throw new Error('Servicio no encontrado');
                                }

                                STATE.servicioActual = servicio;

                                // Llenar el formulario
                                document.getElementById('pagoServicioId').value = servicio.id;
                                document.getElementById('pagoServicioCodigo').value = servicio.loteCodigo || '';
                                document.getElementById('pagoServicioProductor').value = servicio.proveedor || '';
                                document.getElementById('pagoServicioMonto').value = UTILS.formatNumber(servicio.monto || 0);
                                document.getElementById('pagoServicioFecha').value = UTILS.getFechaLocal().toISOString().split('T')[0];
                                document.getElementById('pagoServicioMetodo').value = '';
                                document.getElementById('pagoServicioComprobante').value = '';
                                document.getElementById('pagoServicioObservaciones').value = '';

                                // Mostrar modal
                                const modal = new bootstrap.Modal(DOM.modalPagoServicio);
                                modal.show();

                            } catch (error) {
                                console.error('Error al preparar registro de pago:', error);
                                showBootstrapAlert('Error al preparar el registro de pago', 'danger');
                            }
                        },

                        guardarPago: function() {
                            DOM.loadingSpinner.style.display = 'flex';

                            var self = this;

                            try {
                                const servicioId = document.getElementById('pagoServicioId').value;
                                const fecha = document.getElementById('pagoServicioFecha').value;
                                const metodo = document.getElementById('pagoServicioMetodo').value;
                                const monto = parseFloat(document.getElementById('pagoServicioMonto').value);
                                const comprobante = document.getElementById('pagoServicioComprobante').value;
                                const observaciones = document.getElementById('pagoServicioObservaciones').value;

                                // Validaciones
                                if (!fecha || !metodo || isNaN(monto) || monto <= 0) {
                                    throw new Error('Por favor complete todos los campos requeridos');
                                }

                                // Buscar el servicio
                                const servicio = STATE.servicios.find(function(s) { return s.id === servicioId; });
                                if (!servicio) {
                                    throw new Error('Servicio no encontrado');
                                }

                                // Crear objeto de pago
                                const pago = {
                                    fecha: firebase.firestore.Timestamp.fromDate(new Date(fecha)),
                                    metodo: metodo,
                                    monto: monto,
                                    comprobante: comprobante,
                                    observaciones: observaciones
                                };

                                // Obtener referencia al servicio
                                const servicioRef = db.collection('servicios').doc(servicioId);

                                // Actualizar en Firestore usando promesas en lugar de async/await
                                db.runTransaction(function(transaction) {
                                    return transaction.get(servicioRef).then(function(servicioDoc) {
                                        if (!servicioDoc.exists) {
                                            throw new Error('El servicio no existe');
                                        }

                                        const servicioData = servicioDoc.data();
                                        const pagos = servicioData.pagos || [];

                                        // Agregar el nuevo pago
                                        pagos.push(pago);

                                        // Actualizar el servicio
                                        transaction.update(servicioRef, {
                                            pagos: pagos,
                                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                                        });
                                    });
                                }).then(function() {
                                    // Cerrar modal
                                    const modal = bootstrap.Modal.getInstance(DOM.modalPagoServicio);
                                    modal.hide();

                                    // Recargar datos
                                    return ServiciosManager.cargar();
                                }).then(function() {
                                    showBootstrapAlert('Pago registrado correctamente', 'success');
                                }).catch(function(error) {
                                    console.error('Error al guardar pago:', error);
                                    showBootstrapAlert('Error al guardar el pago: ' + error.message, 'danger');
                                }).finally(function() {
                                    DOM.loadingSpinner.style.display = 'none';
                                });
                            } catch (error) {
                                console.error('Error al procesar formulario:', error);
                                showBootstrapAlert('Error al procesar el formulario: ' + error.message, 'danger');
                                DOM.loadingSpinner.style.display = 'none';
                            }
                        },

                        verHistorialPagos: function(servicioId) {
                            try {
                                // Buscar el servicio
                                const servicio = STATE.servicios.find(s => s.id === servicioId);
                                if (!servicio) {
                                    throw new Error('Servicio no encontrado');
                                }

                                STATE.servicioActual = servicio;

                                // Llenar información del servicio
                                document.getElementById('historialServicioCodigo').textContent = servicio.loteCodigo || '';
                                document.getElementById('historialServicioProductor').textContent = servicio.proveedor || '';
                                document.getElementById('historialServicioFecha').textContent = servicio.fecha ? servicio.fecha.toLocaleDateString('es-PE') : 'N/A';
                                document.getElementById('historialServicioMonto').textContent = `S/. ${UTILS.formatNumber(servicio.monto || 0)}`;

                                // Llenar timeline de pagos
                                const timelinePagos = document.getElementById('timelinePagosServicio');
                                timelinePagos.innerHTML = '';

                                if (servicio.pagos && servicio.pagos.length > 0) {
                                    // Ordenar pagos por fecha, del más reciente al más antiguo
                                    const pagosOrdenados = [...servicio.pagos].sort((a, b) => b.fecha.toDate() - a.fecha.toDate());

                                    pagosOrdenados.forEach((pago, index) => {
                                                const fecha = pago.fecha.toDate().toLocaleDateString('es-PE');
                                                const hora = pago.fecha.toDate().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
                                                const metodoTexto = UTILS.obtenerMetodoPagoTexto(pago.metodo);

                                                timelinePagos.innerHTML += `
                                <div class="timeline-container ${index % 2 === 0 ? 'left' : 'right'}">
                                    <div class="timeline-content">
                                        <h6 class="mb-1">S/. ${UTILS.formatNumber(pago.monto)}</h6>
                                        <p class="mb-1"><i class="bi bi-calendar me-2"></i>${fecha} - ${hora}</p>
                                        <p class="mb-1"><i class="bi bi-credit-card me-2"></i>${metodoTexto}</p>
                                        ${pago.comprobante ? `<p class="mb-1"><i class="bi bi-receipt me-2"></i>Comprobante: ${pago.comprobante}</p>` : ''}
                                        ${pago.observaciones ? `<p class="mb-1"><i class="bi bi-chat-left-text me-2"></i>${pago.observaciones}</p>` : ''}
                                    </div>
                                </div>
                            `;
                    });
                } else {
                    timelinePagos.innerHTML = `
                            <div class="alert alert-info">
                                <i class="bi bi-info-circle me-2"></i>No hay pagos registrados para este servicio.
                            </div>
                        `;
                }

                // Actualizar resumen
                document.getElementById('historialTotalPagadoServicio').textContent = `S/. ${UTILS.formatNumber(servicio.monto || 0)}`;

                // Mostrar modal
                const modal = new bootstrap.Modal(DOM.modalHistorialPagos);
                modal.show();

            } catch (error) {
                console.error('Error al cargar historial de pagos:', error);
                showBootstrapAlert('Error al cargar el historial de pagos', 'danger');
            }
        }
    };

// ============= INICIALIZACIÓN =============
function init() {
    console.log('Inicializando aplicación comercial...');

// Verificar que los elementos DOM existen
console.log('Verificando elementos DOM:', {
    loadingSpinner: !!DOM.loadingSpinner,
    tablaLotesComercial: !!DOM.tablaLotesComercial,
    cardViewLotesComercial: !!DOM.cardViewLotesComercial,
    btnTodos: !!DOM.btnTodos
});

// Desactivar comportamiento por defecto de los botones de filtro
const botonesLotes = [DOM.btnTodos, DOM.btnPagados, DOM.btnParciales, DOM.btnPendientes];
botonesLotes.forEach(btn => {
    if (btn) {
        // Eliminar event listeners anteriores
        const nuevoBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(nuevoBtn, btn);

        // Actualizar referencia en DOM
        if (btn === DOM.btnTodos) DOM.btnTodos = nuevoBtn;
        if (btn === DOM.btnPagados) DOM.btnPagados = nuevoBtn;
        if (btn === DOM.btnParciales) DOM.btnParciales = nuevoBtn;
        if (btn === DOM.btnPendientes) DOM.btnPendientes = nuevoBtn;
    }
});

// Agregar nuevos event listeners
if (DOM.btnTodos) {
    DOM.btnTodos.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        LotesComercialManager.filtrar('todos');
        return false;
    });
}

if (DOM.btnPagados) {
    DOM.btnPagados.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        LotesComercialManager.filtrar('pagados');
        return false;
    });
}

if (DOM.btnParciales) {
    DOM.btnParciales.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        LotesComercialManager.filtrar('parciales');
        return false;
    });
}

if (DOM.btnPendientes) {
    DOM.btnPendientes.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        LotesComercialManager.filtrar('pendientes');
        return false;
    });
}

// Configurar botones de guardar pagos
const btnGuardarPago = document.getElementById('btnGuardarPago');
if (btnGuardarPago) {
    btnGuardarPago.addEventListener('click', LotesComercialManager.guardarPago);
}

const btnGuardarPagoServicio = document.getElementById('btnGuardarPagoServicio');
if (btnGuardarPagoServicio) {
    btnGuardarPagoServicio.addEventListener('click', ServiciosManager.guardarPago);
}

const btnNuevoPago = document.getElementById('btnNuevoPago');
if (btnNuevoPago) {
    btnNuevoPago.addEventListener('click', () => {
        const modal = bootstrap.Modal.getInstance(DOM.modalHistorialPagos);
        modal.hide();
        setTimeout(() => {
            LotesComercialManager.registrarPago(STATE.loteActual.id);
        }, 500);
    });
}

// Eventos de conexión
window.addEventListener('online', () => UTILS.actualizarEstadoConexion(true));
window.addEventListener('offline', () => UTILS.actualizarEstadoConexion(false));

// Cargar datos iniciales
console.log('Cargando datos iniciales...');

LotesComercialManager.cargar();
ServiciosManager.cargar();

// Llamar a la función del botón "todos" al finalizar de cargar los datos
setTimeout(function() {
    LotesComercialManager.filtrar('todos');
}, 1500);
}

// Función para mostrar alertas Bootstrap
function showBootstrapAlert(message, type = 'primary', timeout = 3000) {
    // Crear contenedor fijo de alertas si no existe
    let container = document.getElementById('alertContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'alertContainer';
        container.style.position = 'fixed';
        container.style.top = '10px';
        container.style.left = '50%';
        container.style.transform = 'translateX(-50%)';
        container.style.zIndex = '1050';
        container.style.width = 'auto';
        document.body.appendChild(container);
    }
    // Crear alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.setAttribute('role', 'alert');
    alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
    container.appendChild(alert);
    // Ocultar automáticamente después del tiempo especificado
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => {
            alert.remove();
        }, 150);
    }, timeout);
}

// Iniciar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM cargado, iniciando aplicación...');
    init();
});

// También intentar iniciar inmediatamente si el DOM ya está listo
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM ya está listo, iniciando aplicación inmediatamente...');
    setTimeout(init, 1);
}