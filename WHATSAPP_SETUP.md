# 📱 Configuración de WhatsApp en el Panel Administrativo

## 🚀 Inicio Rápido

La consola de WhatsApp está integrada en el panel administrativo. Para acceder:

1. Inicia sesión en https://healing-forest-admin.netlify.app
2. En el menú lateral, haz clic en **WhatsApp**
3. Verás la consola de mensajes masivos

## ⚙️ Configuración de Credenciales

### Paso 1: Obtener credenciales de Twilio
1. Crea una cuenta en [Twilio](https://www.twilio.com)
2. Obtén tu Account SID y Auth Token
3. Activa el Sandbox de WhatsApp en Twilio Console

### Paso 2: Configurar credenciales localmente
1. Copia `whatsapp_config_example.js` a `whatsapp_config.js`
2. Llena tus credenciales en el archivo
3. **NUNCA** subas este archivo a GitHub

### Paso 3: Activar el Sandbox
1. Envía "join tu-codigo-sandbox" al +14155238886
2. Espera confirmación de Twilio
3. El sandbox expira después de 72 horas

## 📨 Uso de la Consola

### Envío Individual
- Selecciona "Individual" en tipo de envío
- Ingresa el número con código de país (+57 para Colombia)
- Escribe tu mensaje y envía

### Envío Masivo
- Selecciona "Grupo específico" o "Todos los pacientes"
- Marca los destinatarios deseados
- Usa las plantillas predefinidas o crea tu mensaje

### Plantillas Disponibles
- 📅 **Recordatorio**: Para citas próximas
- 🎁 **Promoción**: Ofertas especiales
- 🎂 **Cumpleaños**: Felicitaciones automáticas
- 👨‍⚕️ **Seguimiento**: Control post-consulta

## 🔧 Configuración del Servidor

Para que los mensajes se envíen realmente, necesitas un servidor:

### Opción 1: Servidor Local (Desarrollo)
```bash
node whatsapp_server.js
```

### Opción 2: Firebase Cloud Functions (Producción)
- Configura una Cloud Function para procesar la cola de mensajes
- Conecta con las credenciales de Twilio

### Opción 3: Servidor Node.js (Producción)
- Despliega el servidor en Heroku, Railway o similar
- Configura las variables de entorno con tus credenciales

## 📊 Características

- ✅ Envío individual y masivo
- ✅ Plantillas personalizables
- ✅ Estadísticas en tiempo real
- ✅ Registro de envíos
- ✅ Personalización con variables ({nombre}, {fecha}, etc.)

## 🚨 Importante

- Los destinatarios deben activar el sandbox primero
- El sandbox es solo para pruebas
- Para producción, solicita un número WhatsApp Business
- Respeta las políticas de WhatsApp Business

## 💰 Costos Estimados

- Por mensaje: ~$0.005 USD
- 1000 mensajes/mes: ~$5 USD
- Incluye recordatorios, confirmaciones y alertas

## 🛠️ Solución de Problemas

### "Failed to fetch"
- Asegúrate que el servidor esté corriendo
- Verifica las credenciales

### Mensajes no llegan
- Confirma que el destinatario activó el sandbox
- Verifica el formato del número (+57...)
- Revisa que el sandbox no haya expirado

## 📞 Soporte

Para ayuda adicional, contacta al equipo de desarrollo.