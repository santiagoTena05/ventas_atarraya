# 🚀 Setup Inicial - Agua Blanca System

Este documento contiene todos los archivos y comandos necesarios para iniciar el proyecto desde cero.

---

## 📦 1. Instalación del Proyecto

### Crear Proyecto Next.js

```bash
# Crear proyecto con TypeScript
npx create-next-app@latest agua-blanca-system --typescript --tailwind --app --import-alias "@/*"

cd agua-blanca-system
```

### Instalar Dependencias Principales

```bash
# Supabase
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# UI Components
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select
npm install @radix-ui/react-label @radix-ui/react-slot
npm install class-variance-authority clsx tailwind-merge lucide-react

# Forms & Validation
npm install react-hook-form zod @hookform/resolvers

# State Management
npm install zustand

# Data Fetching & Caching
npm install @tanstack/react-query

# Charts
npm install recharts

# Tables
npm install @tanstack/react-table

# Date handling
npm install date-fns

# Excel handling (para migración)
npm install xlsx

# Dev dependencies
npm install -D @types/node @types/react @types/react-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event
```

---

## 🔧 2. Archivos de Configuración

### `.env.local`

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Agua Blanca System

# (Opcional) Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=notifications@aguablanca.com
SMTP_PASS=tu-password
```

### `.env.local.example`

```env
# Copia este archivo a .env.local y llena los valores

# Supabase - Obtén estos valores de tu proyecto en https://supabase.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Agua Blanca System
```

### `next.config.js`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  images: {
    domains: ['tu-proyecto.supabase.co'],
  },
  
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

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### `tailwind.config.ts`

```typescript
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
```

### `components.json` (shadcn/ui)

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### `.gitignore`

```
# dependencies
/node_modules
/.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local
.env.production

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# supabase
supabase/.temp
```

---

## 🗄️ 3. Setup de Supabase

### Instalar Supabase CLI

```bash
npm install -g supabase
```

### Login y Setup

```bash
# Login
supabase login

# Inicializar en el proyecto
supabase init

# Vincular con proyecto en cloud
supabase link --project-ref tu-project-ref
```

### Crear Primera Migración

```bash
supabase migration new initial_schema
```

### Archivo de Migración: `supabase/migrations/20240101000000_initial_schema.sql`

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla: oficinas
CREATE TABLE oficinas (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(10) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  ubicacion VARCHAR(255),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: responsables
CREATE TABLE responsables (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  oficina_id INT REFERENCES oficinas(id),
  email VARCHAR(255),
  telefono VARCHAR(20),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: regiones_mercado
CREATE TABLE regiones_mercado (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true
);

-- Tabla: tipos_cliente
CREATE TABLE tipos_cliente (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true
);

-- Tabla: productos
CREATE TABLE productos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  unidad_medida VARCHAR(20) NOT NULL,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true
);

-- Tabla: tallas_camaron
CREATE TABLE tallas_camaron (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) UNIQUE NOT NULL,
  gramos_min INT,
  gramos_max INT,
  rango_ab_gr VARCHAR(20),
  talla_sin_cabeza_lb VARCHAR(20),
  talla_con_cabeza_kg VARCHAR(20),
  orden INT,
  activo BOOLEAN DEFAULT true
);

-- Tabla: clientes
CREATE TABLE clientes (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  tipo_cliente_id INT REFERENCES tipos_cliente(id),
  rfc VARCHAR(13),
  email VARCHAR(255),
  telefono VARCHAR(20),
  direccion TEXT,
  ciudad VARCHAR(100),
  estado VARCHAR(100),
  codigo_postal VARCHAR(10),
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: granjas
CREATE TABLE granjas (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  ubicacion VARCHAR(255),
  responsable VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: cosechas
CREATE TABLE cosechas (
  id SERIAL PRIMARY KEY,
  granja_id INT REFERENCES granjas(id),
  nota_salida VARCHAR(50) UNIQUE NOT NULL,
  fecha_cosecha DATE NOT NULL,
  responsable_id INT REFERENCES responsables(id),
  
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
  
  diferencia_10_12 DECIMAL(10,3) DEFAULT 0,
  diferencia_12_15 DECIMAL(10,3) DEFAULT 0,
  diferencia_14_20 DECIMAL(10,3) DEFAULT 0,
  diferencia_16_20 DECIMAL(10,3) DEFAULT 0,
  diferencia_21_25 DECIMAL(10,3) DEFAULT 0,
  diferencia_26_30 DECIMAL(10,3) DEFAULT 0,
  diferencia_31_35 DECIMAL(10,3) DEFAULT 0,
  
  comentarios TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: usuarios (extiende auth.users de Supabase)
CREATE TABLE usuarios (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  rol VARCHAR(50) NOT NULL DEFAULT 'readonly',
  oficina_id INT REFERENCES oficinas(id),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: ventas
CREATE TABLE ventas (
  id SERIAL PRIMARY KEY,
  folio INT UNIQUE NOT NULL,
  
  oficina_id INT REFERENCES oficinas(id),
  responsable_id INT REFERENCES responsables(id),
  region_mercado_id INT REFERENCES regiones_mercado(id),
  
  cosecha_id INT REFERENCES cosechas(id),
  nota_salida_granja VARCHAR(50),
  fecha_cosecha DATE NOT NULL,
  fecha_entrega DATE NOT NULL,
  
  cliente_id INT REFERENCES clientes(id),
  tipo_cliente_id INT REFERENCES tipos_cliente(id),
  no_orden_atarraya VARCHAR(50),
  
  producto_id INT REFERENCES productos(id),
  talla_camaron_id INT REFERENCES tallas_camaron(id),
  
  entero_kgs DECIMAL(10,3) DEFAULT 0,
  precio_venta_entero DECIMAL(10,2) DEFAULT 0,
  monto_venta_entero DECIMAL(10,2) GENERATED ALWAYS AS (entero_kgs * precio_venta_entero) STORED,
  
  pad_kgs DECIMAL(10,3) DEFAULT 0,
  precio_venta_pad DECIMAL(10,2) DEFAULT 0,
  monto_venta_pad DECIMAL(10,2) GENERATED ALWAYS AS (pad_kgs * precio_venta_pad) STORED,
  
  descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
  descuento_mxn DECIMAL(10,2) DEFAULT 0,
  
  total_orden DECIMAL(10,2) GENERATED ALWAYS AS (
    monto_venta_entero + monto_venta_pad - descuento_mxn
  ) STORED,
  
  metodo_pago VARCHAR(50) NOT NULL,
  forma_pago VARCHAR(50) NOT NULL,
  estatus_pago_cliente VARCHAR(50) DEFAULT 'Pendiente',
  estatus_deposito VARCHAR(50),
  folio_transferencia VARCHAR(100),
  
  uso_cfdi VARCHAR(10),
  tipo_factura VARCHAR(10),
  monto_facturar DECIMAL(10,2),
  estatus_factura VARCHAR(50) DEFAULT 'Pendiente',
  no_factura VARCHAR(50),
  
  estatus_1er_pago VARCHAR(50),
  fecha_1er_pago DATE,
  monto_1er_pago DECIMAL(10,2),
  
  estatus_2o_pago VARCHAR(50),
  fecha_2o_pago DATE,
  monto_2o_pago DECIMAL(10,2),
  
  created_by UUID REFERENCES usuarios(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES usuarios(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla: auditoria
CREATE TABLE auditoria (
  id SERIAL PRIMARY KEY,
  tabla VARCHAR(50) NOT NULL,
  registro_id INT NOT NULL,
  accion VARCHAR(20) NOT NULL,
  usuario_id UUID REFERENCES usuarios(id),
  fecha TIMESTAMPTZ DEFAULT NOW(),
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT
);

-- Índices
CREATE INDEX idx_ventas_fecha_entrega ON ventas(fecha_entrega);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX idx_ventas_responsable ON ventas(responsable_id);
CREATE INDEX idx_ventas_oficina ON ventas(oficina_id);
CREATE INDEX idx_ventas_cosecha ON ventas(cosecha_id);
CREATE INDEX idx_auditoria_tabla_registro ON auditoria(tabla, registro_id);
CREATE INDEX idx_auditoria_usuario ON auditoria(usuario_id);
CREATE INDEX idx_auditoria_fecha ON auditoria(fecha);

-- Trigger para usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger para auditoría
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
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
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP != 'INSERT' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP != 'DELETE' THEN row_to_json(NEW) ELSE NULL END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_ventas
  AFTER INSERT OR UPDATE OR DELETE ON ventas
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER audit_cosechas
  AFTER INSERT OR UPDATE OR DELETE ON cosechas
  FOR EACH ROW EXECUTE FUNCTION audit_changes();
```

### Archivo de Seeds: `supabase/seed.sql`

```sql
-- Insertar oficinas
INSERT INTO oficinas (codigo, nombre) VALUES
('ALV_LER', 'ALV Lerma'),
('ALV_API', 'ALV Apizaco'),
('MV_TON', 'MV Tonameca'),
('MV_AJO', 'MV Ajolotán');

-- Insertar responsables
INSERT INTO responsables (nombre, oficina_id) VALUES
('Manuel F.', 3),
('Carlos', 1),
('Alex B.', 2),
('Gil', 1),
('Daniel S.', 3);

-- Insertar regiones de mercado
INSERT INTO regiones_mercado (nombre) VALUES
('Puerto Escondido'),
('Sureste'),
('Lamarca'),
('Oaxaca'),
('CDMX');

-- Insertar tipos de cliente
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

-- Insertar productos
INSERT INTO productos (codigo, nombre, unidad_medida) VALUES
('ENT', 'Entero', 'kg'),
('PAD', 'PAD', 'kg'),
('LAR', 'Larvas', 'pieza');

-- Insertar tallas de camarón
INSERT INTO tallas_camaron (codigo, gramos_min, gramos_max, rango_ab_gr, talla_sin_cabeza_lb, talla_con_cabeza_kg, orden) VALUES
('10-12', 61, 70, '10-12', '61-70', '> 90', 1),
('12-15', 51, 60, '12-15', '51-60', '70-80', 2),
('14-20', 41, 50, '14-20', '41-50', '70-80', 3),
('16-20', 36, 40, '16-20', '36-40', '50-60', 4),
('21-25', 31, 35, '21-25', '31-35', '40-50', 5),
('26-30', 26, 30, '26-30', '26-30', '30-40', 6),
('31-35', 21, 25, '31-35', '21-25', '20-30', 7);

-- Insertar granjas
INSERT INTO granjas (nombre, ubicacion) VALUES
('MV Vigas', 'Oaxaca'),
('ALV Lerma', 'Estado de México');
```

### Aplicar Migraciones

```bash
# Aplicar a local
supabase db reset

# Aplicar a cloud
supabase db push
```

---

## 🎨 4. Setup de shadcn/ui

```bash
# Inicializar shadcn/ui
npx shadcn-ui@latest init

# Instalar componentes básicos
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add select
npx shadcn-ui@latest add table
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add toast
```

---

## 🔐 5. Configurar Row Level Security (RLS)

Crear archivo: `supabase/migrations/20240101000001_enable_rls.sql`

```sql
-- Habilitar RLS
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosechas ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

-- Políticas para ventas
CREATE POLICY "usuarios_ven_su_oficina" ON ventas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() AND rol = 'admin'
    )
    OR
    oficina_id IN (
      SELECT oficina_id FROM usuarios 
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "responsables_crean_ventas" ON ventas
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol IN ('admin', 'responsable')
    )
  );

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

CREATE POLICY "solo_admins_eliminan" ON ventas
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM usuarios 
      WHERE id = auth.uid() 
      AND rol = 'admin'
    )
  );

-- Políticas para clientes
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "todos_ven_clientes" ON clientes
  FOR SELECT
  USING (true);

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

Aplicar:

```bash
supabase db push
```

---

## 🚀 6. Primer Deploy a Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (preview)
vercel

# Deploy a producción
vercel --prod
```

### Configurar Variables de Entorno en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Settings > Environment Variables
3. Agrega:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## ✅ Verificación

```bash
# Verificar que todo funciona
npm run dev

# Abrir navegador en http://localhost:3000
```

---

## 📚 Próximos Pasos

1. ✅ Setup completado
2. 🔨 Crear componente de Login
3. 🔨 Crear layout principal
4. 🔨 Crear formulario de ventas
5. 🔨 Implementar API routes

---

*Todo listo para empezar a desarrollar! 🎉*