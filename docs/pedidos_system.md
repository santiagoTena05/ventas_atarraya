# Sistema de Pedidos - Especificación de Funcionalidades

## Descripción General

El Sistema de Pedidos es una interfaz para terceros que permite a clientes externos crear órdenes directamente conectadas al inventario de la Estrategia Comercial. Funciona como una extensión del sistema de cosechas, registrando ventas directamente en el inventario disponible.

---

## 1. Autenticación y Control de Acceso

### 1.1 Tipos de Usuario

#### **Usuario Interno (Staff)**
- Acceso completo al sistema
- Puede ver todos los pedidos
- Puede editar y eliminar pedidos
- Acceso a métricas y reportes
- Puede gestionar usuarios terceros

#### **Usuario Tercero (Cliente Externo)**
- Acceso limitado solo a creación de pedidos
- Solo puede ver sus propios pedidos
- No puede editar pedidos después de crearlos
- No tiene acceso a inventario total ni métricas
- Interfaz simplificada

#### **Usuario Administrador**
- Todos los permisos de usuario interno
- Gestión de usuarios y permisos
- Configuración del sistema
- Acceso a auditoría completa

### 1.2 Sistema de Login

#### **Pantalla de Login Unificada**
```
- Email/Usuario
- Contraseña
- Botón "Iniciar Sesión"
- Link "¿Olvidaste tu contraseña?"
- Registro para nuevos usuarios terceros
```

#### **Proceso de Autenticación**
1. Validación de credenciales
2. Identificación del tipo de usuario
3. Redirección a interfaz correspondiente
4. Establecimiento de sesión y permisos

### 1.3 Registro de Usuarios Terceros

#### **Auto-registro Controlado**
- Los terceros pueden registrarse con aprobación pendiente
- Formulario de registro con información de empresa
- Verificación de email obligatoria
- Aprobación manual por administrador antes de activar cuenta

#### **Información Requerida para Registro**
- Nombre completo
- Email corporativo
- Nombre de empresa
- Teléfono de contacto
- Dirección
- Tipo de cliente (se asigna automáticamente o se selecciona)

---

## 2. Interfaces Diferenciadas por Tipo de Usuario

### 2.1 Interfaz para Usuarios Internos (Staff)

#### **Dashboard Principal**
- Vista completa de todos los pedidos
- Métricas en tiempo real:
  - Pedidos pendientes
  - Pedidos en proceso
  - Pedidos completados
  - Ingresos proyectados
- Filtros avanzados por cliente, fecha, estado, responsable
- Acceso a todas las funcionalidades del sistema

#### **Gestión Completa de Pedidos**
- Crear pedidos en nombre de clientes
- Editar cualquier pedido
- Cambiar estados de pedidos
- Eliminar pedidos (con confirmación)
- Ver historial completo de cambios
- Asignar responsables internos

#### **Integración con Inventario**
- Vista completa del inventario disponible
- Capacidad de reservar inventario para pedidos futuros
- Alertas de inventario bajo
- Proyecciones de inventario vs pedidos pendientes

### 2.2 Interfaz para Usuarios Terceros (Clientes Externos)

#### **Dashboard Simplificado**
- Solo sus pedidos propios
- Estado actual de cada pedido
- Historial de pedidos anteriores
- Información de contacto para soporte

#### **Creación de Pedidos (Como ya implementado)**
- Selección de talla/fecha disponible
- Vista del inventario disponible para esa selección
- Entrada de cantidad deseada
- Validación en tiempo real
- Notas/observaciones adicionales

#### **Limitaciones de Terceros**
- No pueden ver pedidos de otros clientes
- No pueden editar pedidos una vez creados
- No ven inventario total ni métricas del sistema
- No pueden cambiar estados de pedidos
- Solo pueden cancelar pedidos en estado "Pendiente"

---

## 3. Gestión de Estados de Pedidos

### 3.1 Estados del Pedido

#### **Pendiente** (Estado inicial)
- Pedido creado pero no procesado
- Puede ser editado por staff
- Puede ser cancelado por el cliente
- Inventario reservado temporalmente

#### **En Proceso**
- Pedido confirmado y en preparación
- Solo staff puede cambiar a este estado
- Inventario comprometido definitivamente
- Cliente recibe notificación automática

#### **Listo para Entrega**
- Pedido preparado y disponible
- Notificación automática al cliente
- Coordinación de entrega/pickup

#### **Completado**
- Pedido entregado y cerrado
- Se registra como venta definitiva en Estrategia Comercial
- Inventario se descuenta definitivamente

#### **Cancelado**
- Pedido anulado
- Inventario liberado
- Registro del motivo de cancelación

### 3.2 Flujo de Estados

```
Pendiente → En Proceso → Listo para Entrega → Completado
    ↓
 Cancelado (desde cualquier estado anterior a Completado)
```

### 3.3 Notificaciones por Estado

#### **Automáticas por Email**
- Confirmación de pedido creado
- Cambio a "En Proceso"
- Cambio a "Listo para Entrega"
- Pedido completado
- Cancelación de pedido

#### **Notificaciones Internas**
- Nuevos pedidos para staff
- Pedidos que requieren atención
- Alertas de inventario insuficiente
- Pedidos próximos a fecha de entrega

---

## 4. Integración con Estrategia Comercial

### 4.1 Sincronización de Inventario

#### **Lectura en Tiempo Real**
- Los pedidos leen el inventario disponible directamente de Estrategia Comercial
- Cálculo automático: Inventario Total - Ventas Proyectadas = Inventario Disponible
- Actualización automática cuando cambia el inventario en Estrategia Comercial

#### **Registro de Ventas**
- Cuando un pedido se completa, se registra automáticamente como venta en Estrategia Comercial
- Utiliza la misma estructura de datos que las cosechas asignadas
- Mantiene trazabilidad completa entre ambos sistemas

### 4.2 Validaciones de Inventario

#### **Validación en Tiempo de Creación**
- Verificación de inventario disponible al seleccionar talla/fecha
- Advertencias si la cantidad solicitada excede el inventario
- Opción de crear pedido "sobre inventario" con aprobación manual

#### **Validación Continua**
- Monitoreo de cambios en inventario que afecten pedidos pendientes
- Alertas automáticas si el inventario de un pedido pendiente se reduce
- Re-validación antes de cambiar estado a "En Proceso"

---

## 5. Gestión de Clientes y Productos

### 5.1 Base de Datos de Clientes

#### **Información de Cliente**
- Datos básicos (nombre, contacto, dirección)
- Tipo de cliente (distribuidor, restaurante, retail, etc.)
- Historial de compras
- Preferencias de entrega
- Términos de pago acordados

#### **Gestión por Staff**
- Crear nuevos clientes
- Editar información de clientes existentes
- Asignar descuentos o precios especiales
- Gestionar crédito y términos de pago

### 5.2 Catálogo de Productos

#### **Productos Disponibles**
- Lista sincronizada con tipos de producto en Estrategia Comercial
- Descripciones detalladas
- Precios por talla/calidad
- Disponibilidad por semana

#### **Gestión de Precios**
- Precios base por producto y talla
- Precios especiales por tipo de cliente
- Descuentos por volumen
- Precios históricos para análisis

---

## 6. Reportes y Analytics

### 6.1 Reportes para Staff

#### **Reportes Operativos**
- Pedidos por estado y fecha
- Inventario vs demanda proyectada
- Performance por cliente
- Análisis de rentabilidad por producto/talla

#### **Reportes Gerenciales**
- Ingresos proyectados vs realizados
- Tendencias de demanda
- Eficiencia en tiempos de entrega
- Satisfacción del cliente

### 6.2 Dashboard de Métricas

#### **KPIs en Tiempo Real**
- Total de pedidos activos
- Inventario disponible vs comprometido
- Ingresos del mes actual vs proyectado
- Tiempo promedio de procesamiento

#### **Alertas Automáticas**
- Inventario bajo para productos con pedidos pendientes
- Pedidos atrasados en procesamiento
- Clientes con pagos pendientes
- Discrepancias en inventario

---

## 7. Características de Usabilidad

### 7.1 Para Usuarios Terceros

#### **Simplicidad**
- Interfaz intuitiva y minimalista
- Proceso de pedido en pasos claros
- Validaciones en tiempo real
- Confirmaciones visuales claras

#### **Transparencia**
- Vista clara del inventario disponible
- Información precisa de precios
- Estados de pedido actualizados
- Tiempos de entrega estimados

### 7.2 Para Staff Interno

#### **Eficiencia**
- Acceso rápido a información crítica
- Filtros y búsquedas avanzadas
- Acciones masivas (aprobar múltiples pedidos)
- Atajos de teclado para acciones comunes

#### **Control Total**
- Visibilidad completa del sistema
- Capacidad de intervenir en cualquier proceso
- Auditoría completa de acciones
- Herramientas de resolución de problemas

---

## 8. Seguridad y Auditoría

### 8.1 Seguridad de Datos

#### **Protección de Información**
- Encriptación de datos sensibles
- Acceso basado en roles y permisos
- Sesiones seguras con timeout automático
- Protección contra ataques comunes (SQL injection, XSS, etc.)

#### **Segregación de Datos**
- Los terceros solo ven sus propios datos
- Información de inventario limitada a lo necesario
- Precios y márgenes protegidos

### 8.2 Auditoría y Trazabilidad

#### **Log de Acciones**
- Registro completo de todas las acciones de usuarios
- Timestamping de cambios en pedidos
- Historial de cambios de estado
- Tracking de accesos al sistema

#### **Compliance**
- Backup automático de datos
- Retención de registros según normativas
- Capacidad de auditoría externa
- Reportes de compliance

---

## 9. Integraciones Futuras

### 9.1 Sistemas de Pago

#### **Procesamiento de Pagos**
- Integración con pasarelas de pago
- Soporte para múltiples métodos de pago
- Manejo de crédito y términos de pago
- Facturación automática

### 9.2 Logística

#### **Gestión de Entregas**
- Integración con sistemas de transporte
- Tracking de envíos
- Optimización de rutas
- Confirmación de entrega

### 9.3 Comunicaciones

#### **Notificaciones Avanzadas**
- SMS para actualizaciones críticas
- WhatsApp Business para comunicación
- Integración con CRM existente
- Notificaciones push para app móvil

---

## 10. Sistema de Snapshots de Inventario - Implementación Requerida

### 10.1 Descripción del Problema Actual

#### **Estado Actual**
- Estrategia Comercial calcula inventario **dinámicamente en tiempo real** desde datos del planner
- Pedidos sistema necesita acceso a este inventario pero no hay mecanismo eficiente de acceso
- Sistema de snapshots existe (`projected_inventory_snapshots` table) pero **no está implementado**
- Hook `useProjectedInventorySnapshots` existe pero nunca es usado
- Actualmente usando datos mock en Pedidos para pruebas

#### **Problemas de la Implementación Actual**
1. **Performance**: Cada consulta de inventario requiere cálculos complejos en tiempo real
2. **Inconsistencia**: Diferentes partes del sistema pueden calcular valores ligeramente diferentes
3. **Dependencias**: Pedidos depende directamente de la lógica de Estrategia Comercial
4. **Escalabilidad**: No viable para múltiples usuarios consultando inventario simultáneamente

### 10.2 Diseño del Sistema de Snapshots

#### **Arquitectura Objetivo**
```
Estrategia Comercial (cambios) → Trigger snapshot generation → projected_inventory_snapshots table → Pedidos (lectura rápida)
```

#### **Tabla: projected_inventory_snapshots**
```sql
- id (uuid, primary key)
- plan_id (uuid, foreign key to planner_planes)
- estanque_id (integer, foreign key to estanques)
- fecha_semana (date, week of inventory)
- talla_comercial (string, commercial size)
- inventario_total_kg (numeric, total inventory in kg)
- source_block_id (uuid, reference to planner_bloques)
- block_info (jsonb, metadata from planner block)
- snapshot_date (timestamp, when snapshot was created)
- created_at (timestamp, record creation)
```

#### **Flujo de Datos**
1. **Usuario modifica datos** en Estrategia Comercial (siembras, cosechas, ventas)
2. **Sistema detecta cambios** y marca version como "dirty"
3. **Background proceso** regenera snapshots para affected weeks/estanques
4. **Pedidos lee desde snapshots** en lugar de calcular en tiempo real
5. **Cache invalidation** cuando snapshots se actualizan

### 10.3 Componentes a Implementar

#### **10.3.1 Snapshot Generation Service**

**Archivo**: `frontend/lib/services/snapshotGenerator.ts`
```typescript
interface SnapshotGenerationOptions {
  planId: string;
  dateRange?: { start: string; end: string };
  forceRegenerate?: boolean;
}

class InventorySnapshotGenerator {
  // Generar snapshots desde datos del planner
  generateSnapshots(options: SnapshotGenerationOptions): Promise<void>

  // Detectar qué semanas necesitan regeneración
  getStaleSnapshots(planId: string): Promise<string[]>

  // Limpiar snapshots obsoletos
  cleanupOldSnapshots(planId: string, keepDays: number): Promise<void>

  // Validar consistencia de snapshots
  validateSnapshots(planId: string): Promise<ValidationResult>
}
```

#### **10.3.2 Hook Integration**

**Modificar**: `frontend/hooks/useProjectedInventorySnapshots.ts`
- Integrar con snapshot generation service
- Agregar auto-refresh cuando snapshots cambian
- Implementar fallback a cálculo dinámico si snapshots no están disponibles
- Agregar método para forzar regeneración

#### **10.3.3 Estrategia Comercial Integration**

**Modificar**: `frontend/hooks/useEstrategiaComercialData.ts`
- Agregar snapshot generation triggers
- Detectar cuándo los datos cambian y marcar snapshots como stale
- Opción para usar snapshots vs cálculo dinámico
- Background refresh de snapshots

#### **10.3.4 Pedidos Integration**

**Modificar**: `frontend/lib/hooks/useInventoryAvailability.ts`
- Remover datos mock actuales
- Usar snapshots como fuente primaria de datos
- Implementar fallback a Estrategia Comercial si snapshots no disponibles
- Agregar invalidación de cache cuando snapshots se actualizan

#### **10.3.5 Admin Interface para Snapshots**

**Nuevo**: `frontend/components/admin/SnapshotManager.tsx`
- Ver estado de snapshots por plan
- Forzar regeneración manual
- Ver métricas de performance (snapshot generation times)
- Diagnosticar problemas de consistencia
- Limpiar snapshots obsoletos

### 10.4 Implementación Step-by-Step

#### **Step 1: Snapshot Generation Core (3 días)**
1. Implementar `InventorySnapshotGenerator` service
2. Crear algoritmo de conversión: planner_bloques → projected_inventory_snapshots
3. Implementar size distribution logic (tallas comerciales)
4. Agregar tests unitarios para generation logic

#### **Step 2: Database Triggers y Automation (2 días)**
1. Detectar cambios en planner_bloques, ventas, cosechas_asignadas
2. Implementar queue system para background snapshot generation
3. Agregar timestamp tracking para change detection
4. Implementar batch processing para multiple snapshot updates

#### **Step 3: Hook Integration (2 días)**
1. Modificar useProjectedInventorySnapshots para usar new service
2. Agregar auto-refresh mechanism
3. Implementar caching layer con cache invalidation
4. Agregar error handling y fallback mechanisms

#### **Step 4: Estrategia Comercial Integration (2 días)**
1. Agregar snapshot generation triggers a useEstrategiaComercialData
2. Implementar background refresh after data changes
3. Agregar UI indicators para snapshot status (generating, stale, fresh)
4. Opción toggle: snapshots vs real-time calculation

#### **Step 5: Pedidos Migration (1 día)**
1. Remover mock data de useInventoryAvailability
2. Conectar to snapshot-based inventory data
3. Implementar fallback to real-time calculation
4. Testing end-to-end workflow

#### **Step 6: Admin Interface (2 días)**
1. Crear SnapshotManager component
2. Implementar snapshot status dashboard
3. Agregar manual regeneration controls
4. Implementar cleanup y maintenance tools

#### **Step 7: Performance Optimization (2 días)**
1. Implementar incremental snapshot updates
2. Optimizar database queries con proper indexes
3. Implementar compression para large datasets
4. Agregar performance monitoring

#### **Step 8: Testing y Validation (2 días)**
1. End-to-end testing del workflow completo
2. Performance testing con data volumenes reales
3. Validation de data consistency
4. User acceptance testing

### 10.5 Considerations Técnicas

#### **10.5.1 Data Consistency**
- **Atomic updates**: Snapshots deben actualizarse transactionalmente
- **Versioning**: Track snapshot versions para detectar inconsistencias
- **Validation**: Periodic checks que snapshots match calculated values
- **Rollback**: Capacity de revert a previous snapshot version si hay problemas

#### **10.5.2 Performance Requirements**
- **Generation speed**: Snapshots deben generar en < 30 segundos para plans normales
- **Query performance**: Snapshot reads deben ser < 100ms
- **Storage optimization**: Compress historical snapshots después de 30 días
- **Concurrent access**: Support múltiples usuarios leyendo snapshots simultáneamente

#### **10.5.3 Error Handling**
- **Graceful degradation**: Fallback a real-time calculation si snapshots fallan
- **Error notification**: Alertas cuando snapshot generation falla
- **Data validation**: Detect y report inconsistencias entre snapshots y source data
- **Recovery mechanisms**: Auto-retry para failed snapshot generations

#### **10.5.4 Monitoring y Observability**
- **Metrics**: Track snapshot generation frequency, success rate, performance
- **Alerts**: Notify cuando snapshots están stale por > X tiempo
- **Logs**: Detailed logging de snapshot generation process
- **Dashboard**: Real-time visibility into snapshot system health

### 10.6 Migration Strategy

#### **Phase 1: Parallel System (1 semana)**
- Implementar snapshot system alongside existing real-time calculation
- Generate snapshots pero continue usando real-time para production
- Compare results para validate accuracy

#### **Phase 2: Gradual Rollout (1 semana)**
- Enable snapshots para read-only operations first
- Gradually migrate Pedidos to use snapshots
- Keep real-time as fallback

#### **Phase 3: Full Migration (1 semana)**
- Switch Pedidos to snapshots-first approach
- Keep real-time calculation for Estrategia Comercial interface
- Monitor performance and fix issues

#### **Phase 4: Optimization (1 semana)**
- Optimize snapshot generation based on usage patterns
- Implement advanced caching strategies
- Fine-tune performance parameters

### 10.7 Success Criteria

#### **Performance Metrics**
- Pedidos inventory loading time: < 500ms (current: variable)
- Snapshot generation time: < 30s for typical plan
- Data consistency: 99.9% match between snapshots y real-time calculation
- System availability: 99.5% uptime para snapshot system

#### **User Experience**
- Pedidos users see inventory data inmediatamente
- No noticeable delays cuando browsing available inventory
- Consistent data across different parts of application
- Clear indicators cuando data is being refreshed

---

## 11. Plan de Implementación Actualizado

### Fase 0: **[PRIORITY]** Snapshot System Implementation (3 semanas)
- Implementar sistema completo de inventory snapshots
- Migrar Pedidos de mock data a snapshot-based data
- Establecer foundation para high-performance inventory access

### Fase 1: Autenticación y Permisos (2 semanas)
- Sistema de login y roles
- Interfaces diferenciadas
- Registro de usuarios terceros

### Fase 2: Gestión de Estados (1 semana)
- Flujo completo de estados de pedidos
- Notificaciones básicas por email
- Validaciones de inventario

### Fase 3: Reportes y Analytics (1 semana)
- Dashboard para staff
- Reportes básicos
- Métricas en tiempo real

### Fase 4: Funcionalidades Avanzadas (2 semanas)
- Gestión de precios
- Auditoría completa
- Optimizaciones de rendimiento

### Fase 5: Integraciones Externas (3 semanas)
- Sistemas de pago
- Notificaciones avanzadas
- Integraciones logísticas

---

## Conclusión

El Sistema de Pedidos está diseñado para ser una extensión natural del sistema de Estrategia Comercial, proporcionando una interfaz segura y eficiente para que terceros accedan al inventario disponible mientras mantiene el control total para el staff interno. La implementación gradual permitirá validar cada funcionalidad antes de proceder con características más avanzadas.