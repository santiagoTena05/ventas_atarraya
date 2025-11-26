# Sistema de Gestión de Ventas y Cosechas - Agua Blanca Seafoods

## 📋 Tabla de Contenidos
1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Análisis del Sistema Actual](#análisis-del-sistema-actual)
3. [Objetivos del Proyecto](#objetivos-del-proyecto)
4. [Arquitectura del Sistema](#arquitectura-del-sistema)
5. [Base de Datos](#base-de-datos)
6. [Stack Tecnológico](#stack-tecnológico)
7. [Estructura del Proyecto](#estructura-del-proyecto)
8. [Fase 1: Sistema de Ventas](#fase-1-sistema-de-ventas)
9. [Fase 2: Sistema de Cosechas](#fase-2-sistema-de-cosechas)
10. [Fase 3: Unificación y Trazabilidad](#fase-3-unificación-y-trazabilidad)
11. [API Endpoints](#api-endpoints)
12. [Seguridad y Autenticación](#seguridad-y-autenticación)
13. [Testing](#testing)
14. [Deployment](#deployment)
15. [Migración de Datos](#migración-de-datos)

---

## 📊 Resumen Ejecutivo

### Contexto
Agua Blanca Seafoods actualmente gestiona sus operaciones de ventas y cosechas mediante archivos Excel que se han vuelto lentos y difíciles de manejar debido al volumen de datos. Se requiere migrar a una aplicación web que permita:

- Acceso desde múltiples dispositivos (móvil, tablet, desktop)
- Registro simultáneo por múltiples usuarios
- Mejor rendimiento y escalabilidad
- Trazabilidad completa de cosechas a ventas
- Reportes y análisis en tiempo real

### Alcance
- **Fase 1**: Sistema de ventas con formulario, registros y reportes básicos
- **Fase 2**: Sistema de cosechas 
- **Fase 3**: Integración total con trazabilidad y reportes avanzados

### Stack Seleccionado
- **Frontend + Backend**: Next.js 14 (App Router) con TypeScript
- **Base de Datos**: Supabase (PostgreSQL + Auth + Storage)
- **Hosting**: Vercel
- **Ventajas**: 
  - 100% gratis para empezar
  - Escalable cuando sea necesario
  - Deploy automático
  - Serverless (sin mantenimiento de servidores)

### Cronograma Estimado
- Fase 1: 4-5 semanas (Next.js es más rápido que frontend/backend separados)
- Fase 2: 3 semanas  
- Fase 3: 3 semanas
- Testing final: 2 semanas
- **Total**: 12-14 semanas

### Costos (Free Tier)
- **Supabase**: $0/mes
  - 500 MB database (suficiente para ~50k ventas)
  - 2 GB bandwidth/mes
  - Backups diarios (7 días retención)
- **Vercel**: $0/mes
  - 100 GB bandwidth/mes
  - Serverless functions ilimitadas
  - Deploy automático con Git
- **Total inicial**: $0/mes

### Cuando Escalar (Futuro)
Si el proyecto crece:
- **Supabase Pro** ($25/mes): 8 GB DB, 50 GB bandwidth
- **Vercel Pro** ($20/mes): 1 TB bandwidth, analytics avanzados

---

## 🔍 Análisis del Sistema Actual

### Módulos Identificados en Excel

#### 1. **Formulario de Ventas** (Imagen 2-3)
Campos principales:
- Datos administrativos: # Registro, Oficina, Responsable, Región de Mercado
- Datos de cosecha: Nota Salida Granja, Fecha Cosecha, Fecha Entrega
- Datos del cliente: Cliente, Tipo de Cliente, No. Orden Atarraya
- Datos del producto: Tipo de Producto, Talla Camarón, Entero|kgs, Precio Venta, Monto Venta
- Descuentos: % y mxn
- Datos de pago: Método de Pago, Forma de Pago (cliente y depósito), Folio Transferencia
- Facturación: Uso del CFDI, Tipo de Factura, Monto a Facturar, Estatus Factura, No. Factura

**Listas desplegables**:
- Oficina: ALV Lerma, MV Apizaco, MV Tonameca, ALV Abalos, etc.
- Responsable: Carlos, Cartas, Graniel F., Manuel F., etc.
- Región: Puerto Escondido, Sureste, Entero, PAD, etc.
- Tipo Cliente: Cliente Final, Distribuidor Local, Empleado, Granja, Mayorista, Menudeo, Minorista, Muestra, Restaurante, Retail Boutique, Venta Local
- Producto: Entero, Larvas, PAD
- Talla: 10-12, 12-15, 14-20, 16-20, 21-25, 26-30, 31-35
- Método Pago: Cortesía, Dos Exhibiciones, Pagado, Pendiente
- Forma Pago: Efectivo, Pagado, Pendiente, Transferencia, PG (Pago Garantizado)

#### 2. **Actualización de Ventas** (Imagen 3)
- Similar al formulario de captura
- Permite modificar registros existentes
- Botones: Limpiar y Actualizar

#### 3. **Concentrado de Ventas** (Imagen 4)
Tabla con todas las columnas:
- Folio, Oficina, Responsable, Región de Mercado
- Nota Salida Granja, Fecha Cosecha, Fecha Entrega
- Cliente, Tipo de Cliente
- Contidad Entregada, Tipo de Producto, Talla Camarón
- PAD Entero, PAD Kgs, Entero Kgs
- Precio Venta Entero, Monto Venta Entero
- Precio Venta PAD, Monto Venta PAD, Precio Total, Precio Total PAD
- Descuento, Precio Final Entero, Precio Final PAD
- Total general, Tipo de Compra, Forma Pago, Pendiente, Descuento %

**Funciones**:
- Filtros por múltiples criterios
- Botones: "Encabezados MBS | MV" y "Encabezados RBS | ALV"

#### 4. **Resumen Cuentas I - Por Responsable** (Imagen 5)
- Agrupación por responsable (Alex B., Carlos, Daniel S., Gil, Manuel F.)
- Subdivisión por tipo de cliente
- Columnas: Cortesía, Pagado, Pendiente, Grand Total
- Filtros interactivos por:
  - Estatus Pago (Cortesía, Pagado, Pendiente)
  - Responsable (Expandir/Contraer)
  - Tipo Cliente (Expandir/Contraer)
- Timeline con meses (JAN, FEB, MAR, APR, MAY, JUN)

#### 5. **Resumen Cuentas II - Por Tipo de Cliente** (Imagen 6)
- Agrupación por tipo de cliente
- Columnas: Responsable, Cliente, Cortesía, Pagado, Pendiente, Total general
- Filtros similares al Resumen I
- Nota al pie: "ALV Lerma | Pendientes 2o. Pago NO aparecen en Tabla"

#### 6. **Canal de Ventas** (Imagen 7)
Análisis por producto y precio:

**Por Tipo de Cliente | Total MXN**:
- Tabla con columnas: Tipo de Cliente, Entero, PAD, Total general
- Total Entero: $103,577.31
- Total PAD: $219,383.18
- Total general: $322,960.49

**Por Talla de Camarón | Total MXN**:
- Rangos: 10-12, 12-15, 14-20, 21-25, 24-30, 31-35
- Totales por Entero y PAD

**Por Talla de Camarón | Total Kgs**:
- Mismos rangos con kilogramos

**Por Talla de Camarón | Precio promedio MXN**:
- Precio promedio por talla

**Visualizaciones**:
- Gráfico de barras: "Canal de Ventas por producto | total mxn"
- Gráfico de barras: "Camarón de | Precio Venta Promedio"
- Logo de Agua Blanca Seafoods en el centro

#### 7. **Reportes de Ventas - Varios** (Imagen 8)
Múltiples visualizaciones:

**Ventas Totales por producto**:
- Tabla: Producto, Total mxn, numero, Venta/kg
- Pie chart con distribución

**Ventas Totales por ubicación**:
- Tabla con ubicaciones y totales
- Bar chart comparativo

**Ventas Totales por mensual por ubicación**:
- Bar charts mensuales
- Comparación entre ubicaciones (ALV Lerma, MV Apizaco, ALV Lerma)

**Precio Venta por talla & presentación**:
- Tablas detalladas
- Bar charts de precios

**Timeline**: Filtro de meses (JAN, FEB, MAR, APR, MAY)

#### 8. **Estados de Cuenta MV** (Imagen 9)
**Agua Blanca Seafoods - Estado de Cuenta - Hotel Escondido**
- Fecha Inicial: 01-Jan-21
- Fecha Final: 06-Oct-25

Tabla detallada:
- Folio, Fecha Entrega, Producto, Talla Camarón, PAD|Botes, PAD|Kgs, Entero|kgs, Precio Venta|kg, Monto Venta, Total Orden|mxn, Método de Pago, Estatus Pago|cliente, Factura, Estatus Factura, No. Factura

Estados de pago marcados:
- Pagado (✓)
- Pendiente (texto rojo)

#### 9. **Estados de Cuenta ALV** (Imagen 10)
Similar al estado MV pero para ubicación Lamarca
- Cliente específico con su historial completo
- Incluye información de exhibiciones y pagos

#### 10. **Conciliación Facturas** (Imagen 11)
**Facturas - Lamarca**
- Fecha Inicial: 01-Jan-21
- Fecha Final: 06-Oct-25

Columnas:
- Folio, Fecha Entrega, Producto, Cantidad Entregada, Total Orden|mxn, Monto a Facturar
- Estatus 1er. Pago, Fecha 1er. Pago, Monto 1er. Pago
- Estatus 2o. Pago, Fecha 2o. Pago, Monto 2o. Pago
- Estatus Factura, No. Factura

Botones: "Limpiar" y "Actualizar"

#### 11. **Cuadre Producción de Granja** (Imagen 12)
**Maricultura Vigas | Fecha Cosecha**

**Datos Granja** (columna lateral):
- Fecha Cosecha
- Nota Salida
- Diferencias
- Comentario

Tabla principal:
- Fecha Cosecha, Nota Salida
- Columnas por rango de tallas: 10-12, 12-15, 14-20, 21-25, 26-30, 31-35, Total general
- Nota kg, Diferencia kg para cada talla

Secciones con color turquesa para totales acumulados

#### 12. **Tablas Comerciales** (Imagen 13)
**Tallas Comerciales | Camarón**

Tabla de referencia:
- Gramos, Rango AB|gr, Talla sin cabeza|lb, Talla con cabeza|kg
- Rangos desde 0 (>100 / >80) hasta 47 (U15 / 20-30)
- Referencias específicas por gramo:
  - 0-9: <10, >100, >80
  - 10-11: 10-12, 61-70, 90-100
  - 12-15: 12-15, 51-60, 70-90
  - Y así sucesivamente...

---

## 🎯 Objetivos del Proyecto

### Objetivos Principales
1. **Mejorar el rendimiento**: Eliminar lentitud del Excel
2. **Acceso multi-dispositivo**: Web responsive funcional en móvil, tablet y desktop
3. **Acceso simultáneo**: Múltiples usuarios registrando al mismo tiempo
4. **Trazabilidad**: Vincular ventas con cosechas específicas
5. **Reportes en tiempo real**: Dashboard actualizado automáticamente
6. **Migración de datos históricos**: Importar todos los registros del Excel

### Objetivos Secundarios
1. Sistema de facturación integrado
2. Estados de cuenta automáticos
3. Alertas de inventario
4. Exportación de reportes (Excel, PDF)
5. Auditoría completa de cambios

---

## 🏗️ Arquitectura del Sistema

### Arquitectura General (Vercel + Supabase)
```
┌─────────────────────────────────────────────┐
│       VERCEL (Next.js Full-Stack App)       │
│  ┌──────────────────────────────────────┐  │
│  │  Frontend (React Components)         │  │
│  │  - Formularios                       │  │
│  │  - Tablas                            │  │
│  │  - Reportes & Gráficos               │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  API Routes (Serverless Functions)   │  │
│  │  - /api/auth/*                       │  │
│  │  - /api/ventas/*                     │  │
│  │  - /api/cosechas/*                   │  │
│  │  - /api/reportes/*                   │  │
│  └──────────────────────────────────────┘  │
└─────────────────┬───────────────────────────┘
                  │ HTTPS/REST + Supabase Client
┌─────────────────▼───────────────────────────┐
│            SUPABASE                         │
│  ┌──────────────────────────────────────┐  │
│  │  PostgreSQL Database                 │  │
│  │  - Usuarios, Ventas, Cosechas        │  │
│  │  - Clientes, Facturas, Auditoría     │  │
│  │  - Row Level Security (RLS)          │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  Supabase Auth                       │  │
│  │  - Login/Logout                      │  │
│  │  - JWT Tokens                        │  │
│  └──────────────────────────────────────┘  │
│  ┌──────────────────────────────────────┐  │
│  │  Supabase Storage (opcional)         │  │
│  │  - Documentos PDF                    │  │
│  │  - Facturas XML/PDF                  │  │
│  └──────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

### Modelo de Componentes Next.js
```
app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   └── layout.tsx
├── (dashboard)/
│   ├── layout.tsx (con Header, Sidebar)
│   ├── page.tsx (Dashboard principal)
│   ├── ventas/
│   │   ├── page.tsx (Lista ventas)
│   │   ├── nuevo/page.tsx
│   │   ├── [id]/page.tsx
│   │   └── reportes/page.tsx
│   ├── cosechas/
│   │   ├── page.tsx
│   │   ├── nuevo/page.tsx
│   │   └── cuadre/page.tsx
│   ├── reportes/
│   │   ├── page.tsx
│   │   ├── canal-ventas/page.tsx
│   │   └── estados-cuenta/page.tsx
│   └── facturacion/
│       └── page.tsx
├── api/
│   ├── auth/
│   │   └── [...supabase]/route.ts
│   ├── ventas/
│   │   ├── route.ts (GET, POST)
│   │   └── [id]/route.ts (GET, PUT, DELETE)
│   ├── cosechas/
│   │   ├── route.ts
│   │   └── [id]/route.ts
│   ├── reportes/
│   │   ├── dashboard/route.ts
│   │   ├── canal-ventas/route.ts
│   │   └── estado-cuenta/route.ts
│   └── catalogos/
│       └── route.ts
└── layout.tsx (Root layout)
```

### Ventajas de esta Arquitectura

1. **Serverless**: No necesitas mantener servidores
2. **Auto-scaling**: Escala automáticamente con la demanda
3. **Edge Network**: Deploy global, baja latencia
4. **Integración perfecta**: Next.js + Supabase trabajan muy bien juntos
5. **Real-time opcional**: Supabase tiene subscripciones real-time
6. **Gratis**: Perfecto para empezar, luego escalar

---

## 💾 Base de Datos

### Esquema Completo

#### Tabla: `usuarios`
```sql
CREATE TABLE usuarios (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL, -- 'admin', 'responsable', 'readonly'
  oficina_id INT REFERENCES oficinas(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: `oficinas`
```sql
CREATE TABLE oficinas (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(10) UNIQUE NOT NULL, -- 'ALV', 'MV'
  nombre VARCHAR(100) NOT NULL, -- 'ALV Lerma', 'MV Tonameca'
  ubicacion VARCHAR(255),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: `responsables`
```sql
CREATE TABLE responsables (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  oficina_id INT REFERENCES oficinas(id),
  email VARCHAR(255),
  telefono VARCHAR(20),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: `regiones_mercado`
```sql
CREATE TABLE regiones_mercado (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true
);
```

#### Tabla: `clientes`
```sql
CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  tipo_cliente VARCHAR(50) NOT NULL, -- 'Cliente Final', 'Distribuidor Local', etc.
  rfc VARCHAR(13),
  email VARCHAR(255),
  telefono VARCHAR(20),
  direccion TEXT,
  ciudad VARCHAR(100),
  estado VARCHAR(100),
  codigo_postal VARCHAR(10),
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: `tipos_cliente`
```sql
CREATE TABLE tipos_cliente (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true
);

-- Valores iniciales
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

#### Tabla: `productos`
```sql
CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL, -- 'Entero', 'PAD', 'Larvas'
  unidad_medida VARCHAR(20) NOT NULL, -- 'kg', 'bote', 'pieza'
  descripcion TEXT,
  activo BOOLEAN DEFAULT true
);
```

#### Tabla: `tallas_camaron`
```sql
CREATE TABLE tallas_camaron (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL, -- '10-12', '12-15', etc.
  gramos_min INT,
  gramos_max INT,
  rango_ab_gr VARCHAR(20),
  talla_sin_cabeza_lb VARCHAR(20),
  talla_con_cabeza_kg VARCHAR(20),
  orden INT, -- Para ordenar en las listas
  activo BOOLEAN DEFAULT true
);

-- Valores iniciales basados en Imagen 13
INSERT INTO tallas_camaron (codigo, gramos_min, gramos_max, rango_ab_gr, talla_sin_cabeza_lb, talla_con_cabeza_kg, orden) VALUES
('10-12', 61, 70, '10-12', '61-70', '> 90', 1),
('12-15', 51, 60, '12-15', '51-60', '70 - 80', 2),
('14-20', 41, 50, '14-20', '41-50', '70 - 80', 3),
('16-20', 36, 40, '16-20', '36-40', '50 - 60', 4),
('21-25', 31, 35, '21-25', '31-35', '40 - 50', 5),
('26-30', 26, 30, '26-30', '26-30', '30 - 40', 6),
('31-35', 21, 25, '31-35', '21-25', '20 - 30', 7);
```

#### Tabla: `granjas`
```sql
CREATE TABLE granjas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  ubicacion VARCHAR(255),
  responsable VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: `cosechas`
```sql
CREATE TABLE cosechas (
  id SERIAL PRIMARY KEY,
  granja_id INT REFERENCES granjas(id),
  nota_salida VARCHAR(50) UNIQUE NOT NULL,
  fecha_cosecha DATE NOT NULL,
  responsable_id INT REFERENCES responsables(id),
  
  -- Kilogramos por talla
  kg_10_12 DECIMAL(10,3) DEFAULT 0,
  kg_12_15 DECIMAL(10,3) DEFAULT 0,
  kg_14_20 DECIMAL(10,3) DEFAULT 0,
  kg_16_20 DECIMAL(10,3) DEFAULT 0,
  kg_21_25 DECIMAL(10,3) DEFAULT 0,
  kg_26_30 DECIMAL(10,3) DEFAULT 0,
  kg_31_35 DECIMAL(10,3) DEFAULT 0,
  
  kg_total DECIMAL(10,3) GENERATED ALWAYS AS (
    kg_10_12 + kg_12_15 + kg_14_20 + kg_16_20 + 
    kg_21_25 + kg_26_30 + kg_31_35
  ) STORED,
  
  -- Diferencias (para cuadre)
  diferencia_10_12 DECIMAL(10,3) DEFAULT 0,
  diferencia_12_15 DECIMAL(10,3) DEFAULT 0,
  diferencia_14_20 DECIMAL(10,3) DEFAULT 0,
  diferencia_16_20 DECIMAL(10,3) DEFAULT 0,
  diferencia_21_25 DECIMAL(10,3) DEFAULT 0,
  diferencia_26_30 DECIMAL(10,3) DEFAULT 0,
  diferencia_31_35 DECIMAL(10,3) DEFAULT 0,
  
  comentarios TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: `ventas`
```sql
CREATE TABLE ventas (
  id SERIAL PRIMARY KEY,
  folio INT UNIQUE NOT NULL,
  
  -- Datos administrativos
  oficina_id INT REFERENCES oficinas(id),
  responsable_id INT REFERENCES responsables(id),
  region_mercado_id INT REFERENCES regiones_mercado(id),
  
  -- Datos de cosecha
  cosecha_id INT REFERENCES cosechas(id), -- NULL en Fase 1, requerido en Fase 3
  nota_salida_granja VARCHAR(50),
  fecha_cosecha DATE NOT NULL,
  fecha_entrega DATE NOT NULL,
  
  -- Datos del cliente
  cliente_id INT REFERENCES clientes(id),
  tipo_cliente_id INT REFERENCES tipos_cliente(id),
  no_orden_atarraya VARCHAR(50),
  
  -- Datos del producto
  producto_id INT REFERENCES productos(id),
  talla_camaron_id INT REFERENCES tallas_camaron(id),
  
  -- Cantidades y precios
  entero_kgs DECIMAL(10,3) DEFAULT 0,
  precio_venta_entero DECIMAL(10,2) DEFAULT 0,
  monto_venta_entero DECIMAL(10,2) GENERATED ALWAYS AS (entero_kgs * precio_venta_entero) STORED,
  
  pad_kgs DECIMAL(10,3) DEFAULT 0,
  precio_venta_pad DECIMAL(10,2) DEFAULT 0,
  monto_venta_pad DECIMAL(10,2) GENERATED ALWAYS AS (pad_kgs * precio_venta_pad) STORED,
  
  -- Descuentos
  descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
  descuento_mxn DECIMAL(10,2) DEFAULT 0,
  
  -- Totales
  total_orden DECIMAL(10,2) GENERATED ALWAYS AS (
    monto_venta_entero + monto_venta_pad - descuento_mxn
  ) STORED,
  
  -- Datos de pago
  metodo_pago VARCHAR(50) NOT NULL, -- 'Cortesía', 'Transferencia', 'Efectivo', 'POS'
  forma_pago VARCHAR(50) NOT NULL, -- 'Pagado', 'Pendiente', 'Cortesía', 'PG'
  estatus_pago_cliente VARCHAR(50) DEFAULT 'Pendiente', -- 'Pagado', 'Pendiente', 'Cortesía'
  estatus_deposito VARCHAR(50),
  folio_transferencia VARCHAR(100),
  
  -- Datos de facturación
  uso_cfdi VARCHAR(10), -- 'G01', 'G02', 'G03', etc.
  tipo_factura VARCHAR(10), -- 'PG', 'Pendiente', etc.
  monto_facturar DECIMAL(10,2),
  estatus_factura VARCHAR(50) DEFAULT 'Pendiente', -- 'Enviada', 'Pendiente'
  no_factura VARCHAR(50),
  
  -- Facturación en exhibiciones
  estatus_1er_pago VARCHAR(50),
  fecha_1er_pago DATE,
  monto_1er_pago DECIMAL(10,2),
  
  estatus_2o_pago VARCHAR(50),
  fecha_2o_pago DATE,
  monto_2o_pago DECIMAL(10,2),
  
  -- Auditoría
  created_by INT REFERENCES usuarios(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INT REFERENCES usuarios(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_ventas_fecha_entrega ON ventas(fecha_entrega);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX idx_ventas_responsable ON ventas(responsable_id);
CREATE INDEX idx_ventas_oficina ON ventas(oficina_id);
CREATE INDEX idx_ventas_cosecha ON ventas(cosecha_id);
```

#### Tabla: `facturas`
```sql
CREATE TABLE facturas (
  id SERIAL PRIMARY KEY,
  venta_id INT REFERENCES ventas(id),
  folio VARCHAR(50) UNIQUE NOT NULL,
  serie VARCHAR(10),
  uuid VARCHAR(100) UNIQUE,
  
  cliente_id INT REFERENCES clientes(id),
  fecha_emision DATE NOT NULL,
  fecha_timbrado TIMESTAMP,
  
  subtotal DECIMAL(10,2) NOT NULL,
  iva DECIMAL(10,2) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  
  metodo_pago VARCHAR(10), -- SAT: 'PUE', 'PPD'
  forma_pago VARCHAR(10), -- SAT: '01', '03', etc.
  uso_cfdi VARCHAR(10), -- SAT: 'G01', 'G03', etc.
  
  estatus VARCHAR(50) DEFAULT 'Vigente', -- 'Vigente', 'Cancelada'
  fecha_cancelacion DATE,
  motivo_cancelacion TEXT,
  
  xml_path TEXT,
  pdf_path TEXT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tabla: `auditoria`
```sql
CREATE TABLE auditoria (
  id SERIAL PRIMARY KEY,
  tabla VARCHAR(50) NOT NULL,
  registro_id INT NOT NULL,
  accion VARCHAR(20) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  usuario_id INT REFERENCES usuarios(id),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT
);

CREATE INDEX idx_auditoria_tabla_registro ON auditoria(tabla, registro_id);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_fecha ON auditoria(fecha);
```

---

## 🛠️ Stack Tecnológico

### Backend
- **Framework**: Next.js API Routes (serverless)
- **Base de Datos**: Supabase (PostgreSQL)
- **ORM**: Prisma con Supabase
- **Autenticación**: Supabase Auth
- **Validación**: Zod
- **Testing**: Jest + Supertest
- **Documentación API**: Swagger/OpenAPI

### Frontend
- **Framework**: Next.js 14+ con TypeScript (App Router)
- **Routing**: Next.js App Router
- **Estado Global**: Zustand
- **UI Components**: TailwindCSS + shadcn/ui
- **Forms**: React Hook Form + Zod
- **Gráficos**: Recharts
- **Tablas**: TanStack Table (React Table)
- **Fechas**: date-fns
- **HTTP Client**: Fetch API / Axios
- **Testing**: Vitest + React Testing Library
- **Supabase Client**: @supabase/supabase-js

### Hosting & Database
- **Hosting Backend + Frontend**: Vercel (Free Tier)
- **Base de Datos**: Supabase (Free Tier)
  - PostgreSQL 15
  - Row Level Security (RLS)
  - Realtime subscriptions
  - Storage para archivos
- **CI/CD**: Vercel Git Integration (automático)
- **Monitoreo**: Vercel Analytics + Sentry

### Limitaciones Free Tier

#### Supabase Free Tier
- ✅ 500 MB database storage
- ✅ 2 GB bandwidth / mes
- ✅ 50,000 monthly active users (auth)
- ✅ 2 GB file storage
- ✅ 50 MB file uploads
- ⚠️ Proyectos pausados después de 1 semana de inactividad

#### Vercel Free Tier
- ✅ 100 GB bandwidth / mes
- ✅ Serverless Functions (10 segundos timeout)
- ✅ 6,000 serverless executions / día
- ✅ 100 GB-hours compute time
- ✅ 1 concurrent build
- ⚠️ Sin custom domains comerciales

### Herramientas de Desarrollo
- **Editor**: VS Code
- **Control de versiones**: Git + GitHub
- **API Testing**: Postman / Insomnia
- **Database GUI**: Supabase Studio (web-based)
- **Supabase CLI**: Para migraciones locales

---

## 📁 Estructura del Proyecto

```
agua-blanca-system/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── ventas/
│   │   │   ├── page.tsx
│   │   │   ├── nuevo/
│   │   │   │   └── page.tsx
│   │   │   ├── [id]/
│   │   │   │   ├── page.tsx
│   │   │   │   └── editar/page.tsx
│   │   │   └── reportes/
│   │   │       ├── page.tsx
│   │   │       ├── canal-ventas/page.tsx
│   │   │       ├── resumen-responsables/page.tsx
│   │   │       └── resumen-tipo-cliente/page.tsx
│   │   ├── cosechas/
│   │   │   ├── page.tsx
│   │   │   ├── nuevo/page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── cuadre/page.tsx
│   │   ├── clientes/
│   │   │   ├── page.tsx
│   │   │   ├── nuevo/page.tsx
│   │   │   ├── [id]/page.tsx
│   │   │   └── estado-cuenta/[id]/page.tsx
│   │   ├── facturacion/
│   │   │   ├── page.tsx
│   │   │   ├── conciliacion/page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── administracion/
│   │       ├── usuarios/page.tsx
│   │       └── catalogos/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   └── callback/route.ts
│   │   ├── ventas/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   └── export/route.ts
│   │   ├── cosechas/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   └── [id]/disponibilidad/route.ts
│   │   ├── clientes/
│   │   │   ├── route.ts
│   │   │   ├── [id]/route.ts
│   │   │   └── [id]/estado-cuenta/route.ts
│   │   ├── reportes/
│   │   │   ├── dashboard/route.ts
│   │   │   ├── ventas-responsable/route.ts
│   │   │   ├── ventas-tipo-cliente/route.ts
│   │   │   ├── canal-ventas/route.ts
│   │   │   └── cuadre-produccion/route.ts
│   │   ├── facturacion/
│   │   │   ├── route.ts
│   │   │   └── [id]/route.ts
│   │   └── catalogos/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── loading.tsx
├── components/
│   ├── ui/ (shadcn components)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   ├── dialog.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   ├── common/
│   │   ├── DataTable.tsx
│   │   ├── DatePicker.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ErrorBoundary.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   ├── Footer.tsx
│   │   └── DashboardLayout.tsx
│   ├── ventas/
│   │   ├── VentaForm.tsx
│   │   ├── VentasList.tsx
│   │   ├── VentaCard.tsx
│   │   ├── ConcentradoVentas.tsx
│   │   ├── ResumenResponsables.tsx
│   │   ├── ResumenTipoCliente.tsx
│   │   └── CanalVentasCharts.tsx
│   ├── cosechas/
│   │   ├── CosechaForm.tsx
│   │   ├── CosechasList.tsx
│   │   └── CuadreProduccion.tsx
│   ├── reportes/
│   │   ├── DashboardKPIs.tsx
│   │   ├── VentasChart.tsx
│   │   └── EstadoCuentaTable.tsx
│   └── auth/
│       └── LoginForm.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts (client-side)
│   │   ├── server.ts (server-side)
│   │   └── middleware.ts
│   ├── utils/
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   ├── calculations.ts
│   │   └── constants.ts
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useVentas.ts
│   │   ├── useCosechas.ts
│   │   ├── useClientes.ts
│   │   └── useSupabase.ts
│   └── services/
│       ├── ventas.service.ts
│       ├── cosechas.service.ts
│       ├── clientes.service.ts
│       └── reportes.service.ts
├── types/
│   ├── database.types.ts (generado por Supabase CLI)
│   ├── venta.types.ts
│   ├── cosecha.types.ts
│   ├── cliente.types.ts
│   └── common.types.ts
├── store/
│   ├── authStore.ts
│   └── uiStore.ts
├── supabase/
│   ├── migrations/
│   │   ├── 20240101000000_initial_schema.sql
│   │   ├── 20240101000001_create_ventas.sql
│   │   ├── 20240101000002_create_cosechas.sql
│   │   ├── 20240101000003_create_rls_policies.sql
│   │   └── ...
│   ├── seed.sql
│   └── config.toml
├── scripts/
│   ├── migrate-excel-data.ts
│   └── generate-supabase-types.sh
├── public/
│   ├── images/
│   └── assets/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.local.example
├── .env.production
├── .gitignore
├── next.config.js
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── components.json (shadcn config)
├── middleware.ts (Supabase auth middleware)
├── vercel.json
└── README.md
```

---

## 🚀 Fase 1: Sistema de Ventas

### Objetivos
- Formulario completo de captura de ventas
- Visualización de ventas registradas (Concentrado)
- Resúmenes por responsable y tipo de cliente
- Reportes básicos con gráficos
- Exportación de datos

### 1.1 Formulario de Ventas

#### Campos del Formulario
```typescript
interface VentaForm {
  // Datos administrativos
  oficina: string;
  responsable: string;
  regionMercado?: string;
  
  // Datos de cosecha
  notaSalidaGranja?: string;
  fechaCosecha: Date;
  fechaEntrega: Date;
  
  // Datos del cliente
  cliente: string;
  tipoCliente: string;
  noOrdenAtarraya?: string;
  
  // Datos del producto
  tipoProducto: 'Entero' | 'PAD' | 'Larvas';
  tallaCamaron?: string;
  
  // Cantidades y precios - Entero
  enteroKgs?: number;
  precioVentaEntero?: number;
  // montoVentaEntero se calcula automáticamente
  
  // Cantidades y precios - PAD
  padKgs?: number;
  precioVentaPad?: number;
  // montoVentaPad se calcula automáticamente
  
  // Descuentos
  descuentoPorcentaje?: number;
  descuentoMxn?: number;
  
  // Datos de pago
  metodoPago: string;
  formaPago: string;
  estatusPagoCliente?: string;
  estatusDeposito?: string;
  folioTransferencia?: string;
  
  // Datos de facturación
  usoCFDI?: string;
  tipoFactura?: string;
  montoFacturar?: number;
  estatusFactura?: string;
  noFactura?: string;
}
```

#### Validaciones
- Campos obligatorios: oficina, responsable, fechaCosecha, fechaEntrega, cliente, tipoCliente, tipoProducto, metodoPago, formaPago
- fechaEntrega >= fechaCosecha
- Si tipoProducto = 'Entero': enteroKgs y precioVentaEntero requeridos
- Si tipoProducto = 'PAD': padKgs y precioVentaPad requeridos
- Cantidades > 0
- Precios >= 0
- Descuentos >= 0

#### Cálculos Automáticos
```javascript
montoVentaEntero = enteroKgs * precioVentaEntero
montoVentaPad = padKgs * precioVentaPad
totalOrden = montoVentaEntero + montoVentaPad - descuentoMxn
```

### 1.2 Concentrado de Ventas

#### Funcionalidades
- Tabla con paginación (20, 50, 100 registros por página)
- Filtros múltiples:
  - Rango de fechas (fecha inicio - fecha fin)
  - Oficina
  - Responsable
  - Cliente
  - Tipo de cliente
  - Producto
  - Estatus de pago
- Ordenamiento por columna
- Búsqueda general
- Botones de acción: Ver detalle, Editar, Eliminar (con confirmación)
- Exportar a Excel/CSV
- Columnas totalizadoras en footer

#### Columnas de la Tabla
1. Folio
2. Fecha Entrega
3. Oficina
4. Responsable
5. Cliente
6. Tipo Cliente
7. Producto
8. Talla
9. Entero Kgs
10. Precio Entero
11. Monto Entero
12. PAD Kgs
13. Precio PAD
14. Monto PAD
15. Total Orden
16. Estatus Pago
17. Acciones

### 1.3 Resumen Cuentas I - Por Responsable

#### Estructura
```
Responsable
├── Tipo Cliente 1
│   ├── Cliente A: Cortesía | Pagado | Pendiente | Total
│   └── Cliente B: Cortesía | Pagado | Pendiente | Total
├── Tipo Cliente 2
└── Total por Responsable
```

#### Filtros Interactivos
- Timeline de meses (selección múltiple)
- Expandir/Contraer por responsable
- Expandir/Contraer por tipo de cliente
- Filtro de estatus de pago

### 1.4 Resumen Cuentas II - Por Tipo de Cliente

#### Estructura
```
Tipo Cliente
├── Responsable 1
│   ├── Cliente A: Cortesía | Pagado | Pendiente | Total
│   └── Cliente B: Cortesía | Pagado | Pendiente | Total
├── Responsable 2
└── Total por Tipo Cliente
```

### 1.5 Canal de Ventas

#### Reportes a Implementar

**1. Por Tipo de Cliente | Total MXN**
- Tabla con: Tipo Cliente | Entero | PAD | Total
- Totales generales

**2. Por Talla de Camarón | Total MXN**
- Tabla con tallas y montos por producto
- Gráfico de barras comparativo

**3. Por Talla de Camarón | Total Kgs**
- Tabla con tallas y kilogramos
- Gráfico de barras

**4. Precio Promedio por Talla**
- Tabla calculada: Total Monto / Total Kgs
- Gráfico de barras de precios

### 1.6 Estados de Cuenta por Cliente

#### Funcionalidades
- Selector de cliente
- Rango de fechas
- Tabla detallada de todas las transacciones:
  - Folio, Fecha, Producto, Talla, Cantidad, Precio, Monto
  - Método de Pago, Estatus Pago, Factura, Estatus Factura
- Totales:
  - Total transacciones
  - Total pagado
  - Total pendiente
  - Saldo actual
- Exportar a PDF como estado de cuenta formal

---

## 🌱 Fase 2: Sistema de Cosechas

### Objetivos
- Formulario de registro de cosechas
- Cuadre de producción de granja
- Reportes de producción
- Vinculación básica con sistema de ventas

### 2.1 Formulario de Cosechas

#### Campos
```typescript
interface CosechaForm {
  granja: string;
  notaSalida: string;
  fechaCosecha: Date;
  responsable: string;
  
  // Kilogramos por talla
  kg_10_12: number;
  kg_12_15: number;
  kg_14_20: number;
  kg_16_20: number;
  kg_21_25: number;
  kg_26_30: number;
  kg_31_35: number;
  
  // Diferencias (opcional, para cuadre)
  diferencia_10_12?: number;
  diferencia_12_15?: number;
  diferencia_14_20?: number;
  diferencia_16_20?: number;
  diferencia_21_25?: number;
  diferencia_26_30?: number;
  diferencia_31_35?: number;
  
  comentarios?: string;
}
```

#### Validaciones
- notaSalida única
- fechaCosecha no puede ser futura
- Al menos una talla debe tener kg > 0
- Total automático: suma de todas las tallas

### 2.2 Cuadre de Producción

#### Vista
- Tabla por fecha de cosecha
- Columnas por talla (10-12, 12-15, etc.)
- Filas:
  - Nota kg (lo registrado en cosecha)
  - Vendido kg (suma de ventas vinculadas)
  - Diferencia kg (Nota - Vendido)
- Totales por talla y general
- Código de colores:
  - Verde: Diferencia = 0
  - Amarillo: Diferencia < 5%
  - Rojo: Diferencia >= 5%

---

## 🔗 Fase 3: Unificación y Trazabilidad

### Objetivos
- Vincular cada venta con su cosecha de origen
- Control de inventario en tiempo real
- Trazabilidad completa
- Reportes avanzados
- Alertas automáticas

### 3.1 Trazabilidad Cosecha → Venta

#### Modificaciones al Formulario de Ventas
- Campo nuevo: **Cosecha de Origen** (dropdown)
  - Mostrar: Nota Salida | Fecha | Granja
  - Filtrar por tallas disponibles
- Validación: Verificar disponibilidad de kg en la cosecha
- Al registrar venta: Descontar kg de la cosecha

#### Cálculo de Inventario
```sql
-- Disponible por cosecha y talla
SELECT 
  c.id,
  c.nota_salida,
  c.kg_10_12 - COALESCE(SUM(v.entero_kgs) FILTER (WHERE t.codigo = '10-12'), 0) as disponible_10_12,
  c.kg_12_15 - COALESCE(SUM(v.entero_kgs) FILTER (WHERE t.codigo = '12-15'), 0) as disponible_12_15,
  ...
FROM cosechas c
LEFT JOIN ventas v ON v.cosecha_id = c.id
LEFT JOIN tallas_camaron t ON t.id = v.talla_camaron_id
GROUP BY c.id;
```

### 3.2 Dashboard Unificado

#### KPIs Principales
```
┌─────────────────┬─────────────────┬─────────────────┐
│ Total Cosechado │ Total Vendido   │ Inventario Actual│
│   5,234.5 kg    │   4,892.3 kg    │    342.2 kg     │
└─────────────────┴─────────────────┴─────────────────┘

┌─────────────────┬─────────────────┬─────────────────┐
│ Ventas del Mes  │ Ventas Pendientes│ Facturas Pendientes│
│  $523,450.00    │   $45,230.00    │       15        │
└─────────────────┴─────────────────┴─────────────────┘
```

#### Gráficos
1. **Ventas por Mes** (línea)
2. **Ventas por Producto** (pie)
3. **Top 10 Clientes** (barras horizontales)
4. **Ventas por Responsable** (barras)
5. **Inventario por Talla** (barras)
6. **Tendencia de Precios** (línea)

#### Alertas
- Inventario bajo por talla (< umbral configurable)
- Facturas pendientes > 30 días
- Pagos pendientes > 15 días
- Cosechas sin ventas registradas

### 3.3 Reportes Avanzados

#### Reporte de Trazabilidad
```
Cosecha: #4074 | Granja: MV Vigas | Fecha: 02-Ene-2021
Total Cosechado: 150.5 kg (Talla 12-15)

Ventas Vinculadas:
├── Venta #105 | 14-Feb-21 | Cliente: Lamarca | 50 kg | $2,500
├── Venta #196 | 22-Feb-21 | Cliente: Lamarca | 40 kg | $2,000
└── Venta #... | ... | ... | ...

Total Vendido: 145.3 kg
Inventario: 5.2 kg
Diferencia: 0 kg
```

#### Reporte de Rentabilidad
- Costo de producción por kg (manual o calculado)
- Precio de venta promedio
- Margen de ganancia
- Análisis por producto, talla, cliente, responsable

---

## 🌐 API Endpoints

### Autenticación
```
POST   /api/auth/register          - Registrar usuario (solo admin)
POST   /api/auth/login             - Login
POST   /api/auth/logout            - Logout
POST   /api/auth/refresh           - Refresh token
GET    /api/auth/me                - Obtener usuario actual
PUT    /api/auth/change-password   - Cambiar contraseña
```

### Usuarios
```
GET    /api/usuarios               - Listar usuarios (admin)
GET    /api/usuarios/:id           - Obtener usuario
POST   /api/usuarios               - Crear usuario (admin)
PUT    /api/usuarios/:id           - Actualizar usuario
DELETE /api/usuarios/:id           - Eliminar usuario (admin)
```

### Ventas
```
GET    /api/ventas                 - Listar ventas (con filtros y paginación)
GET    /api/ventas/:id             - Obtener venta por ID
POST   /api/ventas                 - Crear venta
PUT    /api/ventas/:id             - Actualizar venta
DELETE /api/ventas/:id             - Eliminar venta
GET    /api/ventas/stats           - Estadísticas generales
GET    /api/ventas/export          - Exportar a Excel/CSV
```

### Cosechas
```
GET    /api/cosechas               - Listar cosechas
GET    /api/cosechas/:id           - Obtener cosecha
POST   /api/cosechas               - Crear cosecha
PUT    /api/cosechas/:id           - Actualizar cosecha
DELETE /api/cosechas/:id           - Eliminar cosecha
GET    /api/cosechas/:id/disponibilidad - Inventario disponible
GET    /api/cosechas/:id/ventas    - Ventas vinculadas a cosecha
```

### Clientes
```
GET    /api/clientes               - Listar clientes
GET    /api/clientes/:id           - Obtener cliente
POST   /api/clientes               - Crear cliente
PUT    /api/clientes/:id           - Actualizar cliente
DELETE /api/clientes/:id           - Eliminar cliente (soft delete)
GET    /api/clientes/:id/estado-cuenta - Estado de cuenta del cliente
```

### Reportes
```
GET    /api/reportes/dashboard     - KPIs del dashboard
GET    /api/reportes/ventas-por-responsable - Resumen Cuentas I
GET    /api/reportes/ventas-por-tipo-cliente - Resumen Cuentas II
GET    /api/reportes/canal-ventas  - Análisis de canal de ventas
GET    /api/reportes/cuadre-produccion - Cuadre de producción
GET    /api/reportes/trazabilidad/:cosechaId - Trazabilidad de cosecha
GET    /api/reportes/export/pdf    - Exportar reporte a PDF
```

### Catálogos
```
GET    /api/catalogos/oficinas
GET    /api/catalogos/responsables
GET    /api/catalogos/regiones-mercado
GET    /api/catalogos/tipos-cliente
GET    /api/catalogos/productos
GET    /api/catalogos/tallas-camaron
```

### Facturación
```
GET    /api/facturas               - Listar facturas
GET    /api/facturas/:id           - Obtener factura
POST   /api/facturas               - Crear factura
PUT    /api/facturas/:id           - Actualizar factura
DELETE /api/facturas/:id           - Cancelar factura
GET    /api/facturas/:id/xml       - Descargar XML
GET    /api/facturas/:id/pdf       - Descargar PDF
```

---

## 🔐 Seguridad y Autenticación

### Roles de Usuario
1. **Admin**
   - Acceso completo al sistema
   - Gestión de usuarios
   - Configuración de catálogos
   - Acceso a todos los reportes
   - Puede eliminar registros

2. **Responsable**
   - Crear y editar ventas de su oficina
   - Ver reportes de su oficina
   - Ver estados de cuenta de sus clientes
   - NO puede eliminar registros
   - NO puede gestionar usuarios

3. **Solo Lectura**
   - Ver todos los reportes
   - Exportar datos
   - NO puede crear/editar/eliminar

### Implementación con Supabase Auth

#### 1. Setup Inicial de Auth

```typescript
// lib/supabase/client.ts (Client-side)
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export const createClient = () => createClientComponentClient();

// lib/supabase/server.ts (Server-side)
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const createServerClient = () => 
  createServerComponentClient({ cookies });
```

#### 2. Estructura de Usuario en Supabase

```sql
-- La tabla auth.users es manejada por Supabase
-- Creamos nuestra tabla usuarios que extiende auth.users

CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  rol VARCHAR(50) NOT NULL DEFAULT 'readonly', -- 'admin', 'responsable', 'readonly'
  oficina_id INT REFERENCES oficinas(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger para crear usuario automáticamente al registrarse
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO public.usuarios (id, email, nombre, rol)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'readonly')
  );
  RETURN NEW;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

#### 3. Login/Registro

```typescript
// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      router.push('/dashboard');
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Cargando...' : 'Iniciar Sesión'}
        </button>
      </form>
    </div>
  );
}
```

#### 4. Registro de Nuevos Usuarios (Solo Admin)

```typescript
// app/api/usuarios/route.ts
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createServerClient();
  
  // Verificar que el usuario actual es admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const { data: currentUser } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (currentUser?.rol !== 'admin') {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
  }

  // Crear nuevo usuario
  const body = await request.json();
  const { email, password, nombre, rol, oficina_id } = body;

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      nombre,
      rol,
      oficina_id,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
```

#### 5. Middleware de Protección

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Rutas públicas
  const publicRoutes = ['/login', '/reset-password'];
  const isPublicRoute = publicRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  if (isPublicRoute) {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return res;
  }

  // Rutas protegidas
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Verificar roles para rutas específicas
  const adminRoutes = ['/administracion'];
  const isAdminRoute = adminRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  if (isAdminRoute) {
    const { data: user } = await supabase
      .from('usuarios')
      .select('rol')
      .eq('id', session.user.id)
      .single();

    if (user?.rol !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
```

#### 6. Hook de Autenticación

```typescript
// lib/hooks/useAuth.ts
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'responsable' | 'readonly';
  oficina_id: number | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Escuchar cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) {
      setProfile(data);
    }
    setLoading(false);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return {
    user,
    profile,
    loading,
    signOut,
    isAdmin: profile?.rol === 'admin',
    isResponsable: profile?.rol === 'responsable',
  };
}
```

### Row Level Security (RLS)

#### Políticas para Ventas

```sql
-- Habilitar RLS
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

-- Los usuarios solo ven ventas de su oficina (excepto admins)
CREATE POLICY "usuarios_ven_su_oficina" ON ventas
  FOR SELECT
  USING (
    -- Admins ven todo
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND rol = 'admin'
    )
    OR
    -- Otros usuarios solo ven su oficina
    oficina_id IN (
      SELECT oficina_id FROM usuarios 
      WHERE id = auth.uid()
    )
  );

-- Solo responsables y admins pueden insertar
CREATE POLICY "responsables_crean_ventas" ON ventas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol IN ('admin', 'responsable')
    )
  );

-- Solo responsables y admins pueden actualizar sus propias ventas
CREATE POLICY "responsables_editan_sus_ventas" ON ventas
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol IN ('admin', 'responsable')
      AND (rol = 'admin' OR oficina_id = ventas.oficina_id)
    )
  );

-- Solo admins pueden eliminar
CREATE POLICY "solo_admins_eliminan" ON ventas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );
```

#### Políticas para Clientes

```sql
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Todos pueden ver clientes
CREATE POLICY "todos_ven_clientes" ON clientes
  FOR SELECT
  USING (true);

-- Solo responsables y admins pueden crear/editar
CREATE POLICY "responsables_gestionan_clientes" ON clientes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol IN ('admin', 'responsable')
    )
  );
```

### Auditoría Automática

```sql
-- Trigger para registrar todos los cambios
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO auditoria (
    tabla, 
    registro_id, 
    accion, 
    usuario_id, 
    datos_anteriores, 
    datos_nuevos,
    ip_address
  )
  VALUES (
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END,
    current_setting('request.headers', true)::json->>'x-forwarded-for'
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aplicar a todas las tablas importantes
CREATE TRIGGER audit_ventas
  AFTER INSERT OR UPDATE OR DELETE ON ventas
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER audit_cosechas
  AFTER INSERT OR UPDATE OR DELETE ON cosechas
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER audit_clientes
  AFTER INSERT OR UPDATE OR DELETE ON clientes
  FOR EACH ROW EXECUTE FUNCTION audit_changes();
```

### Seguridad Adicional

#### Rate Limiting

```typescript
// middleware.ts - Agregar rate limiting simple
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function rateLimit(ip: string, limit = 100, window = 60000) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + window });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count++;
  return true;
}

// Usar en middleware
const ip = req.headers.get('x-forwarded-for') || 'unknown';
if (!rateLimit(ip)) {
  return NextResponse.json(
    { error: 'Demasiadas peticiones' }, 
    { status: 429 }
  );
}
```

#### Validación de Inputs

```typescript
// lib/utils/validators.ts
import { z } from 'zod';

export const ventaSchema = z.object({
  oficina: z.string().min(1, 'Oficina requerida'),
  responsable: z.string().min(1, 'Responsable requerido'),
  fechaCosecha: z.string().datetime(),
  fechaEntrega: z.string().datetime(),
  cliente: z.string().min(1, 'Cliente requerido'),
  tipoCliente: z.string().min(1),
  tipoProducto: z.enum(['Entero', 'PAD', 'Larvas']),
  enteroKgs: z.number().min(0).optional(),
  precioVenta: z.number().min(0).optional(),
  metodoPago: z.string().min(1),
  formaPago: z.string().min(1),
}).refine(data => {
  if (data.tipoProducto === 'Entero') {
    return data.enteroKgs && data.enteroKgs > 0;
  }
  return true;
}, {
  message: 'Entero requiere kilogramos > 0',
  path: ['enteroKgs']
});

// Usar en API routes
export async function POST(request: Request) {
  const body = await request.json();
  
  try {
    const validated = ventaSchema.parse(body);
    // Procesar venta...
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors }, 
        { status: 400 }
      );
    }
  }
}
```

#### Sanitización de Queries

```typescript
// Supabase maneja esto automáticamente con prepared statements
// Nunca construir queries con string concatenation

// ❌ MAL
const { data } = await supabase
  .from('ventas')
  .select('*')
  .eq('cliente', userInput); // Esto es seguro en Supabase

// ✅ BIEN - Supabase usa prepared statements internamente
const { data } = await supabase
  .from('ventas')
  .select('*')
  .eq('cliente', userInput); // Automáticamente sanitizado
```

---

## 🧪 Testing

### Configuración de Testing

#### Instalar Dependencias

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event msw
```

#### Configuración Vitest

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
```

```typescript
// tests/setup.ts
import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
```

### API Routes Testing

```typescript
// app/api/ventas/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';
import { createServerClient } from '@/lib/supabase/server';

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

describe('GET /api/ventas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe retornar ventas cuando el usuario está autenticado', async () => {
    const mockVentas = [
      { id: 1, cliente: 'Test', monto: 1000 },
      { id: 2, cliente: 'Test 2', monto: 2000 },
    ];

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: '123' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          data: mockVentas,
          error: null,
        }),
      }),
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);

    const request = new Request('http://localhost:3000/api/ventas');
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(mockVentas);
  });

  it('debe retornar 401 cuando no hay usuario', async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
        }),
      },
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);

    const request = new Request('http://localhost:3000/api/ventas');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});

describe('POST /api/ventas', () => {
  it('debe crear una venta válida', async () => {
    const ventaData = {
      oficina: 'MV Tonameca',
      responsable: 'Manuel F.',
      cliente: 'Test Cliente',
      tipoCliente: 'Restaurante',
      fechaCosecha: '2024-01-01',
      fechaEntrega: '2024-01-01',
      tipoProducto: 'Entero',
      enteroKgs: 10,
      precioVenta: 200,
      metodoPago: 'Transferencia',
      formaPago: 'Pagado',
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: '123' } },
        }),
      },
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: [{ id: 1, ...ventaData }],
            error: null,
          }),
        }),
      }),
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);

    const request = new Request('http://localhost:3000/api/ventas', {
      method: 'POST',
      body: JSON.stringify(ventaData),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toHaveProperty('id');
  });

  it('debe rechazar venta sin campos requeridos', async () => {
    const ventaIncompleta = {
      oficina: 'MV Tonameca',
      // Falta cliente, fechas, etc.
    };

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: '123' } },
        }),
      },
    };

    vi.mocked(createServerClient).mockReturnValue(mockSupabase as any);

    const request = new Request('http://localhost:3000/api/ventas', {
      method: 'POST',
      body: JSON.stringify(ventaIncompleta),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
```

### Component Testing

```typescript
// components/ventas/VentaForm.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import VentaForm from './VentaForm';

describe('VentaForm', () => {
  it('debe renderizar todos los campos obligatorios', () => {
    render(<VentaForm />);
    
    expect(screen.getByLabelText(/oficina/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/responsable/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cliente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha cosecha/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha entrega/i)).toBeInTheDocument();
  });

  it('debe calcular automáticamente el monto', async () => {
    const user = userEvent.setup();
    render(<VentaForm />);
    
    const kgsInput = screen.getByLabelText(/entero.*kgs/i);
    const precioInput = screen.getByLabelText(/precio venta/i);
    const montoInput = screen.getByLabelText(/monto venta/i);

    await user.type(kgsInput, '10');
    await user.type(precioInput, '200');

    await waitFor(() => {
      expect(montoInput).toHaveValue('2000.00');
    });
  });

  it('debe validar campos requeridos al enviar', async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn();
    
    render(<VentaForm onSubmit={mockSubmit} />);
    
    const submitButton = screen.getByRole('button', { name: /registrar/i });
    await user.click(submitButton);

    // No debe llamar a onSubmit si hay errores de validación
    expect(mockSubmit).not.toHaveBeenCalled();
    
    // Debe mostrar mensajes de error
    expect(screen.getByText(/oficina.*requerida/i)).toBeInTheDocument();
  });

  it('debe enviar datos válidos correctamente', async () => {
    const user = userEvent.setup();
    const mockSubmit = vi.fn();
    
    render(<VentaForm onSubmit={mockSubmit} />);
    
    // Llenar formulario
    await user.selectOptions(screen.getByLabelText(/oficina/i), 'MV Tonameca');
    await user.selectOptions(screen.getByLabelText(/responsable/i), 'Manuel F.');
    await user.type(screen.getByLabelText(/cliente/i), 'Test Cliente');
    // ... llenar más campos

    const submitButton = screen.getByRole('button', { name: /registrar/i });
    await user.click(submitButton);

    expect(mockSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        oficina: 'MV Tonameca',
        responsable: 'Manuel F.',
        cliente: 'Test Cliente',
      })
    );
  });

  it('debe limpiar el formulario al hacer click en limpiar', async () => {
    const user = userEvent.setup();
    render(<VentaForm />);
    
    const clienteInput = screen.getByLabelText(/cliente/i);
    await user.type(clienteInput, 'Test Cliente');
    
    expect(clienteInput).toHaveValue('Test Cliente');
    
    const limpiarButton = screen.getByRole('button', { name: /limpiar/i });
    await user.click(limpiarButton);
    
    expect(clienteInput).toHaveValue('');
  });
});
```

### Integration Testing

```typescript
// tests/integration/ventas-flow.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Usar Supabase de test
const supabase = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_KEY!
);

describe('Flujo completo de ventas', () => {
  let testUserId: string;
  let testVentaId: number;

  beforeAll(async () => {
    // Crear usuario de prueba
    const { data: authData } = await supabase.auth.signUp({
      email: 'test@test.com',
      password: 'test123',
    });
    testUserId = authData.user!.id;

    // Insertar datos de prueba necesarios
    await supabase.from('oficinas').insert({
      nombre: 'Test Oficina',
      codigo: 'TEST',
    });
  });

  afterAll(async () => {
    // Limpiar datos de prueba
    await supabase.from('ventas').delete().eq('created_by', testUserId);
    await supabase.from('usuarios').delete().eq('id', testUserId);
    await supabase.from('oficinas').delete().eq('codigo', 'TEST');
  });

  it('debe crear una venta completa', async () => {
    const { data, error } = await supabase
      .from('ventas')
      .insert({
        oficina: 'Test Oficina',
        responsable: 'Test User',
        cliente: 'Test Cliente',
        tipoCliente: 'Restaurante',
        fechaCosecha: '2024-01-01',
        fechaEntrega: '2024-01-01',
        tipoProducto: 'Entero',
        enteroKgs: 10,
        precioVenta: 200,
        metodoPago: 'Transferencia',
        formaPago: 'Pagado',
        created_by: testUserId,
      })
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toHaveProperty('id');
    expect(data.montoVenta).toBe(2000);

    testVentaId = data.id;
  });

  it('debe actualizar una venta existente', async () => {
    const { data, error } = await supabase
      .from('ventas')
      .update({
        enteroKgs: 15,
        precioVenta: 250,
      })
      .eq('id', testVentaId)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data.enteroKgs).toBe(15);
    expect(data.precioVenta).toBe(250);
    expect(data.montoVenta).toBe(3750);
  });

  it('debe registrar la auditoría de cambios', async () => {
    const { data, error } = await supabase
      .from('auditoria')
      .select('*')
      .eq('tabla', 'ventas')
      .eq('registro_id', testVentaId)
      .order('fecha', { ascending: false });

    expect(error).toBeNull();
    expect(data).toHaveLength(2); // INSERT y UPDATE
    expect(data[0].accion).toBe('UPDATE');
    expect(data[1].accion).toBe('INSERT');
  });
});
```

### E2E Testing con Playwright (Opcional)

```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('debe permitir login con credenciales válidas', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('debe mostrar error con credenciales inválidas', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    
    await page.fill('input[type="email"]', 'wrong@test.com');
    await page.fill('input[type="password"]', 'wrong');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.error')).toBeVisible();
  });
});

// tests/e2e/ventas.spec.ts
test.describe('Ventas Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login antes de cada test
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'test@test.com');
    await page.fill('input[type="password"]', 'test123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('debe crear una nueva venta', async ({ page }) => {
    await page.goto('http://localhost:3000/ventas/nuevo');
    
    await page.selectOption('select[name="oficina"]', 'MV Tonameca');
    await page.selectOption('select[name="responsable"]', 'Manuel F.');
    await page.fill('input[name="cliente"]', 'Cliente E2E Test');
    await page.selectOption('select[name="tipoCliente"]', 'Restaurante');
    await page.fill('input[name="fechaCosecha"]', '2024-01-01');
    await page.fill('input[name="fechaEntrega"]', '2024-01-01');
    await page.selectOption('select[name="tipoProducto"]', 'Entero');
    await page.fill('input[name="enteroKgs"]', '10');
    await page.fill('input[name="precioVenta"]', '200');
    await page.selectOption('select[name="metodoPago"]', 'Transferencia');
    await page.selectOption('select[name="formaPago"]', 'Pagado');
    
    await page.click('button[type="submit"]');
    
    await expect(page.locator('.success-message')).toBeVisible();
    await expect(page).toHaveURL('**/ventas');
  });
});
```

### Scripts de Testing en package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  }
}
```

### Cobertura de Código

```bash
# Generar reporte de cobertura
npm run test:coverage

# Ver reporte en navegador
open coverage/index.html
```

### Mejores Prácticas de Testing

1. **Prueba comportamiento, no implementación**
2. **Usa queries accesibles** (getByRole, getByLabelText)
3. **Evita testing de detalles de implementación**
4. **Mock solo cuando sea necesario**
5. **Tests aislados e independientes**
6. **Nombres descriptivos de tests**

---

## 🚢 Deployment

### Setup Inicial

#### 1. Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto:
   - Nombre: `agua-blanca-system`
   - Database Password: Genera una segura
   - Region: `South America (São Paulo)` (más cercana a México)
3. Espera a que el proyecto se aprovisione (~2 minutos)
4. Ve a Project Settings > API para obtener:
   - `Project URL`
   - `anon public` key
   - `service_role` key (solo para backend/migraciones)

#### 2. Configurar Base de Datos

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Vincular proyecto local
supabase link --project-ref tu-project-ref

# Crear migraciones
supabase migration new initial_schema

# Aplicar migraciones
supabase db push
```

#### 3. Deployment en Vercel

**Opción A: Desde GitHub (Recomendado)**

1. Sube tu código a GitHub
2. Ve a [vercel.com](https://vercel.com) y haz login
3. Click "New Project"
4. Importa tu repositorio de GitHub
5. Vercel detectará Next.js automáticamente
6. Configura las variables de entorno (ver abajo)
7. Click "Deploy"

**Opción B: Desde CLI**

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Production
vercel --prod
```

### Configuración de Variables de Entorno

#### Variables en Vercel

Ve a Project Settings > Environment Variables y agrega:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# App
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app

# (Opcional) Para emails
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@aguablanca.com
SMTP_PASS=tu-password

# (Opcional) Sentry
NEXT_PUBLIC_SENTRY_DSN=tu-sentry-dsn
```

#### Archivo `.env.local` (Desarrollo Local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Configuración de Supabase

#### 1. Row Level Security (RLS)

Supabase requiere políticas RLS para seguridad:

```sql
-- Habilitar RLS en todas las tablas
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosechas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo ven datos de su oficina
CREATE POLICY "usuarios_ven_su_oficina" ON ventas
  FOR SELECT
  USING (
    oficina_id IN (
      SELECT oficina_id FROM usuarios 
      WHERE id = auth.uid()
    )
  );

-- Política: Los admins ven todo
CREATE POLICY "admins_ven_todo" ON ventas
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );

-- Política: Solo admins pueden eliminar
CREATE POLICY "solo_admins_eliminan" ON ventas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );
```

#### 2. Funciones de Base de Datos

```sql
-- Función para obtener usuario actual con su rol
CREATE OR REPLACE FUNCTION get_current_user()
RETURNS TABLE (
  id UUID,
  email TEXT,
  rol VARCHAR(50),
  oficina_id INT
) AS $
BEGIN
  RETURN QUERY
  SELECT u.id, u.email, u.rol, u.oficina_id
  FROM usuarios u
  WHERE u.id = auth.uid();
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para calcular inventario disponible
CREATE OR REPLACE FUNCTION get_inventario_disponible(cosecha_id_param INT)
RETURNS TABLE (
  talla VARCHAR(20),
  cosechado DECIMAL(10,3),
  vendido DECIMAL(10,3),
  disponible DECIMAL(10,3)
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    t.codigo as talla,
    CASE t.codigo
      WHEN '10-12' THEN c.kg_10_12
      WHEN '12-15' THEN c.kg_12_15
      WHEN '14-20' THEN c.kg_14_20
      WHEN '16-20' THEN c.kg_16_20
      WHEN '21-25' THEN c.kg_21_25
      WHEN '26-30' THEN c.kg_26_30
      WHEN '31-35' THEN c.kg_31_35
    END as cosechado,
    COALESCE(SUM(v.entero_kgs) FILTER (WHERE v.talla_camaron_id = t.id), 0) as vendido,
    (CASE t.codigo
      WHEN '10-12' THEN c.kg_10_12
      WHEN '12-15' THEN c.kg_12_15
      WHEN '14-20' THEN c.kg_14_20
      WHEN '16-20' THEN c.kg_16_20
      WHEN '21-25' THEN c.kg_21_25
      WHEN '26-30' THEN c.kg_26_30
      WHEN '31-35' THEN c.kg_31_35
    END - COALESCE(SUM(v.entero_kgs) FILTER (WHERE v.talla_camaron_id = t.id), 0)) as disponible
  FROM cosechas c
  CROSS JOIN tallas_camaron t
  LEFT JOIN ventas v ON v.cosecha_id = c.id AND v.talla_camaron_id = t.id
  WHERE c.id = cosecha_id_param
  GROUP BY t.id, t.codigo, c.kg_10_12, c.kg_12_15, c.kg_14_20, 
           c.kg_16_20, c.kg_21_25, c.kg_26_30, c.kg_31_35;
END;
$ LANGUAGE plpgsql;
```

#### 3. Triggers para Auditoría

```sql
-- Trigger para registrar cambios en ventas
CREATE OR REPLACE FUNCTION audit_ventas_changes()
RETURNS TRIGGER AS $
BEGIN
  INSERT INTO auditoria (
    tabla, 
    registro_id, 
    accion, 
    usuario_id, 
    datos_anteriores, 
    datos_nuevos
  )
  VALUES (
    'ventas',
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER ventas_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON ventas
  FOR EACH ROW EXECUTE FUNCTION audit_ventas_changes();
```

### Configuración de Next.js

#### `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Configuración para Vercel
  images: {
    domains: ['tu-proyecto.supabase.co'],
  },
  
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

#### `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 10
    }
  }
}
```

#### `middleware.ts` (Autenticación)

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Rutas públicas
  if (req.nextUrl.pathname.startsWith('/login')) {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
    return res;
  }

  // Rutas protegidas
  if (!session && !req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### CI/CD Automático

Vercel maneja CI/CD automáticamente:

1. **Push a `main`**: Deploy automático a producción
2. **Pull Request**: Preview deployment automático
3. **Push a otras ramas**: Preview deployment

### Comandos Útiles

```bash
# Desarrollo local
npm run dev

# Build de producción (test local)
npm run build
npm start

# Ejecutar migraciones de Supabase
supabase db push

# Generar tipos de TypeScript desde Supabase
supabase gen types typescript --project-id tu-project-ref > types/database.types.ts

# Deploy manual a Vercel
vercel --prod

# Ver logs de producción
vercel logs

# Rollback a deployment anterior
vercel rollback
```

### Monitoreo y Logs

#### Vercel Analytics (Incluido en Free Tier)
- Ve a tu proyecto en Vercel > Analytics
- Métricas de rendimiento web vitals
- Tráfico y velocidad de carga

#### Supabase Dashboard
- Ve a tu proyecto > Database > Logs
- Monitorea queries lentas
- Revisa uso de almacenamiento

#### Logs de Errores
```typescript
// lib/logger.ts
export function logError(error: Error, context?: any) {
  console.error('Error:', error);
  
  // En producción, enviar a Sentry
  if (process.env.NODE_ENV === 'production') {
    // Sentry.captureException(error, { extra: context });
  }
}
```

### Backups

#### Supabase Backups (Free Tier)
- Backups diarios automáticos (7 días de retención)
- Ve a Project Settings > Database > Backups
- Puedes descargar backups manualmente

#### Backup Manual
```bash
# Usando Supabase CLI
supabase db dump -f backup.sql

# O usando pg_dump directamente
pg_dump "postgresql://..." > backup.sql
```

### Escalamiento

Cuando el proyecto crezca:

#### Supabase
- **Pro Plan ($25/mes)**: 8 GB database, 50 GB bandwidth, backups point-in-time
- **Team Plan**: Múltiples proyectos, más recursos

#### Vercel
- **Pro Plan ($20/mes/usuario)**: 1 TB bandwidth, analytics avanzados
- **Enterprise**: SLA, soporte dedicado

### Troubleshooting

#### Errores Comunes

**1. "Invalid API key" en Supabase**
```bash
# Verifica que las env vars estén configuradas
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY

# Regenera las keys en Supabase Dashboard si es necesario
```

**2. "Function timeout" en Vercel**
```javascript
// Optimiza queries grandes
// Usa paginación
// Implementa caché

// O aumenta timeout en vercel.json (máx 10s en free tier)
{
  "functions": {
    "app/api/reportes/heavy.ts": {
      "maxDuration": 10
    }
  }
}
```

**3. "Row Level Security" bloqueando queries**
```sql
-- Revisa políticas RLS
SELECT * FROM pg_policies WHERE tablename = 'ventas';

-- Temporalmente deshabilita RLS (solo desarrollo)
ALTER TABLE ventas DISABLE ROW LEVEL SECURITY;
```

**4. Proyecto Supabase pausado**
```
Free tier pausa proyectos después de 1 semana de inactividad.
Solución: 
- Haz cualquier query desde el dashboard para reactivar
- Configura un cron job que haga ping cada 6 días
```

---

## 📦 Migración de Datos desde Excel

### Preparación

#### 1. Instalar Dependencias

```bash
npm install xlsx @supabase/supabase-js dotenv
```

#### 2. Estructura del Script

```typescript
// scripts/migrate-excel-data.ts
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Usar service role key para bypass RLS
);

interface ExcelRow {
  '# Registro': number;
  'Oficina': string;
  'Responsable': string;
  'Región de Mercado': string;
  'Nota Salida Granja': string;
  'Fecha Cosecha': string | number;
  'Fecha Entrega': string | number;
  'Cliente': string;
  'Tipo de Cliente': string;
  'Tipo de Producto': string;
  'Talla Camarón': string;
  'Entero | kgs': number;
  'Precio Venta': number;
  'Monto Venta': number;
  'Descuento | %': number;
  'Descuento | mxn': number;
  'Método de Pago': string;
  'Forma de Pago': string;
  // ... más campos
}

// Mapeo de IDs de catálogos (caché)
const catalogCache = {
  oficinas: new Map<string, number>(),
  responsables: new Map<string, number>(),
  tiposCliente: new Map<string, number>(),
  productos: new Map<string, number>(),
  tallas: new Map<string, number>(),
  clientes: new Map<string, number>(),
};

async function loadCatalogs() {
  console.log('📚 Cargando catálogos...');

  // Cargar oficinas
  const { data: oficinas } = await supabase.from('oficinas').select('id, nombre');
  oficinas?.forEach(o => catalogCache.oficinas.set(o.nombre, o.id));

  // Cargar responsables
  const { data: responsables } = await supabase.from('responsables').select('id, nombre');
  responsables?.forEach(r => catalogCache.responsables.set(r.nombre, r.id));

  // Cargar tipos de cliente
  const { data: tiposCliente } = await supabase.from('tipos_cliente').select('id, nombre');
  tiposCliente?.forEach(t => catalogCache.tiposCliente.set(t.nombre, t.id));

  // Cargar productos
  const { data: productos } = await supabase.from('productos').select('id, nombre');
  productos?.forEach(p => catalogCache.productos.set(p.nombre, p.id));

  // Cargar tallas
  const { data: tallas } = await supabase.from('tallas_camaron').select('id, codigo');
  tallas?.forEach(t => catalogCache.tallas.set(t.codigo, t.id));

  console.log('✅ Catálogos cargados');
}

async function getOrCreateCliente(nombre: string, tipoCliente: string): Promise<number> {
  // Buscar en caché
  if (catalogCache.clientes.has(nombre)) {
    return catalogCache.clientes.get(nombre)!;
  }

  // Buscar en BD
  const { data: existing } = await supabase
    .from('clientes')
    .select('id')
    .eq('nombre', nombre)
    .single();

  if (existing) {
    catalogCache.clientes.set(nombre, existing.id);
    return existing.id;
  }

  // Crear nuevo
  const { data: newCliente, error } = await supabase
    .from('clientes')
    .insert({
      nombre,
      tipo_cliente_id: catalogCache.tiposCliente.get(tipoCliente),
    })
    .select('id')
    .single();

  if (error) throw error;

  catalogCache.clientes.set(nombre, newCliente.id);
  return newCliente.id;
}

function parseExcelDate(excelDate: string | number): string {
  if (typeof excelDate === 'string') {
    // Si ya es string, asumimos formato ISO o similar
    return new Date(excelDate).toISOString().split('T')[0];
  }

  // Excel almacena fechas como números (días desde 1900-01-01)
  const date = XLSX.SSF.parse_date_code(excelDate);
  return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
}

async function migrateVentas(excelPath: string) {
  console.log('📂 Leyendo archivo Excel:', excelPath);

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0]; // Ajustar si tiene otro nombre
  const sheet = workbook.Sheets[sheetName];
  const data: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`📊 Total de registros encontrados: ${data.length}`);

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  // Cargar catálogos primero
  await loadCatalogs();

  console.log('\n🚀 Iniciando importación...\n');

  for (const [index, row] of data.entries()) {
    try {
      // Validar que tenga datos mínimos
      if (!row.Cliente || !row['Fecha Entrega']) {
        console.log(`⏭️  Saltando fila ${index + 2}: datos incompletos`);
        skipped++;
        continue;
      }

      // Obtener o crear cliente
      const clienteId = await getOrCreateCliente(row.Cliente, row['Tipo de Cliente']);

      // Preparar datos de venta
      const venta = {
        folio: row['# Registro'],
        oficina_id: catalogCache.oficinas.get(row.Oficina),
        responsable_id: catalogCache.responsables.get(row.Responsable),
        fecha_cosecha: parseExcelDate(row['Fecha Cosecha']),
        fecha_entrega: parseExcelDate(row['Fecha Entrega']),
        cliente_id: clienteId,
        tipo_cliente_id: catalogCache.tiposCliente.get(row['Tipo de Cliente']),
        producto_id: catalogCache.productos.get(row['Tipo de Producto']),
        talla_camaron_id: row['Talla Camarón'] 
          ? catalogCache.tallas.get(row['Talla Camarón'])
          : null,
        entero_kgs: row['Entero | kgs'] || 0,
        precio_venta_entero: row['Precio Venta'] || 0,
        descuento_porcentaje: row['Descuento | %'] || 0,
        descuento_mxn: row['Descuento | mxn'] || 0,
        metodo_pago: row['Método de Pago'],
        forma_pago: row['Forma de Pago'],
        nota_salida_granja: row['Nota Salida Granja'],
        // ... más campos según necesites
      };

      // Insertar en Supabase
      const { error } = await supabase
        .from('ventas')
        .insert(venta);

      if (error) throw error;

      imported++;

      if (imported % 50 === 0) {
        console.log(`✅ Importados: ${imported} / ${data.length}`);
      }
    } catch (error) {
      console.error(`❌ Error en fila ${index + 2}:`, error instanceof Error ? error.message : error);
      errors++;

      // Opcional: guardar errores en archivo
      // fs.appendFileSync('migration-errors.log', `Fila ${index + 2}: ${error}\n`);
    }
  }

  console.log('\n📈 Resumen de Importación:');
  console.log(`   ✅ Exitosos: ${imported}`);
  console.log(`   ⏭️  Saltados: ${skipped}`);
  console.log(`   ❌ Errores: ${errors}`);
  console.log(`   📊 Total procesados: ${data.length}`);
}

// Ejecutar migración
const excelPath = process.argv[2] || './data/ventas.xlsx';

migrateVentas(excelPath)
  .then(() => {
    console.log('\n✅ Migración completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
```

### Script de Migración de Cosechas

```typescript
// scripts/migrate-cosechas.ts
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface CosechaRow {
  'Fecha Cosecha': string | number;
  'Nota Salida': string;
  '10-12': number;
  '12-15': number;
  '14-20': number;
  '21-25': number;
  '26-30': number;
  '31-35': number;
  'Comentario': string;
}

async function migrateCosechas(excelPath: string) {
  console.log('📂 Leyendo archivo Excel de cosechas:', excelPath);

  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data: CosechaRow[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`📊 Total de cosechas: ${data.length}`);

  let imported = 0;
  let errors = 0;

  // Asumir una granja por defecto o extraer del sheet
  const { data: granja } = await supabase
    .from('granjas')
    .select('id')
    .eq('nombre', 'MV Vigas')
    .single();

  const granjaId = granja?.id || 1;

  for (const [index, row] of data.entries()) {
    try {
      const cosecha = {
        granja_id: granjaId,
        nota_salida: row['Nota Salida'],
        fecha_cosecha: parseExcelDate(row['Fecha Cosecha']),
        kg_10_12: row['10-12'] || 0,
        kg_12_15: row['12-15'] || 0,
        kg_14_20: row['14-20'] || 0,
        kg_21_25: row['21-25'] || 0,
        kg_26_30: row['26-30'] || 0,
        kg_31_35: row['31-35'] || 0,
        comentarios: row['Comentario'],
      };

      const { error } = await supabase
        .from('cosechas')
        .insert(cosecha);

      if (error) throw error;

      imported++;

      if (imported % 20 === 0) {
        console.log(`✅ Importadas: ${imported} / ${data.length}`);
      }
    } catch (error) {
      console.error(`❌ Error en fila ${index + 2}:`, error);
      errors++;
    }
  }

  console.log('\n📈 Resumen:');
  console.log(`   ✅ Exitosos: ${imported}`);
  console.log(`   ❌ Errores: ${errors}`);
}

function parseExcelDate(excelDate: string | number): string {
  if (typeof excelDate === 'string') {
    return new Date(excelDate).toISOString().split('T')[0];
  }
  const date = XLSX.SSF.parse_date_code(excelDate);
  return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
}

const excelPath = process.argv[2] || './data/cosechas.xlsx';

migrateCosechas(excelPath)
  .then(() => {
    console.log('\n✅ Migración de cosechas completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
```

### Uso de los Scripts

```bash
# Compilar TypeScript si es necesario
npx tsc scripts/migrate-excel-data.ts

# Ejecutar migración de ventas
node scripts/migrate-excel-data.js ./data/ventas.xlsx

# Ejecutar migración de cosechas
node scripts/migrate-cosechas.js ./data/cosechas.xlsx

# O con tsx directamente
npx tsx scripts/migrate-excel-data.ts ./data/ventas.xlsx
```

### Validación Post-Migración

```sql
-- Verificar totales en Supabase Dashboard > SQL Editor

-- Total de ventas migradas
SELECT COUNT(*) as total_ventas FROM ventas;

-- Suma total de ventas
SELECT SUM(total_orden) as suma_total FROM ventas;

-- Ventas por oficina
SELECT 
  o.nombre,
  COUNT(v.id) as num_ventas,
  SUM(v.total_orden) as total_monto
FROM ventas v
JOIN oficinas o ON o.id = v.oficina_id
GROUP BY o.nombre
ORDER BY total_monto DESC;

-- Verificar integridad referencial
SELECT COUNT(*) as ventas_sin_oficina 
FROM ventas WHERE oficina_id IS NULL;

SELECT COUNT(*) as ventas_sin_cliente 
FROM ventas WHERE cliente_id IS NULL;

-- Comparar con Excel
-- Total en Excel vs Total en BD
SELECT 
  (SELECT COUNT(*) FROM ventas) as ventas_bd,
  'Comparar con total de filas en Excel' as nota;

-- Verificar rangos de fechas
SELECT 
  MIN(fecha_entrega) as fecha_minima,
  MAX(fecha_entrega) as fecha_maxima
FROM ventas;
```

### Script de Rollback (en caso de error)

```typescript
// scripts/rollback-migration.ts
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function rollback() {
  console.log('⚠️  ADVERTENCIA: Esto eliminará TODOS los datos migrados');
  console.log('Esperando 5 segundos para cancelar...');
  
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('🗑️  Eliminando datos...');

  // Eliminar en orden inverso por dependencias
  await supabase.from('ventas').delete().gte('id', 0);
  await supabase.from('cosechas').delete().gte('id', 0);
  await supabase.from('clientes').delete().gte('id', 0);

  console.log('✅ Rollback completado');
}

rollback()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Error en rollback:', error);
    process.exit(1);
  });
```

### Mejores Prácticas para Migración

1. **Hacer backup antes**: Exporta los datos actuales de Supabase
2. **Probar en desarrollo**: Usa un proyecto de Supabase de test primero
3. **Migrar por lotes**: Si hay muchos datos, procesar en chunks
4. **Validar antes**: Revisa el Excel, limpia datos inválidos
5. **Logging detallado**: Guarda logs de errores para debugging
6. **Verificar después**: Compara totales Excel vs BD
7. **Considerar performance**: Desactiva RLS temporalmente durante migración

### Optimización para Grandes Volúmenes

```typescript
// Insertar en lotes de 100
const BATCH_SIZE = 100;

for (let i = 0; i < data.length; i += BATCH_SIZE) {
  const batch = data.slice(i, i + BATCH_SIZE);
  const ventasToInsert = batch.map(row => ({
    // mapear campos
  }));

  await supabase.from('ventas').insert(ventasToInsert);
  
  console.log(`Procesados ${Math.min(i + BATCH_SIZE, data.length)} / ${data.length}`);
}
```

---

## 💰 Optimización de Free Tier

### Límites y Recomendaciones

#### Supabase Free Tier

**Límites:**
- 500 MB database storage
- 2 GB bandwidth / mes
- 50,000 monthly active users
- 2 GB file storage
- Proyecto pausado después de 1 semana de inactividad

**Optimizaciones:**

1. **Base de Datos (500 MB)**
   - Estimación: ~50,000 ventas con todos los campos
   - ✅ Suficiente para 2-3 años de operación normal
   - Usar índices solo en columnas necesarias
   - Limpiar tabla de auditoría periódicamente (mantener solo últimos 6 meses)

2. **Bandwidth (2 GB/mes)**
   - Estimación: ~4,000 requests por día
   - ✅ Suficiente para ~10-15 usuarios activos diarios
   - Implementar caché en frontend para catálogos
   - Paginación en todas las listas
   - Compresión de imágenes/documentos

3. **Proyecto Pausado**
   - Solución: Configurar cron job que haga ping cada 6 días
   - Ejemplo: GitHub Actions con workflow semanal
   ```yaml
   # .github/workflows/keep-alive.yml
   name: Keep Supabase Alive
   on:
     schedule:
       - cron: '0 0 */6 * *'  # Cada 6 días
   jobs:
     ping:
       runs-on: ubuntu-latest
       steps:
         - name: Ping Supabase
           run: |
             curl ${{ secrets.SUPABASE_URL }}/rest/v1/
   ```

#### Vercel Free Tier

**Límites:**
- 100 GB bandwidth / mes
- 6,000 serverless executions / día
- 10 segundos timeout por función

**Optimizaciones:**

1. **Bandwidth (100 GB/mes)**
   - ✅ Muy generoso, difícil de alcanzar con uso normal
   - Usar Next.js Image Optimization
   - Servir assets estáticos optimizados

2. **Serverless Functions**
   - 6,000 ejecuciones/día ≈ 1 request cada 14 segundos
   - ✅ Suficiente para operación normal
   - Agrupar operaciones cuando sea posible
   - Usar Server Components cuando no necesites interactividad

3. **Timeout (10 segundos)**
   - Optimizar queries lentas
   - Usar paginación para reportes grandes
   - Para procesos largos, considerar dividir en pasos

### Monitoreo de Uso

#### Dashboard de Supabase
```
Settings > Usage
- Database Size: Actual / 500 MB
- Bandwidth: Actual / 2 GB
- Active Users: Actual / 50,000
```

#### Dashboard de Vercel
```
Project > Analytics
- Bandwidth: Actual / 100 GB
- Function Invocations: Actual / 180,000 (6k/día * 30)
```

### Alertas Recomendadas

```typescript
// lib/utils/usage-monitor.ts
export async function checkUsageLimits() {
  // Verificar uso de Supabase
  const dbSize = await getDBSize();
  const bandwidth = await getBandwidth();

  if (dbSize > 400) { // 80% del límite
    console.warn('⚠️ Base de datos cerca del límite');
    // Enviar alerta por email
  }

  if (bandwidth > 1.6) { // 80% del límite
    console.warn('⚠️ Bandwidth cerca del límite');
  }
}
```

### Plan de Escalamiento

Cuando alcances estos umbrales, considera upgrade:

#### Señales para Supabase Pro ($25/mes)
- Database > 400 MB (80%)
- Bandwidth > 1.6 GB/mes (80%)
- Necesitas backups point-in-time
- Más de 10 usuarios concurrentes

#### Señales para Vercel Pro ($20/mes)
- Bandwidth > 80 GB/mes (80%)
- Necesitas analytics detallados
- Quieres protección DDoS
- Más de 50 usuarios concurrentes

### Arquitectura para Free Tier

```typescript
// Estrategia de caché agresiva
const CACHE_TIMES = {
  catalogos: 24 * 60 * 60, // 1 día
  reportes: 60 * 60,       // 1 hora
  ventas: 5 * 60,          // 5 minutos
};

// Usar React Query para caché automático
import { useQuery } from '@tanstack/react-query';

export function useVentas() {
  return useQuery({
    queryKey: ['ventas'],
    queryFn: fetchVentas,
    staleTime: CACHE_TIMES.ventas * 1000,
  });
}
```

---

## 📝 Notas Adicionales

### Mejores Prácticas

1. **Código**
   - Usar TypeScript en todo el proyecto
   - Comentar código complejo
   - Nombres descriptivos de variables
   - Funciones pequeñas y reutilizables
   - Server Components por defecto, Client Components solo cuando necesites interactividad

2. **Git**
   - Commits descriptivos usando conventional commits
     - `feat: añadir formulario de ventas`
     - `fix: corregir cálculo de monto`
     - `docs: actualizar README`
   - Branches por feature: `feature/formulario-ventas`
   - Pull Requests con descripción detallada
   - Code review obligatorio antes de merge a main

3. **Supabase**
   - Usar migraciones para cambios de esquema
   - Nunca modificar esquema directamente en producción
   - Row Level Security (RLS) en TODAS las tablas
   - Índices en columnas de búsqueda frecuente
   - Soft delete en lugar de DELETE físico

4. **Seguridad**
   - Validar TODOS los inputs (usar Zod)
   - Sanitizar datos antes de queries (Supabase lo hace automáticamente)
   - Rate limiting en rutas públicas
   - HTTPS obligatorio (Vercel lo maneja)
   - Secrets en variables de entorno (nunca en código)
   - Usar service_role key SOLO en backend/scripts

5. **Performance**
   - Paginación en todas las listas
   - Caché para catálogos (React Query)
   - Lazy loading de componentes pesados
   - Compresión de responses (Vercel lo maneja)
   - Optimización de imágenes con next/image
   - Server Components para contenido estático

---

## 🎯 Checklist de Implementación

### Setup Inicial
- [ ] Crear cuenta en Supabase
- [ ] Crear proyecto en Supabase (región São Paulo)
- [ ] Crear cuenta en Vercel
- [ ] Crear repositorio en GitHub
- [ ] Configurar Next.js con TypeScript
- [ ] Instalar shadcn/ui
- [ ] Configurar TailwindCSS

### Fase 1: Ventas (4-5 semanas)
- [ ] Crear esquema de base de datos
- [ ] Configurar migraciones de Supabase
- [ ] Seed de catálogos iniciales
- [ ] Configurar Supabase Auth
- [ ] Implementar login/logout
- [ ] Crear middleware de autenticación
- [ ] Formulario ventas (frontend + API route)
- [ ] Lista de ventas con filtros
- [ ] Editar/eliminar ventas
- [ ] Resumen Cuentas I (por responsable)
- [ ] Resumen Cuentas II (por tipo cliente)
- [ ] Canal de ventas con gráficos
- [ ] Estados de cuenta por cliente
- [ ] Exportación Excel/PDF
- [ ] Tests unitarios básicos
- [ ] Deploy a Vercel
- [ ] Migración de datos históricos

### Fase 2: Cosechas (3 semanas)
- [ ] Tablas cosechas en BD
- [ ] API routes para cosechas
- [ ] Formulario registro cosechas
- [ ] Lista cosechas con filtros
- [ ] Cuadre de producción
- [ ] Reportes producción por granja
- [ ] Tests

### Fase 3: Unificación (3 semanas)
- [ ] Vincular ventas con cosechas (FK)
- [ ] Modificar formulario ventas (selector de cosecha)
- [ ] Función de cálculo de inventario
- [ ] Dashboard principal con KPIs
- [ ] Gráficos de trazabilidad
- [ ] Reporte de inventario disponible
- [ ] Alertas de inventario bajo
- [ ] Tests E2E completos

### Testing y QA (2 semanas)
- [ ] Testing completo de todos los flujos
- [ ] Corrección de bugs
- [ ] Testing de performance
- [ ] Testing en móviles
- [ ] UAT con usuarios reales

### Deployment y Capacitación
- [ ] Deploy final a producción
- [ ] Configurar dominio custom (opcional)
- [ ] Configurar backups automáticos
- [ ] Configurar monitoreo de errores (Sentry)
- [ ] Documentación de usuario final
- [ ] Capacitación a usuarios
- [ ] Periodo de prueba paralelo con Excel
- [ ] Go-live oficial

---

## 🚀 Comandos Rápidos

### Desarrollo Local
```bash
# Instalar dependencias
npm install

# Desarrollo con hot reload
npm run dev

# Build de producción (test local)
npm run build
npm start

# Linting
npm run lint

# Tests
npm test

# Type check
npm run type-check
```

### Supabase
```bash
# Login
supabase login

# Inicializar proyecto local
supabase init

# Vincular con proyecto en cloud
supabase link --project-ref tu-project-ref

# Crear migración
supabase migration new nombre_migracion

# Aplicar migraciones
supabase db push

# Reset database (desarrollo)
supabase db reset

# Generar tipos TypeScript
supabase gen types typescript --project-id tu-project-ref > types/database.types.ts
```

### Vercel
```bash
# Login
vercel login

# Deploy preview
vercel

# Deploy production
vercel --prod

# Ver logs
vercel logs

# Lista de deployments
vercel ls

# Rollback a deployment anterior
vercel rollback
```

---

## 📞 Contacto y Recursos

**Documentación:**
- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

**Comunidad:**
- [Next.js Discord](https://discord.gg/nextjs)
- [Supabase Discord](https://discord.supabase.com)

**Soporte:**
- Next.js: GitHub Issues
- Supabase: Discord + Support
- Vercel: Support via dashboard

---

*Última actualización: Octubre 2025*
*Versión: 2.0 (Next.js + Supabase + Vercel)*