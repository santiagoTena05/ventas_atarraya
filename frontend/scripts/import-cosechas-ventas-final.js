#!/usr/bin/env node

/**
 * Script CORREGIDO para importar datos históricos
 * Corrige manejo de estatus de pago vacíos y PENDIENTE
 */

const fs = require('fs');
const path = require('path');

const csvPath = '/Users/santiagotena/Desktop/atarraya/11.-COSECHAS GRAL.TONAMECA 2024.csv';

// IDs por defecto
const DEFAULT_IDS = {
  oficina_id: 1,
  responsable_id: 16,
  region_mercado_id: 1,
  tipo_producto_id: 2,
  metodo_pago_id: 2,
  forma_pago_id: 3,
  estatus_pago_cliente_id: 2,
  tipo_cliente_id: 1
};

// Mapeo de tallas (solo existen IDs 1, 2, 3 en la DB)
const TALLA_MAPPING = {
  '10-11': 1,
  '12-15': 2,
  '16-20': 3,
  '21-25': 3,  // Mapear a la talla más cercana
  '26-30': 3   // Mapear a la talla más cercana
};

// Mapeo de canales
const CANAL_TO_CLIENTE_TYPE = {
  'Empleado': 1,
  'Distribucion': 2,
  'Mayorista': 3,
  'Cortesia': 1,
  'Reposicion': 1,
  'Muestra': 1
};

// CORREGIDO: Mapeo de estatus de pago según tu imagen
const ESTATUS_PAGO_MAPPING = {
  'cortesia': 1,       // Cortesía
  'pagado': 2,         // Pagado
  'pendiente': 3,      // Pendiente
  'parcial': 4,        // Parcial
  'vencido': 5,        // Vencido
  '': 6,               // Sin estatus (cuando está vacío)
  'sin estatus': 6     // Sin estatus
};

function parsePrice(priceStr) {
  if (!priceStr || priceStr === '$-' || priceStr === '-') return 0;
  const cleaned = priceStr.toString().replace(/["\s$,]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function parseDate(dateStr) {
  if (!dateStr) return null;

  // Limpiar espacios y caracteres extraños
  const cleaned = dateStr.trim();
  const parts = cleaned.split('/');
  if (parts.length !== 3) return null;

  // Ahora todas las fechas están en formato DD/MM/YYYY
  let [day, month, year] = parts;

  // Convertir año de 2 dígitos a 4 dígitos
  if (year.length === 2) {
    year = `20${year}`;
  }

  // Validar rangos
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);

  if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
    console.log(`❌ Fecha inválida: ${cleaned} -> día:${dayNum}, mes:${monthNum}`);
    return null;
  }

  const formattedDate = `${year}-${monthNum.toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
  const date = new Date(formattedDate);

  // Validar que la fecha sea válida
  if (isNaN(date.getTime())) return null;

  return formattedDate;
}

function parseQuantity(qtyStr) {
  if (!qtyStr || qtyStr === '#DIV/0!') return 0;
  const parsed = parseFloat(qtyStr.toString().replace(/,/g, ''));
  return isNaN(parsed) ? 0 : parsed;
}

function mapCanal(canal) {
  if (!canal) return 'Distribucion';
  const canalLower = canal.toLowerCase();
  if (canalLower.includes('empleado')) return 'Empleado';
  if (canalLower.includes('mayorista')) return 'Mayorista';
  if (canalLower.includes('distribucion')) return 'Distribucion';
  if (canalLower.includes('cortesia')) return 'Cortesia';
  if (canalLower.includes('reposicion')) return 'Reposicion';
  if (canalLower.includes('muestra')) return 'Muestra';
  return 'Distribucion';
}

function getTallaId(tallaRango) {
  for (const [rango, id] of Object.entries(TALLA_MAPPING)) {
    if (tallaRango && tallaRango.includes(rango)) {
      return id;
    }
  }
  return 1;
}

function generateClientName(nombreComprador, canal, rowNum) {
  if (nombreComprador && nombreComprador.trim()) {
    return nombreComprador.trim();
  }

  const canalMap = {
    'Empleado': 'Empleado',
    'Distribucion': 'Cliente Distribucion',
    'Mayorista': 'Cliente Mayorista',
    'Cortesia': 'Cliente Cortesia'
  };

  return `${canalMap[canal] || 'Cliente'} ${rowNum}`;
}

// CORREGIDO: Función para mapear estatus de pago
function mapEstatusPago(estatusStr) {
  if (!estatusStr || estatusStr.trim() === '') {
    return 6; // Sin estatus
  }

  const estatus = estatusStr.toLowerCase().trim();
  return ESTATUS_PAGO_MAPPING[estatus] || 6; // Default a "Sin estatus" si no se encuentra
}

async function importData() {
  try {
    console.log('📖 Leyendo archivo CSV...');

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const cleanContent = csvContent.replace(/^\uFEFF/, '');
    const lines = cleanContent.split(/\r?\n/).filter(line => line.trim().length > 0);

    console.log(`📊 Encontradas ${lines.length - 1} filas de datos`);

    const transformedData = [];
    const errors = [];
    const cosechasMap = new Map();
    const estatusStats = {};

    // Simple CSV parser que maneja comillas
    function parseCSVRow(row) {
      const result = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < row.length; i++) {
        const char = row[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }

      result.push(current.trim());
      return result;
    }

    // Procesar cada fila
    for (let i = 1; i < lines.length; i++) {
      let currentLine = lines[i];
      let shouldSwapDate = false;

      // Verificar si la línea empieza con *
      if (currentLine.startsWith('*')) {
        shouldSwapDate = true;
        currentLine = currentLine.substring(1); // Quitar el *
        console.log(`🔄 Línea ${i + 1}: Detectado * - intercambiará fecha MM/DD -> DD/MM`);
      }

      const cleanRow = parseCSVRow(currentLine);

      // Si necesitamos intercambiar la fecha
      if (shouldSwapDate && cleanRow[0]) {
        const dateParts = cleanRow[0].split('/');
        if (dateParts.length === 3) {
          // Intercambiar MM/DD/YYYY -> DD/MM/YYYY
          const originalDate = cleanRow[0];
          cleanRow[0] = `${dateParts[1]}/${dateParts[0]}/${dateParts[2]}`;
          console.log(`  📅 ${originalDate} -> ${cleanRow[0]}`);
        }
      }

      try {
        const fecha = parseDate(cleanRow[0]);
        const generacion = cleanRow[2];
        const estanque = cleanRow[3];
        const pesoPromedio = parseFloat(cleanRow[4]) || 0;
        const tallaRango = cleanRow[6];
        const cantidad = parseQuantity(cleanRow[7]);
        const precio = parsePrice(cleanRow[9]);
        const total = parsePrice(cleanRow[10]);
        const nombreComprador = cleanRow[13];
        const canal = mapCanal(cleanRow[14]);
        const estatusPago = cleanRow[15] || ''; // CORREGIDO: permitir vacío

        // Estadísticas de estatus
        const estatusKey = estatusPago || 'VACIO';
        estatusStats[estatusKey] = (estatusStats[estatusKey] || 0) + 1;

        if (!fecha || cantidad <= 0) {
          errors.push(`Fila ${i + 1}: Datos inválidos - fecha: ${cleanRow[0]}, cantidad: ${cleanRow[7]}`);
          continue;
        }

        const cosechaKey = `${fecha}_${estanque}_${generacion}`;

        if (!cosechasMap.has(cosechaKey)) {
          cosechasMap.set(cosechaKey, {
            fecha,
            estanque,
            generacion,
            pesoTotal: 0,
            ventas: []
          });
        }

        const cosecha = cosechasMap.get(cosechaKey);
        cosecha.pesoTotal += cantidad;

        cosecha.ventas.push({
          cantidad,
          precio,
          total,
          nombreComprador: generateClientName(nombreComprador, canal, i),
          canal,
          estatusPago,
          estatusId: mapEstatusPago(estatusPago), // CORREGIDO: usar función de mapeo
          tallaId: getTallaId(tallaRango),
          tallaRango,
          pesoPromedio,
          rowOriginal: i + 1
        });

      } catch (error) {
        errors.push(`Fila ${i + 1}: Error procesando: ${error.message}`);
      }
    }

    console.log(`✅ Procesadas ${cosechasMap.size} cosechas únicas`);
    console.log(`✅ Total ventas: ${Array.from(cosechasMap.values()).reduce((sum, c) => sum + c.ventas.length, 0)}`);

    // NUEVO: Mostrar estadísticas de estatus
    console.log('\n📊 Estadísticas de Estatus de Pago:');
    Object.entries(estatusStats).forEach(([estatus, count]) => {
      const estatusId = mapEstatusPago(estatus === 'VACIO' ? '' : estatus);
      console.log(`  ${estatus === 'VACIO' ? 'VACÍO' : estatus}: ${count} registros (ID: ${estatusId})`);
    });

    // Generar SQL corregido
    console.log('\n🔧 Generando SQL...');

    let sqlContent = `-- Migration para importar datos históricos (ESTATUS CORREGIDO)
-- Generado: ${new Date().toISOString()}
-- Cosechas: ${cosechasMap.size}
-- Ventas: ${Array.from(cosechasMap.values()).reduce((sum, c) => sum + c.ventas.length, 0)}

-- CORRECIONES:
-- - Estatus vacío -> ID 6 (Sin estatus)
-- - pendiente (minúscula) -> ID 3 (Pendiente)
-- - Folios basados en secuencia de cosechas

-- Crear clientes temporales (SIN especificar ID)
`;

    // Generar clientes únicos
    const clientesUnicos = new Set();
    Array.from(cosechasMap.values()).forEach(cosecha => {
      cosecha.ventas.forEach(venta => {
        clientesUnicos.add(venta.nombreComprador);
      });
    });

    // Variables temporales para tracking de IDs
    sqlContent += `
-- Variables para hacer tracking de IDs insertados
DO $$
DECLARE
    cliente_map jsonb := '{}';
    cosecha_map jsonb := '{}';
    current_cliente_id int;
    current_cosecha_id int;
    current_folio int;
BEGIN
    -- Obtener próximo folio disponible
    SELECT COALESCE(MAX(folio), 0) + 1 INTO current_folio FROM cosechas;

`;

    // Insertar clientes
    Array.from(clientesUnicos).forEach((cliente, idx) => {
      sqlContent += `
    -- Cliente: ${cliente.replace(/'/g, "''")}
    INSERT INTO clientes (nombre, activo, created_at)
    VALUES ('${cliente.replace(/'/g, "''")}', true, NOW())
    RETURNING id INTO current_cliente_id;

    cliente_map := cliente_map || jsonb_build_object('${cliente.replace(/'/g, "''")}', current_cliente_id);
`;
    });

    sqlContent += `\n    -- Insertar cosechas y ventas\n`;

    Array.from(cosechasMap.entries()).forEach(([key, cosecha], idx) => {
      sqlContent += `
    -- Cosecha: ${cosecha.estanque} - ${cosecha.fecha}
    INSERT INTO cosechas (
        folio, responsable_id, oficina_id, fecha_cosecha, peso_total_kg, estado, notas, created_at, updated_at
    ) VALUES (
        current_folio + ${idx},
        ${DEFAULT_IDS.responsable_id},
        ${DEFAULT_IDS.oficina_id},
        '${cosecha.fecha} 08:00:00+00',
        ${cosecha.pesoTotal.toFixed(3)},
        'vendida',
        'Importado CSV - ${cosecha.estanque} Gen ${cosecha.generacion}',
        '${cosecha.fecha} 08:00:00+00',
        '${cosecha.fecha} 08:00:00+00'
    ) RETURNING id INTO current_cosecha_id;

    cosecha_map := cosecha_map || jsonb_build_object('${key}', current_cosecha_id);
`;

      // Insertar cosecha_tallas
      const tallasEnCosecha = {};
      cosecha.ventas.forEach(venta => {
        if (!tallasEnCosecha[venta.tallaId]) {
          tallasEnCosecha[venta.tallaId] = 0;
        }
        tallasEnCosecha[venta.tallaId] += venta.cantidad;
      });

      Object.entries(tallasEnCosecha).forEach(([tallaId, peso]) => {
        const porcentaje = (peso / cosecha.pesoTotal) * 100;
        sqlContent += `
    INSERT INTO cosecha_tallas (cosecha_id, talla_camaron_id, peso_talla_kg, porcentaje_talla, created_at)
    VALUES (current_cosecha_id, ${tallaId}, ${peso.toFixed(3)}, ${Math.min(99.99, porcentaje).toFixed(2)}, '${cosecha.fecha} 08:00:00+00');
`;
      });

      // Insertar ventas
      cosecha.ventas.forEach((venta, ventaIdx) => {
        sqlContent += `
    -- Venta: ${venta.nombreComprador} - Estatus: ${venta.estatusPago || 'VACÍO'} (ID: ${venta.estatusId})
    INSERT INTO ventas (
        folio, oficina_id, responsable_id, region_mercado_id, fecha_entrega, cliente_id, tipo_cliente_id,
        tipo_producto_id, talla_camaron_id, entero_kgs, precio_venta, descuento_porcentaje,
        descuento_mxn, metodo_pago_id, forma_pago_id, estatus_pago_cliente_id,
        created_at, updated_at, cosecha_id
    ) VALUES (
        (current_folio + ${idx}) * 1000 + ${ventaIdx + 1},
        ${DEFAULT_IDS.oficina_id},
        ${DEFAULT_IDS.responsable_id},
        ${DEFAULT_IDS.region_mercado_id},
        '${cosecha.fecha}',
        (cliente_map->>'${venta.nombreComprador.replace(/'/g, "''")}')::int,
        ${CANAL_TO_CLIENTE_TYPE[venta.canal] || 1},
        ${DEFAULT_IDS.tipo_producto_id},
        ${venta.tallaId},
        ${venta.cantidad.toFixed(3)},
        ${venta.precio.toFixed(2)},
        0.00,
        0.00,
        ${DEFAULT_IDS.metodo_pago_id},
        ${DEFAULT_IDS.forma_pago_id},
        ${venta.estatusId}, -- CORREGIDO: usar estatusId mapeado
        '${cosecha.fecha} 08:30:00+00',
        '${cosecha.fecha} 08:30:00+00',
        current_cosecha_id
    );
`;
      });
    });

    sqlContent += `\nEND $$;\n`;

    // Guardar SQL
    const migrationDir = path.join(__dirname, '../supabase/migrations');
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 14);
    const sqlPath = path.join(migrationDir, `${timestamp}_import_historical_data_final.sql`);
    fs.writeFileSync(sqlPath, sqlContent);

    console.log(`\n💾 Migration FINAL creada: ${sqlPath}`);
    console.log('\n✅ Proceso completado!');
    console.log('\n🚀 Próximos pasos:');
    console.log('1. npx supabase migration up');
    console.log('2. Verificar en Studio local');
    console.log('3. Si todo OK: npx supabase db push');

    if (errors.length > 0) {
      console.log('\n⚠️  Errores encontrados:');
      errors.forEach(error => console.log(`   ${error}`));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  importData();
}

module.exports = { importData };