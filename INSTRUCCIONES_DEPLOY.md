# 🚀 Instrucciones de Deploy Automático

## Opción 1: Deploy Manual Rápido

Después de hacer cualquier cambio, ejecuta en la terminal:

```bash
cd "/Users/marianatejada/Desktop/HEALLING APP/admin_panel_simple"
./auto_deploy.sh
```

O con un mensaje personalizado:

```bash
./auto_deploy.sh "Agregué nueva funcionalidad X"
```

## Opción 2: Deploy Automático Continuo

Para que los cambios se suban automáticamente cada 30 segundos:

```bash
cd "/Users/marianatejada/Desktop/HEALLING APP/admin_panel_simple"
./watch_and_deploy.sh
```

**Nota**: Deja la terminal abierta. Para detener, presiona `Ctrl+C`

## Opción 3: Comando Súper Rápido

Agrega este alias a tu terminal para deploy instantáneo desde cualquier lugar:

1. Abre tu archivo de configuración:
```bash
echo 'alias deploy-admin="cd \"/Users/marianatejada/Desktop/HEALLING APP/admin_panel_simple\" && ./auto_deploy.sh"' >> ~/.zshrc
source ~/.zshrc
```

2. Ahora solo escribe desde cualquier lugar:
```bash
deploy-admin
```

## 🎯 Flujo de Trabajo Recomendado

1. Haz tus cambios en los archivos
2. Ejecuta: `deploy-admin` o `./auto_deploy.sh`
3. Espera 1-2 minutos
4. Actualiza https://healing-forest-admin.netlify.app

## ⚠️ Importante

- Los cambios tardan 1-2 minutos en verse en la web
- Si hay errores, revisa tu conexión a internet
- El script te avisará si todo salió bien

## 🆘 Solución de Problemas

Si el deploy falla:

1. Verifica tu conexión a internet
2. Asegúrate de estar en el directorio correcto
3. Ejecuta: `git status` para ver el estado
4. Si hay conflictos, avísame para resolverlos