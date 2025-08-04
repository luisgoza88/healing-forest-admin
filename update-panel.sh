#!/bin/bash

echo "🔄 Actualizando Panel Admin"
echo "=========================="
echo ""

# Obtener mensaje de commit
if [ -z "$1" ]; then
    MESSAGE="Actualización automática del panel"
else
    MESSAGE="$1"
fi

echo "📝 Mensaje: $MESSAGE"
echo ""

# Git commands
git add .
git commit -m "$MESSAGE"
git push

echo ""
echo "✅ Panel actualizado!"
echo "🌐 Los cambios estarán online en 1-2 minutos"
echo ""
echo "🔗 Ver en: https://healing-forest-admin.netlify.app"