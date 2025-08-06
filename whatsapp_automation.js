// WHATSAPP AUTOMATION MODULE FOR HEALING FOREST
// Using Twilio WhatsApp Business API

class WhatsAppAutomation {
  constructor(config) {
    this.accountSid = config.accountSid;
    this.authToken = config.authToken;
    this.fromNumber = config.fromNumber; // WhatsApp: +14155238886 (Twilio Sandbox) or your number
    this.baseURL = 'https://api.twilio.com/2010-04-01';
    this.templates = {
      appointmentReminder: {
        es: '🌳 *Healing Forest*\n\nHola {name}! 👋\n\nTe recordamos tu cita:\n📅 Fecha: {date}\n⏰ Hora: {time}\n🏥 Servicio: {service}\n👨‍⚕️ Profesional: {professional}\n\n📍 Dirección: Calle 123, Bogotá\n\n_Para confirmar responde *SI*_\n_Para cancelar responde *NO*_',
        en: '🌳 *Healing Forest*\n\nHi {name}! 👋\n\nReminder of your appointment:\n📅 Date: {date}\n⏰ Time: {time}\n🏥 Service: {service}\n👨‍⚕️ Professional: {professional}\n\n📍 Address: Street 123, Bogotá\n\n_Reply *YES* to confirm_\n_Reply *NO* to cancel_',
      },
      appointmentConfirmation: {
        es: '✅ *Cita Confirmada*\n\nGracias {name}!\n\nTu cita ha sido confirmada:\n📅 {date} a las {time}\n\nTe esperamos! 🌿',
        en: '✅ *Appointment Confirmed*\n\nThank you {name}!\n\nYour appointment is confirmed:\n📅 {date} at {time}\n\nSee you soon! 🌿',
      },
      invoiceSent: {
        es: '📄 *Factura Electrónica*\n\nHola {name}!\n\nTu factura #{invoiceNumber} por ${amount} ha sido enviada a tu email.\n\n✅ Pago confirmado\n🔐 CUFE: {cufe}\n\nGracias por confiar en Healing Forest! 🌳',
        en: '📄 *Electronic Invoice*\n\nHi {name}!\n\nYour invoice #{invoiceNumber} for ${amount} has been sent to your email.\n\n✅ Payment confirmed\n🔐 CUFE: {cufe}\n\nThank you for choosing Healing Forest! 🌳',
      },
      stockAlert: {
        es: '⚠️ *Alerta de Inventario*\n\n{productName} está próximo a vencer:\n📅 Fecha vencimiento: {expiryDate}\n📦 Stock actual: {stock}\n\n🔗 Ver detalles: {link}',
        en: '⚠️ *Inventory Alert*\n\n{productName} is about to expire:\n📅 Expiry date: {expiryDate}\n📦 Current stock: {stock}\n\n🔗 View details: {link}',
      },
      welcomePatient: {
        es: '🌳 *Bienvenido a Healing Forest*\n\nHola {name}! 🌿\n\nGracias por registrarte. Ahora puedes:\n✅ Agendar citas\n✅ Ver tu historial\n✅ Contactar profesionales\n\n💚 Estamos para cuidarte!\n\n_Guarda este número para recibir recordatorios_',
        en: "🌳 *Welcome to Healing Forest*\n\nHi {name}! 🌿\n\nThanks for joining us. Now you can:\n✅ Book appointments\n✅ View your history\n✅ Contact professionals\n\n💚 We're here to care for you!\n\n_Save this number for reminders_",
      },
    };
  }

  // Send WhatsApp message
  async sendMessage(to, message, mediaUrl = null) {
    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
        'base64'
      );

      const formData = new URLSearchParams();
      formData.append('From', `whatsapp:${this.fromNumber}`);
      formData.append('To', `whatsapp:${to}`);
      formData.append('Body', message);

      if (mediaUrl) {
        formData.append('MediaUrl', mediaUrl);
      }

      const response = await fetch(
        `${this.baseURL}/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (response.ok) {
        return {
          success: true,
          messageId: result.sid,
          status: result.status,
        };
      } else {
        throw new Error(result.message || 'Failed to send WhatsApp');
      }
    } catch (error) {
      Logger.error('WhatsApp send error:', error);
      throw error;
    }
  }

  // Send template message
  async sendTemplate(to, templateName, variables, language = 'es') {
    const template = this.templates[templateName]?.[language];
    if (!template) {
      throw new Error('Template not found');
    }

    let message = template;
    for (const [key, value] of Object.entries(variables)) {
      message = message.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    return await this.sendMessage(to, message);
  }

  // Schedule message
  async scheduleMessage(to, message, sendAt) {
    // Store in Firebase for cron job processing
    const scheduledMessage = {
      to,
      message,
      sendAt: firebase.firestore.Timestamp.fromDate(sendAt),
      status: 'scheduled',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    const docRef = await db
      .collection('scheduled_messages')
      .add(scheduledMessage);
    return docRef.id;
  }

  // Send appointment reminder
  async sendAppointmentReminder(appointment) {
    const variables = {
      name: appointment.patientName,
      date: appointment.date,
      time: appointment.time,
      service: appointment.service,
      professional: appointment.staffName,
    };

    return await this.sendTemplate(
      appointment.patientPhone,
      'appointmentReminder',
      variables,
      appointment.language || 'es'
    );
  }

  // Send invoice notification
  async sendInvoiceNotification(payment, invoice) {
    const variables = {
      name: payment.patientName,
      invoiceNumber: invoice.number,
      amount: payment.amount.toLocaleString(),
      cufe: invoice.cufe.substring(0, 8) + '...',
    };

    return await this.sendTemplate(
      payment.patientPhone,
      'invoiceSent',
      variables
    );
  }

  // Bulk send
  async sendBulkMessages(recipients, template, variables) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendTemplate(
          recipient.phone,
          template,
          { ...variables, name: recipient.name },
          recipient.language || 'es'
        );
        results.push({ recipient: recipient.phone, ...result });
      } catch (error) {
        results.push({
          recipient: recipient.phone,
          success: false,
          error: error.message,
        });
      }

      // Rate limiting - Twilio allows 1 message per second
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }
}

// Automation workflows
const whatsappWorkflows = {
  // Setup automated reminders
  async setupAppointmentReminders() {
    // Get tomorrow's appointments
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(dayAfter.getDate() + 1);

    const appointments = await db
      .collection('appointments')
      .where('date', '>=', tomorrow)
      .where('date', '<', dayAfter)
      .where('status', '==', 'pendiente')
      .get();

    const config = await getWhatsAppConfig();
    if (!config) return;

    const whatsapp = new WhatsAppAutomation(config);
    const results = [];

    for (const doc of appointments.docs) {
      const appointment = doc.data();

      // Skip if already reminded
      if (appointment.reminderSent) continue;

      try {
        const result = await whatsapp.sendAppointmentReminder({
          ...appointment,
          date: new Date(appointment.date.seconds * 1000).toLocaleDateString(),
          time: appointment.time,
        });

        // Mark as reminded
        await doc.ref.update({
          reminderSent: true,
          reminderSentAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        results.push({ appointmentId: doc.id, ...result });
      } catch (error) {
        results.push({
          appointmentId: doc.id,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  },

  // Send welcome message to new patients
  async sendWelcomeMessage(userId) {
    const userDoc = await db.collection('users').doc(userId).get();
    const user = userDoc.data();

    if (!user.phone) return;

    const config = await getWhatsAppConfig();
    if (!config) return;

    const whatsapp = new WhatsAppAutomation(config);

    return await whatsapp.sendTemplate(
      user.phone,
      'welcomePatient',
      { name: user.name },
      user.language || 'es'
    );
  },

  // Process scheduled messages (run every minute via cron)
  async processScheduledMessages() {
    const now = new Date();

    const messages = await db
      .collection('scheduled_messages')
      .where('sendAt', '<=', now)
      .where('status', '==', 'scheduled')
      .limit(10)
      .get();

    const config = await getWhatsAppConfig();
    if (!config) return;

    const whatsapp = new WhatsAppAutomation(config);

    for (const doc of messages.docs) {
      const message = doc.data();

      try {
        const result = await whatsapp.sendMessage(message.to, message.message);

        await doc.ref.update({
          status: 'sent',
          sentAt: firebase.firestore.FieldValue.serverTimestamp(),
          messageId: result.messageId,
        });
      } catch (error) {
        await doc.ref.update({
          status: 'failed',
          error: error.message,
          failedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
      }
    }
  },
};

// Helper function to get WhatsApp config
async function getWhatsAppConfig() {
  const configDoc = await db.collection('integrations').doc('whatsapp').get();
  return configDoc.exists ? configDoc.data() : null;
}

// Export for use
window.WhatsAppAutomation = WhatsAppAutomation;
window.whatsappWorkflows = whatsappWorkflows;
