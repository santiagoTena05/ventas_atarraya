# 🗄️ Estructura de Base de Datos ACTUALIZADA - Agua Blanca Seafoods

## 🚨 CAMBIOS CRÍTICOS REQUERIDOS

### 1. **Tabla `clientes` - Actualización URGENTE**

```sql
-- MODIFICAR LA TABLA CLIENTES PARA INCLUIR TODOS LOS CLIENTES ACTUALES
CREATE TABLE clientes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(255) NOT NULL,
  tipo_cliente_id BIGINT REFERENCES tipos_cliente(id),
  oficina VARCHAR(10) DEFAULT 'MV', -- Nueva columna para distinguir MV/ALV

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

-- Índice para búsqueda rápida por oficina
CREATE INDEX idx_clientes_oficina ON clientes(oficina);
```

### 2. **Script de Datos Iniciales de Clientes - COMPLETO**

```sql
-- CLIENTES MV (Mercado Vermouth)
INSERT INTO clientes (nombre, tipo_cliente_id, oficina) VALUES
-- Lista completa de clientes MV del código actual
('abraham', 1, 'MV'),
('Jorge Gamboa', 1, 'MV'),
('Adriana', 1, 'MV'),
('Lamarca', 1, 'MV'),
('afrodita', 1, 'MV'),
('Agua Sala', 1, 'MV'),
('Agua salá', 1, 'MV'),
('agustin garcia', 1, 'MV'),
('Alexis', 1, 'MV'),
('Alfonso', 1, 'MV'),
('ALFONZO', 1, 'MV'),
('ali vega', 1, 'MV'),
('alvaro -bacocho', 1, 'MV'),
('amiga manuel', 1, 'MV'),
('anastasio', 1, 'MV'),
('Angel Monchistation', 1, 'MV'),
('Angel Ruiz', 1, 'MV'),
('Angel Santiago', 1, 'MV'),
('angel tilzapote', 1, 'MV'),
('Armando Lonaza', 1, 'MV'),
('avelino', 1, 'MV'),
('azucena', 1, 'MV'),
('berenica-escondida', 1, 'MV'),
('berenice A1', 1, 'MV'),
('Bunker de JP', 1, 'MV'),
('carlos', 1, 'MV'),
('Carlos sada', 1, 'MV'),
('Carniceria Ojeda', 1, 'MV'),
('Carpintero Patilla', 1, 'MV'),
('casa de los angeles', 1, 'MV'),
('casona Sforza', 1, 'MV'),
('cesar', 1, 'MV'),
('Charly', 1, 'MV'),
('Chef Saúl', 9, 'MV'),
('Chofer Larvas', 1, 'MV'),
('Cipriano', 1, 'MV'),
('Claudia Peña', 1, 'MV'),
('claudia zachila', 1, 'MV'),
('coro', 1, 'MV'),
('Cristobal Fabian', 1, 'MV'),
('daniel serrano', 1, 'MV'),
('DAVID', 1, 'MV'),
('david esconido suit', 1, 'MV'),
('diana facen', 1, 'MV'),
('Don Memo', 1, 'MV'),
('DONYMAR', 1, 'MV'),
('eduardo', 1, 'MV'),
('eduardo cruz', 1, 'MV'),
('Eduardo Huerta', 1, 'MV'),
('Efra Estrada', 1, 'MV'),
('El Crucero', 1, 'MV'),
('El Nene', 1, 'MV'),
('elias', 1, 'MV'),
('Erick', 1, 'MV'),
('fabi aroche', 1, 'MV'),
('Fernando Fabian', 1, 'MV'),
('Fish Shack', 9, 'MV'),
('Francis', 1, 'MV'),
('GABINO', 1, 'MV'),
('gamaliel', 1, 'MV'),
('GENOVEVA', 1, 'MV'),
('german', 1, 'MV'),
('gilberto santiago', 1, 'MV'),
('Gilberto Torres', 1, 'MV'),
('Gudelia', 1, 'MV'),
('Guilibaldo bacocho', 1, 'MV'),
('Hilario', 1, 'MV'),
('Hotel Escondido', 1, 'MV'),
('Hugo', 1, 'MV'),
('hugo baxter', 1, 'MV'),
('illian cullen', 1, 'MV'),
('isaac', 1, 'MV'),
('Israel Garcia', 1, 'MV'),
('ISSAC', 1, 'MV'),
('ivan muciño', 1, 'MV'),
('Jairo', 1, 'MV'),
('JAVIER', 1, 'MV'),
('Jesus juarez', 1, 'MV'),
('jhon coast', 1, 'MV'),
('Jon', 1, 'MV'),
('jon coates', 1, 'MV'),
('josue', 1, 'MV'),
('Juan Alderete', 1, 'MV'),
('Karla Atala', 1, 'MV'),
('katie wiliams', 1, 'MV'),
('kris dondo', 1, 'MV'),
('leo', 1, 'MV'),
('licha panadero', 1, 'MV'),
('linet', 1, 'MV'),
('lizbeth', 1, 'MV'),
('Lonaza', 1, 'MV'),
('lucre peña', 1, 'MV'),
('luis carreño', 1, 'MV'),
('Luxo', 1, 'MV'),
('manuel', 1, 'MV'),
('maria josefa', 1, 'MV'),
('mario', 1, 'MV'),
('MARTIN FABIAN', 1, 'MV'),
('Mauricio', 1, 'MV'),
('MAX', 1, 'MV'),
('maximiliano', 1, 'MV'),
('MAXIMILIANO LOPEZ', 1, 'MV'),
('maximino', 1, 'MV'),
('Mercedes Lopez', 1, 'MV'),
('MERMA', 1, 'MV'),
('Michel', 1, 'MV'),
('michel sereso', 1, 'MV'),
('Mini L', 1, 'MV'),
('Misael hija', 1, 'MV'),
('Monchistation', 1, 'MV'),
('monse', 1, 'MV'),
('Moringa', 1, 'MV'),
('MUESTRA -francis', 1, 'MV'),
('Natalia Seligson', 1, 'MV'),
('Nelson', 1, 'MV'),
('Noe', 1, 'MV'),
('nomad-hotal', 1, 'MV'),
('Omar Fabian', 1, 'MV'),
('Ostreria', 9, 'MV'),
('otoniel', 1, 'MV'),
('pamela', 1, 'MV'),
('patilla', 1, 'MV'),
('patrice', 1, 'MV'),
('patrice-atrapasueños', 1, 'MV'),
('Patricio', 1, 'MV'),
('Pilar zicatela', 1, 'MV'),
('Piyoli', 1, 'MV'),
('plinio', 1, 'MV'),
('Portezuelo', 1, 'MV'),
('Porto Zuelo', 1, 'MV'),
('Prudencio', 1, 'MV'),
('Rafa', 1, 'MV'),
('René', 1, 'MV'),
('Rene Jesus', 1, 'MV'),
('Russek', 1, 'MV'),
('Sativa', 1, 'MV'),
('Savanna', 1, 'MV'),
('Silvia', 1, 'MV'),
('simion', 1, 'MV'),
('sonia', 1, 'MV'),
('sonido leo', 1, 'MV'),
('Surf and Spot', 1, 'MV'),
('susana galvan', 1, 'MV'),
('Susana Morro', 1, 'MV'),
('Syndi', 1, 'MV'),
('tomas davó', 1, 'MV'),
('toto', 1, 'MV'),
('tuli', 1, 'MV'),
('Urbano', 1, 'MV'),
('Velazquez', 1, 'MV'),
('Verde Puerto La Punta', 1, 'MV'),
('veronica', 1, 'MV'),
('visitas a la granja', 1, 'MV'),
('wendy c10', 1, 'MV'),
('wes smith', 1, 'MV'),
('Wokxaca', 9, 'MV'),
('Yassine', 1, 'MV'),
('yolanda park', 1, 'MV');

-- CLIENTES ALV (Acuacultura Lerma Vermouth) - Nota: Jorge Gamboa y Lamarca aparecen en ambas listas
INSERT INTO clientes (nombre, tipo_cliente_id, oficina) VALUES
('Jorge Gamboa', 1, 'ALV'),
('Lamarca', 1, 'ALV');
```

### 3. **Modificación en la Tabla `ventas`**

```sql
-- AGREGAR CAMPOS CALCULADOS FALTANTES
ALTER TABLE ventas
ADD COLUMN descuento_calculado DECIMAL(12,2) GENERATED ALWAYS AS (monto_venta * descuento_porcentaje / 100) STORED,
ADD COLUMN total_orden DECIMAL(12,2) GENERATED ALWAYS AS (monto_venta - (monto_venta * descuento_porcentaje / 100) - descuento_mxn) STORED;
```

### 4. **Nuevos Datos de Catálogos Basados en la Implementación**

```sql
-- DATOS FALTANTES EN TIPOS DE CLIENTE
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

-- TALLAS DE CAMARÓN ACTUALIZADAS
INSERT INTO tallas_camaron (nombre, rango_min, rango_max) VALUES
('10-12', 10, 12),
('12-15', 12, 15),
('14-20', 14, 20),
('21-25', 21, 25),
('26-30', 26, 30),
('31-35', 31, 35),
('36-40', 36, 40),
('41-50', 41, 50),
('51-60', 51, 60),
('61-70', 61, 70),
('71-90', 71, 90);

-- RESPONSABLES ACTUALIZADOS
INSERT INTO responsables (nombre, codigo) VALUES
('Alex B.', 'ALEX'),
('Carlos', 'CARLOS'),
('Daniel S.', 'DANIEL'),
('Gil', 'GIL'),
('Manuel F.', 'MANUEL');

-- OFICINAS ACTUALIZADAS
INSERT INTO oficinas (nombre, codigo) VALUES
('MV Puerto Escondido', 'MV'),
('ALV Lerma', 'ALV'),
('Tonameca', 'TON');
```

### 5. **Vista Optimizada para Autocomplete de Clientes**

```sql
-- CREAR VISTA PARA FACILITAR EL AUTOCOMPLETE
CREATE VIEW clientes_autocomplete AS
SELECT
  id,
  nombre,
  oficina,
  tipo_cliente_id,
  activo,
  CASE
    WHEN oficina = 'MV' THEN 'Cliente MV'
    WHEN oficina = 'ALV' THEN 'Cliente ALV'
    ELSE 'Cliente General'
  END as tipo_oficina
FROM clientes
WHERE activo = true
ORDER BY nombre;
```

## 🔧 **Script de Creación Completo y Actualizado**

```sql
-- =============================================
-- AGUA BLANCA SEAFOODS - DATABASE SETUP v2.0
-- =============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsqueda de texto

-- Crear ENUMs
CREATE TYPE user_role AS ENUM ('admin', 'responsable', 'readonly');
CREATE TYPE cosecha_estado AS ENUM ('pendiente', 'procesada', 'vendida');

-- PASO 1: Crear todas las tablas de catálogo
-- [Incluir todos los CREATE TABLE de catálogos del archivo original]

-- PASO 2: Crear tabla de clientes ACTUALIZADA
-- [Incluir el CREATE TABLE clientes actualizado de arriba]

-- PASO 3: Crear tabla de ventas con campos calculados
-- [Incluir el CREATE TABLE ventas actualizado]

-- PASO 4: Insertar datos iniciales COMPLETOS
-- [Incluir todos los INSERT de clientes MV y ALV]

-- PASO 5: Crear índices optimizados
CREATE INDEX idx_clientes_nombre_trgm ON clientes USING gin(nombre gin_trgm_ops);
CREATE INDEX idx_clientes_oficina ON clientes(oficina);
CREATE INDEX idx_clientes_activo ON clientes(activo);

-- PASO 6: Crear vista de autocomplete
-- [Incluir CREATE VIEW clientes_autocomplete]
```

## ✅ **Checklist de Implementación Actualizado**

### ⚠️ **CRÍTICO - Implementar Ahora:**
- [ ] Crear tabla `clientes` con columna `oficina`
- [ ] Insertar TODOS los clientes MV y ALV (150+ registros)
- [ ] Crear índices para búsqueda rápida de texto
- [ ] Configurar RLS para clientes
- [ ] Probar autocomplete con datos reales

### 📋 **Recomendado - Siguiente Fase:**
- [ ] Migrar de localStorage a Supabase
- [ ] Implementar autenticación
- [ ] Configurar políticas de acceso por oficina
- [ ] Optimizar consultas de reportes

## 🚨 **Notas Críticas para la Implementación**

1. **DUPLICADOS**: Jorge Gamboa y Lamarca aparecen en ambas oficinas (MV y ALV). La columna `oficina` resuelve esto.
2. **CAMPOS CALCULADOS**: Los campos `descuento_calculado` y `total_orden` deben ser GENERATED ALWAYS para consistencia.
3. **BÚSQUEDA**: El índice `gin_trgm_ops` es crucial para el autocomplete rápido.
4. **MIGRACIÓN**: El actual sistema usa localStorage - necesitas migrar gradualmente a Supabase.

**La estructura está lista para implementación inmediata en Supabase.**