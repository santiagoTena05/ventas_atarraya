# 💻 Código Base - Ejemplos de Implementación

Ejemplos de código listo para usar en el proyecto.

---

## 1. Clientes de Supabase

### `lib/supabase/client.ts` (Client-side)

```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { Database } from '@/types/database.types';

export const createClient = () => createClientComponentClient<Database>();
```

### `lib/supabase/server.ts` (Server-side)

```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database.types';

export const createServerClient = () => 
  createServerComponentClient<Database>({ cookies });
```

### `lib/supabase/middleware.ts`

```typescript
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createMiddlewareClient({ req: request, res: response });

  await supabase.auth.getSession();

  return response;
}
```

---

## 2. Middleware de Autenticación

### `middleware.ts`

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
  const publicRoutes = ['/login'];
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

  // Verificar roles para rutas de admin
  if (req.nextUrl.pathname.startsWith('/administracion')) {
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

---

## 3. Hook de Autenticación

### `lib/hooks/useAuth.ts`

```typescript
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

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

---

## 4. Página de Login

### `app/(auth)/login/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">
            Agua Blanca System
          </CardTitle>
          <CardDescription className="text-center">
            Ingresa tus credenciales para continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Cargando...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 5. Layout del Dashboard

### `app/(dashboard)/layout.tsx`

```typescript
import { createServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createServerClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### `components/layout/Header.tsx`

```typescript
'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, LogOut } from 'lucide-react';

export function Header() {
  const { profile, signOut } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Agua Blanca System
          </h1>
          <p className="text-sm text-gray-500">
            Sistema de Gestión de Ventas y Cosechas
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <User className="h-5 w-5" />
              <span>{profile?.nombre}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
```

### `components/layout/Sidebar.tsx`

```typescript
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Home,
  ShoppingCart,
  Wheat,
  BarChart3,
  FileText,
  Users,
  Settings,
} from 'lucide-react';

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/ventas', label: 'Ventas', icon: ShoppingCart },
  { href: '/cosechas', label: 'Cosechas', icon: Wheat },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/reportes', label: 'Reportes', icon: BarChart3 },
  { href: '/facturacion', label: 'Facturación', icon: FileText },
  { href: '/administracion', label: 'Administración', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)]">
      <nav className="p-4 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                isActive
                  ? 'bg-cyan-50 text-cyan-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

---

## 6. API Route de Ejemplo

### `app/api/ventas/route.ts`

```typescript
import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';

const ventaSchema = z.object({
  oficina_id: z.number(),
  responsable_id: z.number(),
  cliente_id: z.number(),
  tipo_cliente_id: z.number(),
  fecha_cosecha: z.string(),
  fecha_entrega: z.string(),
  producto_id: z.number(),
  talla_camaron_id: z.number().optional(),
  entero_kgs: z.number().min(0),
  precio_venta_entero: z.number().min(0),
  metodo_pago: z.string(),
  forma_pago: z.string(),
});

export async function GET(request: Request) {
  const supabase = createServerClient();

  // Verificar autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Obtener parámetros de query
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const offset = (page - 1) * limit;

  // Consultar ventas
  const { data, error, count } = await supabase
    .from('ventas')
    .select('*, clientes(nombre), oficinas(nombre)', { count: 'exact' })
    .range(offset, offset + limit - 1)
    .order('fecha_entrega', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil((count || 0) / limit),
    },
  });
}

export async function POST(request: Request) {
  const supabase = createServerClient();

  // Verificar autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Verificar rol
  const { data: userProfile } = await supabase
    .from('usuarios')
    .select('rol')
    .eq('id', user.id)
    .single();

  if (!['admin', 'responsable'].includes(userProfile?.rol || '')) {
    return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
  }

  // Validar datos
  const body = await request.json();

  try {
    const validated = ventaSchema.parse(body);

    // Obtener siguiente folio
    const { data: lastVenta } = await supabase
      .from('ventas')
      .select('folio')
      .order('folio', { ascending: false })
      .limit(1)
      .single();

    const nextFolio = (lastVenta?.folio || 0) + 1;

    // Insertar venta
    const { data, error } = await supabase
      .from('ventas')
      .insert({
        ...validated,
        folio: nextFolio,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    return NextResponse.json(
      { error: 'Error al crear venta' },
      { status: 500 }
    );
  }
}
```

---

## 7. Componente de Formulario de Ventas

### `components/ventas/VentaForm.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';

const ventaSchema = z.object({
  oficina_id: z.number(),
  responsable_id: z.number(),
  cliente_id: z.number(),
  fecha_cosecha: z.string(),
  fecha_entrega: z.string(),
  tipo_producto: z.enum(['Entero', 'PAD', 'Larvas']),
  entero_kgs: z.number().min(0),
  precio_venta: z.number().min(0),
  metodo_pago: z.string(),
  forma_pago: z.string(),
});

type VentaFormData = z.infer<typeof ventaSchema>;

export function VentaForm() {
  const [loading, setLoading] = useState(false);
  const [catalogos, setCatalogos] = useState<any>({});
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<VentaFormData>({
    resolver: zodResolver(ventaSchema),
  });

  const enteroKgs = watch('entero_kgs');
  const precioVenta = watch('precio_venta');
  const montoVenta = (enteroKgs || 0) * (precioVenta || 0);

  useEffect(() => {
    loadCatalogos();
  }, []);

  const loadCatalogos = async () => {
    const [oficinas, responsables] = await Promise.all([
      supabase.from('oficinas').select('id, nombre'),
      supabase.from('responsables').select('id, nombre'),
    ]);

    setCatalogos({
      oficinas: oficinas.data || [],
      responsables: responsables.data || [],
    });
  };

  const onSubmit = async (data: VentaFormData) => {
    setLoading(true);

    const response = await fetch('/api/ventas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      alert('Venta registrada exitosamente');
      // Reset form o redirect
    } else {
      alert('Error al registrar venta');
    }

    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="oficina_id">Oficina *</Label>
          <Select {...register('oficina_id', { valueAsNumber: true })}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {catalogos.oficinas?.map((o: any) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.oficina_id && (
            <p className="text-sm text-red-600">{errors.oficina_id.message}</p>
          )}
        </div>

        {/* Más campos... */}

        <div>
          <Label htmlFor="entero_kgs">Entero | kgs *</Label>
          <Input
            id="entero_kgs"
            type="number"
            step="0.001"
            {...register('entero_kgs', { valueAsNumber: true })}
          />
        </div>

        <div>
          <Label htmlFor="precio_venta">Precio Venta *</Label>
          <Input
            id="precio_venta"
            type="number"
            step="0.01"
            {...register('precio_venta', { valueAsNumber: true })}
          />
        </div>

        <div>
          <Label>Monto Venta</Label>
          <Input
            type="text"
            value={`$${montoVenta.toFixed(2)}`}
            readOnly
            className="bg-gray-50 font-semibold"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading} className="flex-1">
          {loading ? 'Registrando...' : 'Registrar Venta'}
        </Button>
        <Button type="button" variant="outline">
          Limpiar
        </Button>
      </div>
    </form>
  );
}
```

---

## 8. Utilidades

### `lib/utils.ts`

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function formatNumber(num: number, decimals: number = 3): string {
  return num.toFixed(decimals);
}
```

---

## ✅ Con estos archivos puedes:

1. ✅ Iniciar el proyecto
2. ✅ Configurar autenticación
3. ✅ Crear layouts y navegación
4. ✅ Implementar API routes
5. ✅ Crear formularios
6. ✅ Empezar a desarrollar funcionalidades

**Siguiente paso:** Ejecutar `npm run dev` y empezar a construir! 🚀