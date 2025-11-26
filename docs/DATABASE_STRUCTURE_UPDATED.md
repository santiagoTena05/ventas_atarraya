# 🗄️ Estructura Real de Base de Datos - Agua Blanca Seafoods

Esta documentación refleja la estructura **REAL** actual de la base de datos PostgreSQL en Supabase para el sistema de gestión de ventas y cosechas.

*Actualizado: 21 de octubre de 2025*

---

## 📊 Tablas Principales

### 1. `ventas` - Registro Principal de Ventas

```sql
CREATE TABLE ventas (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  folio INTEGER UNIQUE NOT NULL,

  -- Datos Administrativos
  oficina_id BIGINT REFERENCES oficinas(id),
  responsable_id BIGINT REFERENCES responsables(id),
  region_mercado_id BIGINT REFERENCES regiones_mercado(id),

  -- Datos de Cosecha
  cosecha_id BIGINT REFERENCES cosechas(id),
  fecha_entrega DATE NOT NULL,

  -- Datos del Cliente
  cliente_id BIGINT REFERENCES clientes(id),
  tipo_cliente_id BIGINT REFERENCES tipos_cliente(id),
  no_orden_atarraya VARCHAR(100),

  -- Datos del Producto
  tipo_producto_id BIGINT REFERENCES tipos_producto(id),
  talla_camaron_id BIGINT REFERENCES tallas_camaron(id),
  entero_kgs DECIMAL(10,3) NOT NULL DEFAULT 0,
  precio_venta DECIMAL(10,2) NOT NULL DEFAULT 0,
  monto_venta DECIMAL(12,2) GENERATED ALWAYS AS (entero_kgs * precio_venta) STORED,

  -- Descuentos
  descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
  descuento_mxn DECIMAL(10,2) DEFAULT 0,
  total_orden DECIMAL(12,2) GENERATED ALWAYS AS (
    monto_venta - (monto_venta * descuento_porcentaje / 100) - descuento_mxn
  ) STORED,

  -- Método de Pago
  metodo_pago_id BIGINT REFERENCES metodos_pago(id),
  forma_pago_id BIGINT REFERENCES formas_pago(id),
  estatus_pago_cliente_id BIGINT REFERENCES estatus_pago(id),
  folio_transferencia VARCHAR(100),

  -- Facturación
  tipo_factura_id BIGINT REFERENCES tipos_factura(id),
  uso_cfdi VARCHAR(100),
  estatus_factura_id BIGINT REFERENCES estatus_factura(id),

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
```

### 2. `cosechas` - Registro de Cosechas

```sql
CREATE TABLE cosechas (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  folio BIGINT UNIQUE NOT NULL,
  responsable_id BIGINT REFERENCES responsables(id),
  oficina_id BIGINT REFERENCES oficinas(id),
  fecha_cosecha TIMESTAMPTZ NOT NULL,
  peso_total_kg NUMERIC NOT NULL,
  estado cosecha_estado DEFAULT 'pendiente', -- ENUM: 'pendiente', 'procesada', 'vendida'
  notas TEXT,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  updated_by UUID
);
```

### 3. `cosecha_tallas` - Relación Cosechas-Tallas

```sql
CREATE TABLE cosecha_tallas (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  cosecha_id BIGINT NOT NULL REFERENCES cosechas(id),
  talla_camaron_id BIGINT NOT NULL REFERENCES tallas_camaron(id),
  peso_talla_kg NUMERIC NOT NULL,
  porcentaje_talla NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 4. `cosecha_estanques` - Relación Cosechas-Estanques

```sql
CREATE TABLE cosecha_estanques (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  cosecha_id BIGINT NOT NULL REFERENCES cosechas(id),
  estanque_id BIGINT NOT NULL REFERENCES estanques(id),
  peso_estanque_kg NUMERIC,
  porcentaje_contribucion NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 5. `clientes` - Información de Clientes

```sql
CREATE TABLE clientes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR NOT NULL,
  tipo_cliente_id BIGINT REFERENCES tipos_cliente(id),
  oficina VARCHAR DEFAULT 'MV',
  telefono VARCHAR,
  email VARCHAR,
  direccion TEXT,
  ciudad VARCHAR,
  estado VARCHAR,
  codigo_postal VARCHAR,
  rfc VARCHAR,
  razon_social VARCHAR,
  activo BOOLEAN DEFAULT true,
  notas TEXT,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID
);
```

---

## 📊 Tablas de Catálogos

### `estanques` - Catálogo de Estanques

```sql
CREATE TABLE estanques (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR NOT NULL,
  codigo VARCHAR,
  capacidad_kg NUMERIC,
  ubicacion TEXT,
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### `oficinas` - Catálogo de Oficinas

```sql
CREATE TABLE oficinas (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR NOT NULL,
  codigo VARCHAR,
  direccion TEXT,
  telefono VARCHAR,
  responsable_principal_id BIGINT REFERENCES responsables(id),
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `responsables` - Catálogo de Responsables

```sql
CREATE TABLE responsables (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR NOT NULL
  -- [estructura completa no proporcionada en el esquema]
);
```

### `regiones_mercado` - Catálogo de Regiones

```sql
CREATE TABLE regiones_mercado (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `precios_camaron` - Tabla de Precios Automáticos

```sql
CREATE TABLE precios_camaron (
  id INTEGER PRIMARY KEY DEFAULT nextval('precios_camaron_id_seq'),
  talla_camaron_id INTEGER NOT NULL REFERENCES tallas_camaron(id),
  peso_min_gramos NUMERIC NOT NULL,
  peso_max_gramos NUMERIC NOT NULL,
  conteo_min_kilo INTEGER NOT NULL,
  conteo_max_kilo INTEGER NOT NULL,
  precio_mayorista NUMERIC NOT NULL,
  precio_restaurante NUMERIC NOT NULL,
  precio_menudeo NUMERIC NOT NULL,
  cantidad_min_mayorista NUMERIC DEFAULT 150.000,
  activo BOOLEAN DEFAULT true,

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT DEFAULT 'system',
  updated_by TEXT DEFAULT 'system'
);
```

---

## 💰 Tablas de Pagos y Facturación

### `metodos_pago` - Métodos de Pago

```sql
CREATE TABLE metodos_pago (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `formas_pago` - Formas de Pago

```sql
CREATE TABLE formas_pago (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `estatus_pago` - Estado del Pago

```sql
CREATE TABLE estatus_pago (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR NOT NULL,
  descripcion TEXT,
  color VARCHAR DEFAULT '#6B7280',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### `estatus_factura` - Estado de Facturación

```sql
CREATE TABLE estatus_factura (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 🔗 Relaciones Clave

### Flujo Principal de Datos:

1. **Cosechas → Cosecha_Tallas**: Una cosecha puede tener múltiples tallas
2. **Cosechas → Cosecha_Estanques**: Una cosecha puede venir de múltiples estanques
3. **Ventas → Cosechas**: Una venta está vinculada a una cosecha específica
4. **Ventas → Tallas_Camaron**: Una venta tiene una talla específica (tomada de la cosecha)
5. **Precios_Camaron → Tallas_Camaron**: Los precios automáticos se basan en la talla

### Sistema de Precios Automáticos:

```
Cosecha → obtener talla predominante → buscar precio en precios_camaron → aplicar según tipo_cliente
```

---

## 📈 Vistas Importantes

### `cosechas_inventario_detallado` - Vista de Inventario de Cosechas

Esta vista consolida información de cosechas con su inventario disponible:

- Peso total, vendido y disponible
- Porcentaje vendido
- Estado del inventario (disponible/parcial/agotado)
- Detalles de estanques y tallas en formato texto

---

## 🎯 Funcionalidades Implementadas

### ✅ Sistema de Precios Automáticos
- Cálculo automático basado en talla y tipo de cliente
- Reglas de negocio: Mayorista ≥150kg, Restaurante, Menudeo
- Integración con formulario de ventas

### ✅ Gestión de Cosechas
- Registro de cosechas con múltiples estanques y tallas
- Seguimiento de inventario disponible
- Control de peso vendido vs disponible

### ✅ Sistema de Ventas
- Registro completo con datos administrativos, cliente y producto
- Columnas calculadas automáticamente (monto_venta, total_orden)
- Vinculación automática de talla desde cosecha seleccionada

### ✅ Reportes y Análisis
- Vista consolidada de ventas con filtros por fecha
- Análisis por producto, oficina, región y talla
- Indicadores de rendimiento en tiempo real

---

## 🚀 Próximas Mejoras

### 🔄 Pendientes de Implementación
1. **Ambientes separados** (desarrollo vs producción)
2. **Vista de administración de precios** para gestionar precios_camaron
3. **Histórico de cambios de precios**
4. **Integración con sistema de facturación externa**
5. **Dashboard ejecutivo con métricas clave**

---

## 📋 Tipos de Datos Personalizados

### ENUMs Utilizados

```sql
-- Estado de cosechas
CREATE TYPE cosecha_estado AS ENUM ('pendiente', 'procesada', 'vendida');
```

---

## 🔍 Estado Actual del Sistema

### ✅ **Funcionando Correctamente:**
- Sistema de precios automáticos con cálculo en tiempo real
- Registro de cosechas con múltiples tallas y estanques
- Formulario de ventas con vinculación automática de tallas
- Reportes con selector de fecha moderno (dropdown)
- Gestión de inventario de cosechas

### 🔄 **En Desarrollo:**
- Configuración de ambientes dev/prod
- Vista de administración de precios

### 📋 **Notas Técnicas:**
- **Columnas generadas**: `monto_venta` y `total_orden` se calculan automáticamente
- **Relación tallas**: Se obtiene dinámicamente de `cosecha_tallas` al seleccionar cosecha
- **Precios dinámicos**: Basados en talla + tipo cliente + cantidad
- **Vista inventario**: `cosechas_inventario_detallado` proporciona información consolidada

---

*Este documento refleja la estructura real implementada en Supabase al 21 de octubre de 2025.*