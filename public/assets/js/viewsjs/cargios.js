// ============= CONFIGURACIÓN FIREBASE =============
// Verificar si Firebase ya está inicializado
let db;
try {
    // Verificar si firebase ya está disponible y tiene apps inicializadas
    if (typeof firebase !== 'undefined' && firebase.apps && firebase.apps.length > 0) {
        console.log('Usando instancia de Firebase existente en cargios.js');
        db = firebase.firestore();
    } else {
        // Solo inicializar si no está ya inicializado
        console.log('Inicializando Firebase en cargios.js');
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
    console.error('Error al configurar Firebase en cargios.js:', error);
}

// ============= VARIABLES GLOBALES =============
const STATE = {
    costales: [],
    modoRegistro: 'simple',
    ultimoCodigo: 0,
    loteEditando: null,
    gastosEstivaje: [],
    gastosFlete: [],
    gastos: [],
    allLotes: [] // Agregar propiedad para almacenar todos los lotes
};

// ============= REFERENCIAS DOM =============
const DOM = {
    form: document.getElementById('loteForm'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    connectionStatus: document.getElementById('connectionStatus'),
    registroSimple: document.getElementById('registroSimple'),
    registroDetallado: document.getElementById('registroDetallado'),
    btnRegistroSimple: document.getElementById('btnRegistroSimple'),
    btnRegistroDetallado: document.getElementById('btnRegistroDetallado'),
    tablaCostales: document.getElementById('tablaCostales'),
    totalPesoCostales: document.getElementById('totalPesoCostales'),
    modalNuevoLote: document.getElementById('modalNuevoLote'),
    modalHistorico: document.getElementById('modalHistorico'),
    modalDetallesCostales: document.getElementById('modalDetallesCostales')
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
        badge.className = `badge bg-${online ? 'success' : 'danger'}`;
        badge.textContent = online ? 'Online' : 'Offline';
    }
};

// Nueva función para alternar readonly y cambiar estilo de inputs de totales
const updateEditableFields = () => {
    //console.log('[updateEditableFields] Actualizando campos, modoRegistro:', STATE.modoRegistro);
    const totalCostalesField = document.getElementById('totalCostales');
    const pesoTotalField = document.getElementById('pesoTotal');
    if (!totalCostalesField || !pesoTotalField) return;
    if (STATE.modoRegistro === 'simple') {
        totalCostalesField.removeAttribute('readonly');
        pesoTotalField.removeAttribute('readonly');
        totalCostalesField.classList.remove('bg-light');
        pesoTotalField.classList.remove('bg-light');
        totalCostalesField.classList.add('bg-white');
        pesoTotalField.classList.add('bg-white');
    } else {
        totalCostalesField.setAttribute('readonly', 'readonly');
        pesoTotalField.setAttribute('readonly', 'readonly');
        totalCostalesField.classList.remove('bg-white');
        pesoTotalField.classList.remove('bg-white');
        totalCostalesField.classList.add('bg-light');
        pesoTotalField.classList.add('bg-light');
    }
};

// Nueva función para mostrar aviso interactivo de edición manual
const manualEditWarning = async(field) => {
    if (STATE.costales.length > 0) {
        const confirmed = await confirmBootstrap("Si cambias el total y el peso directamente, se quitarán los detalles de los sacos. ¿Desea continuar?");
        if (confirmed) {
            STATE.costales = [];
            CostalesManager.actualizarTabla();
        } else {
            field.blur();
        }
    }
};

// Nueva función para actualizar el estado del collapse headingPeso
const updateHeadingPesoCollapse = () => {
    const headingPeso = document.getElementById('headingPeso');
    if (!headingPeso) return;
    // Se abre si es nuevo o si el modo es detallado; se cierra si se está editando un registro simple.
    if (!STATE.loteEditando || STATE.modoRegistro === 'detallado') {
        headingPeso.classList.add('show');
    } else {
        headingPeso.classList.remove('show');
    }
};

// Modificación de showBootstrapAlert:
const showBootstrapAlert = (message, type = 'primary', timeout = 3000) => {
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
};

// Nueva función para confirmar usando modal de Bootstrap
const confirmBootstrap = (message) => {
    return new Promise((resolve) => {
        const modalHtml = `
          <div class="modal fade" id="confirmModal" tabindex="-1" aria-labelledby="confirmModalLabel" aria-hidden="true">
              <div class="modal-dialog modal-dialog-centered">
                  <div class="modal-content">
                      <div class="modal-header">
                          <h5 class="modal-title" id="confirmModalLabel">Confirmación</h5>
                          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                      </div>
                      <div class="modal-body">
                          ${message}
                      </div>
                      <div class="modal-footer">
                          <button type="button" class="btn btn-secondary" id="confirmCancel">Cancelar</button>
                          <button type="button" class="btn btn-primary" id="confirmOk">Aceptar</button>
                      </div>
                  </div>
              </div>
          </div>`;
        const container = document.createElement('div');
        container.innerHTML = modalHtml;
        document.body.appendChild(container);
        const modalElement = container.querySelector('#confirmModal');
        // Deshabilitar el cierre con el teclado en el modal confirmModal:
        const bsModal = new bootstrap.Modal(modalElement, { keyboard: false });
        bsModal.show();

        // Evitar que las teclas se propaguen al modal de fondo
        modalElement.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                container.querySelector('#confirmOk').click();
            }
        });

        modalElement.addEventListener('hidden.bs.modal', () => {
            container.remove();
        });
        container.querySelector('#confirmOk').addEventListener('click', () => {
            resolve(true);
            bsModal.hide();
        });
        container.querySelector('#confirmCancel').addEventListener('click', () => {
            resolve(false);
            bsModal.hide();
        });
    });
};

// ============= GESTIÓN DE COSTALES =============
const CostalesManager = {
        agregar: (peso) => {
            if (!peso) return;
            const input = document.getElementById('pesoCostal');
            STATE.costales.push(peso);
            CostalesManager.actualizarTabla();
            input.value = '';
            input.focus();
            CostalesManager.actualizarTotales(); // Se llama a la nueva función
            recalcularPesoNeto(); // Llamada para recalcular el peso neto tras modificar el peso bruto
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        },

        eliminar: async(index) => {
            const confirmed = await confirmBootstrap(`¿Está seguro de eliminar el costal #${index + 1}? Esta acción no se puede deshacer.`);
            if (confirmed) {
                STATE.costales.splice(index, 1);
                CostalesManager.actualizarTabla();
                CostalesManager.actualizarTotales();
            }
        },

        actualizarTabla: () => {
                // Agrupar costales en grupos de 10
                let html = '';
                const grupos = [];
                for (let i = 0; i < STATE.costales.length; i += 10) {
                    const grupo = STATE.costales.slice(i, i + 10);
                    const pesoGrupo = grupo.reduce((sum, peso) => sum + peso, 0);
                    grupos.push({
                        inicio: i + 1,
                        fin: Math.min(i + 10, STATE.costales.length),
                        pesos: grupo,
                        total: pesoGrupo
                    });
                }

                // Generar HTML para cada grupo
                html = grupos.map(grupo => `
            <tr class="grupo-costales">
                <td colspan="3">
                    <div class="mb-2">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="badge bg-primary">
                                Grupo ${grupo.inicio}-${grupo.fin}
                            </span>
                            <span class="badge bg-success">
                                ${UTILS.formatNumber(grupo.total)} Kg
                            </span>
                        </div>
                        <div class="row g-1">
                            ${grupo.pesos.map((peso, idx) => `
                                <div class="col-6">
                                    <div class="d-flex justify-content-between align-items-center border rounded p-2 bg-light">
                                        <span class="badge bg-secondary me-2">${String(grupo.inicio + idx).padStart(2, '0')}</span>
                                        <span>${peso.toFixed(2)} Kg</span>
                                        <button type="button" class="btn btn-outline-danger btn-sm py-0 ms-auto" 
                                            onclick="CostalesManager.eliminar(${grupo.inicio + idx - 1})"
                                            title="Eliminar costal">
                                            ×
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </td>
            </tr>
        `).join('');

        DOM.tablaCostales.innerHTML = html;

        const totalPeso = STATE.costales.reduce((sum, peso) => sum + peso, 0);
        DOM.totalPesoCostales.textContent = `${UTILS.formatNumber(totalPeso)} Kg`;

        // Actualizar campos del registro simple
        document.getElementById('totalCostales').value = STATE.costales.length;
        document.getElementById('pesoTotal').value = totalPeso.toFixed(2);

        //console.log('[actualizarTabla] Actualizando tabla de costales, STATE.costales:', STATE.costales);
    },

    // Nueva función para actualizar totales
    actualizarTotales: () => {
        const totalPeso = STATE.costales.reduce((sum, peso) => sum + peso, 0);
        const totalCostalesField = document.getElementById('totalCostales');
        const pesoTotalField = document.getElementById('pesoTotal');
        if (totalCostalesField) totalCostalesField.value = STATE.costales.length;
        if (pesoTotalField) pesoTotalField.value = totalPeso.toFixed(2);
    }

};

// ============= GESTIÓN DE LOTES =============
const LotesManager = {
    ordenActual: {
        campo: 'codigo',
        ascendente: false
    },
    filtroTexto: '',

    // Nueva función para renderizar lotes en ambas vistas
    renderLotes: (lotes) => {
        const tablaLotes = document.getElementById('tablaLotes');
        const cardViewLotes = document.getElementById('cardViewLotes');
        tablaLotes.innerHTML = '';
        cardViewLotes.innerHTML = '';
        lotes.forEach(lote => {
            const fecha = lote.fecha.toDate().toLocaleDateString('es-PE');
            const variedad = lote.variedad.charAt(0).toUpperCase() + lote.variedad.slice(1);
            const ultimoRegistro = lote.historico && lote.historico.length > 0
                ? lote.historico[lote.historico.length - 1]
                : { totalCostales: lote.totalCostales, pesoTotal: lote.pesoTotal };
            const total = ultimoRegistro.pesoTotal * lote.costoKg;

            // Vista de tabla
            tablaLotes.innerHTML += `
                <tr>
                    <td><strong>${lote.codigo}</strong></td>
                    <td>${fecha}</td>
                    <td>${lote.productor}</td>
                    <td class="d-none d-md-table-cell">${lote.procedencia}</td>
                    <td class="d-none d-md-table-cell">${variedad}</td>
                    <td>S/. ${UTILS.formatNumber(lote.costoKg)}</td>
                    <td>${UTILS.formatNumber(ultimoRegistro.totalCostales)}</td>
                    <td>${UTILS.formatNumber(ultimoRegistro.pesoTotal)} Kg</td>
                    <td>S/. ${UTILS.formatNumber(total)}</td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="LotesManager.editar('${lote.id}')" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-secondary" onclick="LotesManager.verDetalles('${lote.id}')" title="Detalles">
                                <i class="bi bi-info-circle"></i>
                            </button>
                            <button class="btn btn-outline-info" onclick="LotesManager.verHistorico('${lote.id}')" title="Histórico">
                                <i class="bi bi-clock-history"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="LotesManager.eliminar('${lote.id}')" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            // Vista de tarjetas para móviles
            cardViewLotes.innerHTML += `
                <div class="lote-card">
                    <div class="lote-card-header">
                        <div class="lote-header-info">
                            <strong class="h6 mb-0">${lote.codigo}</strong>
                            <small class="lote-variedad">${variedad}</small>
                            <small class="lote-variedad">${lote.procedencia}</small>
                        </div>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary btn-sm" onclick="LotesManager.editar('${lote.id}')" title="Editar">
                                <i class="bi bi-pencil"></i>
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="LotesManager.verDetalles('${lote.id}')" title="Detalles">
                                <i class="bi bi-info-circle"></i>
                            </button>
                            <button class="btn btn-outline-info btn-sm" onclick="LotesManager.verHistorico('${lote.id}')" title="Histórico">
                                <i class="bi bi-clock-history"></i>
                            </button>
                            <button class="btn btn-outline-danger btn-sm" onclick="LotesManager.eliminar('${lote.id}')" title="Eliminar">
                                <i class="bi bi-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="lote-info">
                        <div class="lote-info-item">
                            <span class="lote-info-label">Fecha</span>
                            <span class="lote-info-value">${fecha}</span>
                        </div>
                        <div class="lote-info-item">
                            <span class="lote-info-label">Productor</span>
                            <span class="lote-info-value">${lote.productor}</span>
                        </div>
                        <div class="lote-info-item">
                            <span class="lote-info-label">Costales</span>
                            <span class="lote-info-value">${UTILS.formatNumber(ultimoRegistro.totalCostales)}</span>
                        </div>
                        <div class="lote-info-item">
                            <span class="lote-info-label">Peso Total</span>
                            <span class="lote-info-value">${UTILS.formatNumber(ultimoRegistro.pesoTotal)} Kg</span>
                        </div>
                        <div class="lote-info-item">
                            <span class="lote-info-label">Costo/Kg</span>
                            <span class="lote-info-value">S/. ${UTILS.formatNumber(lote.costoKg)}</span>
                        </div>
                        <div class="lote-info-item">
                            <span class="lote-info-label">Total</span>
                            <span class="lote-info-value text-primary">S/. ${UTILS.formatNumber(total)}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        // ...existing DataTable initialization...
        setTimeout(() => {
            if ($.fn.dataTable.isDataTable('#lotesTable')) {
                $('#lotesTable').DataTable().destroy();
            }
            $('#lotesTable').DataTable({
                language: {
                    url: 'https://cdn.datatables.net/plug-ins/1.12.1/i18n/es-ES.json'
                },
                responsive: true,
                scrollY: function() {
                    // Calcula dinámicamente altura basada en el viewport disponible
                    const windowHeight = window.innerHeight;
                    if (windowHeight < 600) {
                        return 'calc(100vh - 350px)';
                    } else if (windowHeight < 800) {
                        return 'calc(100vh - 320px)';
                    } else if (windowHeight < 1000) {
                        return 'calc(100vh - 300px)';
                    } else {
                        return 'calc(100vh - 280px)';
                    }
                }(),
                scrollCollapse: true,
                autoWidth: false, 
                columnDefs: [
                    { width: '8%', targets: 0 },  // Código
                    { width: '10%', targets: 1 }, // Fecha
                    { width: '20%', targets: 2 }, // Productor
                    { width: '10%', targets: 3 }, // Procedencia
                    { width: '8%', targets: 4 },  // Variedad
                    { width: '8%', targets: 5 },  // Costo/Kg
                    { width: '8%', targets: 6 },  // Costales
                    { width: '8%', targets: 7 },  // Peso
                    { width: '10%', targets: 8 }, // Total
                    { width: '10%', targets: 9 }  // Acciones
                ],
                pageLength: 10,
                lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
                dom: '<"top"if>rt<"bottom"lp><"clear">',
                initComplete: function() {
                    // Ajustar tamaño después de cargar
                    setTimeout(function() {
                        $(window).trigger('resize');
                    }, 200);
                }
            });
        }, 100);

        // Actualizar dashboard con estadísticas
        LotesManager.actualizarDashboard(STATE.allLotes);
    },

    // Nueva función para actualizar las estadísticas del dashboard
    actualizarDashboard: (lotes) => {
        console.log('[actualizarDashboard] Generando estadísticas con', lotes.length, 'lotes');
        
        // 1. Estadísticas básicas: total de lotes y peso
        const totalLotes = lotes.length;
        let totalPeso = 0;
        let totalValor = 0;
        let totalPendiente = 0;
        
        // Contadores para variedades de quinua
        const variedades = {
            blanca: { peso: 0, color: 'rgba(240, 240, 240, 0.8)' },
            roja: { peso: 0, color: 'rgba(220, 53, 69, 0.8)' },
            negra: { peso: 0, color: 'rgba(52, 58, 64, 0.8)' },
            amarilla: { peso: 0, color: 'rgba(255, 193, 7, 0.8)' },
            otra: { peso: 0, color: 'rgba(108, 117, 125, 0.8)' }
        };
        
        // Contadores para procedencias, almacenes y productores
        const procedencias = {};
        const almacenes = {
            'agricultor': { peso: 0, color: 'rgba(40, 167, 69, 0.8)', nombre: 'Almacén del Agricultor' },
            'almacen1': { peso: 0, color: 'rgba(0, 123, 255, 0.8)', nombre: 'Almacén 1' },
            'almacen2': { peso: 0, color: 'rgba(255, 193, 7, 0.8)', nombre: 'Almacén 2' },
            'almacen3': { peso: 0, color: 'rgba(220, 53, 69, 0.8)', nombre: 'Almacén 3' },
            'otro': { peso: 0, color: 'rgba(108, 117, 125, 0.8)', nombre: 'Otro' }
        };
        const productores = {};
        
        // Procesar cada lote para obtener las estadísticas
        lotes.forEach(lote => {
            const peso = lote.pesoNeto || 0;
            const costoKg = lote.costoKg || 0;
            const valor = peso * costoKg;
            const pendiente = lote.montoPendiente || 0;
            
            totalPeso += peso;
            totalValor += valor;
            totalPendiente += pendiente;
            
            // Categorizar por variedad
            const variedad = lote.variedad ? lote.variedad.toLowerCase() : 'otra';
            if (variedades[variedad]) {
                variedades[variedad].peso += peso;
            } else {
                variedades.otra.peso += peso;
            }
            
            // Categorizar por procedencia
            const procedencia = lote.procedencia || 'No especificada';
            if (!procedencias[procedencia]) {
                procedencias[procedencia] = { peso: 0, lotes: 0 };
            }
            procedencias[procedencia].peso += peso;
            procedencias[procedencia].lotes += 1;
            
            // Categorizar por almacén
            const almacen = lote.ubicacionAlmacen || 'otro';
            if (almacenes[almacen]) {
                almacenes[almacen].peso += peso;
            } else {
                almacenes.otro.peso += peso;
            }
            
            // Categorizar por productor
            const productor = lote.productor || 'No especificado';
            if (!productores[productor]) {
                productores[productor] = { peso: 0, lotes: 0, valor: 0 };
            }
            productores[productor].peso += peso;
            productores[productor].lotes += 1;
            productores[productor].valor += valor;
        });
        
        // Calcular precio promedio por kilo
        const precioPromedio = totalPeso > 0 ? totalValor / totalPeso : 0;
        
        // Calcular porcentaje pendiente
        const porcentajePendiente = totalValor > 0 ? (totalPendiente / totalValor) * 100 : 0;
        
        // Actualizar los elementos del DOM
        document.getElementById('totalLotes').textContent = totalLotes;
        document.getElementById('totalPesoLotes').textContent = UTILS.formatNumber(totalPeso) + ' Kg';
        document.getElementById('totalValorLotes').textContent = 'S/. ' + UTILS.formatNumber(totalValor);
        document.getElementById('precioPromedio').textContent = 'S/. ' + UTILS.formatNumber(precioPromedio) + ' / Kg';
        document.getElementById('totalPendientePago').textContent = 'S/. ' + UTILS.formatNumber(totalPendiente);
        document.getElementById('porcentajePendiente').textContent = UTILS.formatNumber(porcentajePendiente) + '% del total';
        document.getElementById('progressPendiente').style.width = porcentajePendiente + '%';
        
        // Generar gráfico de distribución de quinua
        LotesManager.generarGraficoQuinua(variedades);
        
        // Generar gráfico de distribución por almacenes
        LotesManager.generarGraficoAlmacenes(almacenes);
        
        // Mostrar top procedencias
        LotesManager.mostrarTopProcedencias(procedencias);
        
        // Mostrar top productores
        LotesManager.mostrarTopProductores(productores);
    },
    
    // Función para generar el gráfico de distribución de quinua
    generarGraficoQuinua: (variedades) => {
        const ctx = document.getElementById('distribucionQuinuaChart')?.getContext('2d');
        if (!ctx) {
            console.error('Contexto del gráfico no encontrado');
            return;
        }
        
        // Eliminar cualquier instancia anterior del gráfico
        if (window.distribucionQuinuaChart && typeof window.distribucionQuinuaChart.destroy === 'function') {
            window.distribucionQuinuaChart.destroy();
        }
        
        // Preparar datos para el gráfico
        const labels = [];
        const data = [];
        const backgroundColor = [];
        const borderColor = [];
        
        Object.entries(variedades).forEach(([nombre, info]) => {
            if (info.peso > 0) {
                labels.push(nombre.charAt(0).toUpperCase() + nombre.slice(1));
                data.push(info.peso);
                backgroundColor.push(info.color);
                borderColor.push(info.color.replace('0.8', '1'));
            }
        });
        
        // Crear el gráfico
        window.distribucionQuinuaChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColor,
                    borderColor: borderColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 0,
                        bottom: 0
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 10
                            },
                            boxWidth: 12,
                            padding: 8
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                                return `${label}: ${UTILS.formatNumber(value)} Kg (${percentage})`;
                            }
                        }
                    }
                }
            }
        });
    },
    
    // Función para generar el gráfico de distribución por almacenes
    generarGraficoAlmacenes: (almacenes) => {
        const ctx = document.getElementById('almacenesChart')?.getContext('2d');
        if (!ctx) {
            console.error('Contexto del gráfico de almacenes no encontrado');
            return;
        }
        
        // Eliminar cualquier instancia anterior del gráfico
        if (window.almacenesChart && typeof window.almacenesChart.destroy === 'function') {
            window.almacenesChart.destroy();
        }
        
        // Preparar datos para el gráfico
        const labels = [];
        const data = [];
        const backgroundColor = [];
        const borderColor = [];
        
        Object.entries(almacenes).forEach(([id, info]) => {
            if (info.peso > 0) {
                labels.push(info.nombre);
                data.push(info.peso);
                backgroundColor.push(info.color);
                borderColor.push(info.color.replace('0.8', '1'));
            }
        });
        
        // Crear el gráfico
        window.almacenesChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColor,
                    borderColor: borderColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                layout: {
                    padding: {
                        left: 10,
                        right: 10,
                        top: 0,
                        bottom: 0
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 10
                            },
                            boxWidth: 12,
                            padding: 8
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((acc, val) => acc + val, 0);
                                const percentage = total > 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
                                return `${label}: ${UTILS.formatNumber(value)} Kg (${percentage})`;
                            }
                        }
                    }
                }
            }
        });
    },
    
    // Función para mostrar las principales procedencias
    mostrarTopProcedencias: (procedencias) => {
        const container = document.getElementById('top-procedencias');
        if (!container) {
            console.error('Contenedor de top procedencias no encontrado');
            return;
        }
        
        // Convertir a array y ordenar por peso
        const procedenciasArray = Object.entries(procedencias).map(([nombre, datos]) => ({
            nombre,
            ...datos
        }));
        
        procedenciasArray.sort((a, b) => b.peso - a.peso);
        
        // Mostrar las 5 principales procedencias
        const top5 = procedenciasArray.slice(0, 5);
        
        let html = '<ul class="list-group list-group-flush">';
        top5.forEach(proc => {
            html += `
                <li class="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                    <div>
                        <span class="fw-medium">${proc.nombre}</span>
                        <small class="d-block text-muted">${proc.lotes} lotes</small>
                    </div>
                    <span class="badge bg-primary rounded-pill">${UTILS.formatNumber(proc.peso)} Kg</span>
                </li>
            `;
        });
        html += '</ul>';
        
        container.innerHTML = html;
    },
    
    // Función para mostrar los principales productores
    mostrarTopProductores: (productores) => {
        const container = document.getElementById('top-productores');
        if (!container) {
            console.error('Contenedor de top productores no encontrado');
            return;
        }
        
        // Convertir a array y ordenar por peso
        const productoresArray = Object.entries(productores).map(([nombre, datos]) => ({
            nombre,
            ...datos
        }));
        
        productoresArray.sort((a, b) => b.peso - a.peso);
        
        // Mostrar los 5 principales productores
        const top5 = productoresArray.slice(0, 5);
        
        let html = '<ul class="list-group list-group-flush">';
        top5.forEach(prod => {
            html += `
                <li class="list-group-item px-0 py-2 d-flex justify-content-between align-items-center">
                    <div>
                        <span class="fw-medium">${prod.nombre}</span>
                        <small class="d-block text-muted">${prod.lotes} lotes - S/. ${UTILS.formatNumber(prod.valor)}</small>
                    </div>
                    <span class="badge bg-success rounded-pill">${UTILS.formatNumber(prod.peso)} Kg</span>
                </li>
            `;
        });
        html += '</ul>';
        
        container.innerHTML = html;
    },

    // Se elimina el filtrado en la consulta a Firebase
    cargar: async () => {
        try {
            let query = db.collection('lotes')
                         .where("estadodoc", "==", "activo");
            // Aplicar ordenamiento según ordenActual
            if (LotesManager.ordenActual.campo === 'codigo') {
                query = query.orderBy('codigo', LotesManager.ordenActual.ascendente ? 'asc' : 'desc');
            } else if (LotesManager.ordenActual.campo === 'fecha') {
                query = query.orderBy('fecha', LotesManager.ordenActual.ascendente ? 'asc' : 'desc');
            } else if (LotesManager.ordenActual.campo === 'productor') {
                query = query.orderBy('productor', 'asc');
            }

            const snapshot = await query.get();
            const lotes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            STATE.allLotes = lotes;
            LotesManager.renderLotes(lotes);
        } catch (error) {
            console.error('Error al cargar lotes:', error);
        }
    },

    // Modificar la función buscar para usar filtrado en el DOM
    buscar: (texto) => {
        LotesManager.filtroTexto = texto.toLowerCase();
        const filtered = STATE.allLotes.filter(lote => {
            const searchStr = `${lote.codigo} ${lote.productor} ${lote.procedencia} ${lote.variedad} ${lote.fecha.toDate().toLocaleDateString('es-PE')} ${lote.costoKg} ${lote.totalCostales} ${lote.pesoTotal}`.toLowerCase();
            return searchStr.includes(LotesManager.filtroTexto);
        });
        LotesManager.renderLotes(filtered);
    },

    editar: async (docId) => {
        try {
            const doc = await db.collection('lotes').doc(docId).get();
            if (doc.exists) {
                STATE.loteEditando = { id: docId, ...doc.data() };
                LotesManager.cargarDatosLote(STATE.loteEditando);
                const modal = new bootstrap.Modal(DOM.modalNuevoLote);
                modal.show();
            }
        } catch (error) {
            console.error('Error al cargar lote:', error);
            showBootstrapAlert('Error al cargar el lote para edición', 'danger');
        }
    },

    verDetalles: async (docId) => {
        try {
            const doc = await db.collection('lotes').doc(docId).get();
            if (doc.exists) {
                const lote = doc.data();
                
                // Formatear fecha
                const fechaFormateada = lote.fecha.toDate().toLocaleDateString('es-PE');
                
                // Información General
                document.getElementById('detalleCodigo').textContent = lote.codigo || '';
                document.getElementById('detalleNCompra').textContent = lote.NCompra || 'N/A';
                document.getElementById('detalleFecha').textContent = fechaFormateada;
                document.getElementById('detalleUbicacion').textContent = lote.ubicacionAlmacen || 'No especificada';
                document.getElementById('detalleProductor').textContent = lote.productor || '';
                document.getElementById('detalleProcedencia').textContent = lote.procedencia || '';
                document.getElementById('detalleResponsable').textContent = lote.responsable || 'No especificado';
                
                // Datos del Producto
                const variedad = lote.variedad ? (lote.variedad.charAt(0).toUpperCase() + lote.variedad.slice(1)) : '';
                document.getElementById('detalleVariedad').textContent = variedad;
                document.getElementById('detalleHumedad').textContent = lote.humedad ? `${lote.humedad}%` : 'No especificada';
                document.getElementById('detalleTotalCostales').textContent = UTILS.formatNumber(lote.totalCostales || 0);
                document.getElementById('detallePesoTotal').textContent = `${UTILS.formatNumber(lote.pesoTotal || 0)} Kg`;
                document.getElementById('detalleDescuento').textContent = `${UTILS.formatNumber(lote.descuento || 0)} Kg`;
                document.getElementById('detallePesoNeto').textContent = `${UTILS.formatNumber(lote.pesoNeto || 0)} Kg`;
                
                // Información Financiera
                document.getElementById('detalleCostoKg').textContent = `S/. ${UTILS.formatNumber(lote.costoKg || 0)}`;
                
                // Mapear condición de ingreso a texto más descriptivo
                let condicionTexto = 'No especificada';
                if (lote.condicionIngreso === 'pagado') condicionTexto = 'Pagado';
                else if (lote.condicionIngreso === 'adelanto') condicionTexto = 'Con adelanto';
                else if (lote.condicionIngreso === 'credito') condicionTexto = 'A crédito';
                
                document.getElementById('detalleCondicionIngreso').textContent = condicionTexto;
                document.getElementById('detalleCostoLote').textContent = `S/. ${UTILS.formatNumber(lote.costoLote || 0)}`;
                document.getElementById('detalleGastosT').textContent = `S/. ${UTILS.formatNumber(lote.GastosT || 0)}`;
                document.getElementById('detalleMontoAdelanto').textContent = `S/. ${UTILS.formatNumber(lote.montoAdelanto || 0)}`;
                document.getElementById('detalleMontoPendiente').textContent = `S/. ${UTILS.formatNumber(lote.montoPendiente || 0)}`;
                document.getElementById('detalleCostoT').textContent = `S/. ${UTILS.formatNumber(lote.CostoT || 0)}`;
                document.getElementById('detalleCostoRealkg').textContent = `S/. ${UTILS.formatNumber(lote.CostoRealkg || 0)}`;
                
                // Observaciones
                document.getElementById('detalleObservacion').textContent = lote.observacion || 'Sin observaciones';
                
                // Mostrar detalles de costales si existen
                const detalleCostalesContainer = document.getElementById('detalleCostalesContainer');
                const detalleListaCostales = document.getElementById('detalleListaCostales');
                const detalleTotalPesoCostales = document.getElementById('detalleTotalPesoCostales');

                if (lote.costales && lote.costales.length > 0) {
                    let totalPeso = 0;
                    detalleListaCostales.innerHTML = lote.costales.map((peso, index) => {
                        totalPeso += parseFloat(peso);
                        return `
                            <tr>
                                <td class="text-center">${index + 1}</td>
                                <td>${UTILS.formatNumber(peso)} Kg</td>
                            </tr>
                        `;
                    }).join('');
                    
                    detalleTotalPesoCostales.textContent = `Total: ${UTILS.formatNumber(totalPeso)} Kg`;
                    detalleCostalesContainer.style.display = 'block';
                } else {
                    detalleCostalesContainer.style.display = 'none';
                }
                
                // Mostrar detalles de gastos si existen
                const detalleGastosContainer = document.getElementById('detalleGastosContainer');
                const detalleListaGastos = document.getElementById('detalleListaGastos');
                const detalleTotalGastos = document.getElementById('detalleTotalGastos');
                
                if (lote.gastos && lote.gastos.length > 0) {
                    let totalGastos = 0;
                    detalleListaGastos.innerHTML = lote.gastos.map(gasto => {
                        totalGastos += parseFloat(gasto.monto);
                        return `
                            <tr>
                                <td>${gasto.tipo.charAt(0).toUpperCase() + gasto.tipo.slice(1)}</td>
                                <td>${gasto.fecha || 'N/A'}</td>
                                <td>${gasto.responsable || 'N/A'}</td>
                                <td>${gasto.motivo || 'N/A'}</td>
                                <td>S/. ${UTILS.formatNumber(gasto.monto)}</td>
                            </tr>
                        `;
                    }).join('');
                    
                    detalleTotalGastos.textContent = `Total: S/. ${UTILS.formatNumber(totalGastos)}`;
                    detalleGastosContainer.style.display = 'block';
                } else {
                    detalleGastosContainer.style.display = 'none';
                }

                // Mostrar el modal
                const modal = new bootstrap.Modal(document.getElementById('modalDetalleLote'));
                modal.show();
            }
        } catch (error) {
            console.error('Error al cargar detalles del lote:', error);
            showBootstrapAlert('Error al cargar los detalles del lote', 'danger');
        }
    },

    verHistorico: async (docId) => {
        let indexsacos = 0

        try {
            const doc = await db.collection('lotes').doc(docId).get();
            if (doc.exists) {
                const lote = doc.data();
                indexsacos = lote.historico.length

                // Actualizar información del lote
                const historicoLoteCodigo = document.getElementById('historicoLoteCodigo');
                const historicoLoteProductor = document.getElementById('historicoLoteProductor');
                const historicoLoteFecha = document.getElementById('historicoLoteFecha');
                const historicoLoteProcedencia = document.getElementById('historicoLoteProcedencia');
                const tablaHistorico = document.getElementById('tablaHistorico');

                if (!historicoLoteCodigo || !historicoLoteProductor || !historicoLoteFecha ||
                    !historicoLoteProcedencia || !tablaHistorico) {
                    console.error('No se encontraron elementos del modal');
                    return;
                }

                historicoLoteCodigo.textContent = lote.codigo || '';
                historicoLoteProductor.textContent = lote.productor || '';
                historicoLoteFecha.textContent = lote.fecha ? lote.fecha.toDate().toLocaleDateString('es-PE') : '';
                historicoLoteProcedencia.textContent = lote.procedencia || '';

                // Llenar tabla de histórico
                tablaHistorico.innerHTML = '';


                if (lote.historico && Array.isArray(lote.historico) && lote.historico.length > 0) {
                    // Ordenar histórico por fecha, del más reciente al más antiguo
                    const historico = [...lote.historico].sort((a, b) => b.fecha.toDate() - a.fecha.toDate());


                    historico.forEach((registro) => {
                        const fecha = registro.fecha.toDate().toLocaleString('es-PE');
                        const tipo = registro.tipo === 'detallado' ? 'Detallado' : 'Simple';
                        const tipoClase = registro.tipo === 'detallado' ? 'primary' : 'success';

                        indexsacos = indexsacos - 1

                        // Solo mostrar el botón si es detallado y tiene costales
                        let botonDetalles = '';
                        if (registro.tipo === 'detallado' && Array.isArray(registro.costales) && registro.costales.length > 0) {
                            botonDetalles = `
                                <button class="btn btn-outline-secondary btn-sm" 
                                        onclick="LotesManager.verDetallesCostales(${indexsacos}, '${docId}')"
                                        title="Ver detalle de costales">
                                    <i class="bi bi-list-ul"></i>
                                </button>`;
                        }

                        // ver index en consola
                        tablaHistorico.innerHTML += `
                            <tr>
                                <td>${fecha}</td>
                                <td><span class="badge bg-${tipoClase}">${tipo}</span></td>
                                <td>${UTILS.formatNumber(registro.totalCostales || 0)}</td>
                                <td>${UTILS.formatNumber(registro.pesoTotal || 0)} Kg</td>
                                <td>${botonDetalles}</td>
                            </tr>
                        `;
                    });
                } else {
                    // Si no hay histórico, mostrar el registro original
                    const fecha = lote.createdAt ? lote.createdAt.toDate().toLocaleString('es-PE') : 'No disponible';
                    const tipo = lote.costales && Array.isArray(lote.costales) && lote.costales.length > 0 ? 'Detallado' : 'Simple';
                    const tipoClase = tipo === 'Detallado' ? 'primary' : 'success';

                    let botonDetalles = '';
                    if (tipo === 'Detallado' && Array.isArray(lote.costales) && lote.costales.length > 0) {
                        botonDetalles = `
                            <button class="btn btn-outline-secondary btn-sm" 
                                    onclick="LotesManager.verDetallesCostales(-1, '${docId}')"
                                    title="Ver detalle de costales">
                                <i class="bi bi-list-ul"></i>
                            </button>`;
                    }

                    tablaHistorico.innerHTML = `
                        <tr>
                            <td>${fecha}</td>
                            <td><span class="badge bg-${tipoClase}">${tipo}</span></td>
                            <td>${UTILS.formatNumber(lote.totalCostales || 0)}</td>
                            <td>${UTILS.formatNumber(lote.pesoTotal || 0)} Kg</td>
                            <td>${botonDetalles}</td>
                        </tr>
                    `;
                }

                // Mostrar modal
                const modal = new bootstrap.Modal(DOM.modalHistorico);
                modal.show();
            }

        } catch (error) {
            console.error('Error al cargar histórico:', error);
            showBootstrapAlert('Error al cargar el histórico del lote', 'danger');
        }
    },

    verDetallesCostales: async (index, docId) => {
        try {
            const doc = await db.collection('lotes').doc(docId).get();
            if (doc.exists) {
                const lote = doc.data();
                let costales = [];

                // Obtener la lista de costales según el índice
                if (index >= 0 && lote.historico && Array.isArray(lote.historico)) {
                    const registro = lote.historico[index];
                    if (registro && Array.isArray(registro.costales)) {
                        costales = registro.costales;
                    }
                } else if (Array.isArray(lote.costales)) {
                    costales = lote.costales;
                }

                const tablaDetalles = document.getElementById('tablaDetallesCostales');
                const totalDetallesCostales = document.getElementById('totalDetallesCostales');

                if (!tablaDetalles || !totalDetallesCostales) {
                    console.error('No se encontraron elementos del modal de detalles');
                    return;
                }

                tablaDetalles.innerHTML = '';

                if (costales.length > 0) {
                    costales.forEach((peso, i) => {
                        tablaDetalles.innerHTML += `
                            <tr>
                                <td>${i + 1}</td>
                                <td>${UTILS.formatNumber(peso)} Kg</td>
                            </tr>
                        `;
                    });

                    const total = costales.reduce((sum, peso) => sum + (typeof peso === 'number' ? peso : 0), 0);
                    totalDetallesCostales.textContent = `${UTILS.formatNumber(total)} Kg`;
                } else {
                    tablaDetalles.innerHTML = '<tr><td colspan="2" class="text-center">No hay detalles disponibles</td></tr>';
                    totalDetallesCostales.textContent = '0 Kg';
                }

                const modal = new bootstrap.Modal(DOM.modalDetallesCostales);
                modal.show();

                console.log("index: " + index);
            }
        } catch (error) {
            console.error('Error al cargar detalles:', error);
            showBootstrapAlert('Error al cargar los detalles de los costales', 'danger');
        }
    },

    obtenerSiguienteCodigo: async () => {
        try {
            const snapshot = await db.collection('lotes')
                .orderBy('codigo', 'desc')
                .limit(1)
                .get();

            if (!snapshot.empty) {
                const ultimoLote = snapshot.docs[0].data();
                return parseInt(ultimoLote.codigo.replace('L', '')) + 1;
            }
            return 1;
        } catch (error) {
            console.error('Error al obtener código:', error);
            return null;
        }
    },

    guardar: async (formData) => {
        loadingSpinner.style.display = 'flex';

        try {
            const fechaInput = new Date(document.getElementById('fecha').value + 'T00:00:00');
            const totalCostales = parseInt(document.getElementById('totalCostales').value);
            const pesoTotal = parseFloat(document.getElementById('pesoTotal').value);

            // Nota: Al guardar un lote en modo simple se asegura que, en el objeto registroActual,
            // la propiedad costales se asigne como [] para guardar solo los totales.
            // (La siguiente línea ya cumple esto)
            const tipoActual = (STATE.modoRegistro === 'detallado' || STATE.costales.length > 0) ? 'detallado' : 'simple';

            const registroActual = {
                fecha: firebase.firestore.Timestamp.now(),
                tipo: tipoActual,    // Ahora se forzará 'detallado' si hay sacos
                totalCostales,
                pesoTotal,
                costales: tipoActual === 'detallado' ? [...STATE.costales] : []  // Guardar sacos solo si es detallado
            };

            // Preparar el lote
            const lote = {
                codigo: STATE.loteEditando ? STATE.loteEditando.codigo : `L${String(await LotesManager.obtenerSiguienteCodigo()).padStart(4, '0')}`,
                fecha: firebase.firestore.Timestamp.fromDate(fechaInput),
                productor: document.getElementById('productor').value,
                procedencia: document.getElementById('procedencia').value,
                variedad: document.getElementById('variedad').value,
                costoKg: parseFloat(document.getElementById('costoKg').value),
                totalCostales,
                pesoTotal,
                descuento: parseFloat(document.getElementById('descuento').value),
                pesoNeto: parseFloat(document.getElementById('pesoNeto').value),
                // Guardar los costales si el modo es detallado
                costales: tipoActual === 'detallado' ? [...STATE.costales] : [],
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                gastosEstivaje: STATE.gastosEstivaje,
                gastosFlete: STATE.gastosFlete,
                gastos: STATE.gastos,
                condicionIngreso: document.getElementById('condicionIngreso').value,

                costoLote: parseFloat(document.getElementById('costoLote').value),
                GastosT: parseFloat(document.getElementById('GastosT').value),
                CostoT: parseFloat(document.getElementById('CostoT').value),
                CostoRealkg: parseFloat(document.getElementById('CostoRealkg').value),
                estadodoc: STATE.loteEditando ? STATE.loteEditando.estadodoc : "activo", // Campo para marcar como eliminado un lote

                ubicacionAlmacen: document.getElementById('ubicacionAlmacen').value,
                humedad: parseFloat(document.getElementById('humedad').value),
                responsable: document.getElementById('responsable').value,
                observacion: document.getElementById('observacion').value,
                montoAdelanto: parseFloat(document.getElementById('montoAdelanto').value),
                montoPendiente: parseFloat(document.getElementById('montoPendiente').value),
                NCompra: document.getElementById('NCompra').value,
            };

            // Manejar el histórico
            if (STATE.loteEditando && STATE.loteEditando.historico) {
                lote.historico = [...STATE.loteEditando.historico, registroActual];
            } else {
                lote.historico = [registroActual];
            }

            if (!STATE.loteEditando) {
                lote.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            }

            if (navigator.onLine) {
                if (STATE.loteEditando) {
                    await db.collection('lotes').doc(STATE.loteEditando.id).update(lote);
                } else {
                    await db.collection('lotes').add(lote);
                }
                const modal = bootstrap.Modal.getInstance(DOM.modalNuevoLote);
                modal.hide();
                await LotesManager.cargar();
                showBootstrapAlert(STATE.loteEditando ? 'Lote actualizado correctamente' : 'Lote guardado correctamente', 'success');
            } else {
                const lotesOffline = JSON.parse(localStorage.getItem('lotesOffline') || '[]');
                lotesOffline.push(lote);
                localStorage.setItem('lotesOffline', JSON.stringify(lotesOffline));
                const modal = bootstrap.Modal.getInstance(DOM.modalNuevoLote);
                modal.hide();
                showBootstrapAlert('Lote guardado localmente. Se sincronizará cuando haya conexión', 'info');
            }
        } catch (error) {
            console.error('Error al guardar lote:', error);
            showBootstrapAlert('Error al guardar el lote', 'danger');
        } finally {
            loadingSpinner.style.display = 'none';
        }
    },

    eliminar: async (docId) => {
        try {
            const confirmed = await confirmBootstrap('¿Está seguro de eliminar este lote?');
            if (!confirmed) return;
            await db.collection('lotes').doc(docId).update({
                estadodoc: "eliminado",
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            await LotesManager.cargar();
            showBootstrapAlert('Lote eliminado correctamente', 'success');
        } catch (error) {
            console.error('Error al eliminar lote:', error);
            showBootstrapAlert('Error al eliminar el lote', 'danger');
        }
    },

    cargarDatosLote: (lote) => {
        console.log('[cargarDatosLote] Iniciando carga del lote:', lote);
        document.getElementById('codigo').value = lote.codigo;
        console.log('[cargarDatosLote] Código cargado:', lote.codigo);
        document.getElementById('fecha').value = lote.fecha.toDate().toISOString().split('T')[0];
        console.log('[cargarDatosLote] Fecha cargada:', document.getElementById('fecha').value);
        document.getElementById('productor').value = lote.productor;
        document.getElementById('procedencia').value = lote.procedencia;
        document.getElementById('variedad').value = lote.variedad;
        document.getElementById('costoKg').value = lote.costoKg;
        //neto y descuento
        document.getElementById('descuento').value = lote.descuento;
        document.getElementById('pesoNeto').value = lote.pesoNeto;
        //condicionIngreso
        document.getElementById('condicionIngreso').value = lote.condicionIngreso;
        //CostoRealkg, CostoT, GastosT, costoLote
        document.getElementById('CostoRealkg').value = lote.CostoRealkg;
        document.getElementById('CostoT').value = lote.CostoT;
        document.getElementById('GastosT').value = lote.GastosT;
        document.getElementById('costoLote').value = lote.costoLote;
        document.getElementById('humedad').value = lote.humedad;
        document.getElementById('observacion').value = lote.observacion;
        document.getElementById('responsable').value = lote.responsable;
        document.getElementById('ubicacionAlmacen').value = lote.ubicacionAlmacen;
        document.getElementById('montoAdelanto').value = lote.montoAdelanto;
        document.getElementById('montoPendiente').value = lote.montoPendiente;
        document.getElementById('NCompra').value = lote.NCompra || '';


        if (lote.historico && lote.historico.length > 0) {
            const ultimoRegistro = lote.historico[lote.historico.length - 1];
            document.getElementById('totalCostales').value = ultimoRegistro.totalCostales;
            document.getElementById('pesoTotal').value = ultimoRegistro.pesoTotal;
            //console.log('[cargarDatosLote] Último registro:', ultimoRegistro);

            // Modificación: activar modo detallado solo si existen costales
            if (ultimoRegistro.tipo === 'detallado' && ultimoRegistro.costales && ultimoRegistro.costales.length > 0) {
                STATE.modoRegistro = 'detallado';
                STATE.costales = [...ultimoRegistro.costales];
                //console.log('[cargarDatosLote] Modo detallado activado, costales:', STATE.costales);
                if (DOM.btnRegistroDetallado) { DOM.btnRegistroDetallado.click(); }
                CostalesManager.actualizarTabla();
            } else {
                STATE.modoRegistro = 'simple';
                //console.log('[cargarDatosLote] Modo simple activado (detalle sin costales)');
                if (DOM.btnRegistroSimple) { DOM.btnRegistroSimple.click(); }
            }

        } else {
            document.getElementById('totalCostales').value = lote.totalCostales;
            document.getElementById('pesoTotal').value = lote.pesoTotal;
            //console.log('[cargarDatosLote] Sin histórico, totales asignados:', lote.totalCostales, lote.pesoTotal);
            if (lote.costales && lote.costales.length > 0) {
                STATE.modoRegistro = 'detallado';
                STATE.costales = [...lote.costales];
                //console.log('[cargarDatosLote] Modo detallado (sin histórico) activado, costales:', STATE.costales);
                if (DOM.btnRegistroDetallado) { DOM.btnRegistroDetallado.click(); }
                CostalesManager.actualizarTabla();
            } else {
                STATE.modoRegistro = 'simple';
                //console.log('[cargarDatosLote] Modo simple (sin histórico) activado');
                if (DOM.btnRegistroSimple) { DOM.btnRegistroSimple.click(); }
            }
        }
        
        // NUEVA MODIFICACIÓN: Cargar gastos existentes del lote
        if (lote.gastos && Array.isArray(lote.gastos)) {
            STATE.gastos = [...lote.gastos];
        } else {
            STATE.gastos = [];
        }
        GastosManager.actualizarTablaGasto();
        // Llamar para recalcular totales y actualizar GastosT y CostoRealkg
        recalcularPesoNeto();
        
        console.log('[cargarDatosLote] Estado final:', STATE);
        updateHeadingPesoCollapse();  // Actualizar estado del collapse headingPeso
    }
};

// ============= GESTIÓN DE GASTOS UNIFICADOS =============
const GastosManager = {
    agregarGasto: () => {
        const tipo = document.getElementById('gastoTipo').value;
        const fecha = document.getElementById('gastoFecha').value;
        const responsable = document.getElementById('gastoResponsable').value.trim();
        const motivo = document.getElementById('gastoMotivo').value.trim();
        const monto = parseFloat(document.getElementById('gastoMonto').value);
        if (isNaN(monto)) return;
        STATE.gastos.push({ tipo, fecha, responsable, motivo, monto });
        GastosManager.actualizarTablaGasto();
        // Limpiar campos
        document.getElementById('gastoFecha').value = '';
        document.getElementById('gastoResponsable').value = '';
        document.getElementById('gastoMotivo').value = '';
        document.getElementById('gastoMonto').value = '';
        recalcularPesoNeto(); // Actualizar inputs de costos
    },
    eliminarGasto: async (index) => {
        const confirmed = await confirmBootstrap('¿Eliminar este gasto?');
        if (confirmed) {
            STATE.gastos.splice(index, 1);
            GastosManager.actualizarTablaGasto();
            recalcularPesoNeto(); // Actualizar inputs de costos
        }
    },
    actualizarTablaGasto: () => {
        let html = '';
        STATE.gastos.forEach((gasto, index) => {
            html += `<tr>
                        <td>${gasto.tipo.charAt(0).toUpperCase() + gasto.tipo.slice(1)}</td>
                        <td>${gasto.fecha}</td>
                        <td>${gasto.responsable}</td>
                        <td>${gasto.motivo}</td>
                        <td>${UTILS.formatNumber(gasto.monto)}</td>
                        <td><button type="button" class="btn btn-outline-danger btn-sm" onclick="GastosManager.eliminarGasto(${index})">×</button></td>
                     </tr>`;
        });
        document.getElementById('tablaGasto').innerHTML = html;
        
        // Calcular y mostrar total de gastos
        const totalGastos = STATE.gastos.reduce((sum, gasto) => sum + gasto.monto, 0);
        const totalCell = document.getElementById('totalGastosCell');
        if (totalCell) {
            totalCell.textContent = numeral(totalGastos).format('0,0.00');
        }
    }
};

// ============= ASIGNAR EVENTO AL BOTÓN DE AGREGAR GASTO =============
document.getElementById('btnAgregarGasto').addEventListener('click', GastosManager.agregarGasto);

// ============= GESTIÓN DE MODOS DE REGISTRO =============
const ModoRegistroManager = {
    cambiarASimple: () => {
        if (STATE.modoRegistro === 'detallado' && STATE.costales.length > 0) {
            const pesoTotal = STATE.costales.reduce((sum, peso) => sum + peso, 0);

            // Guardar el registro detallado actual en el histórico
            if (STATE.loteEditando) {
                if (!STATE.loteEditando.historico) {
                    STATE.loteEditando.historico = [];
                }
                STATE.loteEditando.historico.push({
                    fecha: firebase.firestore.Timestamp.now(),
                    tipo: 'detallado',
                    totalCostales: STATE.costales.length,
                    pesoTotal,
                    costales: [...STATE.costales]
                });
            }

            // Actualizar campos para el nuevo registro simple
            document.getElementById('totalCostales').value = STATE.costales.length;
            document.getElementById('pesoTotal').value = pesoTotal.toFixed(2);
            STATE.costales = [];
        }
        STATE.modoRegistro = 'simple';
        updateEditableFields();
        updateHeadingPesoCollapse();
    },

    cambiarADetallado: () => {
        if (STATE.modoRegistro === 'simple') {
            const totalCostales = parseInt(document.getElementById('totalCostales').value) || 0;
            const pesoTotal = parseFloat(document.getElementById('pesoTotal').value) || 0;

            // Guardar el registro simple actual en el histórico
            if (STATE.loteEditando && totalCostales > 0) {
                if (!STATE.loteEditando.historico) {
                    STATE.loteEditando.historico = [];
                }
                STATE.loteEditando.historico.push({
                    fecha: firebase.firestore.Timestamp.now(),
                    tipo: 'simple',
                    totalCostales,
                    pesoTotal,
                    costales: []
                });
            }

            // Limpiar los campos para el nuevo registro detallado
            STATE.costales = [];
            document.getElementById('totalCostales').value = '';
            document.getElementById('pesoTotal').value = '';
            CostalesManager.actualizarTabla();
        }
        STATE.modoRegistro = 'detallado';
        updateEditableFields();
        updateHeadingPesoCollapse();
    }
};

// Nueva versión de recalcularPesoNeto para actualizar los inputs de costo
const recalcularPesoNeto = () => {
    const pesoBruto = parseFloat(document.getElementById('pesoTotal').value) || 0;
    const descuento = parseFloat(document.getElementById('descuento').value) || 0;
    const pesoNeto = pesoBruto - descuento;
    document.getElementById('pesoNeto').value = pesoNeto.toFixed(2);

    // Calcular costoLote: costoKg * pesoNeto
    const costoKg = parseFloat(document.getElementById('costoKg').value) || 0;
    const costoLote = costoKg * pesoNeto;
    document.getElementById('costoLote').value = costoLote.toFixed(2);

    // Calcular GastosT: suma de STATE.gastos
    const totalGastos = STATE.gastos.reduce((sum, gasto) => sum + gasto.monto, 0);
    document.getElementById('GastosT').value = totalGastos.toFixed(2);

    // Calcular CostoT: costoLote + GastosT
    const costoT = costoLote + totalGastos;
    document.getElementById('CostoT').value = costoT.toFixed(2);

    // Calcular CostoRealkg: CostoT / pesoNeto (si pesoNeto > 0)
    const costoRealkg = pesoNeto > 0 ? costoT / pesoNeto : 0;
    document.getElementById('CostoRealkg').value = costoRealkg.toFixed(2);
    
    // NUEVA MODIFICACIÓN: calcular montoPendiente = costoLote - montoAdelanto
    const montoAdelanto = parseFloat(document.getElementById('montoAdelanto').value.replace(/,/g,'')) || 0;
    const montoPendiente = costoLote - montoAdelanto;
    document.getElementById('montoPendiente').value = montoPendiente.toFixed(2);
};

// ============= EVENT LISTENERS =============
function initEventListeners() {
    // Eventos de conexión
    window.addEventListener('online', () => UTILS.actualizarEstadoConexion(true));
    window.addEventListener('offline', () => UTILS.actualizarEstadoConexion(false));

    // Eventos de modo de registro (se verifica si existen los elementos)
    if (DOM.btnRegistroSimple) {
        DOM.btnRegistroSimple.addEventListener('click', () => {
            if (STATE.modoRegistro === 'detallado') {
                if (confirm('¿Desea convertir el registro detallado a simple? Se Guardará el histórico.')) {
                    ModoRegistroManager.cambiarASimple();
                } else {
                    return;
                }
            }
            STATE.modoRegistro = 'simple';
            DOM.registroSimple.style.display = 'block';
            DOM.registroDetallado.style.display = 'none';
            DOM.btnRegistroSimple.classList.add('active');
            DOM.btnRegistroDetallado.classList.remove('active');
        });
    }
    if (DOM.btnRegistroDetallado) {
        DOM.btnRegistroDetallado.addEventListener('click', () => {
            if (STATE.modoRegistro === 'simple') {
                if (confirm('¿Desea convertir el registro simple a detallado? Se Guardará el histórico.')) {
                    ModoRegistroManager.cambiarADetallado();
                } else {
                    return;
                }
            }
            STATE.modoRegistro = 'detallado';
            DOM.registroSimple.style.display = 'none';
            DOM.registroDetallado.style.display = 'block';
            DOM.btnRegistroSimple.classList.remove('active');
            DOM.btnRegistroDetallado.classList.add('active');
            setTimeout(() => pesoCostalInput.focus(), 300);
        });
    }

    // Eventos de costales
    const btnAgregarCostal = document.getElementById('btnAgregarCostal');
    if (btnAgregarCostal) {
        btnAgregarCostal.addEventListener('click', () => {
            const peso = parseFloat(document.getElementById('pesoCostal').value);
            CostalesManager.agregar(peso);
        });
    }

    // Evento de formulario
    if (DOM.form) {
        DOM.form.addEventListener('submit', async (e) => {
            e.preventDefault();
            LotesManager.guardar();
        });
    }

    // Evento de cierre de modal
    if (DOM.modalNuevoLote) {
        DOM.modalNuevoLote.addEventListener('hidden.bs.modal', () => {
            DOM.form.reset();
            STATE.costales = [];
            STATE.loteEditando = null;
            STATE.gastos = []; // Se reinicia el arreglo de gastos
            CostalesManager.actualizarTabla();
            GastosManager.actualizarTablaGasto(); // Actualizar tabla de gastos
            document.getElementById('fecha').value = UTILS.getFechaLocal().toISOString().split('T')[0];
        });
    }

    // Mejorar entrada de pesos
    const pesoCostalInput = document.getElementById('pesoCostal');
    if (pesoCostalInput) {
        pesoCostalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const peso = parseFloat(pesoCostalInput.value);
                if (peso > 0) {
                    CostalesManager.agregar(peso);
                }
            }
        });
    }

    // Prevenir edición directa de "Total Costales" y "Peso Total (Kg)"
    const totalCostalesField = document.getElementById('totalCostales');
    const pesoTotalField = document.getElementById('pesoTotal');

    if (totalCostalesField) {
        totalCostalesField.addEventListener('focus', async (e) => {
            await manualEditWarning(e.target);
        });
    }
    if (pesoTotalField) {
        pesoTotalField.addEventListener('focus', async (e) => {
            await manualEditWarning(e.target);
        });
    }

    // Llamada para actualizar campos de totales según el modo actual
    updateEditableFields();

    // Agregar escuchadores de eventos para recalcular el peso neto
    const descuentoField = document.getElementById('descuento');
    if(pesoTotalField) {
        pesoTotalField.addEventListener('input', recalcularPesoNeto);
    }
    if(descuentoField) {
        descuentoField.addEventListener('input', recalcularPesoNeto);
    }
    const costoKgField = document.getElementById('costoKg');
    if(costoKgField) {
        costoKgField.addEventListener('input', recalcularPesoNeto);
    }
    const montoAdelantoField = document.getElementById('montoAdelanto');
    if(montoAdelantoField) {
        montoAdelantoField.addEventListener('input', recalcularPesoNeto);
    }
    
    // Nuevos event listeners para la vista de tarjetas en móviles
    const busquedaMovil = document.getElementById('busquedaMovil');
    if (busquedaMovil) {
        busquedaMovil.addEventListener('input', (e) => {
            LotesManager.buscar(e.target.value);
        });
    }
    const ordenacionMovil = document.getElementById('ordenacionMovil');
    const direccionOrdenacion = document.getElementById('direccionOrdenacion'); // Nuevo select
    if (ordenacionMovil && direccionOrdenacion) {
        // Listener combinado: al cambiar campo o dirección se reordena
        const reordenar = () => {
            LotesManager.ordenActual.campo = ordenacionMovil.value;
            LotesManager.ordenActual.ascendente = (direccionOrdenacion.value === 'asc');
            const sorted = [...STATE.allLotes].sort((a, b) => {
                const campo = LotesManager.ordenActual.campo;
                let aValue = a[campo], bValue = b[campo];
                if (campo === 'fecha') {
                    aValue = a.fecha.toDate(); 
                    bValue = b.fecha.toDate();
                }
                if (aValue < bValue) return LotesManager.ordenActual.ascendente ? -1 : 1;
                if (aValue > bValue) return LotesManager.ordenActual.ascendente ? 1 : -1;
                return 0;
            });
            STATE.allLotes = sorted;
            LotesManager.buscar(LotesManager.filtroTexto);
        };
        ordenacionMovil.addEventListener('change', reordenar);
        direccionOrdenacion.addEventListener('change', reordenar);
    }

    // Inicializar tooltips de Bootstrap
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Event Listener para redimensión de ventana
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if ($.fn.dataTable.isDataTable('#lotesTable')) {
                // Recalcular altura y reajustar tabla
                const table = $('#lotesTable').DataTable();
                table.columns.adjust().draw();
            }
        }, 250);
    });

    // Botón flotante para nuevo lote
    const btnNuevo = document.createElement('button');
    btnNuevo.className = 'btn btn-primary floating-button';
    btnNuevo.innerHTML = '<i class="bi bi-plus-lg"></i>';
    btnNuevo.title = 'Nuevo Lote';
    btnNuevo.addEventListener('click', () => {
        // Reiniciar estado
        STATE.loteEditando = null;
        STATE.costales = [];
        STATE.gastos = [];
        GastosManager.actualizarTablaGasto();

        // Resetear campos del formulario
        document.getElementById('loteForm').reset();
        document.getElementById('fecha').value = UTILS.getFechaLocal().toISOString().split('T')[0];
        document.getElementById('gastoFecha').value = UTILS.getFechaLocal().toISOString().split('T')[0];
        
        // Obtener siguiente código
        db.collection('lotes').orderBy('codigo', 'desc').limit(1)
            .get()
            .then((querySnapshot) => {
                let lastCode = "L0000";
                if (!querySnapshot.empty) {
                    const doc = querySnapshot.docs[0];
                    lastCode = doc.data().codigo || "L0000";
                }
                const numericPart = parseInt(lastCode.substring(1), 10);
                const nextCode = "L" + String(numericPart + 1).padStart(4, '0');
                document.getElementById('codigo').value = nextCode;
            });

        // Mostrar modal
        const modal = new bootstrap.Modal(document.getElementById('modalNuevoLote'));
        modal.show();
    });
    document.body.appendChild(btnNuevo);
}

// ============= INICIALIZACIÓN =============
function init() {
    document.getElementById('fecha').value = UTILS.getFechaLocal().toISOString().split('T')[0];
    document.getElementById('gastoFecha').value = UTILS.getFechaLocal().toISOString().split('T')[0];
    initEventListeners();
    LotesManager.cargar();
    updateEditableFields();
}

// Iniciar aplicación
init();

// Función para notificar al contenedor del iframe sobre cambios en el tamaño
function notifyParentAboutResize() {
    try {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({
                type: 'iframeContentResize',
                height: document.documentElement.scrollHeight
            }, '*');
        }
    } catch (e) {
        console.warn('No se pudo comunicar con el padre', e);
    }
}

// Llamar a la función cuando se cargue la página y cuando cambie su tamaño
window.addEventListener('load', notifyParentAboutResize);
window.addEventListener('resize', notifyParentAboutResize);
document.addEventListener('DOMContentLoaded', notifyParentAboutResize);