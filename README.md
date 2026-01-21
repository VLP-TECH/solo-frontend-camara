# Frontend - Cámara de Comercio de Valencia

Aplicación React con Vite para la plataforma digital de la Cámara de Comercio de Valencia.

## Tecnologías

- **Vite** - Build tool y dev server
- **TypeScript** - Lenguaje de programación
- **React** - Biblioteca de UI
- **shadcn-ui** - Componentes de UI
- **Tailwind CSS** - Framework de estilos
- **Supabase** - Backend y autenticación
- **Recharts** - Visualización de datos
- **React Query** - Gestión de estado del servidor

## Instalación

```sh
# Instalar dependencias
npm install

# Configurar variables de entorno
# Crear archivo .env en este directorio con:
VITE_SUPABASE_URL=tu-url-de-supabase
VITE_SUPABASE_ANON_KEY=tu-clave-anon-de-supabase
VITE_API_BASE_URL=http://127.0.0.1:8000  # Opcional: URL del backend de Brainnova
```

## Scripts

- `npm run dev` - Inicia el servidor de desarrollo (puerto 8080)
- `npm run build` - Construye la aplicación para producción
- `npm run start` - Inicia el servidor de preview de producción (puerto 4173)
- `npm run process-pdf` - Procesa PDFs de conocimiento (usa scripts del backend)
- `npm run load-brainnova` - Carga datos de Brainnova (usa scripts del backend)

## Estructura

```
frontend/
├── src/
│   ├── components/     # Componentes React reutilizables
│   ├── pages/          # Páginas de la aplicación
│   ├── hooks/          # Custom hooks
│   ├── contexts/       # Context providers
│   ├── integrations/  # Integraciones con servicios externos
│   └── lib/            # Utilidades y helpers
├── public/             # Archivos estáticos
└── Dockerfile          # Dockerfile para producción
```

## Desarrollo

```sh
# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:8080`

## Construcción para Producción

```sh
# Construir
npm run build

# Los archivos estarán en dist/
```

## Docker

```sh
# Construir imagen
docker build -t camara-vlc-frontend .

# Ejecutar contenedor
docker run -d -p 4173:4173 --env-file .env camara-vlc-frontend
```


