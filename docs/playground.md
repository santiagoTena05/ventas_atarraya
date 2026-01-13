# Playground - Sistema de Simulación de Cosechas

## Propósito General
Vista para simular cosechas futuras y generar pedidos, conectada directamente con las proyecciones del planner.

## Estructura de la Vista

### Eje Temporal (Columnas)
- **Inicio automático**: Siempre empieza en la semana actual (no se pueden planear cosechas pasadas)
- **Cada semana contiene 2 columnas**:
  - **Izquierda (Ventas Proyectadas)**: Suma del peso de cosechas registradas para esa talla
  - **Derecha (Inventario Neto)**: Viene de las proyecciones del planner

### Eje de Tallas (Filas)
- Basadas en **tallas comerciales** predefinidas
- Las equivalencias deberían estar ya implementadas (usadas para cálculos de precios en ventas)
- **Tallas a implementar** (según imagen original):
  - 61-70
  - 51-60
  - 41-50
  - 31-40
  - 31-35
  - 26-30
  - 21-25
  - 16-20

## Lógica de Colores

### Azul
- **Condición**: Ventas ≤ Inventario Neto
- **Significado**: Hay suficiente inventario proyectado para cubrir las ventas

### Amarillo
- **Condición**: Cosecha técnica pendiente
- **Trigger**: Cuando cierto parámetro es superado por estanque
- **Acción requerida**: Cosecha obligatoria

### Rojo
- **Condición**: Ventas Proyectadas > Inventario Neto
- **Significado**: Las cosechas registradas superan el inventario disponible proyectado
- **Ejemplo**: Si hay 100 cosechas registradas pero inventario neto de 0, la celda se muestra en rojo

## Cosechas Técnicas

### Funcionamiento
- Se activan automáticamente cuando se supera un **parámetro crítico por estanque**
- Son **obligatorias** (no opcionales)
- Aparecen destacadas en **amarillo**

### Parámetros que Activan Cosecha Técnica
- [ ] **TODO**: Definir qué parámetros específicos activan las cosechas técnicas
- [ ] **TODO**: ¿Es por densidad? ¿Por biomasa? ¿Por mortalidad? ¿Por tiempo?

### Proceso de Asignación
1. Celda amarilla aparece (cosecha técnica detectada)
2. Usuario hace click en la celda
3. Se abre modal de asignación (ver Modal de Asignación)
4. Usuario registra la cosecha
5. Celda cambia a azul (cosecha asignada)

## Modal de Asignación de Cosechas

### Campos del Modal (según imagen)
- **Cliente**: Dropdown con clientes disponibles
- **Categorías**: Selector (LIVE, etc.)
- **Presentación**: Selector (DRY, etc.)
- **Tamaño Comercial**: Selector de talla (51-60, etc.)
- **Cantidad lb**: Input numérico
- **Recurrente**: Checkbox
- **Eliminar**: Opción para eliminar

### Acciones
- **Guardar**: Confirma la cosecha
- **Agregar nuevo**: Permite múltiples asignaciones para la misma celda

## Integración con el Planner

### Datos que Consume
- **Proyecciones de inventario** por talla y semana
- **Biomasa proyectada** por estanque
- **Parámetros críticos** por estanque (para cosechas técnicas)

### Datos que Genera
- **Cosechas programadas** que afectan el inventario futuro
- **Pedidos simulados** basados en las cosechas asignadas

## Equivalencias de Tallas

### Investigar
- [ ] **TODO**: Verificar si las equivalencias talla/peso ya están implementadas
- [ ] **TODO**: Buscar en código existente de cálculos de precios en ventas
- [ ] **TODO**: Definir mapeo completo de tallas comerciales a rangos de peso

## Funcionalidades Pendientes de Definir

### Navegación Temporal
- [ ] **TODO**: ¿Cuántas semanas mostrar hacia el futuro?
- [ ] **TODO**: ¿Scroll horizontal? ¿Paginación?

### Filtros y Configuración
- [ ] **TODO**: ¿Filtros por cliente? ¿Por tipo de producto?
- [ ] **TODO**: ¿Configuración de parámetros de cosecha técnica?

### Validaciones
- [ ] **TODO**: ¿Qué pasa si se asigna más cosecha que inventario disponible?
- [ ] **TODO**: ¿Alertas o warnings?

### Reportes/Exportación
- [ ] **TODO**: ¿Se puede exportar el plan de cosechas?
- [ ] **TODO**: ¿Integración con sistema de pedidos real?

## Notas de Implementación

### Componentes Necesarios
- Tabla principal con scroll horizontal
- Modal de asignación de cosechas
- Sistema de colores dinámico
- Integración con hooks del planner

### Consideraciones Técnicas
- Rendimiento con muchas semanas/tallas
- Actualización en tiempo real de proyecciones
- Manejo de estado de cosechas asignadas vs proyecciones

---

**Estado**: Documentación inicial - Pendiente completar detalles faltantes
**Próximos pasos**: Definir parámetros de cosecha técnica y completar especificaciones técnicas