# Plan de Funcionamiento del Proyecto - Cámara de Comercio de Valencia

## 📋 Índice
1. [Visión General](#visión-general)
2. [Arquitectura del Proyecto](#arquitectura-del-proyecto)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estructura de Carpetas](#estructura-de-carpetas)
5. [Flujo de Autenticación](#flujo-de-autenticación)
6. [Sistema de Rutas](#sistema-de-rutas)
7. [Componentes Principales](#componentes-principales)
8. [Integraciones](#integraciones)
9. [Sistema de Permisos](#sistema-de-permisos)
10. [Chatbot con IA](#chatbot-con-ia)
11. [Flujo de Datos](#flujo-de-datos)
12. [Scripts y Comandos](#scripts-y-comandos)

---

## 🎯 Visión General

Este proyecto es una **aplicación web React** desarrollada para la **Cámara de Comercio de Valencia** que permite visualizar y gestionar datos relacionados con el ecosistema digital valenciano. La aplicación incluye:

- **Dashboards interactivos** con visualizaciones de KPIs e indicadores
- **Sistema de autenticación** con roles y permisos
- **Gestión de encuestas** para recopilar datos
- **Chatbot con IA** para consultas sobre indicadores y datos
- **Análisis de dimensiones** y subdimensiones del ecosistema digital
- **Comparaciones territoriales** y evolución temporal
- **Exportación de datos** y generación de informes

---

## 🏗️ Arquitectura del Proyecto

### Arquitectura General
```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Supabase   │  │  Brainnova   │  │   Chatbot    │ │
│  │   (Auth +    │  │    API       │  │  Knowledge   │ │
│  │    DB)       │  │  (Backend)   │  │    Base      │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Patrón de Diseño
- **SPA (Single Page Application)** con React Router
- **Context API** para estado global (autenticación)
- **React Query** para gestión de estado del servidor
- **Componentes funcionales** con hooks
- **TypeScript** para tipado estático

---

## 🛠️ Stack Tecnológico

### Core
- **React 18.3** - Biblioteca de UI
- **TypeScript 5.8** - Lenguaje tipado
- **Vite 5.4** - Build tool y dev server
- **React Router DOM 6.30** - Enrutamiento

### UI y Estilos
- **shadcn/ui** - Componentes UI basados en Radix UI
- **Tailwind CSS 3.4** - Framework de estilos
- **Radix UI** - Componentes accesibles (dialog, dropdown, etc.)
- **Lucide React** - Iconos
- **Recharts 2.15** - Visualización de datos

### Backend y Datos
- **Supabase** - Autenticación y base de datos
- **React Query (TanStack Query)** - Gestión de estado del servidor
- **Brainnova API** - Backend personalizado para cálculos

### Formularios y Validación
- **React Hook Form 7.61** - Gestión de formularios
- **Zod 3.25** - Validación de esquemas
- **@hookform/resolvers** - Integración React Hook Form + Zod

### Utilidades
- **date-fns 3.6** - Manipulación de fechas
- **clsx** - Utilidad para clases CSS condicionales
- **tailwind-merge** - Merge de clases Tailwind

---

## 📁 Estructura de Carpetas

```
src/
├── components/          # Componentes React reutilizables
│   ├── ui/             # Componentes UI de shadcn (button, card, dialog, etc.)
│   ├── BackendStatus.tsx
│   ├── ChatWidget.tsx  # Widget de chatbot flotante
│   ├── DashboardSection.tsx
│   ├── DataSourcesSection.tsx
│   ├── ErrorBoundary.tsx
│   ├── FooterSection.tsx
│   ├── HeroSection.tsx
│   ├── NavigationHeader.tsx
│   └── ProtectedRoute.tsx  # Componente para proteger rutas
│
├── contexts/           # Context providers
│   └── AuthContext.tsx # Contexto de autenticación
│
├── hooks/              # Custom hooks
│   ├── use-mobile.tsx
│   ├── use-toast.ts
│   ├── usePermissions.ts  # Hook para permisos de usuario
│   └── useUserProfile.ts  # Hook para perfil de usuario
│
├── integrations/       # Integraciones con servicios externos
│   └── supabase/
│       ├── client.ts   # Cliente de Supabase
│       └── types.ts    # Tipos TypeScript generados
│
├── lib/                # Utilidades y servicios
│   ├── brainnova-api.ts        # Cliente API de Brainnova
│   ├── brainnova-admin-api.ts  # API admin de Brainnova
│   ├── brainnova-types.ts      # Tipos para Brainnova
│   ├── chatbot-service.ts      # Servicio del chatbot
│   ├── csv-export.ts           # Exportación CSV
│   ├── csv-utils.ts            # Utilidades CSV
│   ├── dashboard-data.ts       # Datos del dashboard
│   ├── data-sources.ts         # Gestión de fuentes de datos
│   ├── kpis-data.ts            # Datos de KPIs
│   ├── tendencias-helpers.ts   # Helpers para tendencias
│   └── utils.ts                # Utilidades generales
│
├── pages/              # Páginas de la aplicación
│   ├── Index.tsx              # Página de inicio (landing)
│   ├── Auth.tsx                # Página de autenticación
│   ├── Dashboard.tsx           # Dashboard principal
│   ├── AdminDashboard.tsx      # Dashboard de administración
│   ├── AdminConfig.tsx         # Configuración de admin
│   ├── Surveys.tsx             # Lista de encuestas
│   ├── CreateSurvey.tsx        # Crear encuesta
│   ├── SurveyForm.tsx          # Formulario de encuesta
│   ├── OpenData.tsx            # Datos abiertos
│   ├── KPIsDashboard.tsx       # Dashboard de KPIs
│   ├── Tendencias.tsx          # Análisis de tendencias
│   ├── BrainnovaScore.tsx      # Cálculo de Brainnova Score
│   ├── Metodologia.tsx         # Metodología
│   ├── Informes.tsx            # Informes
│   ├── EvolucionTemporal.tsx   # Evolución temporal
│   ├── ComparacionTerritorial.tsx  # Comparación territorial
│   ├── Dimensiones.tsx        # Lista de dimensiones
│   ├── DimensionDetail.tsx    # Detalle de dimensión
│   ├── SubdimensionDashboard.tsx  # Dashboard de subdimensión
│   └── NotFound.tsx            # Página 404
│
├── assets/             # Recursos estáticos (imágenes)
├── App.tsx             # Componente raíz con rutas
├── main.tsx            # Punto de entrada de la aplicación
└── index.css           # Estilos globales
```

---

## 🔐 Flujo de Autenticación

### 1. Inicialización (`AuthContext.tsx`)
```typescript
// Al cargar la app, se configura un listener de cambios de autenticación
supabase.auth.onAuthStateChange((event, session) => {
  setSession(session);
  setUser(session?.user ?? null);
});
```

### 2. Registro de Usuario
1. Usuario completa formulario en `/auth`
2. Se llama a `signUp()` con email, password y datos opcionales
3. Supabase crea el usuario
4. Se actualiza la tabla `profiles` con:
   - `active: false` (requiere activación por admin)
   - `razon_social` y `cif` (si se proporcionan)
5. Usuario recibe email de confirmación

### 3. Inicio de Sesión
1. Usuario ingresa credenciales en `/auth`
2. Se llama a `signIn()` con email y password
3. Supabase valida credenciales
4. Se establece la sesión en localStorage
5. El listener actualiza el estado global

### 4. Protección de Rutas (`ProtectedRoute.tsx`)
```typescript
// Verifica:
1. ¿Usuario autenticado? → Si no, redirige a /auth
2. ¿Usuario activo? → Si no, muestra mensaje de espera
3. ¿Todo OK? → Muestra el contenido protegido
```

### 5. Cierre de Sesión
- Intenta cerrar sesión globalmente (`scope: 'global'`)
- Cierra sesión localmente (`scope: 'local'`)
- Limpia localStorage de claves relacionadas con Supabase
- Actualiza estado global

---

## 🗺️ Sistema de Rutas

### Rutas Públicas
- `/` - Página de inicio (landing con HeroSection)
- `/auth` - Autenticación (login/registro)

### Rutas Protegidas (requieren autenticación y usuario activo)

#### Dashboards y Visualización
- `/dashboard` - Dashboard principal
- `/kpis` - Dashboard de KPIs
- `/kpis/subdimension` - Dashboard de subdimensión específica
- `/tendencias` - Análisis de tendencias
- `/evolucion` - Evolución temporal
- `/comparacion` - Comparación territorial

#### Dimensiones e Indicadores
- `/dimensiones` - Lista de dimensiones
- `/dimensiones/detalle` - Detalle de una dimensión
- `/brainnova-score` - Cálculo de Brainnova Score

#### Gestión de Datos
- `/datos-abiertos` - Datos abiertos y exportación
- `/informes` - Generación de informes
- `/metodologia` - Información sobre metodología

#### Encuestas
- `/encuestas` - Lista de encuestas
- `/encuestas/crear` - Crear nueva encuesta
- `/encuestas/:id` - Formulario de encuesta específica

#### Administración (requiere rol admin)
- `/admin-usuarios` - Gestión de usuarios
- `/config` - Configuración del sistema

#### Otras
- `*` - Página 404 (NotFound)

---

## 🧩 Componentes Principales

### 1. `App.tsx` - Componente Raíz
```typescript
// Estructura:
<ErrorBoundary>
  <QueryClientProvider>
    <AuthProvider>
      <TooltipProvider>
        <BrowserRouter>
          <Routes>...</Routes>
          <ChatWidget />  // Widget flotante siempre visible
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
</ErrorBoundary>
```

### 2. `AuthContext.tsx` - Contexto de Autenticación
- **Estado**: `user`, `session`, `loading`
- **Métodos**: `signUp()`, `signIn()`, `signOut()`
- **Listener**: Escucha cambios de autenticación de Supabase

### 3. `ProtectedRoute.tsx` - Protección de Rutas
- Verifica autenticación
- Verifica que el usuario esté activo
- Muestra loading durante verificación
- Muestra mensaje si usuario no está activo

### 4. `ChatWidget.tsx` - Widget de Chatbot
- Componente flotante en la esquina inferior derecha
- Estado: `isOpen`, `messages`, `inputValue`, `isLoading`
- Integra con `chatbot-service.ts` para generar respuestas

### 5. `NavigationHeader.tsx` - Navegación
- Barra de navegación superior
- Muestra menú según permisos del usuario
- Botón de logout

### 6. Componentes UI (shadcn/ui)
- `Button`, `Card`, `Dialog`, `Input`, `Select`, etc.
- Basados en Radix UI para accesibilidad
- Estilizados con Tailwind CSS

---

## 🔌 Integraciones

### 1. Supabase (`integrations/supabase/client.ts`)

#### Configuración
```typescript
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

#### Tablas Principales
- `profiles` - Perfiles de usuario (rol, active, razon_social, cif)
- `surveys` - Encuestas
- `chatbot_knowledge` - Base de conocimiento del chatbot
- `definicion_indicadores` - Definiciones de indicadores
- `resultado_indicadores` - Resultados calculados de indicadores
- `dimensiones` - Dimensiones del ecosistema digital
- `subdimensiones` - Subdimensiones

### 2. Brainnova API (`lib/brainnova-api.ts`)

#### Endpoints Utilizados
- `GET /api/v1/indicadores-disponibles` - Lista de indicadores
- `GET /api/v1/filtros-globales` - Filtros disponibles (países, sectores, etc.)
- `GET /api/v1/resultados` - Resultados históricos de indicadores
- `POST /api/v1/brainnova-score` - Calcular Brainnova Score

#### Estrategia de Fallback
```typescript
// Si el backend no está disponible:
1. Intenta conectar al backend Brainnova
2. Si falla o timeout (5s), usa Supabase como fallback
3. Consulta directamente las tablas de Supabase
4. Mapea los datos al formato esperado
```

### 3. Chatbot Service (`lib/chatbot-service.ts`)

#### Funcionalidades
- **Búsqueda de conocimiento**: Busca en `chatbot_knowledge`
- **Búsqueda de indicadores**: Busca en `definicion_indicadores`
- **Información de encuestas**: Consulta `surveys`
- **Información de dimensiones**: Consulta `dimensiones` y `subdimensiones`
- **Generación de respuestas**: Combina múltiples fuentes para generar respuestas contextuales

#### Flujo de Respuesta
```typescript
1. Limpia y procesa la consulta del usuario
2. Detecta el tipo de consulta (encuestas, dimensiones, indicadores, valores)
3. Busca información relevante en las bases de datos
4. Genera respuesta contextual basada en los resultados
5. Si no encuentra nada, sugiere alternativas
```

---

## 👥 Sistema de Permisos

### Roles (`usePermissions.ts`)
- **admin**: Acceso completo, siempre puede ver datos
- **editor**: Puede exportar, descargar informes, subir datos
- **user**: Usuario estándar (o sin rol)

### Permisos (`usePermissions.ts`)
```typescript
canExportData: isAdmin || isEditor
canDownloadReports: isAdmin || isEditor
canUploadDataSources: isAdmin || isEditor
canManageUsers: isAdmin (solo admin)
canViewData: isAdmin || (profile?.active === true)
canAccessAdminPanel: isAdmin
```

### Hook `useUserProfile.ts`
- Obtiene perfil del usuario desde Supabase
- Calcula `isAdmin` basado en `role === 'admin'`
- Verifica `isActive` basado en `active === true`

### Flujo de Verificación
1. Usuario se autentica
2. `ProtectedRoute` verifica autenticación
3. `useUserProfile` obtiene perfil
4. Se verifica `active === true` (o `isAdmin`)
5. `usePermissions` calcula permisos específicos
6. Componentes muestran/ocultan funcionalidades según permisos

---

## 🤖 Chatbot con IA

### Componente `ChatWidget.tsx`
- Widget flotante siempre visible
- Estado de conversación local
- Integración con `generateChatbotResponse()`

### Servicio `chatbot-service.ts`

#### Tipos de Consultas Soportadas

1. **Encuestas**
   - Detecta: "encuesta", "survey", "cuestionario"
   - Consulta tabla `surveys`
   - Lista encuestas activas

2. **Dimensiones**
   - Detecta: "dimensión", "dimension", "dimensiones"
   - Consulta tabla `dimensiones`
   - Puede mostrar indicadores de una dimensión específica

3. **Indicadores**
   - Detecta: "kpi", "indicador", "métrica", "dato"
   - Busca en `definicion_indicadores`
   - Puede mostrar detalles completos o lista

4. **Valores de Indicadores**
   - Detecta: "valor", "cuánto", "cuál es el valor"
   - Consulta `resultado_indicadores`
   - Muestra último valor calculado

5. **Búsqueda General**
   - Busca en `chatbot_knowledge`
   - Calcula relevancia de resultados
   - Prioriza resultados más específicos

#### Algoritmo de Búsqueda
```typescript
1. Limpia consulta (elimina signos, stop words)
2. Extrae términos de búsqueda (palabras > 2 caracteres)
3. Busca en múltiples campos (title, content, keywords)
4. Calcula relevancia:
   - Título: +3 puntos
   - Keywords: +2 puntos
   - Contenido: +1 punto
5. Ordena por relevancia
6. Genera respuesta contextual
```

---

## 📊 Flujo de Datos

### 1. Carga de Datos del Dashboard

```typescript
// Ejemplo: Dashboard de KPIs
1. Componente monta
2. React Query ejecuta query
3. Llama a brainnova-api.ts o data-sources.ts
4. Si backend disponible → usa Brainnova API
5. Si backend no disponible → fallback a Supabase
6. Datos se cachean en React Query
7. Componente se re-renderiza con datos
```

### 2. Visualización de Indicadores

```typescript
// Flujo completo:
1. Usuario selecciona indicador en dropdown
2. Se llama a getIndicadoresDisponibles()
3. Usuario selecciona filtros (país, sector, etc.)
4. Se llama a getFiltrosGlobales() para opciones
5. Se llama a getResultados() con parámetros
6. Datos se muestran en gráfico (Recharts)
7. Usuario puede cambiar filtros → se vuelve a llamar getResultados()
```

### 3. Cálculo de Brainnova Score

```typescript
1. Usuario completa formulario con parámetros
2. Se llama a calculateBrainnovaScore()
3. POST a /api/v1/brainnova-score
4. Backend calcula score usando algoritmo Brainnova
5. Se muestra resultado con visualización
```

### 4. Exportación de Datos

```typescript
1. Usuario hace clic en "Exportar"
2. Se verifica permiso canExportData
3. Se obtienen datos actuales del dashboard
4. Se llama a csv-export.ts
5. Se genera CSV con formato específico
6. Se descarga archivo
```

---

## 🚀 Scripts y Comandos

### Desarrollo
```bash
npm run dev          # Inicia servidor de desarrollo (puerto 8080)
```

### Producción
```bash
npm run build        # Construye aplicación para producción
npm run start        # Preview de producción (puerto 4173)
```

### Scripts Adicionales
```bash
npm run process-pdf      # Procesa PDFs de conocimiento (usa backend)
npm run load-brainnova   # Carga datos de Brainnova (usa backend)
```

### Docker
```bash
docker build -t camara-vlc-frontend .
docker run -d -p 4173:4173 --env-file .env camara-vlc-frontend
```

---

## 🔄 Flujo de Usuario Típico

### Usuario Nuevo
1. Visita `/` → Ve landing page
2. Hace clic en "Iniciar Sesión" → Va a `/auth`
3. Se registra → Cuenta creada con `active: false`
4. Ve mensaje: "Cuenta pendiente de validación"
5. Admin activa cuenta
6. Usuario puede iniciar sesión → Accede a `/dashboard`

### Usuario Activo
1. Inicia sesión → Redirigido a `/dashboard`
2. Explora dimensiones → `/dimensiones`
3. Ve detalle de dimensión → `/dimensiones/detalle`
4. Consulta chatbot → Hace preguntas sobre indicadores
5. Visualiza KPIs → `/kpis`
6. Exporta datos → `/datos-abiertos` (si tiene permiso)
7. Cierra sesión → Vuelve a `/`

### Administrador
1. Inicia sesión → Acceso completo
2. Gestiona usuarios → `/admin-usuarios`
3. Configura sistema → `/config`
4. Crea encuestas → `/encuestas/crear`
5. Ve todos los dashboards sin restricciones

---

## 📝 Variables de Entorno

```env
VITE_SUPABASE_URL=https://aoykpiievtadhwssugvs.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_BASE_URL=http://127.0.0.1:8000  # Opcional: Backend Brainnova
```

---

## 🐛 Manejo de Errores

### ErrorBoundary (`components/ErrorBoundary.tsx`)
- Captura errores de renderizado en componentes hijos
- Muestra UI de error amigable
- Permite recuperación o reporte de errores

### Manejo de Errores de API
- Timeouts configurados (5 segundos)
- Fallback automático a Supabase si backend falla
- Mensajes de error descriptivos
- Logging en consola para debugging

---

## 🎨 Estilos y Temas

- **Tailwind CSS** para estilos utilitarios
- **shadcn/ui** para componentes consistentes
- **Variables CSS** para temas (puede extenderse con `next-themes`)
- **Responsive design** con breakpoints de Tailwind

---

## 📈 Optimizaciones

### Build (`vite.config.ts`)
- **Code splitting**: Chunks separados para vendor, UI, charts, router, supabase
- **Minificación**: Terser con drop de console en producción
- **Source maps**: Deshabilitados en producción
- **Chunk size warning**: Límite de 1000KB

### Performance
- **React Query**: Cacheo automático de queries
- **Lazy loading**: Posible con React.lazy() y Suspense
- **Memoización**: Componentes optimizados con React.memo cuando necesario

---

## 🔍 Puntos Clave para Desarrolladores

1. **Siempre usar `ProtectedRoute`** para rutas que requieren autenticación
2. **Verificar permisos** con `usePermissions()` antes de mostrar funcionalidades
3. **Usar React Query** para todas las llamadas a API
4. **Implementar fallback** cuando se llame a Brainnova API
5. **Tipar todo** con TypeScript (tipos en `brainnova-types.ts` y `supabase/types.ts`)
6. **Manejar estados de loading** en componentes asíncronos
7. **Usar componentes de shadcn/ui** para consistencia visual

---

## 📚 Recursos Adicionales

- **Documentación de Supabase**: https://supabase.com/docs
- **Documentación de React Query**: https://tanstack.com/query
- **Documentación de shadcn/ui**: https://ui.shadcn.com
- **Documentación de Recharts**: https://recharts.org

---

*Última actualización: Enero 2026*
