#!/usr/bin/env bash
# Despliega las Edge Functions de correo en Supabase (requiere login: supabase login).
set -euo pipefail

PROJECT_REF="${SUPABASE_PROJECT_REF:-aoykpiievtadhwssugvs}"

echo "Desplegando funciones de correo en proyecto ${PROJECT_REF}..."

supabase functions deploy notify-user-created --project-ref "$PROJECT_REF"
supabase functions deploy notify-registration --project-ref "$PROJECT_REF"
supabase functions deploy create-user --project-ref "$PROJECT_REF"

echo "Listo. Prueba con: node scripts/test-notify-registration.mjs"
