function printLoteBlob() {
    // Recopilar datos del modal "Detalles del Lote"
    const info = {
        codigo: document.getElementById('detalleCodigo').textContent,
        NCompra: document.getElementById('detalleNCompra').textContent,
        fecha: document.getElementById('detalleFecha').textContent,
        ubicacion: document.getElementById('detalleUbicacion').textContent,
        productor: document.getElementById('detalleProductor').textContent,
        procedencia: document.getElementById('detalleProcedencia').textContent,
        responsable: document.getElementById('detalleResponsable').textContent,
        variedad: document.getElementById('detalleVariedad').textContent,
        humedad: document.getElementById('detalleHumedad').textContent,
        totalCostales: document.getElementById('detalleTotalCostales').textContent,
        pesoTotal: document.getElementById('detallePesoTotal').textContent,
        descuento: document.getElementById('detalleDescuento').textContent,
        pesoNeto: document.getElementById('detallePesoNeto').textContent,
        costoKg: document.getElementById('detalleCostoKg').textContent,
        condicion: document.getElementById('detalleCondicionIngreso').textContent,
        costoLote: document.getElementById('detalleCostoLote').textContent,
        gastosT: document.getElementById('detalleGastosT').textContent,
        montoAdelanto: document.getElementById('detalleMontoAdelanto').textContent,
        montoPendiente: document.getElementById('detalleMontoPendiente').textContent,
        costoT: document.getElementById('detalleCostoT').textContent,
        costoRealkg: document.getElementById('detalleCostoRealkg').textContent,
        observacion: document.getElementById('detalleObservacion').textContent
    };

    // Extraer detalles de costales y gastos si existen
    const costales = Array.from(document.querySelectorAll('#detalleListaCostales tr')).map(row => ({
        index: row.cells[0].textContent,
        peso: row.cells[1].textContent
    }));
    const gastos = Array.from(document.querySelectorAll('#detalleListaGastos tr')).map(row => ({
        tipo: row.cells[0].textContent,
        fecha: row.cells[1].textContent,
        responsable: row.cells[2].textContent,
        motivo: row.cells[3].textContent,
        monto: row.cells[4].textContent
    }));

    // Armar el HTML completo con estilos para A4 (márgenes, ancho fijo, sin scroll)
    const htmlContent = `
  <!DOCTYPE html>
  <html lang="es">
  <head>
    <meta charset="UTF-8">
    <title>Detalles del Lote</title>
    <style>
      @page { margin: 20mm; }
      body { font-family: Arial, sans-serif; font-size: 12px; margin:0; padding:20px; max-width:210mm; min-height:297mm; }
      h2, h3 { text-align: center; margin-bottom: 10px; }
      h3 { border-bottom: 1px solid #000; padding-bottom: 5px; margin-top: 20px; }
      p { margin: 4px 0; }
      .section { margin-bottom: 15px; }
      .signature { width: 45%; display: inline-block; text-align: center; }
      .signature hr { border-top: 1px solid #000; }
      .info-row { display: flex; justify-content: space-between; }
      .info-row > div { width: 48%; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
      table, th, td { border: 1px solid #000; }
      th, td { padding: 8px; text-align: left; }
    </style>
  </head>
  <body>
    <h2>Detalle del Lote</h2>
    
    <div class="section">
      <h3>Información General</h3>
      <div class="info-row">
        <div><strong>Código:</strong> ${info.codigo}</div>
        <div><strong>Nota de Compra:</strong> ${info.NCompra}</div>
      </div>
      <div class="info-row">
        <div><strong>Fecha:</strong> ${info.fecha}</div>
        <div><strong>Ubicación:</strong> ${info.ubicacion}</div>
      </div>
      <div class="info-row">
        <div><strong>Productor:</strong> ${info.productor}</div>
        <div><strong>Procedencia:</strong> ${info.procedencia}</div>
      </div>
      <div class="info-row">
        <div><strong>Responsable:</strong> ${info.responsable}</div>
      </div>
    </div>

    <div class="section">
      <h3>Datos del Producto</h3>
      <div class="info-row">
        <div><strong>Variedad:</strong> ${info.variedad}</div>
        <div><strong>Humedad:</strong> ${info.humedad}</div>
      </div>
      <div class="info-row">
        <div><strong>Costales:</strong> ${info.totalCostales}</div>
        <div><strong>Peso Bruto:</strong> ${info.pesoTotal}</div>
      </div>
      <div class="info-row">
        <div><strong>Descuento:</strong> ${info.descuento}</div>
        <div><strong>Peso Neto:</strong> ${info.pesoNeto}</div>
      </div>
    </div>

    <div class="section">
      <h3>Información Financiera</h3>
      <div class="info-row">
        <div><strong>Costo/Kg:</strong> ${info.costoKg}</div>
        <div><strong>Condición:</strong> ${info.condicion}</div>
      </div>
      <div class="info-row">
        <div><strong>Costo del Lote:</strong> ${info.costoLote}</div>
        <div><strong>Total Gastos:</strong> ${info.gastosT}</div>
      </div>
      <div class="info-row">
        <div><strong>Adelanto:</strong> ${info.montoAdelanto}</div>
        <div><strong>Pendiente:</strong> ${info.montoPendiente}</div>
      </div>
      <div class="info-row">
        <div><strong>Costo Total:</strong> ${info.costoT}</div>
        <div><strong>Costo Real/Kg:</strong> ${info.costoRealkg}</div>
      </div>
    </div>

    <div class="section">
      <h3>Observaciones</h3>
      <p>${info.observacion}</p>
    </div>
    
    ${costales.length ? `
    <div class="section">
      <h3>Detalle de Costales</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Peso (Kg)</th>
          </tr>
        </thead>
        <tbody>
          ${costales.map(c => `
          <tr>
            <td>${c.index}</td>
            <td>${c.peso}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr>
            <th>Total:</th>
            <th>${info.pesoTotal}</th>
          </tr>
        </tfoot>
      </table>
    </div>` : ''}

    ${gastos.length ? `
    <div class="section">
      <h3>Detalle de Gastos</h3>
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Fecha</th>
            <th>Responsable</th>
            <th>Motivo</th>
            <th>Monto</th>
          </tr>
        </thead>
        <tbody>
          ${gastos.map(g => `
          <tr>
            <td>${g.tipo}</td>
            <td>${g.fecha}</td>
            <td>${g.responsable}</td>
            <td>${g.motivo}</td>
            <td>${g.monto}</td>
          </tr>`).join('')}
        </tbody>
        <tfoot>
          <tr>
            <th colspan="4">Total:</th>
            <th>${info.gastosT}</th>
          </tr>
        </tfoot>
      </table>
    </div>` : ''}
    
    <div class="section" style="margin-top:40px;">
      <div class="signature">
        <hr>
        <p>Firma del Proveedor</p>
      </div>
      <div class="signature" style="float:right;">
        <hr>
        <p>Firma del Comprador</p>
      </div>
      <div style="clear:both;"></div>
    </div>
  </body>
  </html>
  `;

    // Crear un iframe oculto
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Insertar el contenido HTML en el iframe
    iframe.contentDocument.open();
    iframe.contentDocument.write(htmlContent);
    iframe.contentDocument.close();

    // Imprimir desde el iframe
    iframe.onload = () => {
        iframe.contentWindow.print();
        // Eliminar el iframe después de imprimir
        setTimeout(() => {
            document.body.removeChild(iframe);
        }, 100);
    };
}
