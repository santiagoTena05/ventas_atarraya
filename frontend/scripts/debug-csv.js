#!/usr/bin/env node

const fs = require('fs');

const csvPath = '/Users/santiagotena/Desktop/atarraya/11.-COSECHAS GRAL.TONAMECA 2024.csv';

console.log('🔍 Debuggeando CSV...');
console.log('📁 Ruta:', csvPath);

try {
  // Verificar si existe
  const exists = fs.existsSync(csvPath);
  console.log('📂 Archivo existe:', exists);

  if (!exists) {
    console.log('❌ Archivo no encontrado');
    process.exit(1);
  }

  // Leer archivo
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  console.log('📊 Tamaño del archivo:', csvContent.length, 'caracteres');

  // Analizar terminadores de línea
  const crlfCount = (csvContent.match(/\r\n/g) || []).length;
  const lfCount = (csvContent.match(/(?<!\r)\n/g) || []).length;
  const crCount = (csvContent.match(/\r(?!\n)/g) || []).length;

  console.log('🔧 Terminadores de línea:');
  console.log('  - CRLF (\\r\\n):', crlfCount);
  console.log('  - LF (\\n):', lfCount);
  console.log('  - CR (\\r):', crCount);

  // Dividir líneas usando diferentes métodos
  const linesNewline = csvContent.split('\n');
  const linesCarriageReturn = csvContent.split('\r');
  const linesBoth = csvContent.split(/\r?\n/);

  console.log('📋 Líneas encontradas:');
  console.log('  - split("\\n"):', linesNewline.length);
  console.log('  - split("\\r"):', linesCarriageReturn.length);
  console.log('  - split(/\\r?\\n/):', linesBoth.length);

  // Mostrar primeras líneas
  console.log('\n📄 Primeras 3 líneas (método óptimo):');
  const bestLines = linesBoth.filter(line => line.trim().length > 0);
  console.log('  - Total líneas no vacías:', bestLines.length);

  for (let i = 0; i < Math.min(3, bestLines.length); i++) {
    console.log(`  ${i + 1}: "${bestLines[i].substring(0, 100)}..."`);
  }

  // Analizar separadores en la primera línea de datos
  if (bestLines.length > 1) {
    const headerLine = bestLines[0];
    const dataLine = bestLines[1];

    console.log('\n🔍 Análisis de separadores:');
    console.log('  - Comas en header:', (headerLine.match(/,/g) || []).length);
    console.log('  - Comas en datos:', (dataLine.match(/,/g) || []).length);
    console.log('  - Punto y coma en header:', (headerLine.match(/;/g) || []).length);
    console.log('  - Punto y coma en datos:', (dataLine.match(/;/g) || []).length);

    // Probar split con coma
    const headerCells = headerLine.split(',');
    const dataCells = dataLine.split(',');

    console.log('\n📊 Split con coma:');
    console.log('  - Columnas en header:', headerCells.length);
    console.log('  - Columnas en datos:', dataCells.length);
    console.log('  - Primeras 5 columnas header:', headerCells.slice(0, 5));
    console.log('  - Primeras 5 columnas datos:', dataCells.slice(0, 5));
  }

} catch (error) {
  console.error('❌ Error:', error.message);
}