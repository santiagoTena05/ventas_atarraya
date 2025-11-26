# Cálculos del Sistema de Siembras Automáticas
# Documentación Técnica de Algoritmos y Fórmulas

## Resumen Ejecutivo

El sistema de siembras automáticas del Container Planner es un algoritmo complejo que automatiza la planificación de ciclos de cultivo de camarón desde la fase larval hasta la cosecha. Este documento detalla todos los cálculos, algoritmos y consideraciones que el sistema toma en cuenta para generar planes de siembra óptimos.

## 1. Conceptos Fundamentales del Negocio

### 1.1 Estados de Tanques
- **Ready**: Tanque disponible para uso
- **Setup**: Tanque en preparación
- **Nursery**: Fase de crianza (larvas a juveniles)
- **Growout**: Fase de engorde (juveniles a cosecha)
- **Maintenance**: Tanque en mantenimiento
- **Out of order**: Tanque fuera de servicio
- **Reservoir**: Tanque reservorio

### 1.2 Líneas Genéticas y Curvas de Crecimiento
El sistema maneja tres líneas genéticas principales, cada una con su propia curva de crecimiento:

#### Bolt (Crecimiento Rápido)
```
Semana 0: 0.005g → Semana 20: 31.5g
Crecimiento promedio: ~1.6g/semana después de semana 5
```

#### Red (Crecimiento Intermedio)
```
Semana 0: 0.005g → Semana 20: 28.5g
Crecimiento promedio: ~1.4g/semana después de semana 5
```

#### Dragon (Crecimiento Lento)
```
Semana 0: 0.005g → Semana 20: 17.8g
Crecimiento promedio: ~0.9g/semana después de semana 5
```

### 1.3 Densidades de Cultivo
- **Densidad de Nursery**: 1,500 larvas/m² (configurable)
- **Densidad de Growout**: 350 juveniles/m² (configurable)
- **Mortalidad Estándar**: 20% del ciclo total (configurable)

## 2. Algoritmos de Cálculo Principal

### 2.1 Cálculo de Capacidad de Siembra

#### Fórmula Base para Larvas por Tanque:
```javascript
capacidadLarvasPorTanque = áreaTanque × densidadNursery
totalLarvas = suma(capacidadLarvasPorTanque para todos los tanques nursery)
```

#### Cálculo de Supervivencia:
```javascript
tasaSupervivencia = (100 - porcentajeMortalidad) / 100
supervivientesEsperados = totalLarvas × tasaSupervivencia
```

**Ejemplo Práctico:**
```
Tanque de 23.5 m² con densidad 1,500 larvas/m²:
- Capacidad: 23.5 × 1,500 = 35,250 larvas
- Con 20% mortalidad: 35,250 × 0.8 = 28,200 supervivientes
```

### 2.2 Algoritmo de Selección de Tanques

#### Selección de Tanques Nursery:
```javascript
function seleccionarTanquesNursery(tanquesDisponibles, numeroDeseado) {
  // 1. Filtrar tanques disponibles para período nursery
  tanquesValidos = filtrarPorDisponibilidad(tanquesDisponibles, semanaInicio, duracionNursery)

  // 2. Ordenar por tamaño (más grandes primero)
  tanquesOrdenados = ordenarPorTamaño(tanquesValidos, 'descendente')

  // 3. Seleccionar los primeros N tanques
  tanquesSeleccionados = tanquesOrdenados.slice(0, numeroDeseado)

  return tanquesSeleccionados
}
```

#### Selección de Tanques Growout:
```javascript
function seleccionarTanquesGrowout(supervivientes, densidadGrowout) {
  areaRequerida = supervivientes / densidadGrowout

  // Algoritmo de bin packing optimizado
  tanquesSeleccionados = []
  supervivientesRestantes = supervivientes

  for (tanque of tanquesDisponiblesOrdenados) {
    if (supervivientesRestantes <= 0) break

    capacidadTanque = tanque.area × densidadGrowout
    asignacion = Math.min(supervivientesRestantes, capacidadTanque)

    tanquesSeleccionados.push({
      tanque: tanque,
      asignacion: asignacion
    })

    supervivientesRestantes -= asignacion
  }

  return tanquesSeleccionados
}
```

### 2.3 Validación de Disponibilidad de Tanques

#### Algoritmo de Ventana de Disponibilidad:
```javascript
function encontrarVentanaDisponibilidad(tanqueId, semanaInicio, semanasRequeridas) {
  for (semana = semanaInicio; semana <= maxSemanas - semanasRequeridas; semana++) {
    disponible = true

    for (offset = 0; offset < semanasRequeridas; offset++) {
      semanaVerificar = semana + offset
      estadoCelda = obtenerEstadoCelda(tanqueId, semanaVerificar)

      if (estadoCelda !== 'Ready') {
        disponible = false
        break
      }
    }

    if (disponible) return semana
  }

  return -1 // No disponible
}
```

## 3. Cálculos de Biomasa y Peso

### 3.1 Interpolación de Curvas de Crecimiento

```javascript
function obtenerPesoPorSemana(semana, genetica) {
  curvaCrecimiento = obtenerCurvaPorGenetica(genetica)

  // Manejo de casos extremos
  if (semana < 0) return curvaCrecimiento[0].peso
  if (semana >= curvaCrecimiento.length) {
    return curvaCrecimiento[curvaCrecimiento.length - 1].peso
  }

  // Interpolación lineal para semanas intermedias
  semanaInferior = Math.floor(semana)
  semanaSuperior = Math.ceil(semana)

  if (semanaInferior === semanaSuperior) {
    return curvaCrecimiento[semana].peso
  }

  puntoInferior = curvaCrecimiento[semanaInferior]
  puntoSuperior = curvaCrecimiento[semanaSuperior]
  fraccion = semana - semanaInferior

  return puntoInferior.peso + (puntoSuperior.peso - puntoInferior.peso) × fraccion
}
```

### 3.2 Cálculo de Biomasa Total

```javascript
function calcularBiomasaTotal(poblacion, semana, genetica) {
  pesoIndividual = obtenerPesoPorSemana(semana, genetica)
  biomasaGramos = poblacion × pesoIndividual
  biomasaKg = biomasaGramos / 1000

  return {
    pesoIndividual: pesoIndividual,
    biomasaGramos: biomasaGramos,
    biomasaKg: biomasaKg
  }
}
```

### 3.3 Progresión de Biomasa con Mortalidad

```javascript
function calcularProgresionBiomasa(poblacionInicial, tasaMortalidadSemanal, semanaInicio, semanaFin, genetica) {
  progresion = []
  poblacionActual = poblacionInicial

  for (semana = semanaInicio; semana <= semanaFin; semana++) {
    biomasa = calcularBiomasaTotal(poblacionActual, semana, genetica)

    progresion.push({
      semana: semana,
      poblacion: Math.floor(poblacionActual),
      pesoIndividual: biomasa.pesoIndividual,
      biomasaKg: biomasa.biomasaKg
    })

    // Aplicar mortalidad para siguiente semana
    if (semana < semanaFin && tasaMortalidadSemanal > 0) {
      poblacionActual = poblacionActual × (1 - tasaMortalidadSemanal)
    }
  }

  return progresion
}
```

### 3.4 Cálculo de Pico de Biomasa

```javascript
function calcularPicoBiomasa(poblacionInicial, tasaMortalidadSemanal, semanaMaxima, genetica) {
  progresion = calcularProgresionBiomasa(poblacionInicial, tasaMortalidadSemanal, 0, semanaMaxima, genetica)

  picoBiomasa = progresion.reduce((pico, actual) =>
    actual.biomasaKg > pico.biomasaKg ? actual : pico
  )

  return {
    semana: picoBiomasa.semana,
    poblacion: picoBiomasa.poblacion,
    pesoIndividual: picoBiomasa.pesoIndividual,
    biomasaKg: picoBiomasa.biomasaKg
  }
}
```

## 4. Algoritmo de Distribución de Mortalidad

### 4.1 Distribución de Mortalidad por Semana

```javascript
function calcularMortalidadSemanal(mortalidadTotal, duracionCicloSemanas) {
  // Distribuir mortalidad uniformemente a lo largo del ciclo
  tasaMortalidadSemanal = (mortalidadTotal / 100) / duracionCicloSemanas

  return tasaMortalidadSemanal
}
```

**Ejemplo:**
- Mortalidad total: 20%
- Duración ciclo: 11 semanas (3 nursery + 8 growout)
- Mortalidad semanal: 20% ÷ 11 = 1.818% por semana

### 4.2 Aplicación de Mortalidad Acumulativa

```javascript
function aplicarMortalidadAcumulativa(poblacionInicial, tasaSemanal, semanas) {
  poblacionFinal = poblacionInicial

  for (i = 0; i < semanas; i++) {
    poblacionFinal = poblacionFinal × (1 - tasaSemanal)
  }

  return poblacionFinal
}
```

## 5. Validaciones y Restricciones del Sistema

### 5.1 Validación de Capacidad Mínima

```javascript
function validarCapacidadMinima(tanquesNursery, supervivientes, densidadGrowout) {
  areaRequeridaGrowout = supervivientes / densidadGrowout
  areaDisponibleGrowout = calcularAreaDisponibleGrowout()

  if (areaDisponibleGrowout < areaRequeridaGrowout) {
    return {
      valido: false,
      deficit: areaRequeridaGrowout - areaDisponibleGrowout,
      mensaje: `Se necesitan ${deficit.toFixed(1)} m² adicionales para growout`
    }
  }

  return { valido: true }
}
```

### 5.2 Detección de Conflictos de Programación

```javascript
function detectarConflictos(planSiembra, tanqueId, semanaInicio, duracion) {
  conflictos = []

  for (semana = semanaInicio; semana < semanaInicio + duracion; semana++) {
    estadoActual = obtenerEstadoCelda(tanqueId, semana)

    if (estadoActual !== 'Ready') {
      conflictos.push({
        tanque: tanqueId,
        semana: semana,
        estadoActual: estadoActual,
        generacionExistente: obtenerGeneracion(tanqueId, semana)
      })
    }
  }

  return conflictos
}
```

## 6. Optimizaciones y Heurísticas

### 6.1 Algoritmo de Selección de Generación

```javascript
function obtenerSiguienteNumeroGeneracion() {
  generacionesExistentes = extraerGeneracionesExistentes()
  numerosGeneracion = extraerNumerosDeGeneraciones(generacionesExistentes)

  if (numerosGeneracion.length === 0) return '1'

  maximaGeneracion = Math.max(...numerosGeneracion)
  return (maximaGeneracion + 1).toString()
}

function extraerNumerosDeGeneraciones(generaciones) {
  numeros = []

  for (generacion of generaciones) {
    // Extraer números de formatos como "10A", "P1", "5"
    coincidencia = generacion.match(/\d+/)
    if (coincidencia) {
      numeros.push(parseInt(coincidencia[0]))
    }
  }

  return numeros
}
```

### 6.2 Optimización de Asignación de Tanques

```javascript
function optimizarAsignacionTanques(supervivientes, tanquesDisponibles, densidadGrowout) {
  // Ordenar tanques por disponibilidad temprana y luego por tamaño
  tanquesOptimizados = tanquesDisponibles.sort((a, b) => {
    if (a.semanaDisponible !== b.semanaDisponible) {
      return a.semanaDisponible - b.semanaDisponible
    }
    return b.area - a.area // Más grandes primero
  })

  asignaciones = []
  supervivientesRestantes = supervivientes

  for (tanque of tanquesOptimizados) {
    if (supervivientesRestantes <= 0) break

    capacidadMaxima = tanque.area × densidadGrowout
    asignacionOptima = Math.min(supervivientesRestantes, capacidadMaxima)

    if (asignacionOptima > 0) {
      asignaciones.push({
        tanque: tanque,
        asignacion: asignacionOptima,
        utilizacion: (asignacionOptima / capacidadMaxima) × 100
      })

      supervivientesRestantes -= asignacionOptima
    }
  }

  return asignaciones
}
```

## 7. Formatos de Datos y Estructura

### 7.1 Estructura del Plan de Siembra

```javascript
planSiembra = {
  semanaInicio: number,           // Semana de inicio (0-based)
  generacion: string,             // ID de generación
  genetica: string,               // Línea genética (Bolt, Red, Dragon)
  semanasNursery: number,         // Duración fase nursery
  semanasGrowout: number,         // Duración fase growout
  tanquesNursery: [
    {
      id: number,
      nombre: string,
      tipo: string,
      area: number,
      capacidadLarvas: number
    }
  ],
  tanquesGrowout: [
    {
      id: number,
      nombre: string,
      tipo: string,
      area: number,
      asignacionCamarones: number,
      semanaDisponible: number
    }
  ],
  poblacionLarvalTotal: number,      // Larvas sembradas
  poblacionSupervivienteTotal: number, // Supervivientes esperados
  areaNurseryTotal: number,           // Área total nursery usada
  areaGrowoutRequerida: number,       // Área growout requerida
  areaGrowoutAsignada: number,        // Área growout asignada
  fechaSiembra: string,               // Fecha inicio
  fechaFinNursery: string,            // Fecha fin nursery
  fechaCosecha: string,               // Fecha cosecha
  tasaSupervivencia: number,          // Porcentaje supervivencia
  informacionCosecha: {
    pesoTotalKg: number,
    pesoIndividualGramos: number,
    semanaCosecha: number,
    poblacion: number
  },
  progresionBiomasa: [
    {
      semana: number,
      poblacion: number,
      pesoIndividualGramos: number,
      biomasaKg: number
    }
  ],
  picoBiomasa: {
    semana: number,
    poblacion: number,
    pesoIndividual: number,
    biomasaKg: number
  }
}
```

### 7.2 Estructura de Datos de Celda

```javascript
// Formato de almacenamiento en el mapa de datos
clave = `tank-${tankId}-week-${week}`
valor = estadoTanque

// Metadatos asociados
claveGeneracion = `${clave}-generation`
claveGenetica = `${clave}-genetics`
claveDuracion = `${clave}-duration`
```

## 8. Casos Especiales y Manejo de Errores

### 8.1 Manejo de Capacidad Insuficiente

```javascript
function manejarCapacidadInsuficiente(tanquesDisponibles, numeroSolicitado) {
  if (tanquesDisponibles.length < numeroSolicitado) {
    return {
      continuar: confirm(`Solo ${tanquesDisponibles.length} tanques disponibles para nursery, pero solicitaste ${numeroSolicitado}. ¿Continuar con ${tanquesDisponibles.length} nurseries?`),
      tanquesMaximos: tanquesDisponibles.length
    }
  }
  return { continuar: true, tanquesMaximos: numeroSolicitado }
}
```

### 8.2 Validación de Duraciones Personalizadas

```javascript
function validarDuracionesPersonalizadas(duracionesPersonalizadas, planBase) {
  errores = []

  for ([tanqueId, duracion] of Object.entries(duracionesPersonalizadas)) {
    if (duracion < 8 || duracion > 20) {
      errores.push(`Duración ${duracion} para tanque ${tanqueId} está fuera del rango válido (8-20 semanas)`)
    }

    // Verificar que la duración no cause conflictos
    fechaFinPropuesta = planBase.semanaInicioGrowout + duracion
    if (verificarConflictos(tanqueId, planBase.semanaInicioGrowout, fechaFinPropuesta)) {
      errores.push(`Duración personalizada causa conflicto en tanque ${tanqueId}`)
    }
  }

  return errores
}
```

## 9. Integración con Base de Datos

### 9.1 Transformación para Persistencia

```javascript
function transformarParaBaseDatos(planSiembra) {
  entradas = []

  // Procesar tanques nursery
  for (tanque of planSiembra.tanquesNursery) {
    for (semana = 0; semana < planSiembra.semanasNursery; semana++) {
      entradas.push({
        farm_id: obtenerFarmId(),
        container_id: `tank_${tanque.id}`,
        week: planSiembra.semanaInicio + semana,
        state: 'Nursery',
        generation: planSiembra.generacion,
        genetics: planSiembra.genetica,
        duration: planSiembra.semanasNursery
      })
    }
  }

  // Procesar tanques growout
  for (tanque of planSiembra.tanquesGrowout) {
    duracionPersonalizada = obtenerDuracionPersonalizada(tanque.id) || planSiembra.semanasGrowout

    for (semana = 0; semana < duracionPersonalizada; semana++) {
      entradas.push({
        farm_id: obtenerFarmId(),
        container_id: `tank_${tanque.id}`,
        week: planSiembra.semanaInicio + planSiembra.semanasNursery + semana,
        state: 'Growout',
        generation: planSiembra.generacion,
        genetics: planSiembra.genetica,
        duration: duracionPersonalizada
      })
    }
  }

  return entradas
}
```

## 10. Métricas y Indicadores Calculados

### 10.1 Indicadores de Eficiencia

```javascript
function calcularIndicadoresEficiencia(planSiembra) {
  return {
    utilizacionAreaNursery: (planSiembra.areaNurseryUsada / planSiembra.areaNurseryTotal) × 100,
    utilizacionAreaGrowout: (planSiembra.areaGrowoutAsignada / planSiembra.areaGrowoutRequerida) × 100,
    densidadPromedioLarvas: planSiembra.poblacionLarvalTotal / planSiembra.areaNurseryTotal,
    densidadPromedioJuveniles: planSiembra.poblacionSupervivienteTotal / planSiembra.areaGrowoutAsignada,
    rendimientoPorArea: planSiembra.informacionCosecha.pesoTotalKg / planSiembra.areaGrowoutAsignada,
    eficienciaMortalidad: planSiembra.tasaSupervivencia
  }
}
```

### 10.2 Proyecciones Económicas Base

```javascript
function calcularProyeccionesEconomicas(planSiembra, preciosPorGramo) {
  pesoIndividualCosecha = planSiembra.informacionCosecha.pesoIndividualGramos
  poblacionCosecha = planSiembra.informacionCosecha.poblacion
  pesoTotalCosecha = planSiembra.informacionCosecha.pesoTotalKg

  // Precio basado en categoría de tamaño
  categoria = determinarCategoriaSize(pesoIndividualCosecha)
  precioUnitario = preciosPorGramo[categoria]

  return {
    categoriaSize: categoria,
    valorTotalEstimado: pesoTotalCosecha × 1000 × precioUnitario,
    valorPorTanque: (pesoTotalCosecha × 1000 × precioUnitario) / planSiembra.tanquesGrowout.length,
    rendimientoPorM2: (pesoTotalCosecha × 1000 × precioUnitario) / planSiembra.areaGrowoutAsignada
  }
}
```

## Conclusión

El sistema de siembras automáticas implementa un algoritmo sofisticado que considera múltiples factores biológicos, logísticos y operacionales para generar planes de siembra óptimos. Los cálculos incluyen:

1. **Optimización de capacidad** basada en área disponible y densidades de cultivo
2. **Modelado de crecimiento** específico por línea genética
3. **Distribución temporal** de mortalidad a lo largo del ciclo
4. **Asignación inteligente** de tanques basada en disponibilidad y tamaño
5. **Validación integral** de factibilidad y restricciones operacionales
6. **Proyección de biomasa** y peso de cosecha con interpolación de curvas de crecimiento

Este enfoque algorítmico permite a los operadores planificar ciclos de cultivo complejos con múltiples generaciones y líneas genéticas, optimizando el uso de recursos mientras se mantiene la precisión biológica y operacional.