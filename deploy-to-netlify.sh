#!/bin/bash

echo "🚀 Desplegando Panel Admin a Netlify"
echo "===================================="
echo ""

# Verificar si Netlify CLI está instalado
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI no está instalado."
    echo "📦 Instalando Netlify CLI..."
    npm install -g netlify-cli
fi

echo "📁 Directorio: $(pwd)"
echo ""

# Deploy
echo "🌐 Desplegando a Netlify..."
netlify deploy --prod --dir . --site healing-forest-admin

echo ""
echo "✅ ¡Listo! Tu panel admin está online"
echo ""
echo "🔗 URL: https://healing-forest-admin.netlify.app"
echo ""
echo "📝 Notas:"
echo "- Primera vez: Te pedirá autenticarte con tu cuenta de Netlify"
echo "- El panel estará disponible mundialmente en segundos"
echo "- Todas las actualizaciones se sincronizan con Firebase automáticamente"