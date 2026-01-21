# Docker Setup para EasyPanel

Este proyecto está configurado para desplegarse en EasyPanel usando Docker.

## Archivos de Configuración

### Dockerfile
- Multi-stage build optimizado para producción
- Usa Nginx para servir archivos estáticos
- Incluye configuración SPA routing
- Headers de seguridad y compresión gzip
- Health check integrado

### docker-compose.yml
- Configuración para desarrollo local y producción
- Health checks automáticos
- Puerto 80 expuesto

### .dockerignore
- Excluye archivos innecesarios para optimizar el build

## Despliegue en EasyPanel

1. **Sube tu código a GitHub** (ya completado)
2. **En EasyPanel:**
   - Crea un nuevo proyecto
   - Selecciona "Docker" como método de despliegue
   - Conecta tu repositorio de GitHub
   - EasyPanel detectará automáticamente el Dockerfile

3. **Configuración del dominio:**
   - Configura tu dominio personalizado en EasyPanel
   - El contenedor expone el puerto 80

## Variables de Entorno (Opcional)

Si necesitas variables de entorno, crea un archivo `.env` en la raíz con:

```env
# Supabase (si usas autenticación)
VITE_SUPABASE_URL=tu_url_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima

# API externa (si aplica)
VITE_API_BASE_URL=https://tu-api.com/api

# Configuración de la app
VITE_APP_TITLE=Solo Frontend Camara
```

## Comandos Útiles

### Construir localmente:
```bash
docker build -t solo-frontend-camara .
```

### Ejecutar localmente:
```bash
docker run -p 3000:80 solo-frontend-camara
```

### Usar docker-compose:
```bash
docker-compose up --build
```

## Características del Dockerfile

- **Multi-stage build**: Reduce el tamaño final de la imagen
- **Nginx optimizado**: Configurado para SPAs con routing correcto
- **Seguridad**: Headers de seguridad incluidos
- **Compresión**: Gzip habilitado para mejor performance
- **Health checks**: Verificación automática del estado del contenedor
- **Cache optimizado**: Assets estáticos cacheados por 1 año

## Troubleshooting

### Problema: La aplicación no carga rutas directamente
**Solución**: El nginx está configurado para SPA routing. Todas las rutas que no existen como archivos sirven `index.html`.

### Problema: Assets no se cargan
**Solución**: Verifica que los archivos estén en la carpeta `public/` o que se copien correctamente en el build.

### Problema: Contenedor no inicia
**Solución**: Revisa los logs de EasyPanel. El health check puede estar fallando si `/health` no responde.