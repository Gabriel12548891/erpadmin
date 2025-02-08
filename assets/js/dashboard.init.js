// Inicialización del dashboard para Quinua Comercial con integración a Firebase
function getChartColorsArray(r){r=$(r).attr("data-colors");return(r=JSON.parse(r)).map(function(r){r=r.replace(" ","");if(-1==r.indexOf("--"))return r;r=getComputedStyle(document.documentElement).getPropertyValue(r);return r||void 0})}var minichart1Colors=getChartColorsArray("#mini-chart1"),options={series:[{data:[2,10,18,22,36,15,47,75,65,19,14,2,47,42,15]}],chart:{type:"line",height:50,sparkline:{enabled:!0}},colors:minichart1Colors,stroke:{curve:"smooth",width:2},tooltip:{fixed:{enabled:!1},x:{show:!1},y:{title:{formatter:function(r){return""}}},marker:{show:!1}}},chart=new ApexCharts(document.querySelector("#mini-chart1"),options);chart.render();var minichart2Colors=getChartColorsArray("#mini-chart2"),options={series:[{data:[15,42,47,2,14,19,65,75,47,15,42,47,2,14,12]}],chart:{type:"line",height:50,sparkline:{enabled:!0}},colors:minichart2Colors,stroke:{curve:"smooth",width:2},tooltip:{fixed:{enabled:!1},x:{show:!1},y:{title:{formatter:function(r){return""}}},marker:{show:!1}}};(chart=new ApexCharts(document.querySelector("#mini-chart2"),options)).render();var minichart3Colors=getChartColorsArray("#mini-chart3"),options={series:[{data:[47,15,2,67,22,20,36,60,60,30,50,11,12,3,8]}],chart:{type:"line",height:50,sparkline:{enabled:!0}},colors:minichart3Colors,stroke:{curve:"smooth",width:2},tooltip:{fixed:{enabled:!1},x:{show:!1},y:{title:{formatter:function(r){return""}}},marker:{show:!1}}};(chart=new ApexCharts(document.querySelector("#mini-chart3"),options)).render();var minichart4Colors=getChartColorsArray("#mini-chart4"),options={series:[{data:[12,14,2,47,42,15,47,75,65,19,14,2,47,42,15]}],chart:{type:"line",height:50,sparkline:{enabled:!0}},colors:minichart4Colors,stroke:{curve:"smooth",width:2},tooltip:{fixed:{enabled:!1},x:{show:!1},y:{title:{formatter:function(r){return""}}},marker:{show:!1}}};(chart=new ApexCharts(document.querySelector("#mini-chart4"),options)).render();

// Reemplazo del gráfico "Wallet Balance" (criptomonedas) por "Inventario de Quinua"
var inventarioColors = getChartColorsArray("#wallet-balance");
var inventarioOptions = {
    series: [60, 25, 15], // Distribución: Stock Disponible, Vendido, En Solicitud (porcentaje)
    chart: { width: 227, height: 227, type: "pie" },
    labels: ["Stock Disponible", "Vendido", "En Solicitud"],
    colors: inventarioColors,
    stroke: { width: 0 },
    legend: { show: false },
    responsive: [{ breakpoint: 480, options: { chart: { width: 200 } } }]
};
(new ApexCharts(document.querySelector("#wallet-balance"), inventarioOptions)).render();

// Actualización del gráfico "Invested Overview" por "Meta de Ventas"
var radialColors = getChartColorsArray("#invested-overview");
var radialOptions = {
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
    fill: { type: "gradient", gradient: { shade: "dark", type: "horizontal", gradientToColors: [radialColors[1]], opacityFrom: 1, opacityTo: 1, stops: [20, 60] } },
    stroke: { dashArray: 4 },
    legend: { show: false },
    series: [75], // Ejemplo: 75% de meta alcanzado
    labels: ["Meta de Ventas"]
};
(new ApexCharts(document.querySelector("#invested-overview"), radialOptions)).render();

// Modificación del gráfico "Market Overview" de Bitcoin por "Ventas vs Compras"
var barColors = getChartColorsArray("#market-overview");
var barOptions = {
    series: [
        { name: "Ventas", data: [120, 135, 150, 160, 175, 180, 190, 185, 200, 210, 220, 230] },
        { name: "Compras", data: [100, 115, 130, 140, 155, 160, 170, 165, 180, 190, 200, 210] }
    ],
    chart: { type: "bar", height: 400, stacked: true, toolbar: { show: false } },
    plotOptions: { bar: { columnWidth: "20%" } },
    colors: barColors,
    fill: { opacity: 1 },
    dataLabels: { enabled: false },
    legend: { show: false },
    yaxis: { labels: { formatter: function(val) { return "$" + val } } },
    xaxis: { categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"], labels: { rotate: -90 } }
};
(new ApexCharts(document.querySelector("#market-overview"), barOptions)).render();

var vectormapColors=getChartColorsArray("#sales-by-locations");$("#sales-by-locations").vectorMap({map:"world_mill_en",normalizeFunction:"polynomial",hoverOpacity:.7,hoverColor:!1,regionStyle:{initial:{fill:"#e9e9ef"}},markerStyle:{initial:{r:9,fill:vectormapColors,"fill-opacity":.9,stroke:"#fff","stroke-width":7,"stroke-opacity":.4},hover:{stroke:"#fff","fill-opacity":1,"stroke-width":1.5}},backgroundColor:"transparent",markers:[{latLng:[41.9,12.45],name:"USA"},{latLng:[12.05,-61.75],name:"Russia"},{latLng:[1.3,103.8],name:"Australia"}]});