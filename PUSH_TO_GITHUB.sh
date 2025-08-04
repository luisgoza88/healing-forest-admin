#!/bin/bash

echo "🚀 SUBIENDO PANEL ADMIN A GITHUB"
echo "================================"
echo ""
echo "📋 Repositorio: https://github.com/luisgoza88/healing-forest-admin"
echo ""
echo "⚠️  IMPORTANTE:"
echo "   - Username: luisgoza88"
echo "   - Password: Usa tu Personal Access Token (NO tu contraseña normal)"
echo ""
echo "💡 Para crear un Personal Access Token:"
echo "   1. Ve a: https://github.com/settings/tokens"
echo "   2. Generate new token (classic)"
echo "   3. Selecciona: repo, workflow"
echo "   4. Copia el token generado"
echo ""
echo "🚀 Ejecutando push..."
echo ""

git push -u origin main

echo ""
echo "✅ ¡Código subido exitosamente!"
echo ""
echo "📋 Próximo paso:"
echo "   Ve a https://app.netlify.com para conectar con Netlify"