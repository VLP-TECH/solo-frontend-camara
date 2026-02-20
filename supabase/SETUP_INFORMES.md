# Configurar Informes y PDF en Supabase

Sigue estos pasos en el **Dashboard de Supabase** para que la sección Informes guarde bien los PDFs.

---

## 1. Crear la tabla y la columna `pdf_url`

1. Entra en tu proyecto: [https://supabase.com/dashboard](https://supabase.com/dashboard) → tu proyecto.
2. Menú izquierdo: **SQL Editor** → **New query**.
3. Pega y ejecuta este SQL (Run):

```sql
-- Tabla informes: si no existe, se crea; si existe, se añade pdf_url
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'informes') THEN
    CREATE TABLE public.informes (
      id text PRIMARY KEY,
      title text,
      description text,
      date text,
      pages integer DEFAULT 0,
      category text,
      format text DEFAULT 'PDF + HTML',
      pdf_url text,
      created_at timestamptz DEFAULT now()
    );
    INSERT INTO public.informes (id, title, description, date, pages, category, format, pdf_url)
    VALUES (
      'brainnova-2025',
      'Informe BRAINNOVA 2025',
      'Informe completo del Índice BRAINNOVA 2025 sobre el estado de la economía digital en la Comunitat Valenciana.',
      'Enero 2025',
      14,
      'Informes anuales',
      'PDF + HTML',
      '/informes/InformeBrainnova_2025.pdf'
    );
  ELSE
    ALTER TABLE public.informes ADD COLUMN IF NOT EXISTS pdf_url text;
  END IF;
END $$;
```

4. Comprueba que no hay errores. Si la tabla ya existía con otra estructura (por ejemplo desde "Crear Informe"), solo se habrá añadido la columna `pdf_url`.

---

## 2. Bucket de Storage para los PDFs

1. Menú izquierdo: **Storage**.
2. Si no existe un bucket llamado **informes**:
   - **New bucket**.
   - Name: `informes`.
   - Marca **Public bucket** si quieres que las URLs del PDF sean accesibles sin estar logueado (recomendado para ver informes).
   - **Create bucket**.
3. Entra en el bucket **informes** → pestaña **Policies**.
4. Añade políticas para que la app pueda subir y leer:

   **Política 1 – Lectura pública (ver PDFs):**
   - **New policy** → **For full customization**.
   - Name: `Informes públicos lectura`.
   - Allowed operation: **SELECT** (Read).
   - Target roles: `public` (o deja el default).
   - USING expression: `true` (todos pueden leer).
   - **Review** → **Save policy**.

   **Política 2 – Escritura para usuarios autenticados (subir PDFs):**
   - **New policy** → **For full customization**.
   - Name: `Informes upload autenticados`.
   - Allowed operation: **INSERT** (y si quieres sobrescribir: **UPDATE**).
   - Target roles: `authenticated`.
   - WITH CHECK expression: `true` (o `auth.role() = 'authenticated'`).
   - **Review** → **Save policy**.

   Si prefieres usar las plantillas:
   - **New policy** → "Allow public read access" para SELECT en el bucket `informes`.
   - **New policy** → "Allow authenticated uploads" para INSERT (y opcionalmente UPDATE) en `informes`.

---

## 3. Comprobar

- **Table Editor** → tabla **informes**: debe tener al menos una fila (por ejemplo `id = brainnova-2025`) y la columna **pdf_url**.
- **Storage** → bucket **informes**: al subir un PDF desde la app, debe aparecer un archivo dentro (por ejemplo en la carpeta `informes/`).
- En la app: entra en Informes, sube un PDF como admin y recarga la página; el informe debe seguir mostrando el PDF correcto.

---

## Producción (Digital Ocean, etc.): si la subida falla

1. **Bucket "informes"**  
   En Supabase Dashboard → **Storage** → si no existe el bucket **informes**:  
   **New bucket** → Name: `informes` → marcar **Public bucket** → Create.

2. **Políticas de Storage**  
   En **SQL Editor** ejecuta el contenido de  
   `supabase/migrations/20250221100000_storage_informes_policies_idempotent.sql`  
   (DROP policies si existen y CREATE de nuevo). Así te aseguras de que los usuarios autenticados pueden hacer INSERT en el bucket.

3. **Sesión**  
   La subida solo funciona con usuario **logueado**. Si en producción da error, cierra sesión, vuelve a entrar y prueba otra vez.

4. **Tabla informes**  
   Si la tabla tiene la columna `id` como UUID, ejecuta también  
   `supabase/migrations/20250220100000_informes_id_text_and_seed.sql`  
   para que la app pueda guardar la URL del PDF (id como text).

---

## Opción: usar la CLI de Supabase

Si usas Supabase CLI y quieres aplicar solo la migración de la columna:

```bash
supabase db push
```

(o `supabase migration up` según tu flujo). Eso aplicará el contenido de `migrations/20250129000000_add_pdf_url_to_informes.sql`. La tabla completa y el informe por defecto se configuran con el SQL del paso 1 en el Dashboard.
