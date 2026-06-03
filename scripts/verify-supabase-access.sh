#!/usr/bin/env bash
# Comprueba si la CLI puede ver y desplegar en Brainnova (aoykpiievtadhwssugvs).
set -euo pipefail

PROJECT_REF="aoykpiievtadhwssugvs"

echo "=== Proyectos visibles para la sesión actual de Supabase CLI ==="
if ! supabase projects list 2>/dev/null | tee /tmp/sb-projects.txt | grep -q "$PROJECT_REF"; then
  echo ""
  echo "❌ NO aparece $PROJECT_REF en tu lista."
  echo "   Estás logueado con una cuenta que NO tiene acceso a Brainnova."
  echo "   Cuenta esperada para deploy: javier.olmo@thinkia.com"
  echo ""
  echo "   Haz:  supabase logout && supabase login"
  echo "   (elige javier.olmo@thinkia.com en el navegador)"
  echo ""
  echo "   O despliega con token de esa cuenta:"
  echo "   SUPABASE_ACCESS_TOKEN='<token>' supabase functions deploy notify-user-created --project-ref $PROJECT_REF"
  exit 1
fi

echo ""
echo "✅ Proyecto $PROJECT_REF visible. Puedes desplegar:"
echo "   ./scripts/deploy-email-functions.sh"
