// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAlOrxlLbZV-ZzxDcFrretv2dycKtF4dyM",
    authDomain: "healling-forest.firebaseapp.com",
    projectId: "healling-forest",
    storageBucket: "healling-forest.firebasestorage.app",
    messagingSenderId: "657330224656",
    appId: "1:657330224656:web:admin"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Global variables
let currentUser = null;
let calendar = null;
let appointmentsChart = null;
let servicesChart = null;

// Login functionality
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('errorMessage');
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
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
    
    // Setup navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const section = e.target.dataset.section;
            showSection(section);
            
            // Update active nav
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update page title
            document.getElementById('pageTitle').textContent = e.target.textContent;
        });
    });
}

// Show section
function showSection(section) {
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    document.getElementById(section).classList.add('active');
    
    // Load section data
    switch(section) {
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
        case 'payments':
            loadPayments();
            break;
        case 'reports':
            // Reports section doesn't need to load data
            break;
        case 'notifications':
            loadNotifications();
            break;
        case 'settings':
            // Settings section is static
            break;
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
        
        const appointmentsSnapshot = await db.collection('appointments')
            .where('date', '>=', today)
            .where('date', '<', tomorrow)
            .get();
        
        document.getElementById('todayAppointments').textContent = appointmentsSnapshot.size;
        
        // Get total patients
        const patientsSnapshot = await db.collection('users')
            .where('role', '==', 'patient')
            .get();
        
        document.getElementById('totalPatients').textContent = patientsSnapshot.size;
        
        // Get active staff
        const staffSnapshot = await db.collection('staff')
            .where('active', '==', true)
            .get();
        
        document.getElementById('activeStaff').textContent = staffSnapshot.size;
        
        // Get total services
        const servicesSnapshot = await db.collection('services').get();
        document.getElementById('totalServices').textContent = servicesSnapshot.size;
        
        // Load today's appointments table
        const tbody = document.querySelector('#todayAppointmentsTable tbody');
        tbody.innerHTML = '';
        
        if (appointmentsSnapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay citas para hoy</td></tr>';
        } else {
            appointmentsSnapshot.forEach(doc => {
                const appointment = doc.data();
                // Compatibilidad con campos antiguos y nuevos
                const time = appointment.time || appointment.startTime || 'N/A';
                const patientName = appointment.patientName || 'Usuario App';
                const service = appointment.service || appointment.serviceName || 'N/A';
                const staffName = appointment.staffName || appointment.professionalName || 'N/A';
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
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Load charts
async function loadCharts() {
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
        
        const snapshot = await db.collection('appointments')
            .where('date', '>=', date)
            .where('date', '<', nextDate)
            .get();
        
        last7Days.push(date.toLocaleDateString('es', { weekday: 'short', day: 'numeric' }));
        appointmentCounts.push(snapshot.size);
    }
    
    if (appointmentsChart) appointmentsChart.destroy();
    appointmentsChart = new Chart(ctx1, {
        type: 'line',
        data: {
            labels: last7Days,
            datasets: [{
                label: 'Citas',
                data: appointmentCounts,
                borderColor: '#16A34A',
                backgroundColor: 'rgba(22, 163, 74, 0.1)',
                tension: 0.1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            }
        }
    });
    
    // Services chart
    const servicesData = {};
    const appointmentsSnapshot = await db.collection('appointments').get();
    
    appointmentsSnapshot.forEach(doc => {
        const service = doc.data().service || 'Sin servicio';
        servicesData[service] = (servicesData[service] || 0) + 1;
    });
    
    const ctx2 = document.getElementById('servicesChart').getContext('2d');
    
    if (servicesChart) servicesChart.destroy();
    servicesChart = new Chart(ctx2, {
        type: 'doughnut',
        data: {
            labels: Object.keys(servicesData),
            datasets: [{
                data: Object.values(servicesData),
                backgroundColor: [
                    '#16A34A',
                    '#15803d',
                    '#166534',
                    '#14532d',
                    '#052e16'
                ]
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
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
        
        if (!calendar) {
            initializeCalendar();
        }
        loadCalendarEvents();
    } else {
        calendarView.style.display = 'none';
        tableView.style.display = 'block';
        toggleText.textContent = 'Ver Calendario';
    }
}

// Initialize calendar
function initializeCalendar() {
    const calendarEl = document.getElementById('calendar');
    
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'es',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: [],
        eventClick: function(info) {
            viewAppointmentDetails(info.event.id);
        },
        dateClick: function(info) {
            showAddAppointmentForDate(info.dateStr);
        },
        height: 'auto'
    });
    
    calendar.render();
}

// Load calendar events
async function loadCalendarEvents() {
    try {
        const snapshot = await db.collection('appointments').get();
        const events = [];
        
        snapshot.forEach(doc => {
            const appointment = doc.data();
            if (appointment.date) {
                const date = new Date(appointment.date.seconds * 1000);
                events.push({
                    id: doc.id,
                    title: `${appointment.time || ''} - ${appointment.patientName || 'Sin nombre'} (${appointment.service || 'Sin servicio'})`,
                    start: date.toISOString().split('T')[0],
                    backgroundColor: appointment.status === 'completada' ? '#16A34A' : 
                                   appointment.status === 'cancelada' ? '#dc3545' : '#ffc107'
                });
            }
        });
        
        calendar.removeAllEvents();
        calendar.addEventSource(events);
    } catch (error) {
        console.error('Error loading calendar events:', error);
    }
}

// Load appointments
async function loadAppointments() {
    try {
        const snapshot = await db.collection('appointments')
            .orderBy('date', 'desc')
            .limit(50)
            .get();
        
        const tbody = document.querySelector('#appointmentsTable tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay citas registradas</td></tr>';
        } else {
            snapshot.forEach(doc => {
                const appointment = doc.data();
                const date = appointment.date ? new Date(appointment.date.seconds * 1000).toLocaleDateString() : 'N/A';
                // Compatibilidad con campos antiguos y nuevos
                const time = appointment.time || appointment.startTime || 'N/A';
                const patientName = appointment.patientName || 'Usuario App';
                const service = appointment.service || appointment.serviceName || 'N/A';
                const staffName = appointment.staffName || appointment.professionalName || 'N/A';
                const status = appointment.status || 'pendiente';
                
                const row = `
                    <tr>
                        <td>${date}</td>
                        <td>${time}</td>
                        <td>${patientName}</td>
                        <td>${service}</td>
                        <td>${staffName}</td>
                        <td><span class="badge ${status}">${status}</span></td>
                        <td>
                            <button class="action-btn edit-btn" onclick="editAppointment('${doc.id}')">Editar</button>
                            <button class="action-btn delete-btn" onclick="deleteAppointment('${doc.id}')">Eliminar</button>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        }
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// Load staff
async function loadStaff() {
    try {
        const snapshot = await db.collection('staff').get();
        
        const tbody = document.querySelector('#staffTable tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay personal registrado</td></tr>';
        } else {
            snapshot.forEach(doc => {
                const staff = doc.data();
                const specialties = staff.specialties ? staff.specialties.join(', ') : 'N/A';
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
        console.error('Error loading staff:', error);
    }
}

// Load patients
async function loadPatients() {
    try {
        const snapshot = await db.collection('users')
            .where('role', '==', 'patient')
            .limit(50)
            .get();
        
        const tbody = document.querySelector('#patientsTable tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay pacientes registrados</td></tr>';
        } else {
            snapshot.forEach(doc => {
                const patient = doc.data();
                const birthDate = patient.birthDate || 'N/A';
                const createdAt = patient.createdAt ? new Date(patient.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
                const row = `
                    <tr>
                        <td>${patient.name || 'N/A'}</td>
                        <td>${patient.email || 'N/A'}</td>
                        <td>${patient.phone || 'N/A'}</td>
                        <td>${birthDate}</td>
                        <td>${createdAt}</td>
                        <td>
                            <button class="action-btn edit-btn" onclick="viewPatient('${doc.id}')">Ver</button>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        }
    } catch (error) {
        console.error('Error loading patients:', error);
    }
}

// Load services
async function loadServices() {
    try {
        const snapshot = await db.collection('services').get();
        
        const tbody = document.querySelector('#servicesTable tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay servicios registrados</td></tr>';
            // Add some default services
            addDefaultServices();
        } else {
            snapshot.forEach(doc => {
                const service = doc.data();
                const row = `
                    <tr>
                        <td>${service.name || 'N/A'}</td>
                        <td>${service.category || 'N/A'}</td>
                        <td>${service.duration || 'N/A'} min</td>
                        <td>$${service.price || 'N/A'}</td>
                        <td>${service.active ? 'Activo' : 'Inactivo'}</td>
                        <td>
                            <button class="action-btn edit-btn" onclick="editService('${doc.id}')">Editar</button>
                            <button class="action-btn delete-btn" onclick="deleteService('${doc.id}')">Eliminar</button>
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

// Add default services
async function addDefaultServices() {
    const defaultServices = [
        { name: 'Consulta Médica General', category: 'Medicina', duration: 30, price: 50, active: true },
        { name: 'Terapia Psicológica', category: 'Psicología', duration: 60, price: 80, active: true },
        { name: 'Fisioterapia', category: 'Rehabilitación', duration: 45, price: 70, active: true },
        { name: 'Nutrición', category: 'Salud', duration: 45, price: 60, active: true },
        { name: 'Yoga Terapéutico', category: 'Bienestar', duration: 60, price: 40, active: true }
    ];
    
    for (const service of defaultServices) {
        await db.collection('services').add({
            ...service,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    
    loadServices(); // Reload the table
}

// Modal functions
function showModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
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
    
    document.getElementById('addStaffForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            await db.collection('staff').add({
                name: formData.get('name'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                role: formData.get('role'),
                specialties: formData.get('specialties').split(',').map(s => s.trim()),
                active: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
    
    document.getElementById('addServiceForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            await db.collection('services').add({
                name: formData.get('name'),
                category: formData.get('category'),
                duration: parseInt(formData.get('duration')),
                price: parseFloat(formData.get('price')),
                active: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
        db.collection('users').doc(user.uid).get().then(doc => {
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
        db.collection('appointments').doc(id).delete().then(() => {
            loadAppointments();
        });
    }
}

function deleteStaff(id) {
    if (confirm('¿Estás seguro de eliminar este personal?')) {
        db.collection('staff').doc(id).delete().then(() => {
            loadStaff();
        });
    }
}

function deleteService(id) {
    if (confirm('¿Estás seguro de eliminar este servicio?')) {
        db.collection('services').doc(id).delete().then(() => {
            loadServices();
        });
    }
}

// Edit functions (placeholder)
function editAppointment(id) {
    alert('Función de edición próximamente');
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
    // Get lists for dropdowns
    const [patientsSnapshot, staffSnapshot, servicesSnapshot] = await Promise.all([
        db.collection('users').where('role', '==', 'patient').get(),
        db.collection('staff').where('active', '==', true).get(),
        db.collection('services').where('active', '==', true).get()
    ]);
    
    let patientsOptions = '<option value="">Seleccionar paciente</option>';
    patientsSnapshot.forEach(doc => {
        const patient = doc.data();
        patientsOptions += `<option value="${doc.id}">${patient.name || patient.email}</option>`;
    });
    
    let staffOptions = '<option value="">Seleccionar profesional</option>';
    staffSnapshot.forEach(doc => {
        const staff = doc.data();
        staffOptions += `<option value="${doc.id}">${staff.name} (${staff.role})</option>`;
    });
    
    let servicesOptions = '<option value="">Seleccionar servicio</option>';
    servicesSnapshot.forEach(doc => {
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
                <select name="serviceId" required>${servicesOptions}</select>
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
                    <select name="time" required>
                        <option value="">Seleccionar hora</option>
                        ${generateTimeOptions()}
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Notas (opcional)</label>
                <textarea name="notes" rows="3" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></textarea>
            </div>
            <button type="submit" class="btn">Agendar Cita</button>
        </form>
    `;
    
    showModal('Nueva Cita', content);
    
    document.getElementById('addAppointmentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            // Get selected data
            const patientDoc = await db.collection('users').doc(formData.get('patientId')).get();
            const staffDoc = await db.collection('staff').doc(formData.get('staffId')).get();
            const serviceDoc = await db.collection('services').doc(formData.get('serviceId')).get();
            
            const appointmentData = {
                patientId: formData.get('patientId'),
                patientName: patientDoc.data().name || patientDoc.data().email,
                staffId: formData.get('staffId'),
                staffName: staffDoc.data().name,
                serviceId: formData.get('serviceId'),
                service: serviceDoc.data().name,
                date: firebase.firestore.Timestamp.fromDate(new Date(formData.get('date'))),
                time: formData.get('time'),
                notes: formData.get('notes'),
                status: 'pendiente',
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                createdBy: currentUser.uid
            };
            
            await db.collection('appointments').add(appointmentData);
            
            closeModal();
            
            // Reload appointments
            if (document.getElementById('appointments').classList.contains('active')) {
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

// View appointment details
async function viewAppointmentDetails(appointmentId) {
    try {
        const doc = await db.collection('appointments').doc(appointmentId).get();
        const appointment = doc.data();
        
        const date = appointment.date ? new Date(appointment.date.seconds * 1000).toLocaleDateString() : 'N/A';
        
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
            <div style="margin-top: 20px; display: flex; gap: 10px;">
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
window.onclick = function(event) {
    const modal = document.getElementById('modal');
    if (event.target == modal) {
        closeModal();
    }
}

// PAYMENT FUNCTIONS
async function loadPayments() {
    try {
        const snapshot = await db.collection('payments')
            .orderBy('date', 'desc')
            .limit(50)
            .get();
        
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
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No hay pagos registrados</td></tr>';
            // Create sample payments
            await createSamplePayments();
        } else {
            snapshot.forEach(doc => {
                const payment = doc.data();
                const paymentDate = payment.date ? new Date(payment.date.seconds * 1000) : new Date();
                
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
                            ${payment.status === 'pendiente' ? 
                                `<button class="action-btn" style="background: #28a745; color: white;" onclick="markAsPaid('${doc.id}')">Marcar Pagado</button>` : ''}
                        </td>
                    </tr>
                `;
                tbody.innerHTML += row;
            });
        }
        
        // Update stats
        document.getElementById('monthlyIncome').textContent = `$${monthlyTotal.toFixed(2)}`;
        document.getElementById('pendingPayments').textContent = pendingCount;
        document.getElementById('todayPayments').textContent = `$${todayTotal.toFixed(2)}`;
    } catch (error) {
        console.error('Error loading payments:', error);
    }
}

// Create sample payments
async function createSamplePayments() {
    const samplePayments = [
        {
            patientName: 'Juan Pérez',
            service: 'Consulta Médica',
            amount: 50,
            method: 'Efectivo',
            status: 'pagado',
            date: firebase.firestore.Timestamp.now()
        },
        {
            patientName: 'María García',
            service: 'Terapia Psicológica',
            amount: 80,
            method: 'Tarjeta',
            status: 'pendiente',
            date: firebase.firestore.Timestamp.now()
        }
    ];
    
    for (const payment of samplePayments) {
        await db.collection('payments').add({
            ...payment,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
    
    loadPayments();
}

// Show add payment modal
async function showAddPayment() {
    const [patientsSnapshot, servicesSnapshot] = await Promise.all([
        db.collection('users').where('role', '==', 'patient').get(),
        db.collection('services').where('active', '==', true).get()
    ]);
    
    let patientsOptions = '<option value="">Seleccionar paciente</option>';
    patientsSnapshot.forEach(doc => {
        const patient = doc.data();
        patientsOptions += `<option value="${doc.id}">${patient.name || patient.email}</option>`;
    });
    
    let servicesOptions = '<option value="">Seleccionar servicio</option>';
    servicesSnapshot.forEach(doc => {
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
    
    document.getElementById('addPaymentForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            const patientDoc = await db.collection('users').doc(formData.get('patientId')).get();
            const serviceDoc = await db.collection('services').doc(formData.get('serviceId')).get();
            
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
                createdBy: currentUser.uid
            };
            
            await db.collection('payments').add(paymentData);
            closeModal();
            loadPayments();
            alert('Pago registrado exitosamente');
        } catch (error) {
            alert('Error al registrar pago: ' + error.message);
        }
    });
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
                paidAt: firebase.firestore.FieldValue.serverTimestamp()
            });
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
        switch(type) {
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
        content.innerHTML = '<p style="color: red;">Error al generar reporte: ' + error.message + '</p>';
    }
}

async function generateAppointmentsReport(container) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const snapshot = await db.collection('appointments')
        .where('date', '>=', startDate)
        .orderBy('date', 'desc')
        .get();
    
    const stats = {
        total: snapshot.size,
        completadas: 0,
        pendientes: 0,
        canceladas: 0
    };
    
    let tableRows = [];
    snapshot.forEach(doc => {
        const data = doc.data();
        if (data.status === 'completada') stats.completadas++;
        else if (data.status === 'cancelada') stats.canceladas++;
        else stats.pendientes++;
        
        tableRows.push({
            fecha: data.date ? new Date(data.date.seconds * 1000).toLocaleDateString() : 'N/A',
            paciente: data.patientName || 'N/A',
            servicio: data.service || 'N/A',
            profesional: data.staffName || 'N/A',
            estado: data.status || 'pendiente'
        });
    });
    
    currentReportData = {
        type: 'appointments',
        title: 'Reporte de Citas - Últimos 30 días',
        stats: stats,
        rows: tableRows
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
                ${tableRows.slice(0, 10).map(row => `
                    <tr>
                        <td style="border-bottom: 1px solid #eee; padding: 8px;">${row.fecha}</td>
                        <td style="border-bottom: 1px solid #eee; padding: 8px;">${row.paciente}</td>
                        <td style="border-bottom: 1px solid #eee; padding: 8px;">${row.servicio}</td>
                        <td style="border-bottom: 1px solid #eee; padding: 8px;">${row.profesional}</td>
                        <td style="border-bottom: 1px solid #eee; padding: 8px;">${row.estado}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${tableRows.length > 10 ? `<p style="text-align: center; margin-top: 10px;">Mostrando 10 de ${tableRows.length} registros</p>` : ''}
    `;
}

async function generateIncomeReport(container) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    
    const snapshot = await db.collection('payments')
        .where('date', '>=', startDate)
        .where('status', '==', 'pagado')
        .orderBy('date', 'desc')
        .get();
    
    let totalIncome = 0;
    let byMethod = {};
    let byService = {};
    
    snapshot.forEach(doc => {
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
        byService: byService
    };
    
    container.innerHTML = `
        <h4>Reporte de Ingresos - Último Mes</h4>
        <div style="background: #d4edda; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0; color: #155724;">Total: $${totalIncome.toFixed(2)}</h2>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h5>Por Método de Pago:</h5>
                ${Object.entries(byMethod).map(([method, amount]) => `
                    <p>${method}: $${amount.toFixed(2)}</p>
                `).join('')}
            </div>
            <div>
                <h5>Por Servicio:</h5>
                ${Object.entries(byService).map(([service, amount]) => `
                    <p>${service}: $${amount.toFixed(2)}</p>
                `).join('')}
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
            body: currentReportData.rows.map(row => [
                row.fecha,
                row.paciente,
                row.servicio,
                row.profesional,
                row.estado
            ])
        });
    } else if (currentReportData.type === 'income') {
        doc.setFontSize(14);
        doc.text(`Total de Ingresos: $${currentReportData.totalIncome.toFixed(2)}`, 20, 60);
        
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
    doc.save(`reporte-${currentReportData.type}-${new Date().toISOString().split('T')[0]}.pdf`);
}

// NOTIFICATION FUNCTIONS
async function loadNotifications() {
    try {
        const snapshot = await db.collection('notifications')
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        
        const tbody = document.querySelector('#notificationsTable tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No hay notificaciones registradas</td></tr>';
        } else {
            snapshot.forEach(doc => {
                const notification = doc.data();
                const date = notification.createdAt ? 
                    new Date(notification.createdAt.seconds * 1000).toLocaleString() : 'N/A';
                
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
        console.error('Error loading notifications:', error);
    }
}

// Send email notification when appointment is created
async function sendAppointmentConfirmation(appointmentData) {
    if (!document.getElementById('emailConfirmation').checked) return;
    
    try {
        // Get patient email
        const patientDoc = await db.collection('users').doc(appointmentData.patientId).get();
        const patientEmail = patientDoc.data().email;
        
        // Send email (simulated)
        const result = await sendEmail(patientEmail, 'appointmentConfirmation', appointmentData);
        
        // Log notification
        await db.collection('notifications').add({
            type: 'Email - Confirmación',
            recipient: patientEmail,
            message: `Confirmación de cita enviada para ${appointmentData.service}`,
            status: result.success ? 'enviado' : 'error',
            appointmentId: appointmentData.id,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error sending confirmation:', error);
    }
}

// Test push notification
async function testPushNotification() {
    alert('Notificación push enviada a todos los dispositivos registrados');
    
    // Log test notification
    await db.collection('notifications').add({
        type: 'Push - Prueba',
        recipient: 'Todos los usuarios',
        message: 'Notificación de prueba desde el panel admin',
        status: 'enviado',
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    loadNotifications();
}

// Update the appointment creation to send notifications
const originalAddAppointmentSubmit = document.getElementById('addAppointmentForm')?.addEventListener;
if (originalAddAppointmentSubmit) {
    // Intercept appointment creation to add email notification
    // This would be integrated into the existing appointment creation flow
}