# 🌳 Healing Forest Admin Panel

Panel administrativo para gestionar citas, pagos y servicios de Healing Forest.

## 🚀 Deploy Automático

Este proyecto se actualiza automáticamente en:

- **URL**: https://healing-forest-admin.netlify.app

Cada vez que se hace un cambio en GitHub, se actualiza automáticamente en la web.

## 📋 Características

- ✅ Login con Firebase Auth
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Gestión de citas con calendario
- ✅ Sistema de pagos
- ✅ Reportes PDF
- ✅ Notificaciones automáticas
- ✅ Sincronización en tiempo real con la app móvil

## 🔑 Credenciales

- Email: lmg880@gmail.com
- Password: Florida20

## 🛠️ Tecnologías

- HTML/CSS/JavaScript puro
- Firebase (Auth, Firestore)
- Chart.js para gráficas
- FullCalendar para calendario
- jsPDF para reportes

## 🔁 Recurrencia de eventos

Al crear una nueva clase desde el calendario se puede elegir una opción de **Repetir** (diario, semanal o mensual) y definir una fecha de finalización.
El sistema generará todos los eventos correspondientes en Firestore mediante una operación en lote, agrupados bajo un mismo `seriesId`.

En el modal de detalles de cualquier evento de la serie aparecerán los botones **Editar serie** y **Cancelar serie**, que permiten actualizar o eliminar todas las ocurrencias de la serie con un solo clic.
