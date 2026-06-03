#!/usr/bin/env bash
# Despliega las Edge Functions de correo en Supabase (requiere login: supabase login).
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-aoykpiievtadhwssugvs}"

if ! supabase projects list 2>/dev/null | grep -q "$PROJECT_REF"; then
  if [ -z "${SUPABASE_ACCESS_TOKEN:-}" ]; then
    echo "❌ No ves el proyecto $PROJECT_REF. Login con javier.olmo@thinkia.com o export SUPABASE_ACCESS_TOKEN."
    echo "   ./scripts/verify-supabase-access.sh"
    exit 1
  fi
fi

echo "Desplegando funciones de correo en proyecto ${PROJECT_REF}..."

supabase functions deploy notify-user-created --project-ref "$PROJECT_REF"
supabase functions deploy notify-registration --project-ref "$PROJECT_REF"
supabase functions deploy create-user --project-ref "$PROJECT_REF"

echo "Listo. Prueba con: node scripts/test-notify-registration.mjs"
