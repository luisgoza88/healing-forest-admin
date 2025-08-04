// Email Configuration for Healing Forest
// This file contains email templates and configuration

const emailConfig = {
    // EmailJS configuration (free service for sending emails from JavaScript)
    // Sign up at https://www.emailjs.com/ to get your own keys
    SERVICE_ID: 'YOUR_SERVICE_ID',
    TEMPLATE_ID: 'YOUR_TEMPLATE_ID',
    PUBLIC_KEY: 'YOUR_PUBLIC_KEY',
    
    // Email templates
    templates: {
        appointmentConfirmation: {
            subject: 'Confirmación de Cita - Healing Forest',
            getBody: (appointment) => `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #16A34A; color: white; padding: 20px; text-align: center;">
                        <h1>🌳 Healing Forest</h1>
                        <h2>Confirmación de Cita</h2>
                    </div>
                    <div style="padding: 30px; background: #f5f5f5;">
                        <p>Estimado/a ${appointment.patientName},</p>
                        <p>Su cita ha sido confirmada con los siguientes detalles:</p>
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Servicio:</strong> ${appointment.service}</p>
                            <p><strong>Profesional:</strong> ${appointment.staffName}</p>
                            <p><strong>Fecha:</strong> ${appointment.date}</p>
                            <p><strong>Hora:</strong> ${appointment.time}</p>
                            ${appointment.notes ? `<p><strong>Notas:</strong> ${appointment.notes}</p>` : ''}
                        </div>
                        <p>Por favor, llegue 10 minutos antes de su cita.</p>
                        <p>Si necesita cancelar o reprogramar, contáctenos al menos 24 horas antes.</p>
                        <div style="text-align: center; margin-top: 30px;">
                            <a href="#" style="background: #16A34A; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px;">Ver en la App</a>
                        </div>
                    </div>
                    <div style="background: #1E3A3F; color: white; padding: 20px; text-align: center;">
                        <p>© 2024 Healing Forest. Todos los derechos reservados.</p>
                    </div>
                </div>
            `
        },
        
        appointmentReminder: {
            subject: 'Recordatorio de Cita - Healing Forest',
            getBody: (appointment) => `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #16A34A; color: white; padding: 20px; text-align: center;">
                        <h1>🌳 Healing Forest</h1>
                        <h2>Recordatorio de Cita</h2>
                    </div>
                    <div style="padding: 30px; background: #f5f5f5;">
                        <p>Estimado/a ${appointment.patientName},</p>
                        <p>Le recordamos que tiene una cita mañana:</p>
                        <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Servicio:</strong> ${appointment.service}</p>
                            <p><strong>Profesional:</strong> ${appointment.staffName}</p>
                            <p><strong>Fecha:</strong> ${appointment.date}</p>
                            <p><strong>Hora:</strong> ${appointment.time}</p>
                        </div>
                        <p>No olvide traer su documentación necesaria.</p>
                    </div>
                </div>
            `
        },
        
        appointmentCancellation: {
            subject: 'Cita Cancelada - Healing Forest',
            getBody: (appointment) => `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: #dc3545; color: white; padding: 20px; text-align: center;">
                        <h1>🌳 Healing Forest</h1>
                        <h2>Cita Cancelada</h2>
                    </div>
                    <div style="padding: 30px; background: #f5f5f5;">
                        <p>Estimado/a ${appointment.patientName},</p>
                        <p>Lamentamos informarle que su cita ha sido cancelada:</p>
                        <div style="background: #fee; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p><strong>Servicio:</strong> ${appointment.service}</p>
                            <p><strong>Fecha original:</strong> ${appointment.date}</p>
                            <p><strong>Hora original:</strong> ${appointment.time}</p>
                        </div>
                        <p>Por favor, contáctenos para reprogramar su cita.</p>
                    </div>
                </div>
            `
        }
    }
};

// Function to send email using EmailJS
async function sendEmail(to, templateType, data) {
    try {
        // For demo purposes, we'll simulate sending
        console.log(`Sending ${templateType} email to ${to}`);
        console.log('Email content:', emailConfig.templates[templateType].getBody(data));
        
        // In production, uncomment this and use EmailJS:
        /*
        const response = await emailjs.send(
            emailConfig.SERVICE_ID,
            emailConfig.TEMPLATE_ID,
            {
                to_email: to,
                subject: emailConfig.templates[templateType].subject,
                html_body: emailConfig.templates[templateType].getBody(data)
            },
            emailConfig.PUBLIC_KEY
        );
        */
        
        return { success: true, message: 'Email enviado correctamente' };
    } catch (error) {
        console.error('Error sending email:', error);
        return { success: false, message: error.message };
    }
}