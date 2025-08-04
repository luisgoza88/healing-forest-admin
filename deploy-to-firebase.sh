#!/bin/bash

echo "🔥 Desplegando Panel Admin a Firebase Hosting"
echo "============================================"
echo ""

# Verificar si Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI no está instalado."
    echo "📦 Instalando Firebase CLI..."
    npm install -g firebase-tools
fi

# Crear firebase.json si no existe
if [ ! -f "firebase.json" ]; then
    echo "📝 Creando configuración de Firebase..."
    cat > firebase.json << EOF
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
EOF
fi

# Crear .firebaserc si no existe
if [ ! -f ".firebaserc" ]; then
    cat > .firebaserc << EOF
{
  "projects": {
    "default": "healling-forest"
  }
}
EOF
fi

echo "🔑 Autenticando con Firebase..."
firebase login

echo ""
echo "🚀 Desplegando..."
firebase deploy --only hosting

echo ""
echo "✅ ¡Panel admin desplegado!"
echo ""
echo "🔗 URLs disponibles:"
echo "   https://healling-forest.web.app/admin"
echo "   https://healling-forest.firebaseapp.com/admin"