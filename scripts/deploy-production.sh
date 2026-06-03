#!/usr/bin/env bash
# Checklist de producción Brainnova (frontend + Supabase).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== 1. GitHub (main) ==="
git push origin main
echo "✅ main en GitHub"

echo ""
echo "=== 2. Supabase Edge Functions (cuenta con acceso al proyecto) ==="
if ./scripts/verify-supabase-access.sh 2>/dev/null; then
  ./scripts/deploy-email-functions.sh
  node scripts/test-notify-registration.mjs contacto@brainnova.info
else
  echo "⚠️  Sin acceso CLI → EasyPanel no aplica aquí."
  echo "    Opción A: supabase login (javier.olmo@thinkia.com) y vuelve a ejecutar este script."
  echo "    Opción B: GitHub → Actions → Deploy Supabase Edge Functions (email) → Run workflow"
  echo "             (requiere secrets SUPABASE_ACCESS_TOKEN y SUPABASE_PROJECT_REF)"
fi

echo ""
echo "=== 3. Frontend EasyPanel (manual) ==="
echo "→ EasyPanel → proyecto frontend → Redeploy / rebuild desde rama main"
echo "→ Comprobar: /auth, /admin-usuarios, /informes, /kpis"
echo ""
echo "Guía completa: supabase/PRODUCCION.md"
