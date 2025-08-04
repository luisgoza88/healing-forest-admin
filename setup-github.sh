#!/bin/bash

echo "🚀 Configurando GitHub para luisgoza88"
echo "======================================"
echo ""

# Configurar git
git config user.name "luisgoza88"
git config user.email "lmg880@gmail.com"

# Agregar remote
git remote remove origin 2>/dev/null
git remote add origin https://github.com/luisgoza88/healing-forest-admin.git

echo "✅ Configuración lista"
echo ""
echo "📋 Próximos pasos:"
echo "1. Ve a: https://github.com/new"
echo "2. Crea un nuevo repositorio llamado: healing-forest-admin"
echo "3. NO inicialices con README"
echo "4. Después ejecuta: ./push-to-github.sh"