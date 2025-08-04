#!/bin/bash

echo "📤 Subiendo código a GitHub"
echo "=========================="
echo ""

# Asegurarse de que estamos en main
git branch -M main

# Push
echo "🚀 Subiendo a GitHub..."
git push -u origin main

echo ""
echo "✅ ¡Código subido exitosamente!"
echo ""
echo "🌐 Tu repositorio está en:"
echo "   https://github.com/luisgoza88/healing-forest-admin"
echo ""
echo "📋 Siguiente paso: Conectar con Netlify"