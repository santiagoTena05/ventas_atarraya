# 🗄️ Estructura Completa de Base de Datos - Agua Blanca Seafoods

Esta documentación define la estructura completa de la base de datos PostgreSQL en Supabase para el sistema de gestión de ventas y cosechas.

---

## 📋 Índice

1. [Tablas Principales](#tablas-principales)
2. [Tablas de Catálogos](#tablas-de-catálogos)
3. [Tablas de Sistema](#tablas-de-sistema)
4. [Relaciones y Referencias](#relaciones-y-referencias)
5. [Scripts de Creación](#scripts-de-creación)
6. [Políticas de Seguridad (RLS)](#políticas-de-seguridad-rls)
7. [Índices y Optimizaciones](#índices-y-optimizaciones)

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
  nota_salida_granja VARCHAR(100),
  fecha_cosecha DATE NOT NULL,
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
  descuento_calculado DECIMAL(12,2) GENERATED ALWAYS AS (monto_venta * descuento_porcentaje / 100) STORED,
  total_orden DECIMAL(12,2) GENERATED ALWAYS AS (monto_venta - descuento_calculado - descuento_mxn) STORED,

  -- Método de Pago
  metodo_pago_id BIGINT REFERENCES metodos_pago(id),
  forma_pago_id BIGINT REFERENCES formas_pago(id),
  estatus_pago_cliente_id BIGINT REFERENCES estatus_pago(id),
  estatus_deposito_id BIGINT REFERENCES estatus_pago(id),
  folio_transferencia VARCHAR(100),

  -- Facturación
  tipo_factura_id BIGINT REFERENCES tipos_factura(id),
  uso_cfdi VARCHAR(100),
  estatus_factura_id BIGINT REFERENCES estatus_factura(id),

  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
```

### 2. `clientes` - ⚠️ TABLA CRÍTICA REQUERIDA

```sql
CREATE TABLE clientes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(255) NOT NULL,
  tipo_cliente_id BIGINT REFERENCES tipos_cliente(id),

  -- Información de Contacto
  telefono VARCHAR(20),
  email VARCHAR(255),
  direccion TEXT,
  ciudad VARCHAR(100),
  estado VARCHAR(100),
  codigo_postal VARCHAR(10),

  -- Información Fiscal
  rfc VARCHAR(13),
  razon_social VARCHAR(255),

  -- Configuración
  activo BOOLEAN DEFAULT TRUE,
  notas TEXT,

  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

### 3. `cosechas` - Sistema de Cosechas (Fase 2)

```sql
CREATE TABLE cosechas (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  folio_cosecha VARCHAR(50) UNIQUE NOT NULL,

  -- Información de Granja
  granja_id BIGINT REFERENCES granjas(id),
  estanque VARCHAR(50),
  fecha_cosecha DATE NOT NULL,

  -- Información del Producto
  tipo_producto_id BIGINT REFERENCES tipos_producto(id),
  talla_camaron_id BIGINT REFERENCES tallas_camaron(id),

  -- Cantidades
  kilos_brutos DECIMAL(10,3) NOT NULL,
  kilos_netos DECIMAL(10,3) NOT NULL,
  diferencia DECIMAL(10,3) GENERATED ALWAYS AS (kilos_brutos - kilos_netos) STORED,
  porcentaje_diferencia DECIMAL(5,2) GENERATED ALWAYS AS ((kilos_brutos - kilos_netos) / kilos_brutos * 100) STORED,

  -- Estado
  estado ENUM('pendiente', 'procesada', 'vendida') DEFAULT 'pendiente',
  observaciones TEXT,

  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

### 4. `usuarios` - Gestión de Acceso

```sql
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  rol ENUM('admin', 'responsable', 'readonly') NOT NULL DEFAULT 'readonly',
  oficina_id BIGINT REFERENCES oficinas(id),
  activo BOOLEAN DEFAULT TRUE,

  -- Configuración Personal
  configuracion JSONB DEFAULT '{}',

  -- Auditoría
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE
);
```

---

## 📚 Tablas de Catálogos

### 1. `oficinas`

```sql
CREATE TABLE oficinas (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  codigo VARCHAR(10) UNIQUE,
  direccion TEXT,
  telefono VARCHAR(20),
  responsable_principal_id BIGINT,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO oficinas (nombre, codigo) VALUES
('ALV Lerma', 'ALV'),
('MV Apizaco', 'MVA'),
('MV Tonameca', 'MVT');
```

### 2. `responsables`

```sql
CREATE TABLE responsables (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(255) NOT NULL,
  codigo VARCHAR(10) UNIQUE,
  oficina_id BIGINT REFERENCES oficinas(id),
  telefono VARCHAR(20),
  email VARCHAR(255),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO responsables (nombre, codigo) VALUES
('Alex B.', 'ALEX'),
('Carlos', 'CARLOS'),
('Daniel S.', 'DANIEL'),
('Gil', 'GIL'),
('Manuel F.', 'MANUEL');
```

### 3. `tipos_cliente`

```sql
CREATE TABLE tipos_cliente (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO tipos_cliente (nombre) VALUES
('Cliente Final'),
('Distribuidor Local'),
('Empleado'),
('Granja'),
('Mayorista'),
('Menudeo'),
('Minorista'),
('Muestra'),
('Restaurante'),
('Retail Boutique'),
('Venta Local');
```

### 4. `tipos_producto`

```sql
CREATE TABLE tipos_producto (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO tipos_producto (nombre) VALUES
('Larvas'),
('Entero'),
('PAD');
```

### 5. `tallas_camaron`

```sql
CREATE TABLE tallas_camaron (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(20) NOT NULL UNIQUE,
  rango_min INTEGER,
  rango_max INTEGER,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO tallas_camaron (nombre, rango_min, rango_max) VALUES
('10-12', 10, 12),
('12-15', 12, 15),
('14-20', 14, 20),
('21-25', 21, 25),
('26-30', 26, 30),
('31-35', 31, 35);
```

### 6. `regiones_mercado`

```sql
CREATE TABLE regiones_mercado (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO regiones_mercado (nombre) VALUES
('Pto de granja'),
('Puerto Escondido'),
('Sureste');
```

### 7. `metodos_pago`

```sql
CREATE TABLE metodos_pago (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO metodos_pago (nombre) VALUES
('Cortesía'),
('Efectivo'),
('Transferencia');
```

### 8. `formas_pago`

```sql
CREATE TABLE formas_pago (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO formas_pago (nombre) VALUES
('Contado'),
('Dos Exhibiciones'),
('Pagado'),
('Pendiente');
```

### 9. `estatus_pago`

```sql
CREATE TABLE estatus_pago (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  color VARCHAR(7) DEFAULT '#6B7280', -- Color hex para UI
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO estatus_pago (nombre, color) VALUES
('Cortesía', '#10B981'),
('Pagado', '#059669'),
('Pendiente', '#F59E0B');
```

### 10. `tipos_factura`

```sql
CREATE TABLE tipos_factura (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(10) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO tipos_factura (nombre, descripcion) VALUES
('NO', 'Sin facturación'),
('SI', 'Con facturación'),
('PG', 'Facturación pendiente');
```

### 11. `estatus_factura`

```sql
CREATE TABLE estatus_factura (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Datos iniciales
INSERT INTO estatus_factura (nombre) VALUES
('Enviado'),
('Pendiente');
```

### 12. `granjas` (Para Fase 2 - Cosechas)

```sql
CREATE TABLE granjas (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(255) NOT NULL,
  codigo VARCHAR(20) UNIQUE,
  ubicacion TEXT,
  coordenadas POINT,
  contacto_principal VARCHAR(255),
  telefono VARCHAR(20),
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 🔗 Relaciones y Referencias

### Diagrama de Relaciones Principales

```
usuarios ←── ventas ──→ clientes
    ↓         ↓           ↓
oficinas  productos  tipos_cliente
    ↓         ↓
responsables  tallas_camaron
```

### Foreign Keys Críticas

1. **ventas.cliente_id** → **clientes.id** (CRÍTICA - para autocomplete)
2. **ventas.oficina_id** → **oficinas.id**
3. **ventas.responsable_id** → **responsables.id**
4. **ventas.created_by** → **auth.users.id**
5. **clientes.tipo_cliente_id** → **tipos_cliente.id**

---

## 🚀 Scripts de Creación Completos

### 1. Script Principal de Creación

```sql
-- =============================================
-- AGUA BLANCA SEAFOODS - DATABASE SETUP
-- =============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Crear ENUMs
CREATE TYPE user_role AS ENUM ('admin', 'responsable', 'readonly');
CREATE TYPE cosecha_estado AS ENUM ('pendiente', 'procesada', 'vendida');

-- PASO 1: Crear todas las tablas de catálogo
-- (Insertar aquí todos los CREATE TABLE de catálogos)

-- PASO 2: Crear tabla de usuarios
-- (Insertar aquí CREATE TABLE usuarios)

-- PASO 3: Crear tabla de clientes
-- (Insertar aquí CREATE TABLE clientes)

-- PASO 4: Crear tabla principal de ventas
-- (Insertar aquí CREATE TABLE ventas)

-- PASO 5: Crear tabla de cosechas (opcional - Fase 2)
-- (Insertar aquí CREATE TABLE cosechas)

-- PASO 6: Insertar datos iniciales
-- (Insertar aquí todos los INSERT INTO)
```

### 2. Script de Datos Iniciales de Clientes

```sql
-- Insertar clientes de ejemplo para el autocomplete
INSERT INTO clientes (nombre, tipo_cliente_id) VALUES
('Restaurante El Pescador', 9),
('Mariscos La Costa', 9),
('Distribuidora Marina', 2),
('Mercado San Juan', 6),
('Hotel Riviera Maya', 1),
('Supermercados del Norte', 5),
('Casa de Mariscos Pacifico', 9),
('Restaurante Agua Salada', 9),
('Comercializadora Oceano', 2),
('Marisqueria Los Caracoles', 9);
```

---

## 🔒 Políticas de Seguridad (RLS)

### Habilitar RLS en todas las tablas

```sql
-- Habilitar RLS en tablas principales
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosechas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS en catálogos (solo lectura para usuarios normales)
ALTER TABLE oficinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsables ENABLE ROW LEVEL SECURITY;
-- ... (resto de catálogos)
```

### Políticas por Rol

```sql
-- =============================================
-- POLÍTICAS PARA TABLA VENTAS
-- =============================================

-- Admins: acceso completo
CREATE POLICY "admin_ventas_all" ON ventas
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Responsables: solo sus propias ventas
CREATE POLICY "responsable_ventas_own" ON ventas
  FOR ALL TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'responsable'
    AND created_by = auth.uid()
  );

-- Readonly: solo lectura
CREATE POLICY "readonly_ventas_select" ON ventas
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' IN ('readonly', 'responsable', 'admin'));

-- =============================================
-- POLÍTICAS PARA TABLA CLIENTES
-- =============================================

-- Admins: acceso completo
CREATE POLICY "admin_clientes_all" ON clientes
  FOR ALL TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Responsables: lectura y creación
CREATE POLICY "responsable_clientes_read_create" ON clientes
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' IN ('responsable', 'admin', 'readonly'));

CREATE POLICY "responsable_clientes_insert" ON clientes
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' IN ('responsable', 'admin'));

-- =============================================
-- POLÍTICAS PARA CATÁLOGOS (SOLO LECTURA)
-- =============================================

-- Todos los usuarios autenticados pueden leer catálogos
CREATE POLICY "users_catalogs_read" ON oficinas
  FOR SELECT TO authenticated
  USING (true);

-- Repetir para todas las tablas de catálogo...
```

---

## 📈 Índices y Optimizaciones

### Índices Críticos para Rendimiento

```sql
-- Índices para tabla ventas
CREATE INDEX idx_ventas_folio ON ventas(folio);
CREATE INDEX idx_ventas_fecha_entrega ON ventas(fecha_entrega);
CREATE INDEX idx_ventas_cliente_id ON ventas(cliente_id);
CREATE INDEX idx_ventas_responsable_id ON ventas(responsable_id);
CREATE INDEX idx_ventas_created_by ON ventas(created_by);
CREATE INDEX idx_ventas_fecha_entrega_responsable ON ventas(fecha_entrega, responsable_id);

-- Índices para tabla clientes
CREATE INDEX idx_clientes_nombre ON clientes(nombre);
CREATE INDEX idx_clientes_tipo ON clientes(tipo_cliente_id);
CREATE INDEX idx_clientes_activo ON clientes(activo);

-- Índice de búsqueda de texto para clientes (para autocomplete)
CREATE INDEX idx_clientes_nombre_trgm ON clientes
  USING gin(nombre gin_trgm_ops);

-- Índices para usuarios
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_usuarios_oficina ON usuarios(oficina_id);
```

### Funciones de Trigger para Auditoría

```sql
-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger a todas las tablas que tienen updated_at
CREATE TRIGGER update_ventas_updated_at
  BEFORE UPDATE ON ventas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ... (repetir para otras tablas)
```

---

## ✅ Checklist de Implementación

### Fase 1 - Sistema de Ventas (ACTUAL)
- [x] Tabla `ventas` - Registro principal
- [x] Tabla `clientes` - **CRÍTICA para autocomplete**
- [x] Todos los catálogos de apoyo
- [x] Tabla `usuarios` - Autenticación
- [x] Políticas RLS básicas
- [ ] **⚠️ PENDIENTE: Crear en Supabase**

### Fase 2 - Sistema de Cosechas (FUTURO)
- [ ] Tabla `cosechas`
- [ ] Tabla `granjas`
- [ ] Relación cosechas → ventas
- [ ] Trazabilidad completa

### Fase 3 - Optimizaciones (FUTURO)
- [ ] Índices avanzados
- [ ] Funciones de reporte
- [ ] Vistas materializadas
- [ ] Triggers de auditoría completa

---

## 🚨 Notas Importantes

1. **CRÍTICO**: La tabla `clientes` es esencial para el funcionamiento actual del autocomplete
2. **Seguridad**: Todas las tablas deben tener RLS habilitado antes de producción
3. **Rendimiento**: Los índices son cruciales para consultas rápidas en reportes
4. **Backup**: Configurar backups automáticos en Supabase antes del primer uso
5. **Testing**: Probar todas las políticas RLS con diferentes roles de usuario

---

**Actualizado:** $(date)
**Versión de BD:** 1.0
**Estado:** Fase 1 - Sistema de Ventas