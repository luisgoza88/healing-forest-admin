#!/bin/bash

# Script de observación automática para Healing Forest Admin
# Detecta cambios y los sube automáticamente a GitHub

echo "👁️  Observador Automático de Healing Forest Admin"
echo "================================================"
echo ""
echo "Este script detectará cambios y los subirá automáticamente a GitHub"
echo "Presiona Ctrl+C para detener"
echo ""

# Función para subir cambios
deploy_changes() {
    if [[ -n $(git status -s) ]]; then
        echo ""
        echo "🔄 Cambios detectados! Subiendo automáticamente..."
        ./auto_deploy.sh "Actualización automática desde observador"
        echo "⏰ Esperando próximos cambios..."
        echo ""
    fi
}

# Loop infinito para observar cambios
while true; do
    # Verificar cambios cada 30 segundos
    sleep 30
    deploy_changes
done