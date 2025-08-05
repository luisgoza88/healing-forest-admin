#!/bin/bash

# Script de auto-deploy para Healing Forest Admin Panel
# Este script sube automáticamente los cambios a GitHub

echo "🚀 Auto-Deploy para Healing Forest Admin Panel"
echo "=============================================="
echo ""

# Verificar si hay cambios
if [[ -z $(git status -s) ]]; then
    echo "✅ No hay cambios para subir"
    exit 0
fi

# Mostrar cambios
echo "📝 Cambios detectados:"
git status -s
echo ""

# Agregar todos los cambios
git add .

# Crear mensaje de commit con timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")
DEFAULT_MSG="Actualización automática - $TIMESTAMP"

# Si se proporciona un mensaje, usarlo
if [ -n "$1" ]; then
    COMMIT_MSG="$1"
else
    COMMIT_MSG="$DEFAULT_MSG"
fi

# Hacer commit
echo "💾 Creando commit: $COMMIT_MSG"
git commit -m "$COMMIT_MSG

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>"

# Push a GitHub
echo ""
echo "📤 Subiendo a GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ¡Cambios subidos exitosamente!"
    echo "🌐 Los cambios estarán en línea en 1-2 minutos"
    echo "📍 https://healing-forest-admin.netlify.app"
else
    echo ""
    echo "❌ Error al subir los cambios"
    echo "Por favor, verifica tu conexión a internet y credenciales de GitHub"
fi