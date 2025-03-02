// Inicialización del dashboard para ERP Admin - Integración con Firebase
function getChartColorsArray(r) {
    r = $(r).attr("data-colors");
    return (r = JSON.parse(r)).map(function(r) {
        r = r.replace(" ", "");
        if (-1 == r.indexOf("--")) return r;
        r = getComputedStyle(document.documentElement).getPropertyValue(r);
        return r || void 0
    })
}

// Usar la instancia de Firebase ya inicializada
let db;
try {
    // Intentar obtener la instancia de Firestore
    if (window.db) {
        // Usar la instancia ya inicializada en dashboard.html
        db = window.db;
        console.log("Usando instancia de Firestore ya inicializada");
    } else if (window.firebase && window.firebase.firestore) {
        // Inicializar desde la instancia de Firebase
        db = window.firebase.firestore();
        console.log("Conexión a Firestore establecida desde firebase global");
    } else if (firebase && firebase.firestore) {
        // Fallback a la variable global firebase
        db = firebase.firestore();
        console.log("Conexión a Firestore establecida desde firebase local");
    } else {
        throw new Error("No se pudo acceder a Firestore");
    }
} catch (error) {
    console.error("Error al conectar con Firestore:", error);
}

// Estado global para el dashboard
const DASHBOARD_STATE = {
    carguios: [],
    pagos: [],
    despachos: [],
    totalCarguios: 0,
    totalPagos: 0,
    totalDespachos: 0,
    dataLoaded: {
        carguios: false,
        pagos: false,
        despachos: false
    }
};

// Función para formatear números
const formatNumber = (number) => {
    try {
        // Intentar usar Intl.NumberFormat primero
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(number);
    } catch (error) {
        // Si falla, usar Numeral.js como alternativa
        if (typeof numeral !== 'undefined') {
            return numeral(number).format('$0,0');
        } else {
            // Fallback básico si nada más funciona
            return '$' + number.toLocaleString();
        }
    }
};

// Función para formatear fechas
const formatDate = (timestamp) => {
    let date;

    try {
        // Verificar el tipo de timestamp y convertirlo a Date
        if (timestamp instanceof Date) {
            // Ya es un objeto Date
            date = timestamp;
        } else if (timestamp && typeof timestamp.toDate === 'function') {
            // Es un timestamp de Firestore
            date = timestamp.toDate();
        } else if (timestamp && timestamp._seconds) {
            // Es un objeto timestamp de Firestore en formato serializado
            date = new Date(timestamp._seconds * 1000);
        } else if (timestamp && typeof timestamp === 'number') {
            // Es un timestamp en milisegundos
            date = new Date(timestamp);
        } else if (timestamp && typeof timestamp === 'string') {
            // Es una fecha en formato string
            date = new Date(timestamp);
        } else {
            // Fallback a fecha actual
            console.warn("Formato de fecha no reconocido:", timestamp);
            date = new Date();
        }

        return new Intl.DateTimeFormat('es-CL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
    } catch (error) {
        console.error("Error al formatear fecha:", error, timestamp);
        return "Fecha inválida";
    }
};

// Función para obtener el color según el estado
const getEstadoColor = (estado) => {
    if (!estado) return 'secondary';

    switch (estado.toLowerCase()) {
        case 'completado':
            return 'success';
        case 'procesado':
            return 'info';
        case 'pendiente':
            return 'warning';
        case 'cancelado':
            return 'danger';
        default:
            return 'secondary';
    }
};

// Función para obtener datos de carguíos
const cargarDatosCarguios = () => {
    if (!db) {
        console.error("No se puede cargar datos de carguíos: Firestore no está disponible");
        return;
    }

    db.collection('lotes')
        .where("estadodoc", "==", "activo") // Filtrar solo lotes activos
        .get()
        .then(snapshot => {
            DASHBOARD_STATE.carguios = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    codigo: data.codigo || '',
                    peso: data.pesoTotal || 0,
                    costales: data.totalCostales || 0, // Cambiado de numeroCostales a totalCostales
                    estado: data.estado || 'pendiente',
                    fecha: data.fecha || new Date(),
                    productor: data.productor || 'Sin asignar',
                    valorTotal: data.costoLote || 0 // Cambiado de valorTotal a costoLote
                };
            });

            DASHBOARD_STATE.totalCarguios = DASHBOARD_STATE.carguios.length;
            DASHBOARD_STATE.dataLoaded.carguios = true;

            // Actualizar tarjetas informativas
            actualizarTarjetasInformativas();

            try {
                // Inicializar gráfico de estado de carguíos
                initEstadoCarguiosChart();

                // Actualizar la tabla de últimos carguíos
                actualizarTablaUltimosCarguios();
            } catch (error) {
                console.error("Error al inicializar gráficos de carguíos:", error);
            }
        })
        .catch(error => {
            console.error("Error al obtener carguíos:", error);
            // Marcar como cargado aunque haya error para no bloquear el resto del dashboard
            DASHBOARD_STATE.dataLoaded.carguios = true;
            DASHBOARD_STATE.carguios = [];
            DASHBOARD_STATE.totalCarguios = 0;

            // Actualizar tarjetas informativas
            actualizarTarjetasInformativas();
        });
};

// Función para obtener datos de pagos
const cargarDatosPagos = () => {
    if (!db) {
        console.error("No se puede cargar datos de pagos: Firestore no está disponible");
        return;
    }

    // Obtener pagos desde la colección lotes
    db.collection('lotes')
        .where("estadodoc", "==", "activo") // Filtrar solo lotes activos
        .get()
        .then(snapshot => {
            let pagos = [];

            snapshot.docs.forEach(doc => {
                const data = doc.data();

                // Verificar si el lote tiene pagos
                if (data.pagos && Array.isArray(data.pagos)) {
                    // Extraer cada pago y añadir información del lote
                    data.pagos.forEach(pago => {
                        pagos.push({
                            id: doc.id + '_' + pagos.length, // ID compuesto
                            loteId: doc.id,
                            loteCodigo: data.codigo,
                            monto: pago.monto || 0,
                            fechaPago: pago.fecha || new Date(),
                            metodo: pago.metodo || '',
                            comprobante: pago.comprobante || '',
                            observaciones: pago.observaciones || '',
                            tipo: 'productor' // Por defecto asumimos que son pagos a productores
                        });
                    });
                }
            });

            DASHBOARD_STATE.pagos = pagos;

            // Ordenar pagos por fecha, más recientes primero
            DASHBOARD_STATE.pagos.sort((a, b) => {
                const fechaA = a.fechaPago instanceof Date ? a.fechaPago : a.fechaPago.toDate();
                const fechaB = b.fechaPago instanceof Date ? b.fechaPago : b.fechaPago.toDate();
                return fechaB - fechaA;
            });

            DASHBOARD_STATE.totalPagos = DASHBOARD_STATE.pagos.reduce((total, pago) => total + pago.monto, 0);
            DASHBOARD_STATE.dataLoaded.pagos = true;

            // Actualizar tarjetas informativas
            actualizarTarjetasInformativas();

            // Inicializar gráfico de pagos
            initPagosChart();
        })
        .catch(error => {
            console.error("Error al obtener pagos:", error);
            // Marcar como cargado aunque haya error para no bloquear el resto del dashboard
            DASHBOARD_STATE.dataLoaded.pagos = true;
            DASHBOARD_STATE.pagos = [];
            DASHBOARD_STATE.totalPagos = 0;

            // Actualizar tarjetas informativas
            actualizarTarjetasInformativas();
        });
};

// Función para obtener datos de despachos
const cargarDatosDespachos = () => {
    if (!db) {
        console.error("No se puede cargar datos de despachos: Firestore no está disponible");
        return;
    }

    // Buscar todos los lotes con ventas
    db.collection('lotes')
        .where("estadodoc", "==", "activo") // Filtrar solo lotes activos
        .get()
        .then(snapshot => {
            let ventas = [];

            snapshot.docs.forEach(doc => {
                const data = doc.data();
                if (Array.isArray(data.ventas)) {
                    data.ventas.forEach(venta => {
                        // Calcular el total si no está definido
                        const cantidad = venta.cantidad || 0;
                        const precio = venta.precio || 0;
                        const total = cantidad * precio;

                        ventas.push({
                            id: venta.codigoVenta || '',
                            loteId: doc.id,
                            loteCodigo: data.codigo || '',
                            cliente: venta.cliente || '',
                            cantidad: cantidad,
                            precio: precio,
                            total: total,
                            fecha: venta.timestamp || venta.fecha || new Date(),
                            estado: venta.estado || 'pendiente'
                        });
                    });
                }
            });

            // Ordenar por fecha, más recientes primero
            ventas.sort((a, b) => {
                const fechaA = a.fecha instanceof Date ? a.fecha : a.fecha.toDate();
                const fechaB = b.fecha instanceof Date ? b.fecha : b.fecha.toDate();
                return fechaB - fechaA;
            });

            DASHBOARD_STATE.despachos = ventas;
            DASHBOARD_STATE.totalDespachos = ventas.reduce((total, venta) => total + venta.total, 0);
            DASHBOARD_STATE.dataLoaded.despachos = true;

            // Actualizar tarjetas informativas
            actualizarTarjetasInformativas();

            try {
                // Inicializar gráfico de despachos
                initDespachosChart();

                // Actualizar la tabla de últimos despachos
                actualizarTablaUltimosDespachos();
            } catch (error) {
                console.error("Error al inicializar gráficos de despachos:", error);
            }
        })
        .catch(error => {
            console.error("Error al obtener despachos:", error);
            // Marcar como cargado aunque haya error para no bloquear el resto del dashboard
            DASHBOARD_STATE.dataLoaded.despachos = true;
            DASHBOARD_STATE.despachos = [];
            DASHBOARD_STATE.totalDespachos = 0;

            // Actualizar tarjetas informativas
            actualizarTarjetasInformativas();
        });
};

// Función para actualizar las tarjetas informativas
const actualizarTarjetasInformativas = () => {
    // Solo actualizar si todos los datos están cargados
    if (!DASHBOARD_STATE.dataLoaded.carguios ||
        !DASHBOARD_STATE.dataLoaded.pagos ||
        !DASHBOARD_STATE.dataLoaded.despachos) {
        return;
    }

    // Actualizar contador de carguíos
    if (document.getElementById('total-carguios')) {
        document.getElementById('total-carguios').innerText = DASHBOARD_STATE.carguios.length;
    }

    // Actualizar contador de pagos
    if (document.getElementById('total-pagos')) {
        document.getElementById('total-pagos').setAttribute('data-target', DASHBOARD_STATE.totalPagos);
        document.getElementById('total-pagos').innerText = formatNumber(DASHBOARD_STATE.totalPagos);
    }

    // Actualizar contador de despachos
    if (document.getElementById('total-despachos')) {
        document.getElementById('total-despachos').setAttribute('data-target', DASHBOARD_STATE.totalDespachos);
        document.getElementById('total-despachos').innerText = formatNumber(DASHBOARD_STATE.totalDespachos);
    }

    // Actualizar peso total
    if (document.getElementById('peso-total')) {
        const pesoTotal = DASHBOARD_STATE.carguios.reduce((total, carguio) => total + carguio.peso, 0);
        document.getElementById('peso-total').innerText = `${pesoTotal.toLocaleString()} kg`;
    }

    // Iniciar animación de contadores
    if (typeof initCounters === 'function') {
        initCounters();
    } else {
        console.log("La función initCounters no está disponible, implementando versión básica");
        // Implementación básica de initCounters si no existe
        initCountersBasic();
    }
};

// Función básica para inicializar contadores si no existe la función original
const initCountersBasic = () => {
    const counterElements = document.querySelectorAll('.counter-value');
    counterElements.forEach(element => {
        const target = parseFloat(element.getAttribute('data-target') || 0);
        if (element.innerText.includes('$')) {
            element.innerText = formatNumber(target);
        } else {
            element.innerText = target.toString();
        }
    });
};

// Función para inicializar contadores
const initCounters = () => {
    try {
        // Verificar si counterUp está disponible
        if (typeof counterUp === 'function') {
            // Inicializar contadores con counterUp
            document.querySelectorAll('.counter-value').forEach(function(counter) {
                const target = parseInt(counter.getAttribute('data-target') || '0');
                counterUp(counter, {
                    duration: 1000,
                    delay: 16,
                });
                counter.textContent = target.toString();
            });
            console.log("Contadores inicializados con counterUp");
        } else {
            // Implementación básica si counterUp no está disponible
            initCountersBasic();
        }
    } catch (error) {
        console.error("Error al inicializar contadores:", error);
        // Fallback a implementación básica
        initCountersBasic();
    }
};

// Inicialización del gráfico de estado de carguíos (reemplaza Wallet Balance)
const initEstadoCarguiosChart = () => {
    if (!DASHBOARD_STATE.dataLoaded.carguios) return;

    // Calcular estados
    const pendientes = DASHBOARD_STATE.carguios.filter(c => c.estado === 'pendiente').length;
    const procesados = DASHBOARD_STATE.carguios.filter(c => c.estado === 'procesado').length;
    const completados = DASHBOARD_STATE.carguios.filter(c => c.estado === 'completado').length;

    const chartElement = document.querySelector("#wallet-balance");
    if (!chartElement) {
        console.error("Elemento #wallet-balance no encontrado");
        return;
    }

    const estadoCarguiosColors = getChartColorsArray("#wallet-balance");
    const estadoCarguiosOptions = {
        series: [pendientes, procesados, completados],
        chart: { width: 227, height: 227, type: "pie" },
        labels: ["Pendientes", "Procesados", "Completados"],
        colors: estadoCarguiosColors,
        stroke: { width: 0 },
        legend: { show: false },
        responsive: [{ breakpoint: 480, options: { chart: { width: 200 } } }]
    };

    // Actualizar la leyenda
    const legendElement = document.querySelector("#wallet-balance-legend");
    if (legendElement) {
        legendElement.innerHTML = `
            <div>
                <p class="mb-2"><i class="mdi mdi-circle align-middle font-size-10 me-2 text-primary"></i> Pendientes</p>
                <h6>${pendientes} carguíos</h6>
            </div>
            <div class="mt-4 pt-2">
                <p class="mb-2"><i class="mdi mdi-circle align-middle font-size-10 me-2 text-success"></i> Procesados</p>
                <h6>${procesados} carguíos</h6>
            </div>
            <div class="mt-4 pt-2">
                <p class="mb-2"><i class="mdi mdi-circle align-middle font-size-10 me-2 text-info"></i> Completados</p>
                <h6>${completados} carguíos</h6>
            </div>
        `;
    }

    // Renderizar el gráfico
    try {
        new ApexCharts(chartElement, estadoCarguiosOptions).render();
    } catch (error) {
        console.error("Error al renderizar gráfico de estado de carguíos:", error);
    }
};

// Inicialización del gráfico de pagos vs metas (reemplaza Invested Overview)
const initPagosChart = () => {
    if (!DASHBOARD_STATE.dataLoaded.pagos) return;

    // Suponemos una meta mensual de pagos (ajusta según sea necesario)
    const metaMensual = 50000000; // 50 millones como ejemplo

    // Filtrar pagos del mes actual con manejo seguro de fechas
    const pagosMes = DASHBOARD_STATE.pagos
        .filter(p => {
            try {
                let fechaPago;
                if (p.fechaPago) {
                    // Verificar si es un objeto Timestamp de Firestore
                    if (typeof p.fechaPago.toDate === 'function') {
                        fechaPago = p.fechaPago.toDate();
                    } else if (p.fechaPago instanceof Date) {
                        fechaPago = p.fechaPago;
                    } else {
                        // Si no es un objeto Date ni Timestamp, intentar crear un Date
                        fechaPago = new Date(p.fechaPago);
                    }

                    // Verificar si la fecha es válida
                    if (!isNaN(fechaPago.getTime())) {
                        const ahora = new Date();
                        return fechaPago.getMonth() === ahora.getMonth() &&
                            fechaPago.getFullYear() === ahora.getFullYear();
                    }
                }
                return false;
            } catch (error) {
                console.error("Error procesando fecha de pago:", error, p);
                return false;
            }
        })
        .reduce((total, pago) => total + (pago.monto || 0), 0);

    // Calcular porcentaje de meta
    const porcentajeMeta = Math.min(Math.round((pagosMes / metaMensual) * 100), 100);

    // Configurar gráfico
    const radialColors = getChartColorsArray("#invested-overview");
    const radialOptions = {
        chart: { height: 270, type: "radialBar", offsetY: -10 },
        plotOptions: {
            radialBar: {
                startAngle: -130,
                endAngle: 130,
                dataLabels: {
                    name: { show: false },
                    value: {
                        offsetY: 10,
                        fontSize: "18px",
                        formatter: function(val) { return val + "%" }
                    }
                }
            }
        },
        colors: [radialColors[0]],
        fill: {
            type: "gradient",
            gradient: {
                shade: "dark",
                type: "horizontal",
                gradientToColors: [radialColors[1]],
                opacityFrom: 1,
                opacityTo: 1,
                stops: [20, 60]
            }
        },
        stroke: { dashArray: 4 },
        legend: { show: false },
        series: [porcentajeMeta],
        labels: ["Meta de Pagos"]
    };

    // Actualizar la información del gráfico
    const infoElement = document.querySelector("#invested-overview-info .mb-1");
    if (infoElement) {
        infoElement.innerText = "Monto de Pagos";
    }

    const montoElement = document.querySelector("#invested-overview-info h4");
    if (montoElement) {
        montoElement.innerText = formatNumber(pagosMes);
    }

    // Actualizar ingresos y gastos
    const pagosPorTipo = DASHBOARD_STATE.pagos.reduce((acc, pago) => {
        if (pago.tipo === 'productor') {
            acc.productores += pago.monto || 0;
        } else {
            acc.servicios += pago.monto || 0;
        }
        return acc;
    }, { productores: 0, servicios: 0 });

    const productoresElement = document.querySelector("#pagos-productores");
    if (productoresElement) {
        productoresElement.innerText = formatNumber(pagosPorTipo.productores);
    }

    const serviciosElement = document.querySelector("#pagos-servicios");
    if (serviciosElement) {
        serviciosElement.innerText = formatNumber(pagosPorTipo.servicios);
    }

    // Renderizar el gráfico
    try {
        const chartElement = document.querySelector("#invested-overview");
        if (chartElement) {
            new ApexCharts(chartElement, radialOptions).render();
        } else {
            console.error("Elemento #invested-overview no encontrado");
        }
    } catch (error) {
        console.error("Error al renderizar gráfico de pagos:", error);
    }
};

// Inicialización del gráfico de despachos (reemplaza Market Overview)
const initDespachosChart = () => {
    if (!DASHBOARD_STATE.dataLoaded.despachos) return;

    // Preparar datos para el gráfico por mes
    const ventasPorMes = Array(12).fill(0);
    const carguiosPorMes = Array(12).fill(0);

    // Calcular ventas por mes con manejo seguro de fechas
    DASHBOARD_STATE.despachos.forEach(despacho => {
        try {
            let fecha;
            if (despacho.fecha) {
                // Verificar si es un objeto Timestamp de Firestore
                if (typeof despacho.fecha.toDate === 'function') {
                    fecha = despacho.fecha.toDate();
                } else if (despacho.fecha instanceof Date) {
                    fecha = despacho.fecha;
                } else {
                    // Si no es un objeto Date ni Timestamp, intentar crear un Date
                    fecha = new Date(despacho.fecha);
                }

                // Verificar si la fecha es válida
                if (!isNaN(fecha.getTime())) {
                    const mes = fecha.getMonth();
                    ventasPorMes[mes] += despacho.total || 0;
                }
            }
        } catch (error) {
            console.error("Error procesando fecha de despacho:", error, despacho);
        }
    });

    // Calcular carguíos por mes con manejo seguro de fechas
    DASHBOARD_STATE.carguios.forEach(carguio => {
        try {
            let fecha;
            if (carguio.fecha) {
                // Verificar si es un objeto Timestamp de Firestore
                if (typeof carguio.fecha.toDate === 'function') {
                    fecha = carguio.fecha.toDate();
                } else if (carguio.fecha instanceof Date) {
                    fecha = carguio.fecha;
                } else {
                    // Si no es un objeto Date ni Timestamp, intentar crear un Date
                    fecha = new Date(carguio.fecha);
                }

                // Verificar si la fecha es válida
                if (!isNaN(fecha.getTime())) {
                    const mes = fecha.getMonth();
                    carguiosPorMes[mes] += carguio.valorTotal || 0;
                }
            }
        } catch (error) {
            console.error("Error procesando fecha de carguío:", error, carguio);
        }
    });

    // Configurar gráfico
    const barColors = getChartColorsArray("#market-overview");
    const barOptions = {
        series: [
            { name: "Despachos", data: ventasPorMes },
            { name: "Carguíos", data: carguiosPorMes }
        ],
        chart: { type: "bar", height: 400, stacked: false, toolbar: { show: false } },
        plotOptions: { bar: { columnWidth: "20%" } },
        colors: barColors,
        fill: { opacity: 1 },
        dataLabels: { enabled: false },
        legend: { show: true },
        yaxis: {
            labels: {
                formatter: function(val) {
                    return formatNumber(val).replace('$', '$');
                }
            }
        },
        xaxis: {
            categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
            labels: { rotate: -90 }
        }
    };

    // Actualizar la tabla de ranking
    let rankingHtml = '';

    // Agrupar despachos por cliente y calcular totales
    const clientesRanking = {};
    DASHBOARD_STATE.despachos.forEach(despacho => {
        const cliente = despacho.cliente || 'Sin cliente';
        if (!clientesRanking[cliente]) {
            clientesRanking[cliente] = 0;
        }
        clientesRanking[cliente] += despacho.total || 0;
    });

    // Convertir a array y ordenar
    const clientesArray = Object.entries(clientesRanking)
        .map(([cliente, total]) => ({ cliente, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

    // Generar HTML para el ranking
    clientesArray.forEach((cliente, index) => {
        const variacion = Math.random() * 10 - 3; // Simulación para el ejemplo
        rankingHtml += `
            <div class="mt-3">
                <div class="d-flex align-items-center">
                    <div class="avatar-sm m-auto">
                        <span class="avatar-title rounded-circle bg-light-subtle text-dark font-size-16">
                            ${index + 1}
                        </span>
                    </div>
                    <div class="flex-grow-1 ms-3">
                        <span class="font-size-16">${cliente.cliente}</span>
                    </div>
                    <div class="flex-shrink-0">
                        <span class="badge rounded-pill ${variacion > 0 ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'} font-size-12 fw-medium">
                            ${variacion > 0 ? '+' : ''}${variacion.toFixed(1)}%
                        </span>
                    </div>
                </div>
            </div>
        `;
    });

    // Actualizar el DOM con el ranking
    const rankingElement = document.querySelector("#clientes-ranking");
    if (rankingElement) {
        rankingElement.innerHTML = rankingHtml;
    }

    // Renderizar el gráfico
    try {
        const chartElement = document.querySelector("#market-overview");
        if (chartElement) {
            new ApexCharts(chartElement, barOptions).render();
        } else {
            console.error("Elemento #market-overview no encontrado");
        }
    } catch (error) {
        console.error("Error al renderizar gráfico de despachos:", error);
    }
};

// Función para actualizar la tabla de últimos carguíos
const actualizarTablaUltimosCarguios = () => {
    try {
        const tablaBody = document.getElementById('ultimos-carguios');
        if (!tablaBody) {
            console.error("No se encontró el elemento 'ultimos-carguios'");
            return;
        }

        // Limpiar tabla
        tablaBody.innerHTML = '';

        // Ordenar carguíos por fecha, más recientes primero
        const carguiosOrdenados = [...DASHBOARD_STATE.carguios].sort((a, b) => {
            // Convertir ambas fechas a objetos Date para comparación
            let fechaA, fechaB;

            try {
                // Simplificamos la lógica de conversión de fechas
                if (a.fecha instanceof Date) {
                    fechaA = a.fecha;
                } else if (a.fecha && typeof a.fecha.toDate === 'function') {
                    fechaA = a.fecha.toDate();
                } else if (a.fecha && a.fecha._seconds) {
                    fechaA = new Date(a.fecha._seconds * 1000);
                } else {
                    fechaA = new Date(a.fecha || 0);
                }
            } catch (e) {
                fechaA = new Date(0);
                console.warn("Error al convertir fecha A:", e);
            }

            try {
                // Simplificamos la lógica de conversión de fechas
                if (b.fecha instanceof Date) {
                    fechaB = b.fecha;
                } else if (b.fecha && typeof b.fecha.toDate === 'function') {
                    fechaB = b.fecha.toDate();
                } else if (b.fecha && b.fecha._seconds) {
                    fechaB = new Date(b.fecha._seconds * 1000);
                } else {
                    fechaB = new Date(b.fecha || 0);
                }
            } catch (e) {
                fechaB = new Date(0);
                console.warn("Error al convertir fecha B:", e);
            }

            return fechaB - fechaA;
        });

        // Tomar solo los 5 más recientes
        const ultimosCarguios = carguiosOrdenados.slice(0, 5);

        // Agregar filas a la tabla
        ultimosCarguios.forEach(carguio => {
            const row = document.createElement('tr');

            // Formatear fecha de manera segura
            let fechaFormateada;
            try {
                fechaFormateada = formatDate(carguio.fecha);
            } catch (e) {
                console.warn("Error al formatear fecha:", e);
                fechaFormateada = "Fecha inválida";
            }

            row.innerHTML = `
                <td><a href="#" class="text-body fw-bold">${carguio.codigo || 'Sin código'}</a></td>
                <td>${carguio.productor || 'Sin asignar'}</td>
                <td>${carguio.costales || 0}</td>
                <td>${carguio.peso || 0} kg</td>
                <td><span class="badge badge-soft-${getEstadoColor(carguio.estado)}">${carguio.estado || 'pendiente'}</span></td>
                <td>${fechaFormateada}</td>
            `;
            tablaBody.appendChild(row);
        });

        if (ultimosCarguios.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="6" class="text-center">No hay carguíos registrados</td>';
            tablaBody.appendChild(row);
        }
    } catch (error) {
        console.error("Error al actualizar tabla de últimos carguíos:", error);
    }
};

// Función para actualizar la tabla de últimos despachos
const actualizarTablaUltimosDespachos = () => {
    try {
        const tablaBody = document.getElementById('ultimos-despachos');
        if (!tablaBody) {
            console.error("No se encontró el elemento 'ultimos-despachos'");
            return;
        }

        // Limpiar tabla
        tablaBody.innerHTML = '';

        // Ordenar despachos por fecha, más recientes primero
        const despachosOrdenados = [...DASHBOARD_STATE.despachos].sort((a, b) => {
            // Convertir ambas fechas a objetos Date para comparación
            let fechaA, fechaB;

            try {
                // Simplificamos la lógica de conversión de fechas
                if (a.fecha instanceof Date) {
                    fechaA = a.fecha;
                } else if (a.fecha && typeof a.fecha.toDate === 'function') {
                    fechaA = a.fecha.toDate();
                } else if (a.fecha && a.fecha._seconds) {
                    fechaA = new Date(a.fecha._seconds * 1000);
                } else {
                    fechaA = new Date(a.fecha || 0);
                }
            } catch (e) {
                fechaA = new Date(0);
                console.warn("Error al convertir fecha A:", e);
            }

            try {
                // Simplificamos la lógica de conversión de fechas
                if (b.fecha instanceof Date) {
                    fechaB = b.fecha;
                } else if (b.fecha && typeof b.fecha.toDate === 'function') {
                    fechaB = b.fecha.toDate();
                } else if (b.fecha && b.fecha._seconds) {
                    fechaB = new Date(b.fecha._seconds * 1000);
                } else {
                    fechaB = new Date(b.fecha || 0);
                }
            } catch (e) {
                fechaB = new Date(0);
                console.warn("Error al convertir fecha B:", e);
            }

            return fechaB - fechaA;
        });

        // Tomar solo los 5 más recientes
        const ultimosDespachos = despachosOrdenados.slice(0, 5);

        // Agregar filas a la tabla
        ultimosDespachos.forEach(despacho => {
            const row = document.createElement('tr');

            // Formatear fecha de manera segura
            let fechaFormateada;
            try {
                fechaFormateada = formatDate(despacho.fecha);
            } catch (e) {
                console.warn("Error al formatear fecha:", e);
                fechaFormateada = "Fecha inválida";
            }

            row.innerHTML = `
                <td><a href="#" class="text-body fw-bold">${despacho.id || 'Sin código'}</a></td>
                <td>${despacho.cliente || 'Sin cliente'}</td>
                <td>${despacho.cantidad || 0}</td>
                <td>${formatNumber(despacho.precio || 0)}</td>
                <td>${formatNumber(despacho.total || 0)}</td>
                <td><span class="badge badge-soft-${getEstadoColor(despacho.estado)}">${despacho.estado || 'pendiente'}</span></td>
                <td>${fechaFormateada}</td>
            `;
            tablaBody.appendChild(row);
        });

        if (ultimosDespachos.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" class="text-center">No hay despachos registrados</td>';
            tablaBody.appendChild(row);
        }
    } catch (error) {
        console.error("Error al actualizar tabla de últimos despachos:", error);
    }
};

// Inicializar el mapa de ventas (Sales by Locations)
const initSalesLocationsMap = () => {
    // Actualizar el título del mapa
    document.querySelector("#sales-locations-title").innerText = "Distribución Geográfica";

    // Configurar el mapa con ubicaciones relevantes de Perú u otras regiones según sea necesario
    const vectormapColors = getChartColorsArray("#sales-by-locations");
    $("#sales-by-locations").vectorMap({
        map: "world_mill_en",
        normalizeFunction: "polynomial",
        hoverOpacity: .7,
        hoverColor: !1,
        regionStyle: {
            initial: {
                fill: "#e9e9ef"
            }
        },
        markerStyle: {
            initial: {
                r: 9,
                fill: vectormapColors,
                "fill-opacity": .9,
                stroke: "#fff",
                "stroke-width": 7,
                "stroke-opacity": .4
            },
            hover: {
                stroke: "#fff",
                "fill-opacity": 1,
                "stroke-width": 1.5
            }
        },
        backgroundColor: "transparent",
        markers: [
            { latLng: [-12.05, -77.05], name: "Lima" },
            { latLng: [-13.53, -71.97], name: "Cusco" },
            { latLng: [-9.53, -77.53], name: "Ancash" }
        ]
    });

    // Actualizar las regiones en la leyenda
    document.querySelector("#region-lima").innerText = "Lima";
    document.querySelector("#region-cusco").innerText = "Cusco";
    document.querySelector("#region-ancash").innerText = "Ancash";

    // Actualizar los porcentajes (simulados por ahora)
    document.querySelector("#porcentaje-lima").innerText = "45%";
    document.querySelector("#porcentaje-cusco").innerText = "35%";
    document.querySelector("#porcentaje-ancash").innerText = "20%";

    // Actualizar las barras de progreso
    document.querySelector("#progress-lima").style.width = "45%";
    document.querySelector("#progress-cusco").style.width = "35%";
    document.querySelector("#progress-ancash").style.width = "20%";
};

// Inicializar los mini gráficos
const initMiniCharts = () => {
    try {
        // Mini chart 1 - Tendencia de carguíos
        const minichart1Element = document.querySelector("#mini-chart1");
        if (minichart1Element) {
            const minichart1Colors = getChartColorsArray("#mini-chart1");
            const carguiosData = DASHBOARD_STATE.carguios.length > 0 ?
                DASHBOARD_STATE.carguios.slice(0, 15).map(c => (c.peso || 0) / 1000).reverse() : [0, 0, 0, 0, 0]; // Datos de ejemplo si no hay carguíos

            const options1 = {
                series: [{
                    data: carguiosData
                }],
                chart: { type: "line", height: 50, sparkline: { enabled: true } },
                colors: minichart1Colors,
                stroke: { curve: "smooth", width: 2 },
                tooltip: {
                    fixed: { enabled: false },
                    x: { show: false },
                    y: {
                        title: {
                            formatter: function(r) { return "Peso (Ton):" }
                        }
                    },
                    marker: { show: false }
                }
            };
            new ApexCharts(minichart1Element, options1).render();
        }

        // Mini chart 2 - Tendencia de pagos
        const minichart2Element = document.querySelector("#mini-chart2");
        if (minichart2Element) {
            const minichart2Colors = getChartColorsArray("#mini-chart2");
            const pagosData = DASHBOARD_STATE.pagos.length > 0 ?
                DASHBOARD_STATE.pagos.slice(0, 15).map(p => (p.monto || 0) / 1000000).reverse() : [0, 0, 0, 0, 0]; // Datos de ejemplo si no hay pagos

            const options2 = {
                series: [{
                    data: pagosData
                }],
                chart: { type: "line", height: 50, sparkline: { enabled: true } },
                colors: minichart2Colors,
                stroke: { curve: "smooth", width: 2 },
                tooltip: {
                    fixed: { enabled: false },
                    x: { show: false },
                    y: {
                        title: {
                            formatter: function(r) { return "Pagos (MM):" }
                        }
                    },
                    marker: { show: false }
                }
            };
            new ApexCharts(minichart2Element, options2).render();
        }

        // Mini chart 3 - Tendencia de despachos
        const minichart3Element = document.querySelector("#mini-chart3");
        if (minichart3Element) {
            const minichart3Colors = getChartColorsArray("#mini-chart3");
            const despachosData = DASHBOARD_STATE.despachos.length > 0 ?
                DASHBOARD_STATE.despachos.slice(0, 15).map(d => (d.total || 0) / 1000000).reverse() : [0, 0, 0, 0, 0]; // Datos de ejemplo si no hay despachos

            const options3 = {
                series: [{
                    data: despachosData
                }],
                chart: { type: "line", height: 50, sparkline: { enabled: true } },
                colors: minichart3Colors,
                stroke: { curve: "smooth", width: 2 },
                tooltip: {
                    fixed: { enabled: false },
                    x: { show: false },
                    y: {
                        title: {
                            formatter: function(r) { return "Despachos (MM):" }
                        }
                    },
                    marker: { show: false }
                }
            };
            new ApexCharts(minichart3Element, options3).render();
        }

        // Mini chart 4 - Precio promedio
        const minichart4Element = document.querySelector("#mini-chart4");
        if (minichart4Element) {
            const minichart4Colors = getChartColorsArray("#mini-chart4");
            const preciosData = DASHBOARD_STATE.despachos.length > 0 ?
                DASHBOARD_STATE.despachos.slice(0, 15).map(d => (d.precio || 0) / 1000).reverse() : [0, 0, 0, 0, 0]; // Datos de ejemplo si no hay despachos

            const options4 = {
                series: [{
                    data: preciosData
                }],
                chart: { type: "line", height: 50, sparkline: { enabled: true } },
                colors: minichart4Colors,
                stroke: { curve: "smooth", width: 2 },
                tooltip: {
                    fixed: { enabled: false },
                    x: { show: false },
                    y: {
                        title: {
                            formatter: function(r) { return "Precio (K):" }
                        }
                    },
                    marker: { show: false }
                }
            };
            new ApexCharts(minichart4Element, options4).render();
        }
    } catch (error) {
        console.error("Error al inicializar mini gráficos:", error);
    }
};

// Función para inicializar el dashboard
const initDashboard = () => {
    // Cargar datos
    cargarDatosCarguios();
    cargarDatosPagos();
    cargarDatosDespachos();

    // Esperar a que todos los datos estén cargados antes de inicializar los gráficos
    const checkDataLoaded = setInterval(() => {
        if (DASHBOARD_STATE.dataLoaded.carguios &&
            DASHBOARD_STATE.dataLoaded.pagos &&
            DASHBOARD_STATE.dataLoaded.despachos) {

            // Inicializar mini gráficos
            initMiniCharts();

            // Inicializar mapa de ubicaciones
            initSalesLocationsMap();

            clearInterval(checkDataLoaded);
        }
    }, 100);
};

// Iniciar el dashboard cuando el documento esté listo
document.addEventListener('DOMContentLoaded', initDashboard);