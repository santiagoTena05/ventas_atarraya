# To do list

## 1. Planner
### Esenciales:
- [x] Corrección **bug** cálculo de tallas
- [x] Terminar función de adaptar semanas automáticamente
    - [x] Modificar siembras a partir de los cambios automaticos
- [x] Corregir Mortalidad nursery (no empezar en 100%, contar el final de la semana)
- [x] Corregir mortalidad de growout (empezar en 98%)
- [x] Cambiar nombre de **_analytics_** a **_nueva siembra_**
- [ ] **Cosechas técnicas** (Todavía no conozco bien el scope completo)
    - [ ] Especificaciones de estanques para parámetros

### Secundarios:
- [x] Formato de celdas

---

## 2. Playground
- [x] Tabla de registros a partir de semana actual

| Tallas (comerciales) | 01 dec 2025          | 08 dec 2025          |
| :------------------: | :------------------: | :------------------: |
| 61-70                | [Pedidos] [Inv net]  | [Pedidos] [Inv net]  |
| 51-60                | [Pedidos] [Inv net]  | [Pedidos] [Inv net]  |
| ...                  | ...                  | ...                  |
| Total                | ...                  | ...                  |

| Categoría  | Presentación  | Tipo empaquetado |
| :--------- | :-----------: | :--------------: |
| Vivo       | Vivo          | Seco, agua       |
| Fresco     | HON, HOFF, PD |                  |
| Congelado  | HON, HOFF, PD |                  |

- [x] Indicadores de colores
    - 🔵 Azul: cantidad asignada a pedido <= inventario neto
    - 🟡 Amarillo: cantidad de cosecha técnica que debe ser asignada a un pedido
    - 🔴 Rojo: cantidad asignada a pedido >= inventario neto

- [ ] Cosechas técnicas automáticas y por gerente
- [ ] Versiones de playground **¿conectadas?**
- [ ] Tipo de moneda y unidad de peso por Granja
- [ ] Conexión con pedidos

---

## 3. Pedidos
Vendedores externos ingresan con usuario y contraseña para registrar pedidos. Seleccionan fecha y les aparece cantidad y tallas que pueden seleccionar.

### 3.1 Autenticación y usuarios
- [ ] Sistema de login (usuario y contraseña)
- [ ] Recuperación de contraseña
- [ ] Gestión de sesiones (expiración, logout)
- [ ] Registro de nuevos vendedores (solo admin)

### 3.2 Roles y permisos
- [ ] **Vendedor externo**
    - [ ] Crear pedidos propios
    - [ ] Ver historial de pedidos propios
    - [ ] Editar/cancelar pedidos (si aún no están procesados)
- [ ] **Gerente de ventas**
    - [ ] Ver todos los pedidos
    - [ ] Aprobar/rechazar pedidos
    - [ ] Asignar pedidos a inventario
    - [ ] Gestionar vendedores
- [ ] **Administrador**
    - [ ] Todos los permisos
    - [ ] Crear/editar/eliminar usuarios
    - [ ] Configuración del sistema

### 3.3 Creación de pedidos
- [ ] Selección de fecha de entrega
- [ ] Visualización de disponibilidad por talla
- [ ] Selección de tallas y cantidades
- [ ] Selección de categoría (Vivo, Fresco, Congelado)
- [ ] Selección de presentación (HON, HOFF, PD)
- [ ] Selección de tipo de empaquetado
- [ ] Información del cliente final
    - [ ] Nombre/empresa
    - [ ] Dirección de entrega
    - [ ] Contacto
- [ ] Notas adicionales del pedido
- [ ] Validación contra inventario disponible
- [ ] Confirmación y resumen antes de enviar

### 3.4 Estados del pedido
- [ ] `Borrador` - Pedido en proceso de creación
- [ ] `Pendiente` - Enviado, esperando aprobación
- [ ] `Aprobado` - Confirmado por gerente
- [ ] `En proceso` - En preparación/cosecha
- [ ] `Listo para entrega` - Preparado
- [ ] `Entregado` - Completado
- [ ] `Cancelado` - Anulado (con motivo)

### 3.5 Gestión de pedidos (vista gerente)
- [ ] Dashboard de pedidos pendientes
- [ ] Filtros por fecha, vendedor, estado, talla
- [ ] Aprobación/rechazo con comentarios
- [ ] Asignación manual a inventario específico
- [ ] Edición de pedidos (cantidades, fechas)
- [ ] Reagendar pedidos

### 3.6 Historial y reportes
- [ ] Historial de pedidos por vendedor
- [ ] Historial de pedidos por cliente
- [ ] Reporte de ventas por período
- [ ] Reporte de ventas por talla
- [ ] Exportación a Excel/PDF
- [ ] Log de cambios (quién modificó qué y cuándo)

### 3.7 Notificaciones
- [ ] Al vendedor: pedido aprobado/rechazado
- [ ] Al gerente: nuevo pedido pendiente
- [ ] Alertas de pedidos próximos a fecha de entrega
- [ ] Notificación de cambios en disponibilidad

### 3.8 Integraciones
- [ ] Conexión bidireccional con Playground (inventario)
- [ ] Actualización automática de inventario al aprobar pedido
- [ ] Sincronización de cosechas técnicas

### 3.9 UI/UX
- [ ] Vista mobile-friendly (vendedores en campo)
- [ ] Carga rápida de disponibilidad
- [ ] Autoguardado de borradores
- [ ] Mensajes de error claros

---

## 4. Pendientes generales
- [ ] Definir scope completo de cosechas técnicas
- [ ] Pruebas y QA por módulo
- [ ] Documentación de usuario
- [ ] Plan de migración/deployment