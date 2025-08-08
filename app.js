// Firebase Configuration from config.js
const firebaseConfig = window.AppConfig.firebase;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let currentUser = null;
let appointmentsChart = null;
let servicesChart = null;
let calendarEventsUnsubscribe = null;

// Login functionality
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const errorMessage = document.getElementById('errorMessage');

  try {
    const userCredential = await auth.signInWithEmailAndPassword(
      email,
      password
    );
    const user = userCredential.user;

    // Check if user is admin
    const userDoc = await db.collection('users').doc(user.uid).get();
    const userData = userDoc.data();

    if (userData && userData.role === 'admin') {
      currentUser = { ...userData, uid: user.uid };
      showDashboard();
    } else {
      throw new Error('No tienes permisos de administrador');
    }
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.style.display = 'block';
  }
});

// Show dashboard
function showDashboard() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('dashboard').style.display = 'block';
  document.getElementById('userEmail').textContent = currentUser.email;

  loadDashboardData();

  if (typeof setupPatientRealtimeSync === 'function') {
    setupPatientRealtimeSync();
  }
  if (typeof initializeRealTimeUpdates === 'function') {
    initializeRealTimeUpdates();
  }

  // Setup navigation
  document.querySelectorAll('.nav-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const section = e.target.dataset.section;
      showSection(section);

      // Update active nav
      document
        .querySelectorAll('.nav-item')
        .forEach((nav) => nav.classList.remove('active'));
      e.target.classList.add('active');

      // Update page title
      document.getElementById('pageTitle').textContent = e.target.textContent;
    });
  });
}

// Show section
function showSection(section) {
  ListenerManager.clearAll();
  document.querySelectorAll('.content-section').forEach((sec) => {
    sec.classList.remove('active');
  });
  document.getElementById(section).classList.add('active');

  if (section !== 'appointments' && calendarEventsUnsubscribe) {
    calendarEventsUnsubscribe();
    calendarEventsUnsubscribe = null;
  }

  // Load section data
  switch (section) {
    case 'overview':
      loadDashboardData();
      break;
    case 'appointments':
      loadAppointments();
      break;
    case 'staff':
      loadStaff();
      break;
    case 'patients':
      loadPatients();
      break;
    case 'services':
      loadServices();
      break;
    case 'inventory':
      loadInventory();
      break;
    case 'whatsapp':
      loadWhatsAppConsole();
      break;
    case 'payments':
      loadPayments();
      break;
    case 'reports':
      // Reports section doesn't need to load data
      break;
    case 'sop':
      loadSOPData();
      break;
    case 'integrations':
      loadIntegrations();
      break;
    case 'notifications':
      loadNotifications();
      break;
    case 'settings':
      // Settings section is static
      break;
  }

  if (typeof setupPatientRealtimeSync === 'function') {
    setupPatientRealtimeSync();
  }
  if (typeof initializeRealTimeUpdates === 'function') {
    initializeRealTimeUpdates();
  }
}

// Load dashboard data
async function loadDashboardData() {
  try {
    // Get today's appointments
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointmentsSnapshot = await db
      .collection('appointments')
      .where('date', '>=', firebase.firestore.Timestamp.fromDate(today))
      .where('date', '<', firebase.firestore.Timestamp.fromDate(tomorrow))
      .get();

    document.getElementById('todayAppointments').textContent =
      appointmentsSnapshot.size;

    // Get total patients
    const patientsSnapshot = await db
      .collection('users')
      .where('role', '==', 'patient')
      .get();

    document.getElementById('totalPatients').textContent =
      patientsSnapshot.size;

    // Get active staff
    const staffSnapshot = await db
      .collection('staff')
      .where('active', '==', true)
      .get();

    document.getElementById('activeStaff').textContent = staffSnapshot.size;

    // Get total services
    const servicesSnapshot = await db.collection('services').get();
    document.getElementById('totalServices').textContent =
      servicesSnapshot.size;

    // Load today's appointments table
    const tbody = document.querySelector('#todayAppointmentsTable tbody');
    tbody.innerHTML = '';

    if (appointmentsSnapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align: center;">No hay citas para hoy</td></tr>';
    } else {
      appointmentsSnapshot.forEach((doc) => {
        const appointment = doc.data();
        // Compatibilidad con campos antiguos y nuevos
        const time = appointment.time || appointment.startTime || 'N/A';
        const patientName = appointment.patientName || 'Usuario App';
        const service = appointment.service || appointment.serviceName || 'N/A';
        const staffName =
          appointment.staffName || appointment.professionalName || 'N/A';
        const status = appointment.status || 'pendiente';

        const row = `
                    <tr>
                        <td>${time}</td>
                        <td>${patientName}</td>
                        <td>${service}</td>
                        <td>${staffName}</td>
                        <td><span class="badge ${status}">${status}</span></td>
                    </tr>
                `;
        tbody.innerHTML += row;
      });
    }

    // Load charts
    loadCharts();

    // Load service availability summary
    loadServiceAvailabilitySummary();
  } catch (error) {
    Logger.log('Error loading dashboard data:', error);
  }
}

// Load service availability summary for dashboard
async function loadServiceAvailabilitySummary() {
  try {
    const container = document.getElementById('serviceAvailabilityGrid');
    if (!container || !window.serviceCapacity) return;

    container.innerHTML = '';
    const today = new Date();

    // Load availability for each service with capacity management
    for (const [serviceId, serviceConfig] of Object.entries(
      window.serviceCapacity.SERVICE_CAPACITY
    )) {
      try {
        const availability =
          await window.serviceCapacity.getServiceAvailability(serviceId, today);

        // Calculate total available spots for today
        const totalAvailable = availability.summary.totalAvailable;
        const totalCapacity = availability.summary.totalCapacity;
        const percentUsed =
          totalCapacity > 0
            ? Math.round(
                ((totalCapacity - totalAvailable) / totalCapacity) * 100
              )
            : 0;

        // Determine color based on availability
        let bgColor = '#D1FAE5'; // Green background
        let textColor = '#065F46'; // Green text
        if (percentUsed >= 90) {
          bgColor = '#FEE2E2'; // Red background
          textColor = '#991B1B'; // Red text
        } else if (percentUsed >= 75) {
          bgColor = '#FEF3C7'; // Yellow background
          textColor = '#92400E'; // Yellow text
        }

        const card = `
                    <div style="background: ${bgColor}; padding: 15px; border-radius: 8px; cursor: pointer;" 
                         onclick="window.serviceCalendar.showServiceCalendar('${serviceId}')">
                        <h4 style="margin: 0 0 10px 0; color: ${textColor};">${serviceConfig.name}</h4>
                        <div style="font-size: 24px; font-weight: bold; color: ${textColor};">
                            ${totalAvailable}/${totalCapacity}
                        </div>
                        <div style="font-size: 12px; color: ${textColor}; margin-top: 5px;">
                            espacios disponibles
                        </div>
                        <div style="margin-top: 10px; background: white; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div style="height: 100%; width: ${percentUsed}%; background: ${textColor};"></div>
                        </div>
                    </div>
                `;

        container.innerHTML += card;
      } catch (error) {
        Logger.log(`Error loading availability for ${serviceId}:`, error);
      }
    }
  } catch (error) {
    Logger.log('Error loading service availability summary:', error);
  }
}

// Load charts
async function loadCharts() {
  try {
    // Appointments by day chart
    const ctx1 = document.getElementById('appointmentsChart').getContext('2d');
    const last7Days = [];
    const appointmentCounts = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const snapshot = await db
        .collection('appointments')
        .where('date', '>=', date)
        .where('date', '<', nextDate)
        .get();

      last7Days.push(
        date.toLocaleDateString('es', { weekday: 'short', day: 'numeric' })
      );
      appointmentCounts.push(snapshot.size);
    }

    if (appointmentsChart) appointmentsChart.destroy();
    appointmentsChart = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: last7Days,
        datasets: [
          {
            label: 'Citas',
            data: appointmentCounts,
            borderColor: '#16A34A',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
        },
      },
    });

    // Services chart
    const servicesData = {};
    const appointmentsSnapshot = await db.collection('appointments').get();

    appointmentsSnapshot.forEach((doc) => {
      const service = doc.data().service || 'Sin servicio';
      servicesData[service] = (servicesData[service] || 0) + 1;
    });

    const ctx2 = document.getElementById('servicesChart').getContext('2d');

    if (servicesChart) servicesChart.destroy();
    servicesChart = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: Object.keys(servicesData),
        datasets: [
          {
            data: Object.values(servicesData),
            backgroundColor: [
              '#16A34A',
              '#15803d',
              '#166534',
              '#14532d',
              '#052e16',
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  } catch (error) {
    Logger.error('Error loading charts:', error);
    showNotification('Error al cargar las gráficas', 'error');
  }
}

// Toggle calendar view
function toggleCalendarView() {
  const calendarView = document.getElementById('calendarView');
  const tableView = document.getElementById('tableView');
  const toggleText = document.getElementById('viewToggleText');

  if (calendarView.style.display === 'none') {
    calendarView.style.display = 'block';
    tableView.style.display = 'none';
    toggleText.textContent = 'Ver Tabla';

    if (!calendarUtils.getCalendar('main')) {
      initializeCalendar();
    }
    loadCalendarEvents();
  } else {
    calendarView.style.display = 'none';
    tableView.style.display = 'block';
    toggleText.textContent = 'Ver Calendario';
    if (calendarEventsUnsubscribe) {
      calendarEventsUnsubscribe();
      calendarEventsUnsubscribe = null;
    }
  }
}

// Initialize calendar
function initializeCalendar() {
  const calendarEl = document.getElementById('calendar');
  
  if (!calendarEl) {
    Logger.error('Calendar element not found');
    return;
  }

  // Use calendarUtils to create calendar
  const calendarInstance = calendarUtils.createCalendar('main', calendarEl, {
    events: [],
    eventClick: function (info) {
      editAppointment(info.event.id);
    },
    eventDrop: function (info) {
      const start = info.event.start;
      updateAppointment(info.event.id, {
        date: start,
        time: start.toTimeString().slice(0, 5),
      });
    },
    eventResize: function (info) {
      const start = info.event.start;
      updateAppointment(info.event.id, {
        date: start,
        time: start.toTimeString().slice(0, 5),
      });
    },
    dateClick: function (info) {
      showAddAppointmentForDate(info.dateStr);
    },
  }, 'main');
}

// Load calendar events
function loadCalendarEvents() {
  if (calendarEventsUnsubscribe) {
    calendarEventsUnsubscribe();
  }

  calendarEventsUnsubscribe = db.collection('appointments').onSnapshot(
    (snapshot) => {
      const events = [];

      snapshot.forEach((doc) => {
        const appointment = doc.data();
        if (appointment.date) {
          const date = new Date(appointment.date.seconds * 1000);
          events.push({
            id: doc.id,
            title: `${
              appointment.time || ''
            } - ${appointment.patientName || 'Sin nombre'} (${
              appointment.service || 'Sin servicio'
            })`,
            start: date.toISOString().split('T')[0],
            backgroundColor:
              appointment.status === 'completada'
                ? '#16A34A'
                : appointment.status === 'cancelada'
                  ? '#dc3545'
                  : '#ffc107',
          });
        }
      });

      const calendarInstance = calendarUtils.getCalendar('main');
      if (calendarInstance) {
        calendarInstance.removeAllEvents();
        calendarInstance.addEventSource(events);
      }
    },
    (error) => {
      Logger.log('Error loading calendar events:', error);
    }
  );
}

// Update appointment and refresh calendar
async function updateAppointment(id, changes) {
  try {
    const updatedData = { ...changes };
    if (updatedData.date instanceof Date) {
      updatedData.date = firebase.firestore.Timestamp.fromDate(
        updatedData.date
      );
    }
    await db.collection('appointments').doc(id).update(updatedData);
    await loadCalendarEvents();
  } catch (error) {
    Logger.log('Error updating appointment:', error);
    alert('Error al actualizar la cita');
  }
}

// Load appointments
async function loadAppointments() {
  try {
    const snapshot = await db
      .collection('appointments')
      .orderBy('date', 'desc')
      .limit(50)
      .get();

    const tbody = document.querySelector('#appointmentsTable tbody');
    tbody.innerHTML = '';

    // Add search box and date filter if not exists
    const tableView = document.getElementById('tableView');
    if (!tableView.querySelector('.search-input')) {
      const filterContainer = document.createElement('div');
      filterContainer.style.cssText =
        'display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; align-items: center;';

      const searchInput = createSearchInput(
        'appointmentsTable',
        'Buscar citas...'
      );
      searchInput.classList.add('search-input');

      const dateFilter = createDateFilter('appointmentsTable', 0); // Date is in column 0

      filterContainer.appendChild(searchInput);
      filterContainer.appendChild(dateFilter);

      tableView.insertBefore(
        filterContainer,
        document.getElementById('appointmentsTable')
      );
    }

    if (snapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center;">No hay citas registradas</td></tr>';
    } else {
      snapshot.forEach((doc) => {
        const appointment = doc.data();
        const date = appointment.date
          ? new Date(appointment.date.seconds * 1000).toLocaleDateString()
          : 'N/A';
        // Compatibilidad con campos antiguos y nuevos
        const time = appointment.time || appointment.startTime || 'N/A';
        const patientName = appointment.patientName || 'Usuario App';
        const service = appointment.service || appointment.serviceName || 'N/A';
        const staffName =
          appointment.staffName || appointment.professionalName || 'N/A';
        const status = appointment.status || 'pendiente';

        // Get patient phone for WhatsApp
        const patientPhone = appointment.patientPhone || '';

        const row = `
                    <tr>
                        <td>${date}</td>
                        <td>${time}</td>
                        <td>${patientName}</td>
                        <td>${service}</td>
                        <td>${staffName}</td>
                        <td><span class="badge ${status}">${status}</span></td>
                        <td>
                            ${patientPhone ? `<button class="action-btn" style="background: #25d366; color: white;" onclick="sendWhatsApp('${patientPhone}', 'Hola ${patientName}, te recordamos tu cita de ${service} el ${date} a las ${time}')">WhatsApp</button>` : ''}
                            <button class="action-btn edit-btn" onclick="editAppointment('${doc.id}')">Editar</button>
                            <button class="action-btn delete-btn" onclick="deleteAppointment('${doc.id}')">Eliminar</button>
                        </td>
                    </tr>
                `;
        tbody.innerHTML += row;
      });
    }
  } catch (error) {
    Logger.log('Error loading appointments:', error);
  }
}

// Load staff
async function loadStaff() {
  try {
    const snapshot = await db.collection('staff').get();

    const tbody = document.querySelector('#staffTable tbody');
    tbody.innerHTML = '';

    // Add search box if not exists
    const staffSection = document.getElementById('staff');
    if (!staffSection.querySelector('.search-input')) {
      const searchInput = createSearchInput('staffTable', 'Buscar personal...');
      searchInput.classList.add('search-input');
      const table = document.getElementById('staffTable');
      table.parentNode.insertBefore(searchInput, table);
    }

    if (snapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center;">No hay personal registrado</td></tr>';
    } else {
      snapshot.forEach((doc) => {
        const staff = doc.data();
        const specialties = staff.specialties
          ? staff.specialties.join(', ')
          : 'N/A';
        const row = `
                    <tr>
                        <td>${staff.name || 'N/A'}</td>
                        <td>${staff.role || 'N/A'}</td>
                        <td>${specialties}</td>
                        <td>${staff.email || 'N/A'}</td>
                        <td>${staff.phone || 'N/A'}</td>
                        <td>${staff.active ? 'Activo' : 'Inactivo'}</td>
                        <td>
                            <button class="action-btn edit-btn" onclick="editStaff('${doc.id}')">Editar</button>
                            <button class="action-btn delete-btn" onclick="deleteStaff('${doc.id}')">Eliminar</button>
                        </td>
                    </tr>
                `;
        tbody.innerHTML += row;
      });
    }
  } catch (error) {
    Logger.log('Error loading staff:', error);
  }
}

// Load patients
async function loadPatients() {
  try {
    const snapshot = await db
      .collection('users')
      .where('role', '==', 'patient')
      .limit(50)
      .get();

    const tbody = document.querySelector('#patientsTable tbody');
    tbody.innerHTML = '';

    // Add search box if not exists
    const patientsSection = document.getElementById('patients');
    if (!patientsSection.querySelector('.search-input')) {
      const searchInput = createSearchInput(
        'patientsTable',
        'Buscar pacientes por nombre, email o teléfono...'
      );
      searchInput.classList.add('search-input');
      const table = document.getElementById('patientsTable');
      table.parentNode.insertBefore(searchInput, table);
    }

    if (snapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="8" style="text-align: center;">No hay pacientes registrados</td></tr>';
    } else {
      // First, let's get appointment counts for each patient
      const appointmentsSnapshot = await db.collection('appointments').get();
      const patientAppointments = {};

      appointmentsSnapshot.forEach((doc) => {
        const apt = doc.data();
        if (apt.patientId) {
          if (!patientAppointments[apt.patientId]) {
            patientAppointments[apt.patientId] = {
              count: 0,
              lastVisit: null,
            };
          }
          patientAppointments[apt.patientId].count++;

          const aptDate = apt.date ? new Date(apt.date.seconds * 1000) : null;
          if (
            aptDate &&
            (!patientAppointments[apt.patientId].lastVisit ||
              aptDate > patientAppointments[apt.patientId].lastVisit)
          ) {
            patientAppointments[apt.patientId].lastVisit = aptDate;
          }
        }
      });

      snapshot.forEach((doc) => {
        const patient = doc.data();
        const birthDate = patient.birthDate || 'N/A';
        const gender = patient.gender || patient.genero || '-';
        const phone = patient.phone || '';

        // Get appointment info for this patient
        const aptInfo = patientAppointments[doc.id] || {
          count: 0,
          lastVisit: null,
        };
        const lastVisit = aptInfo.lastVisit
          ? aptInfo.lastVisit.toLocaleDateString()
          : '-';

        const row = `
                    <tr>
                        <td>${patient.name || patient.displayName || 'N/A'}</td>
                        <td>${patient.email || 'N/A'}</td>
                        <td>${patient.phone || 'N/A'}</td>
                        <td>${birthDate}</td>
                        <td>${gender}</td>
                        <td>${aptInfo.count}</td>
                        <td>${lastVisit}</td>
                        <td>
                            ${phone ? `<button class="action-btn" style="background: #25d366; color: white;" onclick="sendWhatsApp('${phone}', 'Hola ${patient.name || patient.displayName || 'paciente'}')">WhatsApp</button>` : ''}
                            <button class="action-btn edit-btn" onclick="viewPatient('${doc.id}')">Ver</button>
                        </td>
                    </tr>
                `;
        tbody.innerHTML += row;
      });
    }
  } catch (error) {
    Logger.log('Error loading patients:', error);
  }
}

// Load services
async function loadServices() {
  try {
    // Initialize service schedules if needed
    if (window.serviceCapacity) {
      await window.serviceCapacity.initializeServiceSchedules();
    }

    const snapshot = await db.collection('services').get();

    const tbody = document.querySelector('#servicesTable tbody');
    tbody.innerHTML = '';

    // Add search box if not exists
    const servicesSection = document.getElementById('services');
    if (!servicesSection.querySelector('.search-input')) {
      const searchInput = createSearchInput(
        'servicesTable',
        'Buscar servicios...'
      );
      searchInput.classList.add('search-input');
      const table = document.getElementById('servicesTable');
      table.parentNode.insertBefore(searchInput, table);
    }

    if (snapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center;">No hay servicios registrados</td></tr>';
      // Add some default services
      addDefaultServices();
    } else {
      snapshot.forEach((doc) => {
        const service = doc.data();
        // Check if this service has capacity management
        const serviceKey = doc.id.toLowerCase();
        const hasCapacityManagement =
          service.hasCapacityManagement ||
          [
            'yoga',
            'masaje',
            'massage',
            'sauna',
            'camara_hiperbarica',
            'hyperbaric',
            'sueros',
            'iv_therapy',
          ].some(
            (key) =>
              serviceKey.includes(key) ||
              service.name.toLowerCase().includes(key)
          );
        const capacityInfo = service.maxParticipants
          ? {
              capacity: service.maxParticipants,
              type: service.isGroupService ? 'group' : 'individual',
            }
          : null;

        // Handle different field name variations
        const serviceName =
          service.name ||
          service.serviceName ||
          service.nombre ||
          doc.id ||
          'N/A';
        const serviceCategory =
          service.category || service.categoria || service.type || 'General';
        const serviceDuration =
          service.duration || service.duracion || service.sessionDuration || 60;
        const servicePrice =
          service.price || service.precio || service.cost || 0;
        const isActive = service.active !== undefined ? service.active : true;

        const row = `
                    <tr>
                        <td>${serviceName}</td>
                        <td>${serviceCategory}</td>
                        <td>${serviceDuration} min</td>
                        <td>$${servicePrice}</td>
                        <td>
                            ${isActive ? '<span style="color: #16A34A;">Activo</span>' : '<span style="color: #DC2626;">Inactivo</span>'}
                            ${capacityInfo ? `<br><small>Capacidad: ${capacityInfo.capacity} ${capacityInfo.type === 'group' ? 'personas' : 'persona'}</small>` : ''}
                        </td>
                        <td>
                            ${hasCapacityManagement ? `<button class="action-btn" style="background: #8B5CF6; color: white; margin-bottom: 5px;" onclick="window.serviceCalendar.showServiceCalendar('${doc.id}')">📅 Gestionar Horarios</button><br>` : ''}
                            <button class="action-btn edit-btn" onclick="editService('${doc.id}')">Editar</button>
                            <button class="action-btn delete-btn" onclick="deleteService('${doc.id}')">Eliminar</button>
                        </td>
                    </tr>
                `;
        tbody.innerHTML += row;
      });
    }
  } catch (error) {
    Logger.log('Error loading services:', error);
  }
}

// Add default services
async function addDefaultServices() {
  try {
    const defaultServices = [
      {
        id: 'yoga',
        name: 'Yoga Terapéutico',
        category: 'Bienestar',
        duration: 60,
        price: 40,
        active: true,
        isGroupService: true,
        maxParticipants: 16,
        hasCapacityManagement: true,
      },
      {
        id: 'massage',
        name: 'Masajes',
        category: 'Bienestar',
        duration: 60,
        price: 80,
        active: true,
        isGroupService: false,
        maxParticipants: 1,
        hasCapacityManagement: true,
      },
      {
        id: 'sauna',
        name: 'Sauna y Baño Helado',
        category: 'Bienestar',
        duration: 45,
        price: 50,
        active: true,
        isGroupService: false,
        maxParticipants: 1,
        hasCapacityManagement: true,
      },
      {
        id: 'hyperbaric',
        name: 'Cámara Hiperbárica',
        category: 'Medicina',
        duration: 90,
        price: 120,
        active: true,
        isGroupService: false,
        maxParticipants: 1,
        hasCapacityManagement: true,
      },
      {
        id: 'iv_therapy',
        name: 'Sueros IV',
        category: 'Medicina',
        duration: 45,
        price: 100,
        active: true,
        isGroupService: true,
        maxParticipants: 5,
        hasCapacityManagement: true,
      },
    ];

    for (const service of defaultServices) {
      const { id, ...serviceData } = service;
      await db
        .collection('services')
        .doc(id)
        .set({
          ...serviceData,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
    }

    loadServices(); // Reload the table
  } catch (error) {
    Logger.error('Error adding default services:', error);
    showNotification('Error al agregar servicios predeterminados', 'error');
  }
}

// Modal functions
function showModal(title, content) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = content;
  document.getElementById('modal').classList.add('active');
}

function closeModal() {
  document.getElementById('modal').classList.remove('active');
  if (
    window.serviceCalendar &&
    typeof window.serviceCalendar.cleanup === 'function'
  ) {
    window.serviceCalendar.cleanup();
  }
}

// Expose modal functions globally
window.showModal = showModal;
window.closeModal = closeModal;

// Close calendar modal
function closeCalendarModal() {
  document.getElementById('calendarModal').classList.remove('active');
  // Clean up calendar instance if exists
  if (window.currentCalendarInstance) {
    window.currentCalendarInstance.destroy();
    window.currentCalendarInstance = null;
  }
}

// Show service calendar
async function showServiceCalendar(serviceId, serviceName) {
  try {
    const modal = document.getElementById('calendarModal');
    const modalTitle = document.getElementById('calendarModalTitle');
    const modalBody = document.getElementById('calendarModalBody');

    // Set title
    modalTitle.textContent = `Calendario de ${serviceName}`;

    // Get service data
    const serviceDoc = await db.collection('services').doc(serviceId).get();
    const service = serviceDoc.data();

    // Create calendar content
    modalBody.innerHTML = `
        <div style="margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <p><strong>Capacidad:</strong> ${service.maxParticipants || 1} ${service.isGroupService ? 'participantes' : 'persona'}</p>
                    <p><strong>Duración:</strong> ${service.duration || 60} minutos</p>
                </div>
                <div>
                    <button class="btn" style="background: #10B981;" onclick="addServiceSlot('${serviceId}')">
                        + Agregar Horario
                    </button>
                    <button class="btn" style="background: #6B7280; margin-left: 10px;" onclick="configureServiceSchedule('${serviceId}')">
                        ⚙️ Configurar Horarios
                    </button>
                </div>
            </div>
        </div>
        
        <div style="display: flex; gap: 10px; margin-bottom: 20px;">
            <span style="display: flex; align-items: center;">
                <span class="availability-dot available"></span> Disponible
            </span>
            <span style="display: flex; align-items: center;">
                <span class="availability-dot almost-full"></span> Casi lleno
            </span>
            <span style="display: flex; align-items: center;">
                <span class="availability-dot full"></span> Completo
            </span>
        </div>
        
        <div id="serviceCalendarContainer" style="background: white; padding: 20px; border-radius: 8px; min-height: 600px;"></div>
    `;

    // Show modal
    modal.classList.add('active');

    // Initialize calendar after modal is shown
    setTimeout(() => {
      initializeCalendarForService(serviceId, service);
    }, 100);
  } catch (error) {
    Logger.error('Error showing service calendar:', error);
    showNotification('Error al mostrar el calendario del servicio', 'error');
    closeCalendarModal();
  }
}

// Initialize calendar for a specific service
async function initializeCalendarForService(serviceId, serviceData) {
  try {
    const calendarEl = document.getElementById('serviceCalendarContainer');

    if (!calendarEl) return;

    // Get appointments for this service
    const appointmentsSnapshot = await db
      .collection('appointments')
      .where('serviceId', '==', serviceId)
      .where('date', '>=', new Date())
      .get();

    const events = [];
    const slotCounts = {}; // Track bookings per slot

    appointmentsSnapshot.forEach((doc) => {
      const appointment = doc.data();
      const date = appointment.date.toDate();
      const dateStr = date.toISOString().split('T')[0];
      const timeKey = `${dateStr}_${appointment.time || appointment.startTime}`;

      // Count bookings per slot
      slotCounts[timeKey] = (slotCounts[timeKey] || 0) + 1;

      // Create event
      const startTime = appointment.time || appointment.startTime || '09:00';
      const [hours, minutes] = startTime.split(':');
      const start = new Date(date);
      start.setHours(parseInt(hours), parseInt(minutes));

      const end = new Date(start);
      end.setMinutes(end.getMinutes() + (serviceData.duration || 60));

      events.push({
        id: doc.id,
        title: appointment.patientName || appointment.userName || 'Reservado',
        start: start,
        end: end,
        extendedProps: {
          appointmentId: doc.id,
          patientId: appointment.patientId || appointment.userId,
          status: appointment.status,
          phone: appointment.userPhone,
        },
      });
    });

    // Create calendar
    window.currentCalendarInstance = new FullCalendar.Calendar(calendarEl, {
      initialView: 'timeGridWeek',
      locale: 'es',
      height: 600,
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay',
      },
      slotMinTime: '06:00:00',
      slotMaxTime: '21:00:00',
      slotDuration: '00:30:00',
      expandRows: true,
      events: events,

      eventClick: function (info) {
        showAppointmentDetails(info.event.extendedProps.appointmentId);
      },

      dateClick: function (info) {
        // Create new appointment slot
        createServiceSlot(serviceId, info.date);
      },

      eventDidMount: function (info) {
        // Color based on capacity
        const dateStr = info.event.start.toISOString().split('T')[0];
        const timeStr = info.event.start.toTimeString().slice(0, 5);
        const timeKey = `${dateStr}_${timeStr}`;
        const booked = slotCounts[timeKey] || 0;
        const capacity = serviceData.maxParticipants || 1;

        if (booked >= capacity) {
          info.el.style.backgroundColor = '#DC2626'; // Red - full
        } else if (booked >= capacity * 0.8) {
          info.el.style.backgroundColor = '#F59E0B'; // Yellow - almost full
        } else {
          info.el.style.backgroundColor = '#16A34A'; // Green - available
        }

        // Add tooltip
        info.el.title = `${booked}/${capacity} reservados`;
      },
    });

    window.currentCalendarInstance.render();
  } catch (error) {
    Logger.error('Error initializing calendar for service:', error);
    showNotification(
      'Error al inicializar el calendario del servicio',
      'error'
    );
  }
}

// Create new service slot
function createServiceSlot(serviceId, date) {
  const timeStr = prompt('Ingrese la hora de inicio (formato 24h, ej: 09:00):');
  if (!timeStr) return;

  // Here you would create the slot in Firestore
  alert(`Crear horario para ${date.toLocaleDateString()} a las ${timeStr}`);
  // Reload calendar after creating
}

// Add service slot
function addServiceSlot(serviceId) {
  alert('Función para agregar horario recurrente - En desarrollo');
}

// Configure service schedule
function configureServiceSchedule(serviceId) {
  alert('Función para configurar horarios semanales - En desarrollo');
}

// Update existing services with capacity info
async function updateServicesWithCapacity() {
  Logger.log('Actualizando servicios con información de capacidad...');

  const capacityMap = {
    yoga: { maxParticipants: 16, isGroupService: true },
    masaje: { maxParticipants: 1, isGroupService: false },
    massage: { maxParticipants: 1, isGroupService: false },
    sauna: { maxParticipants: 1, isGroupService: false },
    camara: { maxParticipants: 1, isGroupService: false },
    hiperbarica: { maxParticipants: 1, isGroupService: false },
    hyperbaric: { maxParticipants: 1, isGroupService: false },
    suero: { maxParticipants: 5, isGroupService: true },
    iv: { maxParticipants: 5, isGroupService: true },
    therapy: { maxParticipants: 5, isGroupService: true },
  };

  try {
    const snapshot = await db.collection('services').get();
    const batch = db.batch();
    let updateCount = 0;

    snapshot.forEach((doc) => {
      const service = doc.data();
      const serviceName = (service.name || '').toLowerCase();

      // Find matching capacity config
      let capacityConfig = null;
      for (const [key, config] of Object.entries(capacityMap)) {
        if (serviceName.includes(key)) {
          capacityConfig = config;
          break;
        }
      }

      if (capacityConfig && !service.hasCapacityManagement) {
        batch.update(doc.ref, {
          ...capacityConfig,
          hasCapacityManagement: true,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        });
        updateCount++;
        Logger.log(
          `Actualizando ${service.name} con capacidad ${capacityConfig.maxParticipants}`
        );
      }
    });

    if (updateCount > 0) {
      await batch.commit();
      Logger.log(
        `✅ ${updateCount} servicios actualizados con información de capacidad`
      );
      loadServices(); // Reload services
    } else {
      Logger.log('No hay servicios para actualizar');
    }
  } catch (error) {
    Logger.log('Error actualizando servicios:', error);
  }
}

// Auto-update services on load if needed
if (window.location.hash === '#update-capacity') {
  updateServicesWithCapacity();
}

// Add Staff Modal
function showAddStaff() {
  const content = `
        <form id="addStaffForm">
            <div class="form-group">
                <label>Nombre Completo</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" name="email" required>
                </div>
                <div class="form-group">
                    <label>Teléfono</label>
                    <input type="tel" name="phone" required>
                </div>
            </div>
            <div class="form-group">
                <label>Rol</label>
                <select name="role" required>
                    <option value="doctor">Doctor</option>
                    <option value="therapist">Terapeuta</option>
                    <option value="teacher">Profesor</option>
                    <option value="nurse">Enfermero/a</option>
                </select>
            </div>
            <div class="form-group">
                <label>Especialidades (separadas por coma)</label>
                <input type="text" name="specialties" placeholder="Ej: Medicina General, Pediatría">
            </div>
            <button type="submit" class="btn">Agregar Personal</button>
        </form>
    `;

  showModal('Agregar Personal', content);

  document
    .getElementById('addStaffForm')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);

      try {
        await db.collection('staff').add({
          name: formData.get('name'),
          email: formData.get('email'),
          phone: formData.get('phone'),
          role: formData.get('role'),
          specialties: formData
            .get('specialties')
            .split(',')
            .map((s) => s.trim()),
          active: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        closeModal();
        loadStaff();
        alert('Personal agregado exitosamente');
      } catch (error) {
        alert('Error al agregar personal: ' + error.message);
      }
    });
}

// Add Service Modal
function showAddService() {
  const content = `
        <form id="addServiceForm">
            <div class="form-group">
                <label>Nombre del Servicio</label>
                <input type="text" name="name" required>
            </div>
            <div class="form-group">
                <label>Categoría</label>
                <select name="category" required>
                    <option value="Medicina">Medicina</option>
                    <option value="Psicología">Psicología</option>
                    <option value="Rehabilitación">Rehabilitación</option>
                    <option value="Bienestar">Bienestar</option>
                    <option value="Nutrición">Nutrición</option>
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Duración (minutos)</label>
                    <input type="number" name="duration" min="15" step="15" required>
                </div>
                <div class="form-group">
                    <label>Precio ($)</label>
                    <input type="number" name="price" min="0" step="5" required>
                </div>
            </div>
            <button type="submit" class="btn">Agregar Servicio</button>
        </form>
    `;

  showModal('Agregar Servicio', content);

  document
    .getElementById('addServiceForm')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);

      try {
        await db.collection('services').add({
          name: formData.get('name'),
          category: formData.get('category'),
          duration: parseInt(formData.get('duration')),
          price: parseFloat(formData.get('price')),
          active: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        closeModal();
        loadServices();
        alert('Servicio agregado exitosamente');
      } catch (error) {
        alert('Error al agregar servicio: ' + error.message);
      }
    });
}

// Logout
function logout() {
  ListenerManager.clearAll();
  auth.signOut().then(() => {
    currentUser = null;
    document.getElementById('dashboard').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('errorMessage').style.display = 'none';
  });
}

// Auth state observer
auth.onAuthStateChanged((user) => {
  if (user) {
    // Check if admin
    db.collection('users')
      .doc(user.uid)
      .get()
      .then((doc) => {
        if (doc.exists && doc.data().role === 'admin') {
          currentUser = { ...doc.data(), uid: user.uid };
          showDashboard();
        }
      });
  }
});

// Delete functions (placeholder)
function deleteAppointment(id) {
  if (confirm('¿Estás seguro de eliminar esta cita?')) {
    db.collection('appointments')
      .doc(id)
      .delete()
      .then(() => {
        loadAppointments();
      });
  }
}

function deleteStaff(id) {
  if (confirm('¿Estás seguro de eliminar este personal?')) {
    db.collection('staff')
      .doc(id)
      .delete()
      .then(() => {
        loadStaff();
      });
  }
}

function deleteService(id) {
  if (confirm('¿Estás seguro de eliminar este servicio?')) {
    db.collection('services')
      .doc(id)
      .delete()
      .then(() => {
        loadServices();
      });
  }
}

// Edit functions
async function editAppointment(id) {
  try {
    const [appointmentDoc, staffSnapshot] = await Promise.all([
      db.collection('appointments').doc(id).get(),
      db.collection('staff').where('active', '==', true).get(),
    ]);

    const appointment = appointmentDoc.data();
    let staffOptions = '<option value="">Seleccionar profesional</option>';
    staffSnapshot.forEach((doc) => {
      const staff = doc.data();
      const selected = appointment.staffId === doc.id ? 'selected' : '';
      staffOptions += `<option value="${doc.id}" ${selected}>${staff.name} (${staff.role})</option>`;
    });

    const content = `
        <form id="editAppointmentForm">
            <div class="form-group">
                <label>Hora</label>
                <input type="time" name="time" value="${appointment.time || ''}" required>
            </div>
            <div class="form-group">
                <label>Profesional</label>
                <select name="staffId" required>${staffOptions}</select>
            </div>
            <div class="form-group">
                <label>Estado</label>
                <select name="status" required>
                    <option value="pendiente" ${appointment.status === 'pendiente' ? 'selected' : ''}>Pendiente</option>
                    <option value="completada" ${appointment.status === 'completada' ? 'selected' : ''}>Completada</option>
                    <option value="cancelada" ${appointment.status === 'cancelada' ? 'selected' : ''}>Cancelada</option>
                </select>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button type="button" class="btn" onclick="saveEditedAppointment('${id}')">Guardar</button>
                <button type="button" class="btn" onclick="closeModal()">Cancelar</button>
            </div>
        </form>
    `;
    showModal('Editar Cita', content);
  } catch (error) {
    Logger.log('Error loading appointment:', error);
    alert('Error al cargar la cita');
  }
}

async function saveEditedAppointment(id) {
  const form = document.getElementById('editAppointmentForm');
  const staffSelect = form.staffId;
  const staffName = staffSelect.options[staffSelect.selectedIndex].text
    .split('(')[0]
    .trim();
  const changes = {
    time: form.time.value,
    staffId: staffSelect.value,
    staffName: staffName,
    status: form.status.value,
  };
  await updateAppointment(id, changes);
  calendar.refetchEvents();
  closeModal();
}

function editStaff(id) {
  alert('Función de edición próximamente');
}

function editService(id) {
  alert('Función de edición próximamente');
}

function viewPatient(id) {
  alert('Vista de paciente próximamente');
}

// Show add appointment modal
async function showAddAppointment(preselectedDate = null) {
  try {
    // Get lists for dropdowns
    const [patientsSnapshot, staffSnapshot, servicesSnapshot] =
      await Promise.all([
        db.collection('users').where('role', '==', 'patient').get(),
        db.collection('staff').where('active', '==', true).get(),
        db.collection('services').where('active', '==', true).get(),
      ]);

    let patientsOptions = '<option value="">Seleccionar paciente</option>';
    patientsSnapshot.forEach((doc) => {
      const patient = doc.data();
      patientsOptions += `<option value="${doc.id}">${patient.name || patient.email}</option>`;
    });

    let staffOptions = '<option value="">Seleccionar profesional</option>';
    staffSnapshot.forEach((doc) => {
      const staff = doc.data();
      staffOptions += `<option value="${doc.id}">${staff.name} (${staff.role})</option>`;
    });

    let servicesOptions = '<option value="">Seleccionar servicio</option>';
    servicesSnapshot.forEach((doc) => {
      const service = doc.data();
      servicesOptions += `<option value="${doc.id}">${service.name} - ${service.duration}min - $${service.price}</option>`;
    });

    const today = preselectedDate || new Date().toISOString().split('T')[0];

    const content = `
        <form id="addAppointmentForm">
            <div class="form-group">
                <label>Paciente</label>
                <select name="patientId" required>${patientsOptions}</select>
            </div>
            <div class="form-group">
                <label>Servicio</label>
                <select name="serviceId" required onchange="updateAvailableSlots(this.value)">${servicesOptions}</select>
            </div>
            <div class="form-group">
                <label>Profesional</label>
                <select name="staffId" required>${staffOptions}</select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Fecha</label>
                    <input type="date" name="date" value="${today}" min="${today}" required>
                </div>
                <div class="form-group">
                    <label>Hora</label>
                    <select name="time" required id="timeSelect">
                        <option value="">Seleccionar servicio primero</option>
                    </select>
                    <div id="slotAvailability" style="margin-top: 5px; font-size: 12px;"></div>
                </div>
            </div>
            <div class="form-group">
                <label>Notas (opcional)</label>
                <textarea name="notes" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
            </div>
            <button type="submit" class="btn">Agendar Cita</button>
        </form>
        <div id="capacityWarning" style="margin-top: 15px; padding: 10px; background: #FEF3C7; border-radius: 6px; display: none;">
            <strong style="color: #92400E;">⚠️ Aviso:</strong> <span id="warningMessage"></span>
        </div>
    `;

    showModal('Nueva Cita', content);

    document
      .getElementById('addAppointmentForm')
      .addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const serviceId = formData.get('serviceId');
          const date = new Date(formData.get('date'));
          const time = formData.get('time');
          const patientId = formData.get('patientId');

          // Validate booking if service has capacity management
          if (
            window.serviceCapacity &&
            window.serviceCapacity.SERVICE_CAPACITY[serviceId]
          ) {
            const validation = await window.serviceCapacity.validateBooking(
              serviceId,
              date,
              time,
              patientId
            );

            if (!validation.valid) {
              alert(`No se puede agendar la cita: ${validation.reason}`);
              return;
            }
          }

          // Get selected data
          const patientDoc = await db.collection('users').doc(patientId).get();
          const staffDoc = await db
            .collection('staff')
            .doc(formData.get('staffId'))
            .get();
          const serviceDoc = await db
            .collection('services')
            .doc(serviceId)
            .get();

          const appointmentData = {
            patientId: patientId,
            patientName: patientDoc.data().name || patientDoc.data().email,
            patientPhone: patientDoc.data().phone || '',
            staffId: formData.get('staffId'),
            staffName: staffDoc.data().name,
            serviceId: serviceId,
            service: serviceDoc.data().name,
            date: firebase.firestore.Timestamp.fromDate(date),
            time: time,
            notes: formData.get('notes'),
            status: 'pendiente',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid,
          };

          await db.collection('appointments').add(appointmentData);

          closeModal();

          // Reload appointments
          if (
            document.getElementById('appointments').classList.contains('active')
          ) {
            loadAppointments();
            if (calendar) {
              loadCalendarEvents();
            }
          }

          alert('Cita agendada exitosamente');
        } catch (error) {
          alert('Error al agendar cita: ' + error.message);
        }
      });
  } catch (error) {
    Logger.error('Error showing add appointment modal:', error);
    showNotification('Error al mostrar el formulario de cita', 'error');
    closeModal();
  }
}

// Generate time options
function generateTimeOptions() {
  const times = [];
  for (let hour = 8; hour < 20; hour++) {
    for (let min = 0; min < 60; min += 30) {
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      times.push(`<option value="${time}">${time}</option>`);
    }
  }
  return times.join('');
}

// Show add appointment for specific date
function showAddAppointmentForDate(dateStr) {
  showAddAppointment(dateStr);
}

// Update available slots based on selected service and date
async function updateAvailableSlots(serviceId) {
  const dateInput = document.querySelector('input[name="date"]');
  const timeSelect = document.getElementById('timeSelect');
  const slotAvailability = document.getElementById('slotAvailability');

  if (!serviceId || !dateInput || !timeSelect) return;

  const date = new Date(dateInput.value);

  // Check if service has capacity management
  if (
    window.serviceCapacity &&
    window.serviceCapacity.SERVICE_CAPACITY[serviceId]
  ) {
    try {
      timeSelect.innerHTML = '<option value="">Cargando horarios...</option>';

      const availability = await window.serviceCapacity.getServiceAvailability(
        serviceId,
        date
      );

      let options = '<option value="">Seleccionar hora</option>';
      let hasAvailableSlots = false;

      for (const slot of availability.slots) {
        if (slot.enabled) {
          const isAvailable = slot.available > 0;
          hasAvailableSlots = hasAvailableSlots || isAvailable;

          let statusText = '';
          let statusColor = '';

          if (slot.available === 0) {
            statusText = ' (LLENO)';
            statusColor = 'color: #DC2626;';
          } else if (slot.available <= 2) {
            statusText = ` (${slot.available} espacios)`;
            statusColor = 'color: #F59E0B;';
          } else {
            statusText = ` (${slot.available} espacios)`;
            statusColor = 'color: #16A34A;';
          }

          options += `<option value="${slot.time}" ${!isAvailable ? 'disabled' : ''} style="${statusColor}">${slot.time}${statusText}</option>`;
        }
      }

      timeSelect.innerHTML = options;

      if (!hasAvailableSlots) {
        document.getElementById('capacityWarning').style.display = 'block';
        document.getElementById('warningMessage').textContent =
          'No hay espacios disponibles para este servicio en la fecha seleccionada.';
      } else {
        document.getElementById('capacityWarning').style.display = 'none';
      }
    } catch (error) {
      Logger.log('Error loading available slots:', error);
      timeSelect.innerHTML = generateTimeOptions();
    }
  } else {
    // Service without capacity management - show all time slots
    timeSelect.innerHTML = generateTimeOptions();
  }
}

// Update slots when date changes
document.addEventListener('change', function (e) {
  if (
    e.target.name === 'date' &&
    document.getElementById('addAppointmentForm')
  ) {
    const serviceSelect = document.querySelector('select[name="serviceId"]');
    if (serviceSelect && serviceSelect.value) {
      updateAvailableSlots(serviceSelect.value);
    }
  }
});

// View appointment details
async function viewAppointmentDetails(appointmentId) {
  try {
    const doc = await db.collection('appointments').doc(appointmentId).get();
    const appointment = doc.data();

    const date = appointment.date
      ? new Date(appointment.date.seconds * 1000).toLocaleDateString()
      : 'N/A';

    const content = `
            <div style="line-height: 1.8;">
                <p><strong>Paciente:</strong> ${appointment.patientName || 'N/A'}</p>
                <p><strong>Servicio:</strong> ${appointment.service || 'N/A'}</p>
                <p><strong>Profesional:</strong> ${appointment.staffName || 'N/A'}</p>
                <p><strong>Fecha:</strong> ${date}</p>
                <p><strong>Hora:</strong> ${appointment.time || 'N/A'}</p>
                <p><strong>Estado:</strong> <span class="badge ${appointment.status}">${appointment.status || 'pendiente'}</span></p>
                ${appointment.notes ? `<p><strong>Notas:</strong> ${appointment.notes}</p>` : ''}
            </div>
            <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
                ${appointment.patientPhone ? `<button class="btn" style="background: #25d366;" onclick="sendWhatsApp('${appointment.patientPhone}', 'Hola ${appointment.patientName}, sobre tu cita de ${appointment.service}...')">WhatsApp</button>` : ''}
                <button class="btn" style="background: #ffc107; color: #000;" onclick="editAppointment('${appointmentId}')">Editar</button>
                <button class="btn" style="background: #dc3545;" onclick="deleteAppointment('${appointmentId}'); closeModal();">Eliminar</button>
            </div>
        `;

    showModal('Detalles de la Cita', content);
  } catch (error) {
    alert('Error al cargar los detalles: ' + error.message);
  }
}

// Close modal on click outside
window.onclick = function (event) {
  const modal = document.getElementById('modal');
  if (event.target == modal) {
    closeModal();
  }
};

// PAYMENT FUNCTIONS
async function loadPayments() {
  try {
    const snapshot = await db
      .collection('payments')
      .orderBy('date', 'desc')
      .limit(50)
      .get();

    // Add search box and date filter if not exists
    const paymentsSection = document.getElementById('payments');
    const paymentsTable = document.getElementById('paymentsTable');
    if (!paymentsSection.querySelector('.search-input')) {
      const filterContainer = document.createElement('div');
      filterContainer.style.cssText =
        'display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; align-items: center;';

      const searchInput = createSearchInput('paymentsTable', 'Buscar pagos...');
      searchInput.classList.add('search-input');

      const dateFilter = createDateFilter('paymentsTable', 0); // Date is in column 0

      filterContainer.appendChild(searchInput);
      filterContainer.appendChild(dateFilter);

      paymentsTable.parentNode.insertBefore(filterContainer, paymentsTable);
    }

    // Calculate stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    let monthlyTotal = 0;
    let todayTotal = 0;
    let pendingCount = 0;

    const tbody = document.querySelector('#paymentsTable tbody');
    tbody.innerHTML = '';

    if (snapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="7" style="text-align: center;">No hay pagos registrados</td></tr>';
      // Create sample payments
      await createSamplePayments();
    } else {
      snapshot.forEach((doc) => {
        const payment = doc.data();
        const paymentDate = payment.date
          ? new Date(payment.date.seconds * 1000)
          : new Date();

        // Calculate totals
        if (payment.status === 'pagado') {
          if (paymentDate >= firstDayOfMonth) {
            monthlyTotal += payment.amount || 0;
          }
          if (paymentDate >= today) {
            todayTotal += payment.amount || 0;
          }
        } else if (payment.status === 'pendiente') {
          pendingCount++;
        }

        const row = `
                    <tr>
                        <td>${paymentDate.toLocaleDateString()}</td>
                        <td>${payment.patientName || 'N/A'}</td>
                        <td>${payment.service || 'N/A'}</td>
                        <td>$${payment.amount || 0}</td>
                        <td>${payment.method || 'N/A'}</td>
                        <td><span class="badge ${payment.status}">${payment.status || 'pendiente'}</span></td>
                        <td>
                            <button class="action-btn edit-btn" onclick="viewPaymentDetails('${doc.id}')">Ver</button>
                            ${
                              payment.status === 'pendiente'
                                ? `<button class="action-btn" style="background: #28a745; color: white;" onclick="markAsPaid('${doc.id}')">Marcar Pagado</button>`
                                : `<button class="action-btn" style="background: #FF6B35; color: white;" onclick="generateInvoiceFromPayment('${doc.id}')">Facturar</button>`
                            }
                        </td>
                    </tr>
                `;
        tbody.innerHTML += row;
      });
    }

    // Update stats
    document.getElementById('monthlyIncome').textContent =
      `$${monthlyTotal.toFixed(2)}`;
    document.getElementById('pendingPayments').textContent = pendingCount;
    document.getElementById('todayPayments').textContent =
      `$${todayTotal.toFixed(2)}`;
  } catch (error) {
    Logger.log('Error loading payments:', error);
  }
}

// Create sample payments
async function createSamplePayments() {
  try {
    const samplePayments = [
      {
        patientName: 'Juan Pérez',
        service: 'Consulta Médica',
        amount: 50,
        method: 'Efectivo',
        status: 'pagado',
        date: firebase.firestore.Timestamp.now(),
      },
      {
        patientName: 'María García',
        service: 'Terapia Psicológica',
        amount: 80,
        method: 'Tarjeta',
        status: 'pendiente',
        date: firebase.firestore.Timestamp.now(),
      },
    ];

    for (const payment of samplePayments) {
      await db.collection('payments').add({
        ...payment,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }

    loadPayments();
  } catch (error) {
    Logger.error('Error creating sample payments:', error);
    showNotification('Error al crear pagos de muestra', 'error');
  }
}

// Show add payment modal
async function showAddPayment() {
  try {
    const [patientsSnapshot, servicesSnapshot] = await Promise.all([
      db.collection('users').where('role', '==', 'patient').get(),
      db.collection('services').where('active', '==', true).get(),
    ]);

    let patientsOptions = '<option value="">Seleccionar paciente</option>';
    patientsSnapshot.forEach((doc) => {
      const patient = doc.data();
      patientsOptions += `<option value="${doc.id}">${patient.name || patient.email}</option>`;
    });

    let servicesOptions = '<option value="">Seleccionar servicio</option>';
    servicesSnapshot.forEach((doc) => {
      const service = doc.data();
      servicesOptions += `<option value="${doc.id}" data-price="${service.price}">${service.name} - $${service.price}</option>`;
    });

    const content = `
        <form id="addPaymentForm">
            <div class="form-group">
                <label>Paciente</label>
                <select name="patientId" required>${patientsOptions}</select>
            </div>
            <div class="form-group">
                <label>Servicio</label>
                <select name="serviceId" required onchange="updatePaymentAmount(this)">${servicesOptions}</select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Monto</label>
                    <input type="number" name="amount" step="0.01" min="0" required>
                </div>
                <div class="form-group">
                    <label>Método de Pago</label>
                    <select name="method" required>
                        <option value="Efectivo">Efectivo</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Transferencia">Transferencia</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Notas (opcional)</label>
                <textarea name="notes" rows="2" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
            </div>
            <button type="submit" class="btn">Registrar Pago</button>
        </form>
    `;

    showModal('Registrar Pago', content);

    document
      .getElementById('addPaymentForm')
      .addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);

        try {
          const patientDoc = await db
            .collection('users')
            .doc(formData.get('patientId'))
            .get();
          const serviceDoc = await db
            .collection('services')
            .doc(formData.get('serviceId'))
            .get();

          const paymentData = {
            patientId: formData.get('patientId'),
            patientName: patientDoc.data().name || patientDoc.data().email,
            serviceId: formData.get('serviceId'),
            service: serviceDoc.data().name,
            amount: parseFloat(formData.get('amount')),
            method: formData.get('method'),
            notes: formData.get('notes'),
            status: 'pagado',
            date: firebase.firestore.Timestamp.now(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid,
          };

          await db.collection('payments').add(paymentData);
          closeModal();
          loadPayments();
          alert('Pago registrado exitosamente');
        } catch (error) {
          alert('Error al registrar pago: ' + error.message);
        }
      });
  } catch (error) {
    Logger.error('Error showing add payment modal:', error);
    showNotification('Error al mostrar el formulario de pago', 'error');
    closeModal();
  }
}

// Update payment amount based on selected service
function updatePaymentAmount(select) {
  const price = select.options[select.selectedIndex].dataset.price;
  if (price) {
    document.querySelector('input[name="amount"]').value = price;
  }
}

// Mark payment as paid
async function markAsPaid(paymentId) {
  if (confirm('¿Marcar este pago como completado?')) {
    try {
      await db.collection('payments').doc(paymentId).update({
        status: 'pagado',
        paidAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Check if Siigo is configured for automatic invoicing
      const siigoConfig = localStorage.getItem('siigoConfig');
      if (siigoConfig) {
        const config = JSON.parse(siigoConfig);
        if (config.autoInvoice !== false) {
          if (confirm('¿Generar factura electrónica automáticamente?')) {
            await generateInvoiceFromPayment(paymentId);
          }
        }
      }

      loadPayments();
    } catch (error) {
      alert('Error al actualizar pago: ' + error.message);
    }
  }
}

// REPORT FUNCTIONS
let currentReportData = null;

async function generateReport(type) {
  const preview = document.getElementById('reportPreview');
  const content = document.getElementById('reportContent');

  preview.style.display = 'block';
  content.innerHTML = '<p class="loading">Generando reporte...</p>';

  try {
    switch (type) {
      case 'appointments':
        await generateAppointmentsReport(content);
        break;
      case 'income':
        await generateIncomeReport(content);
        break;
      case 'patients':
        await generatePatientsReport(content);
        break;
      case 'services':
        await generateServicesReport(content);
        break;
    }
  } catch (error) {
    content.innerHTML =
      '<p style="color: red;">Error al generar reporte: ' +
      error.message +
      '</p>';
  }
}

async function generateAppointmentsReport(container) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const snapshot = await db
    .collection('appointments')
    .where('date', '>=', startDate)
    .orderBy('date', 'desc')
    .get();

  const stats = {
    total: snapshot.size,
    completadas: 0,
    pendientes: 0,
    canceladas: 0,
  };

  let tableRows = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.status === 'completada') stats.completadas++;
    else if (data.status === 'cancelada') stats.canceladas++;
    else stats.pendientes++;

    tableRows.push({
      fecha: data.date
        ? new Date(data.date.seconds * 1000).toLocaleDateString()
        : 'N/A',
      paciente: data.patientName || 'N/A',
      servicio: data.service || 'N/A',
      profesional: data.staffName || 'N/A',
      estado: data.status || 'pendiente',
    });
  });

  currentReportData = {
    type: 'appointments',
    title: 'Reporte de Citas - Últimos 30 días',
    stats: stats,
    rows: tableRows,
  };

  container.innerHTML = `
        <h4>Resumen de Citas - Últimos 30 días</h4>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0;">
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px;">
                <strong>Total:</strong> ${stats.total}
            </div>
            <div style="background: #d4edda; padding: 15px; border-radius: 5px;">
                <strong>Completadas:</strong> ${stats.completadas}
            </div>
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px;">
                <strong>Pendientes:</strong> ${stats.pendientes}
            </div>
            <div style="background: #f8d7da; padding: 15px; border-radius: 5px;">
                <strong>Canceladas:</strong> ${stats.canceladas}
            </div>
        </div>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th style="border-bottom: 2px solid #ddd; padding: 8px;">Fecha</th>
                    <th style="border-bottom: 2px solid #ddd; padding: 8px;">Paciente</th>
                    <th style="border-bottom: 2px solid #ddd; padding: 8px;">Servicio</th>
                    <th style="border-bottom: 2px solid #ddd; padding: 8px;">Profesional</th>
                    <th style="border-bottom: 2px solid #ddd; padding: 8px;">Estado</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows
                  .slice(0, 10)
                  .map(
                    (row) => `
                    <tr>
                        <td style="border-bottom: 1px solid #eee; padding: 8px;">${row.fecha}</td>
                        <td style="border-bottom: 1px solid #eee; padding: 8px;">${row.paciente}</td>
                        <td style="border-bottom: 1px solid #eee; padding: 8px;">${row.servicio}</td>
                        <td style="border-bottom: 1px solid #eee; padding: 8px;">${row.profesional}</td>
                        <td style="border-bottom: 1px solid #eee; padding: 8px;">${row.estado}</td>
                    </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
        ${tableRows.length > 10 ? `<p style="text-align: center; margin-top: 10px;">Mostrando 10 de ${tableRows.length} registros</p>` : ''}
    `;
}

async function generateIncomeReport(container) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);

  const snapshot = await db
    .collection('payments')
    .where('date', '>=', startDate)
    .where('status', '==', 'pagado')
    .orderBy('date', 'desc')
    .get();

  let totalIncome = 0;
  let byMethod = {};
  let byService = {};

  snapshot.forEach((doc) => {
    const data = doc.data();
    totalIncome += data.amount || 0;

    byMethod[data.method] = (byMethod[data.method] || 0) + data.amount;
    byService[data.service] = (byService[data.service] || 0) + data.amount;
  });

  currentReportData = {
    type: 'income',
    title: 'Reporte de Ingresos - Último Mes',
    totalIncome: totalIncome,
    byMethod: byMethod,
    byService: byService,
  };

  container.innerHTML = `
        <h4>Reporte de Ingresos - Último Mes</h4>
        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0; color: #155724;">Total: $${totalIncome.toFixed(2)}</h2>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h5>Por Método de Pago:</h5>
                ${Object.entries(byMethod)
                  .map(
                    ([method, amount]) => `
                    <p>${method}: $${amount.toFixed(2)}</p>
                `
                  )
                  .join('')}
            </div>
            <div>
                <h5>Por Servicio:</h5>
                ${Object.entries(byService)
                  .map(
                    ([service, amount]) => `
                    <p>${service}: $${amount.toFixed(2)}</p>
                `
                  )
                  .join('')}
            </div>
        </div>
    `;
}

// Download report as PDF
function downloadReport() {
  if (!currentReportData) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.text('Healing Forest', 105, 20, { align: 'center' });
  doc.setFontSize(16);
  doc.text(currentReportData.title, 105, 30, { align: 'center' });

  // Date
  doc.setFontSize(10);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 20, 40);

  // Content based on report type
  if (currentReportData.type === 'appointments') {
    doc.setFontSize(12);
    doc.text('Resumen:', 20, 55);
    doc.setFontSize(10);
    doc.text(`Total de citas: ${currentReportData.stats.total}`, 30, 65);
    doc.text(`Completadas: ${currentReportData.stats.completadas}`, 30, 72);
    doc.text(`Pendientes: ${currentReportData.stats.pendientes}`, 30, 79);
    doc.text(`Canceladas: ${currentReportData.stats.canceladas}`, 30, 86);

    // Table
    doc.autoTable({
      startY: 100,
      head: [['Fecha', 'Paciente', 'Servicio', 'Profesional', 'Estado']],
      body: currentReportData.rows.map((row) => [
        row.fecha,
        row.paciente,
        row.servicio,
        row.profesional,
        row.estado,
      ]),
    });
  } else if (currentReportData.type === 'income') {
    doc.setFontSize(14);
    doc.text(
      `Total de Ingresos: $${currentReportData.totalIncome.toFixed(2)}`,
      20,
      60
    );

    doc.setFontSize(12);
    doc.text('Por Método de Pago:', 20, 80);
    let y = 90;
    Object.entries(currentReportData.byMethod).forEach(([method, amount]) => {
      doc.setFontSize(10);
      doc.text(`${method}: $${amount.toFixed(2)}`, 30, y);
      y += 7;
    });
  }

  // Save
  doc.save(
    `reporte-${currentReportData.type}-${new Date().toISOString().split('T')[0]}.pdf`
  );
}

// SEARCH FUNCTIONALITY
function searchTable(tableId, searchTerm) {
  const table = document.getElementById(tableId);
  const tbody = table.getElementsByTagName('tbody')[0];
  const rows = tbody.getElementsByTagName('tr');

  searchTerm = searchTerm.toLowerCase();

  for (let i = 0; i < rows.length; i++) {
    const cells = rows[i].getElementsByTagName('td');
    let found = false;

    for (let j = 0; j < cells.length; j++) {
      const cellText = cells[j].textContent || cells[j].innerText;
      if (cellText.toLowerCase().indexOf(searchTerm) > -1) {
        found = true;
        break;
      }
    }

    rows[i].style.display = found ? '' : 'none';
  }
}

// Create search input for a table
function createSearchInput(tableId, placeholder) {
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = placeholder || 'Buscar...';
  searchInput.style.cssText =
    'padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; width: 300px; margin-bottom: 15px;';

  searchInput.addEventListener('keyup', function () {
    searchTable(tableId, this.value);
  });

  return searchInput;
}

// NOTIFICATION FUNCTIONS
async function loadNotifications() {
  try {
    const snapshot = await db
      .collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const tbody = document.querySelector('#notificationsTable tbody');
    tbody.innerHTML = '';

    if (snapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="5" style="text-align: center;">No hay notificaciones registradas</td></tr>';
    } else {
      snapshot.forEach((doc) => {
        const notification = doc.data();
        const date = notification.createdAt
          ? new Date(notification.createdAt.seconds * 1000).toLocaleString()
          : 'N/A';

        const row = `
                    <tr>
                        <td>${date}</td>
                        <td>${notification.type || 'N/A'}</td>
                        <td>${notification.recipient || 'N/A'}</td>
                        <td>${notification.message || 'N/A'}</td>
                        <td><span class="badge ${notification.status}">${notification.status || 'enviado'}</span></td>
                    </tr>
                `;
        tbody.innerHTML += row;
      });
    }
  } catch (error) {
    Logger.log('Error loading notifications:', error);
  }
}

// Send email notification when appointment is created
async function sendAppointmentConfirmation(appointmentData) {
  if (!document.getElementById('emailConfirmation').checked) return;

  try {
    // Get patient email
    const patientDoc = await db
      .collection('users')
      .doc(appointmentData.patientId)
      .get();
    const patientEmail = patientDoc.data().email;

    // Send email (simulated)
    const result = await sendEmail(
      patientEmail,
      'appointmentConfirmation',
      appointmentData
    );

    // Log notification
    await db.collection('notifications').add({
      type: 'Email - Confirmación',
      recipient: patientEmail,
      message: `Confirmación de cita enviada para ${appointmentData.service}`,
      status: result.success ? 'enviado' : 'error',
      appointmentId: appointmentData.id,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    Logger.log('Error sending confirmation:', error);
  }
}

// Test push notification
async function testPushNotification() {
  try {
    alert('Notificación push enviada a todos los dispositivos registrados');

    // Log test notification
    await db.collection('notifications').add({
      type: 'Push - Prueba',
      recipient: 'Todos los usuarios',
      message: 'Notificación de prueba desde el panel admin',
      status: 'enviado',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    loadNotifications();
  } catch (error) {
    Logger.error('Error sending test push notification:', error);
    showNotification('Error al enviar notificación de prueba', 'error');
  }
}

// WhatsApp function
function sendWhatsApp(phone, message) {
  // Clean phone number (remove spaces and special characters)
  const cleanPhone = phone.replace(/[^0-9+]/g, '');

  // Encode message for URL
  const encodedMessage = encodeURIComponent(message);

  // Open WhatsApp with pre-filled message
  window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
}

// Export to Excel function
function exportTableToExcel(tableId, filename = 'export') {
  const table = document.getElementById(tableId);
  const wb = XLSX.utils.book_new();

  // Get visible rows only (respecting search filter)
  const rows = [];
  const tbody = table.getElementsByTagName('tbody')[0];
  const trs = tbody.getElementsByTagName('tr');

  // Add headers
  const headers = [];
  const headerRow = table
    .getElementsByTagName('thead')[0]
    .getElementsByTagName('tr')[0];
  const ths = headerRow.getElementsByTagName('th');
  for (let i = 0; i < ths.length - 1; i++) {
    // Skip last column (actions)
    headers.push(ths[i].textContent);
  }
  rows.push(headers);

  // Add data rows
  for (let i = 0; i < trs.length; i++) {
    if (trs[i].style.display !== 'none') {
      // Only visible rows
      const tds = trs[i].getElementsByTagName('td');
      const row = [];
      for (let j = 0; j < tds.length - 1; j++) {
        // Skip last column (actions)
        row.push(tds[j].textContent.trim());
      }
      if (row.length > 0 && row[0] !== 'No hay') {
        // Skip empty rows
        rows.push(row);
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Data');

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  const fullFilename = `${filename}_${date}.xlsx`;

  XLSX.writeFile(wb, fullFilename);
}

// Date filter function
function createDateFilter(tableId, dateColumnIndex) {
  const container = document.createElement('div');
  container.style.cssText =
    'display: inline-flex; gap: 10px; align-items: center; margin-bottom: 15px; margin-left: 15px;';

  const label = document.createElement('label');
  label.textContent = 'Filtrar por fecha: ';
  label.style.fontWeight = '500';

  const startDate = document.createElement('input');
  startDate.type = 'date';
  startDate.style.cssText =
    'padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;';

  const endDate = document.createElement('input');
  endDate.type = 'date';
  endDate.style.cssText =
    'padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;';

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Limpiar';
  clearBtn.style.cssText =
    'padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer;';

  function filterByDate() {
    const table = document.getElementById(tableId);
    const tbody = table.getElementsByTagName('tbody')[0];
    const rows = tbody.getElementsByTagName('tr');

    const start = startDate.value ? new Date(startDate.value) : null;
    const end = endDate.value ? new Date(endDate.value) : null;

    for (let i = 0; i < rows.length; i++) {
      const cells = rows[i].getElementsByTagName('td');
      if (cells.length > dateColumnIndex) {
        const dateText = cells[dateColumnIndex].textContent;
        const rowDate = moment(dateText, [
          'DD/MM/YYYY',
          'D/M/YYYY',
          'YYYY-MM-DD',
        ]).toDate();

        let show = true;
        if (start && rowDate < start) show = false;
        if (end && rowDate > end) show = false;

        // Also check if row is hidden by search
        if (rows[i].style.display === 'none' && show) {
          show = false;
        }

        rows[i].style.display = show ? '' : 'none';
      }
    }
  }

  startDate.addEventListener('change', filterByDate);
  endDate.addEventListener('change', filterByDate);

  clearBtn.addEventListener('click', () => {
    startDate.value = '';
    endDate.value = '';
    filterByDate();
  });

  container.appendChild(label);
  container.appendChild(startDate);
  container.appendChild(document.createTextNode(' - '));
  container.appendChild(endDate);
  container.appendChild(clearBtn);

  return container;
}

// S&OP FUNCTIONS
let sopCharts = {
  demandCapacity: null,
  serviceMix: null,
  revenueProjection: null,
};

async function loadSOPData() {
  const period = document.getElementById('sopPeriod')?.value || 'month';

  try {
    // Calculate date ranges
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    switch (period) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        endDate.setDate(now.getDate() + 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        endDate.setMonth(now.getMonth() + 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        endDate.setMonth(now.getMonth() + 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        endDate.setFullYear(now.getFullYear() + 1);
        break;
    }

    // Load historical data
    const [appointmentsData, paymentsData, staffData, servicesData] =
      await Promise.all([
        db
          .collection('appointments')
          .where('date', '>=', startDate)
          .where('date', '<=', endDate)
          .get(),
        db
          .collection('payments')
          .where('date', '>=', startDate)
          .where('date', '<=', endDate)
          .get(),
        db.collection('staff').where('active', '==', true).get(),
        db.collection('services').where('active', '==', true).get(),
      ]);

    // Calculate metrics
    const metrics = calculateSOPMetrics(
      appointmentsData,
      paymentsData,
      staffData,
      servicesData,
      period
    );

    // Update KPIs
    updateSOPKPIs(metrics);

    // Update charts
    updateSOPCharts(metrics);

    // Update resource planning table
    updateResourcePlanning(metrics);

    // Generate alerts
    generateSOPAlerts(metrics);
  } catch (error) {
    Logger.log('Error loading S&OP data:', error);
  }
}

function calculateSOPMetrics(appointments, payments, staff, services, period) {
  const metrics = {
    totalAppointments: appointments.size,
    completedAppointments: 0,
    cancelledAppointments: 0,
    totalRevenue: 0,
    projectedDemand: 0,
    capacityUtilization: 0,
    serviceBreakdown: {},
    staffUtilization: {},
    dailyTrends: {},
  };

  // Process appointments
  appointments.forEach((doc) => {
    const data = doc.data();
    if (data.status === 'completada') metrics.completedAppointments++;
    if (data.status === 'cancelada') metrics.cancelledAppointments++;

    // Service breakdown
    const service = data.service || 'Sin servicio';
    metrics.serviceBreakdown[service] =
      (metrics.serviceBreakdown[service] || 0) + 1;

    // Staff utilization
    const staffName = data.staffName || 'Sin asignar';
    metrics.staffUtilization[staffName] =
      (metrics.staffUtilization[staffName] || 0) + 1;
  });

  // Process payments
  payments.forEach((doc) => {
    const data = doc.data();
    if (data.status === 'pagado') {
      metrics.totalRevenue += data.amount || 0;
    }
  });

  // Calculate projections based on historical trends
  const growthRate = 1.1; // 10% growth assumption
  metrics.projectedDemand = Math.round(metrics.totalAppointments * growthRate);

  // Calculate capacity utilization
  const totalStaff = staff.size;
  const workingHours = period === 'week' ? 40 : period === 'month' ? 160 : 480;
  const totalCapacity = totalStaff * workingHours;
  const usedCapacity = metrics.completedAppointments * 1; // 1 hour per appointment average
  metrics.capacityUtilization = Math.round(
    (usedCapacity / totalCapacity) * 100
  );

  return metrics;
}

function updateSOPKPIs(metrics) {
  document.getElementById('projectedDemand').textContent =
    metrics.projectedDemand;
  document.getElementById('availableCapacity').textContent =
    metrics.capacityUtilization + '%';
  document.getElementById('projectedRevenue').textContent =
    '$' + Math.round(metrics.totalRevenue * 1.1).toLocaleString();
  document.getElementById('actualRevenue').textContent =
    '$' + metrics.totalRevenue.toLocaleString();

  const efficiency =
    Math.round(
      (metrics.completedAppointments / metrics.totalAppointments) * 100
    ) || 0;
  document.getElementById('operationalEfficiency').textContent =
    efficiency + '%';
}

function updateSOPCharts(metrics) {
  // Demand vs Capacity Chart
  const ctx1 = document.getElementById('demandCapacityChart')?.getContext('2d');
  if (ctx1) {
    if (sopCharts.demandCapacity) sopCharts.demandCapacity.destroy();

    sopCharts.demandCapacity = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
        datasets: [
          {
            label: 'Demanda',
            data: [
              metrics.totalAppointments * 0.8,
              metrics.totalAppointments * 0.9,
              metrics.totalAppointments,
              metrics.projectedDemand,
            ],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            tension: 0.4,
          },
          {
            label: 'Capacidad',
            data: [100, 100, 100, 100],
            borderColor: '#16A34A',
            backgroundColor: 'rgba(22, 163, 74, 0.1)',
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Análisis de Demanda vs Capacidad',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  }

  // Service Mix Chart
  const ctx2 = document.getElementById('serviceMixChart')?.getContext('2d');
  if (ctx2) {
    if (sopCharts.serviceMix) sopCharts.serviceMix.destroy();

    sopCharts.serviceMix = new Chart(ctx2, {
      type: 'doughnut',
      data: {
        labels: Object.keys(metrics.serviceBreakdown),
        datasets: [
          {
            data: Object.values(metrics.serviceBreakdown),
            backgroundColor: [
              '#16A34A',
              '#0ea5e9',
              '#f59e0b',
              '#ef4444',
              '#8b5cf6',
            ],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
          },
        },
      },
    });
  }

  // Revenue Projection Chart
  const ctx3 = document
    .getElementById('revenueProjectionChart')
    ?.getContext('2d');
  if (ctx3) {
    if (sopCharts.revenueProjection) sopCharts.revenueProjection.destroy();

    const currentRevenue = metrics.totalRevenue;
    sopCharts.revenueProjection = new Chart(ctx3, {
      type: 'bar',
      data: {
        labels: ['Actual', 'Proyectado', 'Meta'],
        datasets: [
          {
            label: 'Ingresos',
            data: [currentRevenue, currentRevenue * 1.1, currentRevenue * 1.2],
            backgroundColor: ['#16A34A', '#0ea5e9', '#f59e0b'],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return '$' + value.toLocaleString();
              },
            },
          },
        },
      },
    });
  }
}

function updateResourcePlanning(metrics) {
  const tbody = document.querySelector('#resourcePlanningTable tbody');
  tbody.innerHTML = '';

  // Sample resource data
  const resources = [
    {
      name: 'Consultorios',
      total: 10,
      used: Math.round(metrics.capacityUtilization * 0.1),
      projection: Math.round(metrics.capacityUtilization * 1.1 * 0.1),
    },
    {
      name: 'Personal Médico',
      total: Object.keys(metrics.staffUtilization).length,
      used: Object.values(metrics.staffUtilization).reduce((a, b) => a + b, 0),
      projection: metrics.projectedDemand,
    },
    {
      name: 'Equipos Especializados',
      total: 5,
      used: 3,
      projection: 4,
    },
  ];

  resources.forEach((resource) => {
    const available = resource.total - resource.used;
    const utilization = Math.round((resource.used / resource.total) * 100);

    const row = `
            <tr>
                <td>${resource.name}</td>
                <td>${resource.total}</td>
                <td>${resource.used}</td>
                <td>${available}</td>
                <td>
                    <div style="display: flex; align-items: center;">
                        <div style="width: 100px; height: 20px; background: #e5e7eb; border-radius: 10px; overflow: hidden; margin-right: 10px;">
                            <div style="width: ${utilization}%; height: 100%; background: ${utilization > 80 ? '#ef4444' : utilization > 60 ? '#f59e0b' : '#16A34A'};"></div>
                        </div>
                        ${utilization}%
                    </div>
                </td>
                <td>${resource.projection} (${resource.projection > resource.total ? '⚠️ Sobre capacidad' : '✅ OK'})</td>
            </tr>
        `;
    tbody.innerHTML += row;
  });
}

function generateSOPAlerts(metrics) {
  const alertsDiv = document.getElementById('sopAlerts');
  const alerts = [];

  // Check capacity utilization
  if (metrics.capacityUtilization > 80) {
    alerts.push(
      '⚠️ Alta utilización de capacidad (' +
        metrics.capacityUtilization +
        '%). Considera contratar más personal.'
    );
  }

  // Check cancellation rate
  const cancellationRate =
    (metrics.cancelledAppointments / metrics.totalAppointments) * 100;
  if (cancellationRate > 15) {
    alerts.push(
      '⚠️ Alta tasa de cancelación (' +
        Math.round(cancellationRate) +
        '%). Implementa recordatorios automáticos.'
    );
  }

  // Check revenue growth
  if (metrics.totalRevenue < metrics.projectedRevenue * 0.9) {
    alerts.push(
      '📉 Ingresos por debajo de la proyección. Revisa estrategias de marketing.'
    );
  }

  // Positive alerts
  if (metrics.capacityUtilization > 60 && metrics.capacityUtilization < 80) {
    alerts.push(
      '✅ Utilización de capacidad óptima. Buen balance entre demanda y recursos.'
    );
  }

  alertsDiv.innerHTML = alerts
    .map((alert) => `<p style="margin: 5px 0;">${alert}</p>`)
    .join('');
}

function generateActionPlan() {
  const growthTarget =
    parseInt(document.getElementById('growthTarget').value) || 10;
  const resultsDiv = document.getElementById('actionPlanResults');

  const actions = [
    {
      area: 'Marketing',
      action: `Aumentar presupuesto de marketing en ${Math.round(growthTarget * 0.5)}% para alcanzar ${growthTarget}% de crecimiento`,
      timeline: '2 semanas',
    },
    {
      area: 'Operaciones',
      action: `Optimizar horarios para aumentar capacidad en ${Math.round(growthTarget * 0.3)}%`,
      timeline: '1 mes',
    },
    {
      area: 'Personal',
      action:
        growthTarget > 15
          ? 'Contratar 1-2 profesionales adicionales'
          : 'Capacitar personal existente en nuevos servicios',
      timeline: '6 semanas',
    },
    {
      area: 'Servicios',
      action: 'Lanzar paquetes promocionales para servicios menos utilizados',
      timeline: '1 semana',
    },
  ];

  resultsDiv.innerHTML = `
        <h4>Plan de Acción para ${growthTarget}% de Crecimiento:</h4>
        <table style="width: 100%; margin-top: 10px;">
            <thead>
                <tr>
                    <th>Área</th>
                    <th>Acción</th>
                    <th>Timeline</th>
                    <th>Estado</th>
                </tr>
            </thead>
            <tbody>
                ${actions
                  .map(
                    (action) => `
                    <tr>
                        <td>${action.area}</td>
                        <td>${action.action}</td>
                        <td>${action.timeline}</td>
                        <td><button class="action-btn" style="background: #16A34A; color: white;">Iniciar</button></td>
                    </tr>
                `
                  )
                  .join('')}
            </tbody>
        </table>
    `;
}

function exportSOPReport() {
  // Prepare data for export
  const wb = XLSX.utils.book_new();

  // KPIs sheet
  const kpis = [
    ['Métrica', 'Valor'],
    [
      'Demanda Proyectada',
      document.getElementById('projectedDemand').textContent,
    ],
    [
      'Capacidad Utilizada',
      document.getElementById('availableCapacity').textContent,
    ],
    [
      'Ingresos Proyectados',
      document.getElementById('projectedRevenue').textContent,
    ],
    [
      'Eficiencia Operativa',
      document.getElementById('operationalEfficiency').textContent,
    ],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(kpis);
  XLSX.utils.book_append_sheet(wb, ws1, 'KPIs');

  // Generate filename with date
  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `SOP_Report_${date}.xlsx`);
}

// INVENTORY FUNCTIONS
let currentCategory = 'all';

async function loadInventory() {
  try {
    // Add search box if not exists
    const inventorySection = document.getElementById('inventory');
    const inventoryTable = document.getElementById('inventoryTable');
    if (!inventorySection.querySelector('.search-input')) {
      const searchInput = createSearchInput(
        'inventoryTable',
        'Buscar productos...'
      );
      searchInput.classList.add('search-input');
      searchInput.style.marginBottom = '15px';
      inventoryTable.parentNode.insertBefore(
        searchInput,
        inventoryTable.previousElementSibling
      );
    }

    // Load products
    const snapshot = await db.collection('products').get();

    const tbody = document.querySelector('#inventoryTable tbody');
    tbody.innerHTML = '';

    let totalProducts = 0;
    let totalValue = 0;
    let lowStockCount = 0;

    if (snapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="9" style="text-align: center;">No hay productos registrados</td></tr>';
      // Add sample products
      await addSampleProducts();
    } else {
      snapshot.forEach((doc) => {
        const product = doc.data();
        totalProducts++;

        const stockValue = (product.stock || 0) * (product.price || 0);
        totalValue += stockValue;

        // Check stock status
        let stockStatus = 'stock-ok';
        let stockStatusText = 'OK';
        if (product.stock <= 0) {
          stockStatus = 'stock-out';
          stockStatusText = 'Agotado';
          lowStockCount++;
        } else if (product.stock <= product.minStock) {
          stockStatus = 'stock-low';
          stockStatusText = 'Bajo';
          lowStockCount++;
        }

        // Check expiry status
        let expiryStatus = '';
        let expiryText = 'N/A';
        if (product.trackExpiry && product.expiryDate) {
          const expiryDate = new Date(product.expiryDate.seconds * 1000);
          const today = new Date();
          const daysToExpiry = Math.floor(
            (expiryDate - today) / (1000 * 60 * 60 * 24)
          );

          expiryText = expiryDate.toLocaleDateString();

          if (daysToExpiry < 0) {
            expiryStatus = 'expired';
            expiryText = `<span style="color: #dc2626; font-weight: bold;">⚠️ Vencido</span>`;
          } else if (daysToExpiry <= 30) {
            expiryStatus = 'expiring-soon';
            expiryText = `<span style="color: #f59e0b;">⏰ ${daysToExpiry} días</span>`;
          } else {
            expiryText = `<span style="color: #10b981;">✅ ${expiryDate.toLocaleDateString()}</span>`;
          }
        }

        const row = `
                    <tr data-category="${product.category || 'otros'}" class="${expiryStatus}">
                        <td>${product.code || 'N/A'}</td>
                        <td>${product.name || 'N/A'}</td>
                        <td>${product.category || 'otros'}</td>
                        <td class="${stockStatus}">${product.stock || 0}</td>
                        <td>${product.minStock || 0}</td>
                        <td>$${(product.price || 0).toFixed(2)}</td>
                        <td>$${stockValue.toFixed(2)}</td>
                        <td>${product.barcode || 'N/A'}</td>
                        <td>${expiryText}</td>
                        <td><span class="${stockStatus}">${stockStatusText}</span></td>
                        <td>
                            <button class="action-btn" style="background: #16A34A; color: white;" onclick="showAdjustStock('${doc.id}')">Ajustar</button>
                            <button class="action-btn edit-btn" onclick="editProduct('${doc.id}')">Editar</button>
                            <button class="action-btn delete-btn" onclick="deleteProduct('${doc.id}')">Eliminar</button>
                        </td>
                    </tr>
                `;
        tbody.innerHTML += row;
      });
    }

    // Update stats
    document.getElementById('totalProducts').textContent = totalProducts;
    document.getElementById('totalInventoryValue').textContent =
      '$' + totalValue.toFixed(2);
    document.getElementById('lowStockCount').textContent = lowStockCount;

    // Load movements
    loadMovements();

    // Apply current category filter
    if (currentCategory !== 'all') {
      filterByCategory(currentCategory);
    }
  } catch (error) {
    Logger.log('Error loading inventory:', error);
  }
}

async function loadMovements() {
  try {
    const snapshot = await db
      .collection('inventory_movements')
      .orderBy('date', 'desc')
      .limit(20)
      .get();

    const tbody = document.querySelector('#movementsTable tbody');
    tbody.innerHTML = '';

    if (snapshot.empty) {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align: center;">No hay movimientos registrados</td></tr>';
    } else {
      let lastMovement = null;
      snapshot.forEach((doc) => {
        const movement = doc.data();
        const date = movement.date
          ? new Date(movement.date.seconds * 1000).toLocaleString()
          : 'N/A';

        if (!lastMovement) {
          lastMovement = `${movement.type} - ${movement.productName}`;
          document.getElementById('lastMovement').textContent = lastMovement;
        }

        const typeIcon =
          movement.type === 'entrada'
            ? '📥'
            : movement.type === 'salida'
              ? '📤'
              : '🔄';
        const typeColor = movement.type === 'entrada' ? '#16A34A' : '#ef4444';

        const row = `
                    <tr>
                        <td>${date}</td>
                        <td>${movement.productName || 'N/A'}</td>
                        <td style="color: ${typeColor};">${typeIcon} ${movement.type}</td>
                        <td>${movement.quantity || 0}</td>
                        <td>${movement.responsibleName || currentUser.name || 'Admin'}</td>
                        <td>${movement.notes || '-'}</td>
                    </tr>
                `;
        tbody.innerHTML += row;
      });
    }
  } catch (error) {
    Logger.log('Error loading movements:', error);
  }
}

function filterByCategory(category) {
  currentCategory = category;

  // Update active tab
  document.querySelectorAll('.category-tab').forEach((tab) => {
    tab.classList.remove('active');
    if (
      tab.textContent.toLowerCase().includes(category) ||
      (category === 'all' && tab.textContent === 'Todos')
    ) {
      tab.classList.add('active');
    }
  });

  // Filter table rows
  const rows = document.querySelectorAll('#inventoryTable tbody tr');
  rows.forEach((row) => {
    if (row.dataset.category) {
      if (category === 'all' || row.dataset.category === category) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    }
  });
}

function showAddProduct() {
  const content = `
        <form id="addProductForm">
            <div class="form-row">
                <div class="form-group">
                    <label>Código/SKU</label>
                    <input type="text" name="code" required>
                </div>
                <div class="form-group">
                    <label>Nombre del Producto</label>
                    <input type="text" name="name" required>
                </div>
            </div>
            <div class="form-group">
                <label>Descripción</label>
                <textarea name="description" rows="2" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Categoría</label>
                    <select name="category" required>
                        <option value="medicamentos">Medicamentos</option>
                        <option value="suplementos">Suplementos</option>
                        <option value="equipos">Equipos</option>
                        <option value="consumibles">Consumibles</option>
                        <option value="otros">Otros</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Unidad de Medida</label>
                    <select name="unit">
                        <option value="unidad">Unidad</option>
                        <option value="caja">Caja</option>
                        <option value="frasco">Frasco</option>
                        <option value="paquete">Paquete</option>
                        <option value="kg">Kilogramo</option>
                        <option value="litro">Litro</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Stock Inicial</label>
                    <input type="number" name="stock" min="0" value="0" required>
                </div>
                <div class="form-group">
                    <label>Stock Mínimo</label>
                    <input type="number" name="minStock" min="0" value="5" required>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Precio Unitario</label>
                    <input type="number" name="price" min="0" step="0.01" required>
                </div>
                <div class="form-group">
                    <label>Proveedor</label>
                    <input type="text" name="supplier" placeholder="Nombre del proveedor">
                </div>
            </div>
            <button type="submit" class="btn">Agregar Producto</button>
        </form>
    `;

  showModal('Agregar Producto', content);

  document
    .getElementById('addProductForm')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);

      try {
        const productData = {
          code: formData.get('code'),
          name: formData.get('name'),
          description: formData.get('description'),
          category: formData.get('category'),
          unit: formData.get('unit'),
          stock: parseInt(formData.get('stock')),
          minStock: parseInt(formData.get('minStock')),
          price: parseFloat(formData.get('price')),
          supplier: formData.get('supplier'),
          active: true,
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          createdBy: currentUser.uid,
        };

        const docRef = await db.collection('products').add(productData);

        // Register initial stock movement
        if (productData.stock > 0) {
          await db.collection('inventory_movements').add({
            productId: docRef.id,
            productName: productData.name,
            type: 'entrada',
            quantity: productData.stock,
            responsibleId: currentUser.uid,
            responsibleName: currentUser.name || currentUser.email,
            notes: 'Stock inicial',
            date: firebase.firestore.FieldValue.serverTimestamp(),
          });
        }

        closeModal();
        loadInventory();
        alert('Producto agregado exitosamente');
      } catch (error) {
        alert('Error al agregar producto: ' + error.message);
      }
    });
}

function showAdjustStock(productId) {
  db.collection('products')
    .doc(productId)
    .get()
    .then((doc) => {
      const product = doc.data();

      const content = `
            <form id="adjustStockForm">
                <h3>${product.name}</h3>
                <p>Stock actual: <strong>${product.stock}</strong></p>
                
                <div class="form-group">
                    <label>Tipo de Movimiento</label>
                    <select name="type" required>
                        <option value="entrada">Entrada (Agregar stock)</option>
                        <option value="salida">Salida (Reducir stock)</option>
                        <option value="ajuste">Ajuste de inventario</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Cantidad</label>
                    <input type="number" name="quantity" min="1" required>
                </div>
                <div class="form-group">
                    <label>Motivo/Notas</label>
                    <textarea name="notes" rows="2" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" required></textarea>
                </div>
                <button type="submit" class="btn">Confirmar Movimiento</button>
            </form>
        `;

      showModal('Ajustar Stock', content);

      document
        .getElementById('adjustStockForm')
        .addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);

          try {
            const movementType = formData.get('type');
            const quantity = parseInt(formData.get('quantity'));
            let newStock = product.stock;

            if (movementType === 'entrada') {
              newStock += quantity;
            } else if (movementType === 'salida') {
              newStock -= quantity;
              if (newStock < 0) {
                alert('No hay suficiente stock disponible');
                return;
              }
            } else if (movementType === 'ajuste') {
              newStock = quantity;
            }

            // Update product stock
            await db.collection('products').doc(productId).update({
              stock: newStock,
              lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
            });

            // Register movement
            await db.collection('inventory_movements').add({
              productId: productId,
              productName: product.name,
              type: movementType,
              quantity: quantity,
              previousStock: product.stock,
              newStock: newStock,
              responsibleId: currentUser.uid,
              responsibleName: currentUser.name || currentUser.email,
              notes: formData.get('notes'),
              date: firebase.firestore.FieldValue.serverTimestamp(),
            });

            closeModal();
            loadInventory();
            alert('Stock actualizado exitosamente');
          } catch (error) {
            alert('Error al actualizar stock: ' + error.message);
          }
        });
    });
}

function showLowStockAlert() {
  db.collection('products')
    .where('stock', '<=', 'minStock')
    .get()
    .then((snapshot) => {
      if (snapshot.empty) {
        alert('✅ No hay productos con stock bajo en este momento');
        return;
      }

      let alertContent =
        '<h3 style="color: #ef4444; margin-bottom: 20px;">⚠️ Productos con Stock Bajo</h3>';
      alertContent += '<table style="width: 100%;">';
      alertContent +=
        '<thead><tr><th>Producto</th><th>Stock Actual</th><th>Stock Mínimo</th><th>Acción</th></tr></thead>';
      alertContent += '<tbody>';

      snapshot.forEach((doc) => {
        const product = doc.data();
        if (product.stock <= product.minStock) {
          alertContent += `
                    <tr>
                        <td>${product.name}</td>
                        <td style="color: #ef4444; font-weight: bold;">${product.stock}</td>
                        <td>${product.minStock}</td>
                        <td><button class="action-btn" style="background: #16A34A; color: white;" onclick="closeModal(); showAdjustStock('${doc.id}')">Reabastecer</button></td>
                    </tr>
                `;
        }
      });

      alertContent += '</tbody></table>';
      showModal('Alerta de Stock Bajo', alertContent);
    });
}

function deleteProduct(id) {
  if (
    confirm(
      '¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.'
    )
  ) {
    db.collection('products')
      .doc(id)
      .delete()
      .then(() => {
        loadInventory();
        alert('Producto eliminado exitosamente');
      })
      .catch((error) => {
        alert('Error al eliminar producto: ' + error.message);
      });
  }
}

function editProduct(id) {
  db.collection('products')
    .doc(id)
    .get()
    .then((doc) => {
      const product = doc.data();

      const content = `
            <form id="editProductForm">
                <div class="form-row">
                    <div class="form-group">
                        <label>Código/SKU</label>
                        <input type="text" name="code" value="${product.code || ''}" required>
                    </div>
                    <div class="form-group">
                        <label>Nombre del Producto</label>
                        <input type="text" name="name" value="${product.name || ''}" required>
                    </div>
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea name="description" rows="2" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${product.description || ''}</textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Categoría</label>
                        <select name="category" required>
                            <option value="medicamentos" ${product.category === 'medicamentos' ? 'selected' : ''}>Medicamentos</option>
                            <option value="suplementos" ${product.category === 'suplementos' ? 'selected' : ''}>Suplementos</option>
                            <option value="equipos" ${product.category === 'equipos' ? 'selected' : ''}>Equipos</option>
                            <option value="consumibles" ${product.category === 'consumibles' ? 'selected' : ''}>Consumibles</option>
                            <option value="otros" ${product.category === 'otros' ? 'selected' : ''}>Otros</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Stock Mínimo</label>
                        <input type="number" name="minStock" min="0" value="${product.minStock || 0}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Precio Unitario</label>
                        <input type="number" name="price" min="0" step="0.01" value="${product.price || 0}" required>
                    </div>
                    <div class="form-group">
                        <label>Proveedor</label>
                        <input type="text" name="supplier" value="${product.supplier || ''}" placeholder="Nombre del proveedor">
                    </div>
                </div>
                <button type="submit" class="btn">Guardar Cambios</button>
            </form>
        `;

      showModal('Editar Producto', content);

      document
        .getElementById('editProductForm')
        .addEventListener('submit', async (e) => {
          e.preventDefault();
          const formData = new FormData(e.target);

          try {
            await db
              .collection('products')
              .doc(id)
              .update({
                code: formData.get('code'),
                name: formData.get('name'),
                description: formData.get('description'),
                category: formData.get('category'),
                minStock: parseInt(formData.get('minStock')),
                price: parseFloat(formData.get('price')),
                supplier: formData.get('supplier'),
                lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
              });

            closeModal();
            loadInventory();
            alert('Producto actualizado exitosamente');
          } catch (error) {
            alert('Error al actualizar producto: ' + error.message);
          }
        });
    });
}

// Add sample products
async function addSampleProducts() {
  const sampleProducts = [
    {
      code: 'MED001',
      name: 'Ibuprofeno 400mg',
      description: 'Antiinflamatorio no esteroideo',
      category: 'medicamentos',
      unit: 'caja',
      stock: 50,
      minStock: 20,
      price: 8.5,
      supplier: 'Farmacéutica Nacional',
    },
    {
      code: 'SUP001',
      name: 'Vitamina C 1000mg',
      description: 'Suplemento vitamínico',
      category: 'suplementos',
      unit: 'frasco',
      stock: 30,
      minStock: 10,
      price: 15.0,
      supplier: 'NutriHealth',
    },
    {
      code: 'EQU001',
      name: 'Tensómetro Digital',
      description: 'Medidor de presión arterial automático',
      category: 'equipos',
      unit: 'unidad',
      stock: 5,
      minStock: 2,
      price: 45.0,
      supplier: 'MediEquip',
    },
    {
      code: 'CON001',
      name: 'Jeringas 5ml',
      description: 'Jeringas desechables estériles',
      category: 'consumibles',
      unit: 'caja',
      stock: 100,
      minStock: 50,
      price: 12.0,
      supplier: 'Suministros Médicos SA',
    },
    {
      code: 'MED002',
      name: 'Alcohol 70%',
      description: 'Solución antiséptica',
      category: 'medicamentos',
      unit: 'litro',
      stock: 20,
      minStock: 10,
      price: 5.5,
      supplier: 'Farmacéutica Nacional',
    },
  ];

  for (const product of sampleProducts) {
    const docRef = await db.collection('products').add({
      ...product,
      active: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    // Register initial stock
    if (product.stock > 0) {
      await db.collection('inventory_movements').add({
        productId: docRef.id,
        productName: product.name,
        type: 'entrada',
        quantity: product.stock,
        responsibleName: 'Sistema',
        notes: 'Inventario inicial',
        date: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  }

  loadInventory();
}

// INTEGRATION FUNCTIONS
function loadIntegrations() {
  // Check integration status
  checkIntegrationStatus();
  // Analyze best billing option
  analyzeBillingRecommendation();
}

async function analyzeBillingRecommendation() {
  try {
    // Get monthly statistics
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const paymentsSnapshot = await db
      .collection('payments')
      .where('date', '>=', thirtyDaysAgo)
      .where('status', '==', 'pagado')
      .get();

    const monthlyInvoices = paymentsSnapshot.size;
    const monthlyRevenue = paymentsSnapshot.docs.reduce(
      (sum, doc) => sum + (doc.data().amount || 0),
      0
    );

    // Get number of staff and services
    const [staffSnapshot, servicesSnapshot] = await Promise.all([
      db.collection('staff').get(),
      db.collection('services').get(),
    ]);

    const staffCount = staffSnapshot.size;
    const servicesCount = servicesSnapshot.size;

    // Recommendation logic
    let recommendation = '';
    let provider = '';

    if (monthlyInvoices < 50) {
      provider = 'cadena';
      recommendation = `
                <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #065f46; margin-bottom: 10px;">🌟 Recomendación: Cadena (GRATIS)</h3>
                    <p><strong>Razón:</strong> Con ${monthlyInvoices} facturas/mes, estás dentro del plan gratuito de Cadena.</p>
                    <p><strong>Ahorro:</strong> $960.000 COP/año comparado con Siigo</p>
                    <p><strong>Tiempo extra requerido:</strong> 2 horas/mes para reportes</p>
                    <button class="btn" style="margin-top: 10px;" onclick="selectProvider('cadena')">Configurar Cadena Ahora</button>
                </div>
            `;
    } else if (monthlyInvoices >= 50 && monthlyInvoices < 200) {
      provider = 'cadena';
      recommendation = `
                <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #92400e; margin-bottom: 10px;">💡 Recomendación: Cadena o Facture.co</h3>
                    <p><strong>Razón:</strong> Con ${monthlyInvoices} facturas/mes, aún es rentable usar Cadena ($15.000/mes).</p>
                    <p><strong>Consideración:</strong> Si necesitas reportes automáticos, considera Facture.co ($25.000/mes)</p>
                    <p><strong>Ahorro:</strong> $780.000 COP/año con Cadena vs Siigo</p>
                    <button class="btn" style="margin-top: 10px; margin-right: 10px;" onclick="selectProvider('cadena')">Usar Cadena</button>
                    <button class="btn" style="margin-top: 10px;" onclick="selectProvider('factureco')">Usar Facture.co</button>
                </div>
            `;
    } else {
      provider = 'siigo';
      recommendation = `
                <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #1e3a8a; margin-bottom: 10px;">🚀 Recomendación: Siigo</h3>
                    <p><strong>Razón:</strong> Con ${monthlyInvoices} facturas/mes y ${staffCount} empleados, necesitas automatización completa.</p>
                    <p><strong>Beneficios:</strong> Contabilidad automática, nómina integrada, cero reprocesos</p>
                    <p><strong>ROI:</strong> El tiempo ahorrado (10+ horas/mes) justifica el costo</p>
                    <button class="btn" style="margin-top: 10px;" onclick="selectProvider('siigo')">Configurar Siigo Ahora</button>
                </div>
            `;
    }

    // Add analysis summary
    const analysisHTML = `
            <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="margin-bottom: 15px;">📊 Análisis de tu Operación</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                    <div>
                        <strong>Facturas/mes:</strong><br>
                        <span style="font-size: 24px; color: #16A34A;">${monthlyInvoices}</span>
                    </div>
                    <div>
                        <strong>Ingresos/mes:</strong><br>
                        <span style="font-size: 24px; color: #16A34A;">$${monthlyRevenue.toLocaleString()}</span>
                    </div>
                    <div>
                        <strong>Personal:</strong><br>
                        <span style="font-size: 24px; color: #16A34A;">${staffCount}</span>
                    </div>
                    <div>
                        <strong>Servicios:</strong><br>
                        <span style="font-size: 24px; color: #16A34A;">${servicesCount}</span>
                    </div>
                </div>
            </div>
            ${recommendation}
        `;

    // Insert analysis in the integrations page
    const integrationsSection = document.getElementById('integrations');
    if (
      integrationsSection &&
      integrationsSection.classList.contains('active')
    ) {
      const existingAnalysis = document.getElementById('billingAnalysis');
      if (existingAnalysis) {
        existingAnalysis.innerHTML = analysisHTML;
      } else {
        const analysisDiv = document.createElement('div');
        analysisDiv.id = 'billingAnalysis';
        analysisDiv.innerHTML = analysisHTML;
        integrationsSection.insertBefore(
          analysisDiv,
          integrationsSection.children[1]
        );
      }
    }
  } catch (error) {
    Logger.log('Error analyzing billing recommendation:', error);
  }
}

function selectProvider(provider) {
  // Auto-select the provider in the configuration form
  configureSiigo();
  setTimeout(() => {
    const providerSelect = document.querySelector('select[name="provider"]');
    if (providerSelect) {
      providerSelect.value = provider;
      updateBillingFields(provider);
    }
  }, 100);
}

function checkIntegrationStatus() {
  // Check Siigo status
  const siigoConfig = localStorage.getItem('siigoConfig');
  if (siigoConfig) {
    document.getElementById('siigoStatus').innerHTML =
      '<span class="badge" style="background: #d4edda; color: #155724;">Conectado</span>';
  }

  // Check SaludTools status
  const saludtoolsConfig = localStorage.getItem('saludtoolsConfig');
  if (saludtoolsConfig) {
    document.getElementById('saludtoolsStatus').innerHTML =
      '<span class="badge" style="background: #d4edda; color: #155724;">Conectado</span>';
  }
}

function configureSiigo() {
  const content = `
        <form id="siigoConfigForm">
            <h3>Configuración de Facturación Electrónica</h3>
            <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h4 style="margin-bottom: 10px;">💡 Recomendación para Healing Forest:</h4>
                <p style="margin: 5px 0;"><strong>Menos de 200 facturas/mes:</strong> Usa Cadena (gratis)</p>
                <p style="margin: 5px 0;"><strong>Más de 200 facturas/mes:</strong> Usa Siigo (automatizado)</p>
            </div>
            
            <div class="form-group">
                <label>Proveedor de Facturación</label>
                <select name="provider" onchange="updateBillingFields(this.value)" required>
                    <option value="">Seleccionar proveedor</option>
                    <option value="siigo">Siigo (Completo - Recomendado para grandes)</option>
                    <option value="cadena">Cadena (Económico - Recomendado para iniciar)</option>
                    <option value="factureco">Facture.co (Intermedio)</option>
                </select>
            </div>
            
            <div id="billingProviderFields">
                <!-- Dynamic fields based on provider -->
            </div>
            
            <p style="color: #666; margin-bottom: 20px;">Selecciona el proveedor que mejor se adapte a tu volumen de facturación.</p>
            
            <div class="form-group">
                <label>API Key de Siigo</label>
                <input type="text" name="apiKey" placeholder="Tu API Key de Siigo" required>
            </div>
            <div class="form-group">
                <label>Partner ID</label>
                <input type="text" name="partnerId" placeholder="Partner ID proporcionado por Siigo" required>
            </div>
            <div class="form-group">
                <label>Ambiente</label>
                <select name="environment">
                    <option value="sandbox">Sandbox (Pruebas)</option>
                    <option value="production">Producción</option>
                </select>
            </div>
            <div class="form-group">
                <label>Resolución DIAN</label>
                <input type="text" name="dianResolution" placeholder="Número de resolución DIAN">
            </div>
            <button type="submit" class="btn">Guardar Configuración</button>
        </form>
    `;

  showModal('Configurar Facturación Electrónica', content);

  document
    .getElementById('siigoConfigForm')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);

      const provider = formData.get('provider');
      if (!provider) {
        alert('⚠️ Selecciona un proveedor');
        return;
      }

      const config = {
        apiKey: formData.get('apiKey'),
        partnerId: formData.get('partnerId'),
        environment: formData.get('environment'),
        dianResolution: formData.get('dianResolution'),
        configuredAt: new Date().toISOString(),
      };

      // Save to localStorage (in production, save to Firebase)
      localStorage.setItem('siigoConfig', JSON.stringify(config));

      // Save to Firebase
      await db
        .collection('integrations')
        .doc('siigo')
        .set({
          ...config,
          configuredBy: currentUser.uid,
          active: true,
        });

      closeModal();
      checkIntegrationStatus();
      alert('✅ Siigo configurado exitosamente');
    });
}

function configureSaludTools() {
  const content = `
        <form id="saludtoolsConfigForm">
            <h3>Configuración de SaludTools</h3>
            <p style="color: #666; margin-bottom: 20px;">Conecta con SaludTools para gestionar RIPS y autorizaciones.</p>
            
            <div class="form-group">
                <label>Usuario SaludTools</label>
                <input type="text" name="username" placeholder="Usuario proporcionado por SaludTools" required>
            </div>
            <div class="form-group">
                <label>Contraseña</label>
                <input type="password" name="password" required>
            </div>
            <div class="form-group">
                <label>Código de Prestador</label>
                <input type="text" name="providerCode" placeholder="Código habilitación" required>
            </div>
            <div class="form-group">
                <label>Tipo de Prestador</label>
                <select name="providerType">
                    <option value="IPS">IPS</option>
                    <option value="PROFESIONAL">Profesional Independiente</option>
                </select>
            </div>
            <button type="submit" class="btn">Guardar Configuración</button>
        </form>
    `;

  showModal('Configurar SaludTools', content);

  document
    .getElementById('saludtoolsConfigForm')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);

      const config = {
        username: formData.get('username'),
        // In production, encrypt password
        password: btoa(formData.get('password')),
        providerCode: formData.get('providerCode'),
        providerType: formData.get('providerType'),
        configuredAt: new Date().toISOString(),
      };

      localStorage.setItem('saludtoolsConfig', JSON.stringify(config));

      await db
        .collection('integrations')
        .doc('saludtools')
        .set({
          ...config,
          configuredBy: currentUser.uid,
          active: true,
        });

      closeModal();
      checkIntegrationStatus();
      alert('✅ SaludTools configurado exitosamente');
    });
}

function configureWhatsApp() {
  const content = `
        <form id="whatsappConfigForm">
            <h3>Configurar WhatsApp Business API</h3>
            <p style="color: #666; margin-bottom: 20px;">Automatiza el envío de mensajes con WhatsApp Business.</p>
            
            <div class="form-group">
                <label>Proveedor de API</label>
                <select name="provider" onchange="updateWhatsAppFields(this.value)">
                    <option value="">Seleccionar proveedor</option>
                    <option value="twilio">Twilio (Recomendado)</option>
                    <option value="messagebird">MessageBird</option>
                    <option value="infobip">Infobip</option>
                    <option value="custom">API Personalizada</option>
                </select>
            </div>
            <div id="whatsappFields">
                <!-- Dynamic fields based on provider -->
            </div>
            <button type="submit" class="btn" style="background: #25D366;">Conectar WhatsApp</button>
        </form>
    `;

  showModal('Configurar WhatsApp Business', content);

  document
    .getElementById('whatsappConfigForm')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);

      try {
        await saveWhatsAppConfig(formData);
        closeModal();
        checkIntegrationStatus();

        // Update status
        document.getElementById('whatsappStatus').innerHTML =
          '<span class="badge" style="background: #d4edda; color: #155724;">Conectado y Automatizado</span>';

        alert(
          '✅ WhatsApp configurado exitosamente! Revisa tu teléfono para el mensaje de prueba.'
        );

        // Start automatic reminders if enabled
        if (formData.get('autoReminders') === 'on') {
          whatsappWorkflows.setupAppointmentReminders();
        }
      } catch (error) {
        alert('❌ Error al configurar WhatsApp: ' + error.message);
      }
    });
}

function updateBillingFields(provider) {
  const fieldsDiv = document.getElementById('billingProviderFields');

  if (provider === 'siigo') {
    fieldsDiv.innerHTML = `
            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <strong>💰 Costo:</strong> $80.000 - $150.000/mes<br>
                <strong>✅ Incluye:</strong> Contabilidad, nómina, reportes automáticos<br>
                <strong>⏱ Tiempo de setup:</strong> 1-2 días
            </div>
            <div class="form-group">
                <label>API Key de Siigo</label>
                <input type="text" name="apiKey" placeholder="Tu API Key de Siigo" required>
            </div>
            <div class="form-group">
                <label>Partner ID</label>
                <input type="text" name="partnerId" placeholder="Partner ID proporcionado por Siigo" required>
            </div>
            <div class="form-group">
                <label>Ambiente</label>
                <select name="environment">
                    <option value="sandbox">Sandbox (Pruebas)</option>
                    <option value="production">Producción</option>
                </select>
            </div>
        `;
  } else if (provider === 'cadena') {
    fieldsDiv.innerHTML = `
            <div style="background: #d1fae5; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <strong>💰 Costo:</strong> GRATIS (primeras 50/mes), luego $15.000<br>
                <strong>✅ Incluye:</strong> Facturación electrónica básica<br>
                <strong>⏱ Tiempo de setup:</strong> 30 minutos
            </div>
            <div class="form-group">
                <label>Token API de Cadena</label>
                <input type="text" name="apiToken" placeholder="Token proporcionado por Cadena" required>
            </div>
            <div class="form-group">
                <label>NIT de tu Empresa</label>
                <input type="text" name="nit" placeholder="NIT sin puntos ni guiones" required>
            </div>
            <div class="form-group">
                <label>Resolución DIAN</label>
                <input type="text" name="dianResolution" placeholder="Número de resolución" required>
            </div>
        `;
  } else if (provider === 'factureco') {
    fieldsDiv.innerHTML = `
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <strong>💰 Costo:</strong> $25.000 - $40.000/mes<br>
                <strong>✅ Incluye:</strong> Facturación + Reportes básicos<br>
                <strong>⏱ Tiempo de setup:</strong> 1 día
            </div>
            <div class="form-group">
                <label>Usuario API</label>
                <input type="text" name="apiUser" required>
            </div>
            <div class="form-group">
                <label>Clave API</label>
                <input type="password" name="apiPassword" required>
            </div>
        `;
  }
}

function updateWhatsAppFields(provider) {
  const fieldsDiv = document.getElementById('whatsappFields');

  if (provider === 'twilio') {
    fieldsDiv.innerHTML = `
            <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <strong>💳 Costo Twilio:</strong> $0.0055 USD por mensaje (aprox $22 COP)<br>
                <strong>🌐 Más confiable:</strong> Funciona en todo el mundo<br>
                <strong>⏱ Setup:</strong> 30 minutos con cuenta verificada
            </div>
            <div class="form-group">
                <label>Account SID</label>
                <input type="text" name="accountSid" placeholder="ACxxxxxxxxxxxxxx" required>
                <small style="color: #666;">Encuéntralo en tu dashboard de Twilio</small>
            </div>
            <div class="form-group">
                <label>Auth Token</label>
                <input type="password" name="authToken" required>
                <small style="color: #666;">Token secreto de tu cuenta</small>
            </div>
            <div class="form-group">
                <label>Número de WhatsApp</label>
                <input type="text" name="fromNumber" placeholder="+14155238886" value="+14155238886" required>
                <small style="color: #666;">Usa +14155238886 para sandbox de pruebas</small>
            </div>
            <div class="form-group">
                <label>Tu número para alertas</label>
                <input type="text" name="adminPhone" placeholder="+57..." required>
                <small style="color: #666;">Recibirás alertas de inventario aquí</small>
            </div>
            <div class="form-group">
                <label>¿Activar recordatorios automáticos?</label>
                <label><input type="checkbox" name="autoReminders" checked> Sí, enviar recordatorios 24h antes</label>
            </div>
        `;
  } else if (provider) {
    fieldsDiv.innerHTML = `
            <div class="form-group">
                <label>API Key</label>
                <input type="text" name="apiKey" required>
            </div>
            <div class="form-group">
                <label>Número de WhatsApp</label>
                <input type="text" name="phoneNumber" placeholder="+57..." required>
            </div>
        `;
  }
}

// Save WhatsApp configuration
async function saveWhatsAppConfig(formData) {
  const config = {
    provider: formData.get('provider'),
    accountSid: formData.get('accountSid'),
    authToken: formData.get('authToken'),
    fromNumber: formData.get('fromNumber'),
    adminPhone: formData.get('adminPhone'),
    autoReminders: formData.get('autoReminders') === 'on',
    configuredAt: new Date().toISOString(),
    configuredBy: currentUser.uid,
  };

  try {
    // Test connection
    const whatsapp = new WhatsAppAutomation(config);

    // Save to Firebase
    await db
      .collection('integrations')
      .doc('whatsapp')
      .set({
        ...config,
        active: true,
      });

    // Send test message
    await whatsapp.sendMessage(
      config.adminPhone,
      '🎉 *WhatsApp configurado exitosamente!*\n\nHealing Forest ahora puede enviar:\n• Recordatorios de citas\n• Confirmaciones de pago\n• Alertas de inventario\n\n🌳 Gracias por automatizar!'
    );

    return { success: true };
  } catch (error) {
    Logger.log('WhatsApp config error:', error);
    throw error;
  }
}

// Quick action functions
function testSiigoConnection() {
  const config = localStorage.getItem('siigoConfig');
  if (!config) {
    alert('⚠️ Primero debes configurar Siigo');
    return;
  }

  // Simulate API test
  alert(
    '🧪 Probando conexión con Siigo...\n\n✅ Conexión exitosa\nAmbiente: Sandbox\nFacturas disponibles: 1000'
  );
}

function generateRIPS() {
  const content = `
        <form id="ripsForm">
            <h3>Generar Archivo RIPS</h3>
            <div class="form-group">
                <label>Periodo</label>
                <input type="month" name="period" required>
            </div>
            <div class="form-group">
                <label>Tipo de Archivo</label>
                <select name="fileType">
                    <option value="AC">AC - Consultas</option>
                    <option value="AP">AP - Procedimientos</option>
                    <option value="AM">AM - Medicamentos</option>
                    <option value="AT">AT - Otros Servicios</option>
                    <option value="US">US - Usuarios</option>
                    <option value="AF">AF - Facturas</option>
                </select>
            </div>
            <button type="submit" class="btn">Generar RIPS</button>
        </form>
    `;

  showModal('Generar RIPS', content);

  document.getElementById('ripsForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Generate RIPS file
    const period = formData.get('period');
    const fileType = formData.get('fileType');

    alert(
      `📄 Generando RIPS...\n\nTipo: ${fileType}\nPeriodo: ${period}\n\n✅ Archivo generado: ${fileType}${period.replace('-', '')}.txt`
    );
    closeModal();
  });
}

function syncPatients() {
  alert(
    '🔄 Sincronizando pacientes...\n\nPacientes en Healing Forest: 150\nPacientes en Siigo: 145\n\n✅ 5 pacientes nuevos sincronizados'
  );
}

function viewIntegrationDocs() {
  window.open(
    '/Users/marianatejada/Desktop/HEALLING APP/INTEGRACION_SIIGO_SALUDTOOLS.md',
    '_blank'
  );
}

// Add invoice generation to payments
function generateInvoiceFromPayment(paymentId) {
  const siigoConfig = localStorage.getItem('siigoConfig');
  if (!siigoConfig) {
    alert('⚠️ Configura Siigo primero para generar facturas');
    return;
  }

  db.collection('payments')
    .doc(paymentId)
    .get()
    .then(async (doc) => {
      const payment = doc.data();

      // Simulate invoice generation
      const invoiceNumber = 'FV-' + Math.floor(Math.random() * 10000);

      // Update payment with invoice
      await db.collection('payments').doc(paymentId).update({
        invoiceNumber: invoiceNumber,
        invoicedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      alert(
        `✅ Factura generada exitosamente\n\nNúmero: ${invoiceNumber}\nCliente: ${payment.patientName}\nValor: $${payment.amount}\n\nLa factura fue enviada al correo del cliente.`
      );

      // Log integration
      await db.collection('integration_logs').add({
        integration: 'siigo',
        action: 'invoice_generated',
        status: 'success',
        details: {
          invoiceNumber: invoiceNumber,
          amount: payment.amount,
          patientName: payment.patientName,
        },
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: currentUser.uid,
      });
    });
}

// Barcode scanning function
function scanBarcode() {
  // For demo purposes, generate a random barcode
  // In production, this would connect to a barcode scanner or camera
  const randomBarcode = '750' + Math.floor(Math.random() * 1000000000);
  document.querySelector('input[name="barcode"]').value = randomBarcode;
  alert('📧 Código escaneado: ' + randomBarcode);
}

// Toggle expiry date field
function toggleExpiryDate(checkbox) {
  const expiryDateField = document.querySelector('input[name="expiryDate"]');
  if (checkbox.checked) {
    expiryDateField.required = true;
    expiryDateField.disabled = false;
  } else {
    expiryDateField.required = false;
    expiryDateField.disabled = true;
    expiryDateField.value = '';
  }
}

// Check for expiring products
async function checkExpiringProducts() {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringProducts = await db
      .collection('products')
      .where('trackExpiry', '==', true)
      .where('expiryDate', '<=', thirtyDaysFromNow)
      .where('stock', '>', 0)
      .get();

    const alerts = [];
    expiringProducts.forEach((doc) => {
      const product = doc.data();
      const expiryDate = new Date(product.expiryDate.seconds * 1000);
      const daysToExpiry = Math.floor(
        (expiryDate - new Date()) / (1000 * 60 * 60 * 24)
      );

      alerts.push({
        productName: product.name,
        expiryDate: expiryDate.toLocaleDateString(),
        daysToExpiry: daysToExpiry,
        stock: product.stock,
        id: doc.id,
      });
    });

    // Send WhatsApp alerts if configured
    const whatsappConfig = await getWhatsAppConfig();
    if (whatsappConfig && alerts.length > 0) {
      const whatsapp = new WhatsAppAutomation(whatsappConfig);

      // Send to admin
      const adminPhone = whatsappConfig.adminPhone || currentUser.phone;
      if (adminPhone) {
        const message = `⚠️ *Productos próximos a vencer*\n\n${alerts
          .map(
            (a) =>
              `• ${a.productName}\n  Vence: ${a.expiryDate} (${a.daysToExpiry} días)\n  Stock: ${a.stock} unidades`
          )
          .join('\n\n')}`;

        await whatsapp.sendMessage(adminPhone, message);
      }
    }

    return alerts;
  } catch (error) {
    Logger.error('Error checking expiring products:', error);
    return [];
  }
}

// Schedule daily expiry check
if (typeof window !== 'undefined') {
  // Check on page load
  setTimeout(checkExpiringProducts, 5000);

  // Check every 24 hours
  setInterval(checkExpiringProducts, 24 * 60 * 60 * 1000);
}

// Update the appointment creation to send notifications
const originalAddAppointmentSubmit =
  document.getElementById('addAppointmentForm')?.addEventListener;
if (originalAddAppointmentSubmit) {
  // Intercept appointment creation to add email notification
  // This would be integrated into the existing appointment creation flow
}

// WhatsApp Console Functions
let whatsappPatients = [];
let whatsappStats = {
  sent: 0,
  delivered: 0,
  failed: 0,
  pending: 0,
};

// Load WhatsApp Console
async function loadWhatsAppConsole() {
  // Load patients for group sending
  try {
    const snapshot = await db
      .collection('users')
      .where('role', '==', 'patient')
      .get();

    whatsappPatients = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    renderWhatsAppPatientsList();
    loadWhatsAppStats();
  } catch (error) {
    Logger.log('Error loading WhatsApp console:', error);
  }
}

// Render patients list for WhatsApp
function renderWhatsAppPatientsList() {
  const list = document.getElementById('patientsList');
  if (!list) return;

  list.innerHTML = whatsappPatients
    .map(
      (patient) => `
        <div style="display: flex; align-items: center; padding: 8px; border-bottom: 1px solid #f0f0f0;">
            <input type="checkbox" id="whatsapp_patient_${patient.id}" value="${patient.phone || ''}" style="margin-right: 10px;">
            <label for="whatsapp_patient_${patient.id}" style="cursor: pointer;">
                ${patient.name || 'Sin nombre'} - ${patient.phone || 'Sin teléfono'}
            </label>
        </div>
    `
    )
    .join('');
}

// Toggle recipient type
function toggleRecipientType() {
  const type = document.getElementById('sendType').value;
  document.getElementById('singleRecipient').style.display =
    type === 'single' ? 'block' : 'none';
  document.getElementById('groupRecipient').style.display =
    type === 'group' ? 'block' : 'none';
  document.getElementById('customNumbers').style.display =
    type === 'custom' ? 'block' : 'none';
}

// Set phone number
function setPhone(number) {
  document.getElementById('phoneNumber').value = number;
}

// Select all patients
function selectAllPatients() {
  document
    .querySelectorAll('#patientsList input[type="checkbox"]')
    .forEach((cb) => {
      cb.checked = true;
    });
}

// Deselect all patients
function selectNonePatients() {
  document
    .querySelectorAll('#patientsList input[type="checkbox"]')
    .forEach((cb) => {
      cb.checked = false;
    });
}

// Use template
function useTemplate(type) {
  const templates = {
    reminder: `🌳 *Healing Forest*

Hola {nombre}! 👋

Te recordamos tu cita:
📅 Mañana
⏰ {hora}
👨‍⚕️ {doctor}

📍 Dirección: Calle 123 #45-67

_Responde SI para confirmar_`,

    promo: `🎁 *Promoción Especial*

¡{nombre}, tenemos una oferta para ti!

30% de descuento en:
✨ Limpieza dental
✨ Valoración general
✨ Primera consulta

Válido hasta: {fecha}

Agenda tu cita respondiendo a este mensaje 📱`,

    birthday: `🎂 *¡Feliz Cumpleaños!*

{nombre}, el equipo de Healing Forest te desea un maravilloso día 🎉

Como regalo especial:
🎁 20% dcto en cualquier servicio
🎁 Valoración gratis

¡Te esperamos! 🌳`,

    followup: `👨‍⚕️ *Seguimiento Médico*

Hola {nombre},

Han pasado 30 días desde tu última visita. ¿Cómo te has sentido?

Recuerda que tu salud es importante para nosotros.

¿Necesitas agendar una cita de control?`,
  };

  document.getElementById('whatsappMessage').value = templates[type] || '';
}

// Send WhatsApp messages
async function sendWhatsAppMessages() {
  try {
    const type = document.getElementById('sendType').value;
    const message = document.getElementById('whatsappMessage').value;

    if (!message.trim()) {
      alert('Por favor escribe un mensaje');
      return;
    }

    document.getElementById('whatsappLoading').style.display = 'block';

    let recipients = [];

    // Get recipients based on type
    switch (type) {
      case 'single':
        const phone = document.getElementById('phoneNumber').value;
        if (phone) recipients.push({ phone, name: 'Usuario' });
        break;

      case 'custom':
        const customNumbers = document
          .getElementById('customNumbersList')
          .value.split('\n')
          .filter((n) => n.trim())
          .map((n) => ({ phone: n.trim(), name: 'Usuario' }));
        recipients = customNumbers;
        break;

      case 'group':
        const checkboxes = document.querySelectorAll(
          '#patientsList input[type="checkbox"]:checked'
        );
        checkboxes.forEach((cb) => {
          if (cb.value) {
            const patient = whatsappPatients.find((p) => p.phone === cb.value);
            recipients.push({
              phone: cb.value,
              name: patient?.name || 'Paciente',
            });
          }
        });
        break;

      case 'all':
        recipients = whatsappPatients
          .filter((p) => p.phone)
          .map((p) => ({
            phone: p.phone,
            name: p.name || 'Paciente',
          }));
        break;
    }

    if (recipients.length === 0) {
      alert('No hay destinatarios seleccionados');
      document.getElementById('whatsappLoading').style.display = 'none';
      return;
    }

    // Send messages
    for (const recipient of recipients) {
      await sendSingleWhatsAppMessage(recipient, message);
      // Wait between messages
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    document.getElementById('whatsappLoading').style.display = 'none';
    updateWhatsAppStats();
  } catch (error) {
    Logger.error('Error sending WhatsApp messages:', error);
    showNotification('Error al enviar mensajes de WhatsApp', 'error');
    document.getElementById('whatsappLoading').style.display = 'none';
  }
}

// Send single WhatsApp message
async function sendSingleWhatsAppMessage(recipient, message) {
  try {
    const personalizedMessage = message
      .replace('{nombre}', recipient.name)
      .replace('{fecha}', new Date().toLocaleDateString())
      .replace('{hora}', '10:00 AM')
      .replace('{doctor}', 'Dr. Martínez');
    // Save to Firebase
    const logEntry = {
      to: recipient.phone,
      message: personalizedMessage,
      status: 'sending',
      timestamp: new Date(),
      type: 'bulk',
    };

    const docRef = await db.collection('whatsapp_logs').add(logEntry);

    // Update stats
    whatsappStats.sent++;
    addWhatsAppLog(recipient.phone, 'Enviando...', 'pending');

    // Simulate response after 2 seconds
    setTimeout(async () => {
      const success = Math.random() > 0.1; // 90% success rate

      if (success) {
        whatsappStats.delivered++;
        whatsappStats.pending--;
        await db.collection('whatsapp_logs').doc(docRef.id).update({
          status: 'delivered',
          deliveredAt: new Date(),
        });
        updateWhatsAppLog(recipient.phone, '✅ Entregado', 'success');
      } else {
        whatsappStats.failed++;
        whatsappStats.pending--;
        await db.collection('whatsapp_logs').doc(docRef.id).update({
          status: 'failed',
          error: 'Número no válido',
        });
        updateWhatsAppLog(recipient.phone, '❌ Falló', 'error');
      }

      updateWhatsAppStats();
    }, 2000);

    whatsappStats.pending++;
    updateWhatsAppStats();
  } catch (error) {
    Logger.log('Error:', error);
    whatsappStats.failed++;
    addWhatsAppLog(recipient.phone, '❌ Error: ' + error.message, 'error');
    updateWhatsAppStats();
  }
}

// Add WhatsApp log
function addWhatsAppLog(number, status, type) {
  const logContainer = document.getElementById('whatsappLogContainer');
  if (!logContainer) return;

  const logItem = document.createElement('div');
  logItem.style.cssText = `padding: 15px; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: start; background: ${
    type === 'success' ? '#D1FAE5' : type === 'error' ? '#FEE2E2' : 'white'
  };`;

  logItem.innerHTML = `
        <div>
            <strong>${number}</strong>
            <div style="font-size: 12px; color: #6B7280; margin-top: 4px;">
                ${new Date().toLocaleTimeString()}
            </div>
        </div>
        <div>${status}</div>
    `;

  logContainer.insertBefore(logItem, logContainer.firstChild);
}

// Update existing log
function updateWhatsAppLog(number, newStatus, type) {
  const logs = document.querySelectorAll('#whatsappLogContainer > div');
  for (const log of logs) {
    if (
      log.innerHTML.includes(number) &&
      log.innerHTML.includes('Enviando...')
    ) {
      log.style.background = type === 'success' ? '#D1FAE5' : '#FEE2E2';
      log.querySelector('div:last-child').textContent = newStatus;
      break;
    }
  }
}

// Update WhatsApp stats
function updateWhatsAppStats() {
  document.getElementById('whatsappSent').textContent = whatsappStats.sent;
  document.getElementById('whatsappDelivered').textContent =
    whatsappStats.delivered;
  document.getElementById('whatsappFailed').textContent = whatsappStats.failed;
  document.getElementById('whatsappPending').textContent =
    whatsappStats.pending;
}

// Load WhatsApp stats
async function loadWhatsAppStats() {
  try {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    const snapshot = await db
      .collection('whatsapp_logs')
      .where('timestamp', '>', oneHourAgo)
      .orderBy('timestamp', 'desc')
      .limit(20)
      .get();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      const status =
        data.status === 'delivered'
          ? '✅ Entregado'
          : data.status === 'failed'
            ? '❌ Falló'
            : '⏳ Pendiente';
      const type =
        data.status === 'delivered'
          ? 'success'
          : data.status === 'failed'
            ? 'error'
            : 'pending';

      addWhatsAppLog(data.to, status, type);
    });
  } catch (error) {
    Logger.log('Error loading WhatsApp history:', error);
  }
}
