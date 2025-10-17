# 🦐 Sistema de Gestión de Ventas y Cosechas - Agua Blanca Seafoods

Una aplicación web moderna para gestionar las operaciones de ventas y cosechas de productos marinos, reemplazando el actual sistema basado en Excel.

## 📋 Descripción del Proyecto

Agua Blanca Seafoods requiere migrar de su sistema actual basado en archivos Excel a una aplicación web que permita:

- **Acceso multi-dispositivo**: Móvil, tablet y desktop
- **Registro simultáneo**: Múltiples usuarios trabajando al mismo tiempo
- **Mejor rendimiento**: Sin lentitud al manejar grandes volúmenes de datos
- **Trazabilidad completa**: Desde cosechas hasta ventas finales
- **Reportes en tiempo real**: Análisis y dashboards interactivos

## 🏗️ Arquitectura del Sistema

### Stack Tecnológico
- **Frontend + Backend**: Next.js 14 (App Router) con TypeScript
- **Base de Datos**: Supabase (PostgreSQL + Auth + Storage)
- **UI Components**: shadcn/ui + Tailwind CSS
- **Hosting**: Vercel
- **Formularios**: React Hook Form + Zod
- **Charts**: Recharts
- **Tablas**: TanStack Table

### Ventajas del Stack
- ✅ **100% gratuito** para empezar
- ✅ **Escalable** cuando sea necesario
- ✅ **Deploy automático** con Git
- ✅ **Serverless** (sin mantenimiento de servidores)
- ✅ **TypeScript** para mayor confiabilidad

## 📊 Módulos del Sistema

### 🎯 Fase 1: Sistema de Ventas (4-5 semanas)
- **Formulario de captura de ventas**
  - Datos administrativos (folio, oficina, responsable)
  - Información de cosecha (nota salida, fechas)
  - Datos del cliente y productos
  - Gestión de precios y descuentos
  - Control de pagos y facturación

- **Concentrado de ventas**
  - Vista tabular con filtros avanzados
  - Exportación a Excel/PDF
  - Búsquedas y ordenamiento

- **Reportes básicos**
  - Estados de cuenta por cliente
  - Resumen por responsable
  - Análisis por tipo de cliente

### 🌱 Fase 2: Sistema de Cosechas (3 semanas)
- **Registro de cosechas por granja**
- **Control de inventarios por talla**
- **Notas de salida de granja**
- **Diferencias y ajustes**

### 🔗 Fase 3: Integración y Trazabilidad (3 semanas)
- **Conexión cosechas → ventas**
- **Trazabilidad completa**
- **Reportes avanzados y dashboards**
- **Analytics y predicciones**

## 🛠️ Instalación y Setup

### Prerrequisitos
- Node.js 18+
- npm o yarn
- Cuenta en Supabase
- Cuenta en Vercel (opcional para deploy)

### Setup Local

```bash
# Clonar repositorio
git clone [repo-url]
cd ventas_atarraya

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Ejecutar migraciones de base de datos
supabase db reset

# Iniciar servidor de desarrollo
npm run dev
```

### Variables de Entorno
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key-aqui
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📁 Estructura del Proyecto

```
ventas_atarraya/
├── app/                      # App Router de Next.js
│   ├── (auth)/              # Rutas de autenticación
│   ├── (dashboard)/         # Panel principal
│   ├── api/                 # API Routes
│   └── globals.css          # Estilos globales
├── components/              # Componentes React
│   ├── ui/                  # Componentes de shadcn/ui
│   ├── layout/              # Layout components
│   └── forms/               # Formularios específicos
├── lib/                     # Utilidades y configuración
│   ├── supabase/           # Cliente de Supabase
│   ├── hooks/              # Custom hooks
│   └── utils.ts            # Funciones helper
├── types/                   # Definiciones de TypeScript
├── supabase/               # Migraciones y configuración DB
└── docs/                   # Documentación del proyecto
```

## 🗄️ Base de Datos

### Tablas Principales
- **oficinas**: ALV Lerma, MV Tonameca, etc.
- **responsables**: Usuarios responsables por oficina
- **clientes**: ⚠️ **REQUERIDA** - Información completa de clientes (nombre, tipo, contacto)
- **tipos_cliente**: Cliente Final, Distribuidor Local, Empleado, etc.
- **productos**: Entero, PAD, Larvas
- **tallas_camaron**: 10-12, 12-15, 14-20, etc.
- **ventas**: Registro principal de ventas
- **cosechas**: Registro de cosechas por granja
- **usuarios**: Gestión de acceso y roles
- **metodos_pago**: Efectivo, Transferencia, Cortesía
- **formas_pago**: Contado, Dos Exhibiciones, Pagado, Pendiente
- **estatus_pago**: Cortesía, Pagado, Pendiente
- **tipos_factura**: NO, SI, PG

### ⚠️ IMPORTANTE: Tabla de Clientes
La funcionalidad de autocomplete de clientes implementada requiere una tabla `clientes` en Supabase con la siguiente estructura mínima:

```sql
CREATE TABLE clientes (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(255) NOT NULL,
  tipo_cliente_id BIGINT REFERENCES tipos_cliente(id),
  telefono VARCHAR(20),
  email VARCHAR(255),
  direccion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Características de Seguridad
- **Row Level Security (RLS)** habilitado
- **Roles de usuario**: admin, responsable, readonly
- **Auditoría completa** de cambios
- **Backups automáticos**

## 🚀 Deploy y Hosting

### Costos (Tier Gratuito)
- **Supabase Free**: $0/mes
  - 500 MB database
  - 2 GB bandwidth/mes
  - Backups diarios (7 días)
- **Vercel Hobby**: $0/mes
  - 100 GB bandwidth/mes
  - Deploy automático

### Deploy a Producción
```bash
# Configurar Vercel
npm i -g vercel
vercel login
vercel

# Variables de entorno en Vercel Dashboard
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - SUPABASE_SERVICE_ROLE_KEY
```

## 👥 Roles y Permisos

- **Admin**: Acceso completo, gestión de usuarios
- **Responsable**: Captura y edición de ventas/cosechas
- **Readonly**: Solo consulta y reportes

## 📈 Cronograma de Desarrollo

| Fase | Duración | Entregables |
|------|----------|-------------|
| Fase 1 | 4-5 semanas | Sistema de ventas completo |
| Fase 2 | 3 semanas | Sistema de cosechas |
| Fase 3 | 3 semanas | Integración y trazabilidad |
| Testing | 2 semanas | QA y optimización |
| **Total** | **12-14 semanas** | Sistema completo |

## 🧪 Testing

```bash
# Ejecutar tests
npm run test

# Tests de integración
npm run test:e2e

# Linting y formateo
npm run lint
npm run format
```

## 📚 Documentación Adicional

- [Setup Inicial](./setup-inicial.md) - Guía completa de instalación
- [Código Base](./codigo-base-ejemplos.md) - Ejemplos de implementación
- [Documentación Completa](./project-doc-agua-blanca.md) - Análisis detallado del sistema

## 🤝 Contribución

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

Este proyecto es privado y pertenece a Agua Blanca Seafoods.

---

**Developed with ❤️ for Agua Blanca Seafoods**