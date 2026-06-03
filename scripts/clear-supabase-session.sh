#!/usr/bin/env bash
# Limpia sesión CLI de Supabase (no borra caché del navegador; ver SETUP_EMAIL.md).
set -euo pipefail

echo "=== 1. Cerrar sesión Supabase CLI ==="
printf 'y\n' | supabase logout 2>/dev/null || supabase logout || true

echo "=== 2. Borrar carpetas locales de credenciales CLI (si existen) ==="
rm -rf "$HOME/.supabase" 2>/dev/null || true
rm -rf "$HOME/Library/Application Support/supabase" 2>/dev/null || true

echo ""
echo "✅ CLI limpia. Siguiente paso EN TU TERMINAL:"
echo "   supabase login"
echo ""
echo "   En el navegador: cierra sesión en supabase.com si ves otra cuenta,"
echo "   luego inicia con javi@thinkia.com (o javier.olmo@thinkia.com)."
echo ""
echo "   Luego:"
echo "   ./scripts/verify-supabase-access.sh"
echo "   ./scripts/deploy-email-functions.sh"
