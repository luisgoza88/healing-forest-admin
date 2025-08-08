// Enhanced Patient Synchronization Module
// Syncs patient data between Flutter app and admin panel

// Enhanced loadPatients function with more fields
async function loadPatientsEnhanced() {
  try {
    const snapshot = await db
      .collection('users')
      .where('role', '==', 'patient')
      .limit(50)
      .get();

    const tbody = document.querySelector('#patientsTable tbody');
    tbody.innerHTML = '';

    // Get all appointments for stats
    const appointmentsSnapshot = await db.collection('appointments').get();
    const appointmentsByUser = {};

    appointmentsSnapshot.forEach((doc) => {
      const apt = doc.data();
      if (!appointmentsByUser[apt.userId]) {
        appointmentsByUser[apt.userId] = [];
      }
      appointmentsByUser[apt.userId].push(apt);
    });

    if (snapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align: center;">No hay pacientes registrados</td></tr>';
    } else {
      snapshot.forEach((doc) => {
        const patient = doc.data();
        const patientId = doc.id;

        // Calculate stats
        const userAppointments = appointmentsByUser[patientId] || [];
        const totalAppointments = userAppointments.length;
        const completedAppointments = userAppointments.filter(
          (a) => a.status === 'completed'
        ).length;
        const lastAppointment = userAppointments
          .filter((a) => a.date && a.date.seconds)
          .sort((a, b) => b.date.seconds - a.date.seconds)[0];

        const birthDate = patient.birthDate
          ? new Date(patient.birthDate).toLocaleDateString()
          : 'N/A';
        const gender = patient.gender || 'N/A';
        const phone = patient.phone || 'N/A';
        const lastVisit = lastAppointment
          ? new Date(lastAppointment.date.seconds * 1000).toLocaleDateString()
          : 'Nunca';

        const row = `
                    <tr>
                        <td>${patient.name || 'N/A'}</td>
                        <td>${patient.email || 'N/A'}</td>
                        <td>${phone}</td>
                        <td>${birthDate}</td>
                        <td>${gender}</td>
                        <td>${totalAppointments} (${completedAppointments} completadas)</td>
                        <td>${lastVisit}</td>
                        <td>
                            ${phone !== 'N/A' ? `<button class="action-btn" style="background: #25d366; color: white;" onclick="sendWhatsAppToPatient('${phone}', '${patient.name || 'paciente'}')">WhatsApp</button>` : ''}
                            <button class="action-btn edit-btn" onclick="viewPatientDetails('${patientId}')">Ver Detalle</button>
                        </td>
                    </tr>
                `;
        tbody.innerHTML += row;
      });
    }
  } catch (error) {
    Logger.error('Error loading patients:', error);
  }
}

// View detailed patient information
async function viewPatientDetails(patientId) {
  try {
    // Get patient data
    const patientDoc = await db.collection('users').doc(patientId).get();
    if (!patientDoc.exists) {
      alert('Paciente no encontrado');
      return;
    }

    const patient = patientDoc.data();

    // Get patient appointments
    const appointmentsSnapshot = await db
      .collection('appointments')
      .where('userId', '==', patientId)
      .orderBy('date', 'desc')
      .get();

    let appointmentsHTML = '';
    let totalSpent = 0;

    appointmentsSnapshot.forEach((doc) => {
      const apt = doc.data();
      const date = apt.date
        ? new Date(apt.date.seconds * 1000).toLocaleDateString()
        : 'N/A';
      const time = apt.startTime || apt.time || 'N/A';
      const status = apt.status || 'pending';
      const statusColor =
        status === 'completed'
          ? 'green'
          : status === 'confirmed'
            ? 'blue'
            : 'orange';

      if (status === 'completed' && apt.price) {
        totalSpent += apt.price;
      }

      appointmentsHTML += `
                <tr>
                    <td>${date}</td>
                    <td>${time}</td>
                    <td>${apt.serviceName || 'N/A'}</td>
                    <td>${apt.staffName || apt.professionalName || 'N/A'}</td>
                    <td>$${apt.price || 0}</td>
                    <td><span style="color: ${statusColor}; font-weight: bold;">${status}</span></td>
                </tr>
            `;
    });

    // Create modal content
    const modalContent = `
            <h2>Detalle del Paciente</h2>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                <div>
                    <h3>Información Personal</h3>
                    <p><strong>Nombre:</strong> ${patient.name || 'N/A'}</p>
                    <p><strong>Email:</strong> ${patient.email || 'N/A'}</p>
                    <p><strong>Teléfono:</strong> ${patient.phone || 'N/A'}</p>
                    <p><strong>Fecha de Nacimiento:</strong> ${patient.birthDate ? new Date(patient.birthDate).toLocaleDateString() : 'N/A'}</p>
                    <p><strong>Género:</strong> ${patient.gender || 'N/A'}</p>
                    <p><strong>Dirección:</strong> ${patient.address || 'N/A'}</p>
                </div>
                
                <div>
                    <h3>Información Médica</h3>
                    <p><strong>Contacto de Emergencia:</strong> ${patient.emergencyContact || 'N/A'}</p>
                    <p><strong>Alergias:</strong> ${patient.allergies || 'Ninguna'}</p>
                    <p><strong>Condiciones Médicas:</strong> ${patient.medicalConditions || 'Ninguna'}</p>
                    <p><strong>Total Gastado:</strong> $${totalSpent.toFixed(2)}</p>
                    <p><strong>Citas Totales:</strong> ${appointmentsSnapshot.size}</p>
                </div>
            </div>
            
            <h3>Historial de Citas</h3>
            <table style="width: 100%; margin-top: 10px;">
                <thead>
                    <tr>
                        <th>Fecha</th>
                        <th>Hora</th>
                        <th>Servicio</th>
                        <th>Profesional</th>
                        <th>Precio</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    ${appointmentsHTML || '<tr><td colspan="6">No hay citas registradas</td></tr>'}
                </tbody>
            </table>
            
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                ${patient.phone ? `<button class="btn" style="background: #25d366;" onclick="sendWhatsAppToPatient('${patient.phone}', '${patient.name || 'paciente'}')">Enviar WhatsApp</button>` : ''}
                <button class="btn" onclick="scheduleAppointmentForPatient('${patientId}', '${patient.name || 'Paciente'}')">Agendar Cita</button>
                <button class="btn" style="background: #6B7280;" onclick="closeModal()">Cerrar</button>
            </div>
        `;

    showModal('Detalle del Paciente', modalContent);
  } catch (error) {
    Logger.error('Error viewing patient details:', error);
    alert('Error al cargar los detalles del paciente');
  }
}

// Send WhatsApp to patient
function sendWhatsAppToPatient(phone, name) {
  // This will use the WhatsApp queue system
  const message = `Hola ${name}! 🌳

Este es un mensaje del equipo de Healing Forest.

¿Cómo podemos ayudarte hoy?

_Para no recibir más mensajes, responde STOP_`;

  // Add to WhatsApp queue
  db.collection('whatsapp_queue')
    .add({
      to: phone,
      message: message,
      type: 'direct',
      timestamp: new Date(),
      status: 'queued',
    })
    .then(() => {
      alert('Mensaje enviado a la cola de WhatsApp');
    })
    .catch((error) => {
      alert('Error al enviar mensaje: ' + error.message);
    });
}

// Schedule appointment for specific patient
function scheduleAppointmentForPatient(patientId, patientName) {
  // Pre-fill the appointment form with patient data
  showAddAppointment();

  // Wait for modal to load then pre-select patient
  setTimeout(() => {
    const patientSelect = document.querySelector('select[id*="patient"]');
    if (patientSelect) {
      patientSelect.value = patientId;
    }
  }, 500);
}

// Override the original loadPatients function
loadPatients = loadPatientsEnhanced;

// Add real-time listeners for patient updates
function setupPatientRealtimeSync() {
  // Listen for new patients
  const unsubscribePatients = db
    .collection('users')
    .where('role', '==', 'patient')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          Logger.log('New patient registered:', change.doc.data());
          // Show notification
          showNotification(
            'Nuevo Paciente',
            `${change.doc.data().name || 'Usuario'} se ha registrado`
          );
        }

        if (change.type === 'modified') {
          Logger.log('Patient updated:', change.doc.data());
          // Reload patients table if on patients page
          if (
            document.getElementById('patients').classList.contains('active')
          ) {
            loadPatientsEnhanced();
          }
        }
      });
    });
  ListenerManager.add(unsubscribePatients);

  // Listen for appointment changes
  const unsubscribeAppointments = db
    .collection('appointments')
    .where('createdAt', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const apt = change.doc.data();
          Logger.log('New appointment created:', apt);
          showNotification(
            'Nueva Cita',
            `Cita agendada para ${apt.serviceName || 'Servicio'}`
          );

          // Reload appointments if on that page
          if (
            document.getElementById('appointments').classList.contains('active')
          ) {
            loadAppointments();
          }
        }
      });
    });
  ListenerManager.add(unsubscribeAppointments);
}

// Notification helper
function showNotification(title, message) {
  // Create notification element
  const notification = document.createElement('div');
  notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #16A34A;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        z-index: 10000;
        max-width: 300px;
        animation: slideIn 0.3s ease;
    `;

  notification.innerHTML = `
        <strong>${title}</strong>
        <p style="margin: 5px 0 0 0; font-size: 14px;">${message}</p>
    `;

  document.body.appendChild(notification);

  // Remove after 5 seconds
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 5000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize real-time sync when logged in
if (typeof currentUser !== 'undefined' && currentUser) {
  setupPatientRealtimeSync();
}

Logger.log('Patient sync module loaded - Real-time synchronization active');
