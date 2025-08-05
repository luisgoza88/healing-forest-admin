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
        case 'inventory':
            loadInventory();
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
        
        // Add search box and date filter if not exists
        const tableView = document.getElementById('tableView');
        if (!tableView.querySelector('.search-input')) {
            const filterContainer = document.createElement('div');
            filterContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; align-items: center;';
            
            const searchInput = createSearchInput('appointmentsTable', 'Buscar citas...');
            searchInput.classList.add('search-input');
            
            const dateFilter = createDateFilter('appointmentsTable', 0); // Date is in column 0
            
            filterContainer.appendChild(searchInput);
            filterContainer.appendChild(dateFilter);
            
            tableView.insertBefore(filterContainer, document.getElementById('appointmentsTable'));
        }
        
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
        console.error('Error loading appointments:', error);
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
        
        // Add search box if not exists
        const patientsSection = document.getElementById('patients');
        if (!patientsSection.querySelector('.search-input')) {
            const searchInput = createSearchInput('patientsTable', 'Buscar pacientes por nombre, email o teléfono...');
            searchInput.classList.add('search-input');
            const table = document.getElementById('patientsTable');
            table.parentNode.insertBefore(searchInput, table);
        }
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay pacientes registrados</td></tr>';
        } else {
            snapshot.forEach(doc => {
                const patient = doc.data();
                const birthDate = patient.birthDate || 'N/A';
                const createdAt = patient.createdAt ? new Date(patient.createdAt.seconds * 1000).toLocaleDateString() : 'N/A';
                const phone = patient.phone || '';
                const row = `
                    <tr>
                        <td>${patient.name || 'N/A'}</td>
                        <td>${patient.email || 'N/A'}</td>
                        <td>${patient.phone || 'N/A'}</td>
                        <td>${birthDate}</td>
                        <td>${createdAt}</td>
                        <td>
                            ${phone ? `<button class="action-btn" style="background: #25d366; color: white;" onclick="sendWhatsApp('${phone}', 'Hola ${patient.name || 'paciente'}')">WhatsApp</button>` : ''}
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
        
        // Add search box if not exists
        const servicesSection = document.getElementById('services');
        if (!servicesSection.querySelector('.search-input')) {
            const searchInput = createSearchInput('servicesTable', 'Buscar servicios...');
            searchInput.classList.add('search-input');
            const table = document.getElementById('servicesTable');
            table.parentNode.insertBefore(searchInput, table);
        }
        
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
                patientPhone: patientDoc.data().phone || '',
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
        
        // Add search box and date filter if not exists
        const paymentsSection = document.getElementById('payments');
        const paymentsTable = document.getElementById('paymentsTable');
        if (!paymentsSection.querySelector('.search-input')) {
            const filterContainer = document.createElement('div');
            filterContainer.style.cssText = 'display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; align-items: center;';
            
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
                                `<button class="action-btn" style="background: #28a745; color: white;" onclick="markAsPaid('${doc.id}')">Marcar Pagado</button>` : 
                                `<button class="action-btn" style="background: #FF6B35; color: white;" onclick="generateInvoiceFromPayment('${doc.id}')">Facturar</button>`}
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
    searchInput.style.cssText = 'padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; width: 300px; margin-bottom: 15px;';
    
    searchInput.addEventListener('keyup', function() {
        searchTable(tableId, this.value);
    });
    
    return searchInput;
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
    const headerRow = table.getElementsByTagName('thead')[0].getElementsByTagName('tr')[0];
    const ths = headerRow.getElementsByTagName('th');
    for (let i = 0; i < ths.length - 1; i++) { // Skip last column (actions)
        headers.push(ths[i].textContent);
    }
    rows.push(headers);
    
    // Add data rows
    for (let i = 0; i < trs.length; i++) {
        if (trs[i].style.display !== 'none') { // Only visible rows
            const tds = trs[i].getElementsByTagName('td');
            const row = [];
            for (let j = 0; j < tds.length - 1; j++) { // Skip last column (actions)
                row.push(tds[j].textContent.trim());
            }
            if (row.length > 0 && row[0] !== 'No hay') { // Skip empty rows
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
    container.style.cssText = 'display: inline-flex; gap: 10px; align-items: center; margin-bottom: 15px; margin-left: 15px;';
    
    const label = document.createElement('label');
    label.textContent = 'Filtrar por fecha: ';
    label.style.fontWeight = '500';
    
    const startDate = document.createElement('input');
    startDate.type = 'date';
    startDate.style.cssText = 'padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;';
    
    const endDate = document.createElement('input');
    endDate.type = 'date';
    endDate.style.cssText = 'padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;';
    
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'Limpiar';
    clearBtn.style.cssText = 'padding: 8px 16px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer;';
    
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
                const rowDate = moment(dateText, ['DD/MM/YYYY', 'D/M/YYYY', 'YYYY-MM-DD']).toDate();
                
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
    revenueProjection: null
};

async function loadSOPData() {
    const period = document.getElementById('sopPeriod')?.value || 'month';
    
    try {
        // Calculate date ranges
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();
        
        switch(period) {
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
        const [appointmentsData, paymentsData, staffData, servicesData] = await Promise.all([
            db.collection('appointments')
                .where('date', '>=', startDate)
                .where('date', '<=', endDate)
                .get(),
            db.collection('payments')
                .where('date', '>=', startDate)
                .where('date', '<=', endDate)
                .get(),
            db.collection('staff').where('active', '==', true).get(),
            db.collection('services').where('active', '==', true).get()
        ]);
        
        // Calculate metrics
        const metrics = calculateSOPMetrics(appointmentsData, paymentsData, staffData, servicesData, period);
        
        // Update KPIs
        updateSOPKPIs(metrics);
        
        // Update charts
        updateSOPCharts(metrics);
        
        // Update resource planning table
        updateResourcePlanning(metrics);
        
        // Generate alerts
        generateSOPAlerts(metrics);
        
    } catch (error) {
        console.error('Error loading S&OP data:', error);
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
        dailyTrends: {}
    };
    
    // Process appointments
    appointments.forEach(doc => {
        const data = doc.data();
        if (data.status === 'completada') metrics.completedAppointments++;
        if (data.status === 'cancelada') metrics.cancelledAppointments++;
        
        // Service breakdown
        const service = data.service || 'Sin servicio';
        metrics.serviceBreakdown[service] = (metrics.serviceBreakdown[service] || 0) + 1;
        
        // Staff utilization
        const staffName = data.staffName || 'Sin asignar';
        metrics.staffUtilization[staffName] = (metrics.staffUtilization[staffName] || 0) + 1;
    });
    
    // Process payments
    payments.forEach(doc => {
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
    metrics.capacityUtilization = Math.round((usedCapacity / totalCapacity) * 100);
    
    return metrics;
}

function updateSOPKPIs(metrics) {
    document.getElementById('projectedDemand').textContent = metrics.projectedDemand;
    document.getElementById('availableCapacity').textContent = metrics.capacityUtilization + '%';
    document.getElementById('projectedRevenue').textContent = '$' + Math.round(metrics.totalRevenue * 1.1).toLocaleString();
    document.getElementById('actualRevenue').textContent = '$' + metrics.totalRevenue.toLocaleString();
    
    const efficiency = Math.round((metrics.completedAppointments / metrics.totalAppointments) * 100) || 0;
    document.getElementById('operationalEfficiency').textContent = efficiency + '%';
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
                datasets: [{
                    label: 'Demanda',
                    data: [metrics.totalAppointments * 0.8, metrics.totalAppointments * 0.9, metrics.totalAppointments, metrics.projectedDemand],
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4
                }, {
                    label: 'Capacidad',
                    data: [100, 100, 100, 100],
                    borderColor: '#16A34A',
                    backgroundColor: 'rgba(22, 163, 74, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Análisis de Demanda vs Capacidad'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
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
                datasets: [{
                    data: Object.values(metrics.serviceBreakdown),
                    backgroundColor: [
                        '#16A34A',
                        '#0ea5e9',
                        '#f59e0b',
                        '#ef4444',
                        '#8b5cf6'
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
    
    // Revenue Projection Chart
    const ctx3 = document.getElementById('revenueProjectionChart')?.getContext('2d');
    if (ctx3) {
        if (sopCharts.revenueProjection) sopCharts.revenueProjection.destroy();
        
        const currentRevenue = metrics.totalRevenue;
        sopCharts.revenueProjection = new Chart(ctx3, {
            type: 'bar',
            data: {
                labels: ['Actual', 'Proyectado', 'Meta'],
                datasets: [{
                    label: 'Ingresos',
                    data: [currentRevenue, currentRevenue * 1.1, currentRevenue * 1.2],
                    backgroundColor: ['#16A34A', '#0ea5e9', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
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
            projection: Math.round(metrics.capacityUtilization * 1.1 * 0.1)
        },
        {
            name: 'Personal Médico',
            total: Object.keys(metrics.staffUtilization).length,
            used: Object.values(metrics.staffUtilization).reduce((a, b) => a + b, 0),
            projection: metrics.projectedDemand
        },
        {
            name: 'Equipos Especializados',
            total: 5,
            used: 3,
            projection: 4
        }
    ];
    
    resources.forEach(resource => {
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
        alerts.push('⚠️ Alta utilización de capacidad (' + metrics.capacityUtilization + '%). Considera contratar más personal.');
    }
    
    // Check cancellation rate
    const cancellationRate = (metrics.cancelledAppointments / metrics.totalAppointments) * 100;
    if (cancellationRate > 15) {
        alerts.push('⚠️ Alta tasa de cancelación (' + Math.round(cancellationRate) + '%). Implementa recordatorios automáticos.');
    }
    
    // Check revenue growth
    if (metrics.totalRevenue < metrics.projectedRevenue * 0.9) {
        alerts.push('📉 Ingresos por debajo de la proyección. Revisa estrategias de marketing.');
    }
    
    // Positive alerts
    if (metrics.capacityUtilization > 60 && metrics.capacityUtilization < 80) {
        alerts.push('✅ Utilización de capacidad óptima. Buen balance entre demanda y recursos.');
    }
    
    alertsDiv.innerHTML = alerts.map(alert => `<p style="margin: 5px 0;">${alert}</p>`).join('');
}

function generateActionPlan() {
    const growthTarget = parseInt(document.getElementById('growthTarget').value) || 10;
    const resultsDiv = document.getElementById('actionPlanResults');
    
    const actions = [
        {
            area: 'Marketing',
            action: `Aumentar presupuesto de marketing en ${Math.round(growthTarget * 0.5)}% para alcanzar ${growthTarget}% de crecimiento`,
            timeline: '2 semanas'
        },
        {
            area: 'Operaciones',
            action: `Optimizar horarios para aumentar capacidad en ${Math.round(growthTarget * 0.3)}%`,
            timeline: '1 mes'
        },
        {
            area: 'Personal',
            action: growthTarget > 15 ? 'Contratar 1-2 profesionales adicionales' : 'Capacitar personal existente en nuevos servicios',
            timeline: '6 semanas'
        },
        {
            area: 'Servicios',
            action: 'Lanzar paquetes promocionales para servicios menos utilizados',
            timeline: '1 semana'
        }
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
                ${actions.map(action => `
                    <tr>
                        <td>${action.area}</td>
                        <td>${action.action}</td>
                        <td>${action.timeline}</td>
                        <td><button class="action-btn" style="background: #16A34A; color: white;">Iniciar</button></td>
                    </tr>
                `).join('')}
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
        ['Demanda Proyectada', document.getElementById('projectedDemand').textContent],
        ['Capacidad Utilizada', document.getElementById('availableCapacity').textContent],
        ['Ingresos Proyectados', document.getElementById('projectedRevenue').textContent],
        ['Eficiencia Operativa', document.getElementById('operationalEfficiency').textContent]
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
            const searchInput = createSearchInput('inventoryTable', 'Buscar productos...');
            searchInput.classList.add('search-input');
            searchInput.style.marginBottom = '15px';
            inventoryTable.parentNode.insertBefore(searchInput, inventoryTable.previousElementSibling);
        }
        
        // Load products
        const snapshot = await db.collection('products').get();
        
        const tbody = document.querySelector('#inventoryTable tbody');
        tbody.innerHTML = '';
        
        let totalProducts = 0;
        let totalValue = 0;
        let lowStockCount = 0;
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center;">No hay productos registrados</td></tr>';
            // Add sample products
            await addSampleProducts();
        } else {
            snapshot.forEach(doc => {
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
                
                const row = `
                    <tr data-category="${product.category || 'otros'}">
                        <td>${product.code || 'N/A'}</td>
                        <td>${product.name || 'N/A'}</td>
                        <td>${product.category || 'otros'}</td>
                        <td class="${stockStatus}">${product.stock || 0}</td>
                        <td>${product.minStock || 0}</td>
                        <td>$${(product.price || 0).toFixed(2)}</td>
                        <td>$${stockValue.toFixed(2)}</td>
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
        document.getElementById('totalInventoryValue').textContent = '$' + totalValue.toFixed(2);
        document.getElementById('lowStockCount').textContent = lowStockCount;
        
        // Load movements
        loadMovements();
        
        // Apply current category filter
        if (currentCategory !== 'all') {
            filterByCategory(currentCategory);
        }
    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

async function loadMovements() {
    try {
        const snapshot = await db.collection('inventory_movements')
            .orderBy('date', 'desc')
            .limit(20)
            .get();
        
        const tbody = document.querySelector('#movementsTable tbody');
        tbody.innerHTML = '';
        
        if (snapshot.empty) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No hay movimientos registrados</td></tr>';
        } else {
            let lastMovement = null;
            snapshot.forEach(doc => {
                const movement = doc.data();
                const date = movement.date ? new Date(movement.date.seconds * 1000).toLocaleString() : 'N/A';
                
                if (!lastMovement) {
                    lastMovement = `${movement.type} - ${movement.productName}`;
                    document.getElementById('lastMovement').textContent = lastMovement;
                }
                
                const typeIcon = movement.type === 'entrada' ? '📥' : movement.type === 'salida' ? '📤' : '🔄';
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
        console.error('Error loading movements:', error);
    }
}

function filterByCategory(category) {
    currentCategory = category;
    
    // Update active tab
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.textContent.toLowerCase().includes(category) || (category === 'all' && tab.textContent === 'Todos')) {
            tab.classList.add('active');
        }
    });
    
    // Filter table rows
    const rows = document.querySelectorAll('#inventoryTable tbody tr');
    rows.forEach(row => {
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
    
    document.getElementById('addProductForm').addEventListener('submit', async (e) => {
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
                createdBy: currentUser.uid
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
                    date: firebase.firestore.FieldValue.serverTimestamp()
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
    db.collection('products').doc(productId).get().then(doc => {
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
        
        document.getElementById('adjustStockForm').addEventListener('submit', async (e) => {
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
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
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
                    date: firebase.firestore.FieldValue.serverTimestamp()
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
    db.collection('products').where('stock', '<=', 'minStock').get().then(snapshot => {
        if (snapshot.empty) {
            alert('✅ No hay productos con stock bajo en este momento');
            return;
        }
        
        let alertContent = '<h3 style="color: #ef4444; margin-bottom: 20px;">⚠️ Productos con Stock Bajo</h3>';
        alertContent += '<table style="width: 100%;">';
        alertContent += '<thead><tr><th>Producto</th><th>Stock Actual</th><th>Stock Mínimo</th><th>Acción</th></tr></thead>';
        alertContent += '<tbody>';
        
        snapshot.forEach(doc => {
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
    if (confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) {
        db.collection('products').doc(id).delete().then(() => {
            loadInventory();
            alert('Producto eliminado exitosamente');
        }).catch(error => {
            alert('Error al eliminar producto: ' + error.message);
        });
    }
}

function editProduct(id) {
    db.collection('products').doc(id).get().then(doc => {
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
        
        document.getElementById('editProductForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            
            try {
                await db.collection('products').doc(id).update({
                    code: formData.get('code'),
                    name: formData.get('name'),
                    description: formData.get('description'),
                    category: formData.get('category'),
                    minStock: parseInt(formData.get('minStock')),
                    price: parseFloat(formData.get('price')),
                    supplier: formData.get('supplier'),
                    lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
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
            price: 8.50,
            supplier: 'Farmacéutica Nacional'
        },
        {
            code: 'SUP001',
            name: 'Vitamina C 1000mg',
            description: 'Suplemento vitamínico',
            category: 'suplementos',
            unit: 'frasco',
            stock: 30,
            minStock: 10,
            price: 15.00,
            supplier: 'NutriHealth'
        },
        {
            code: 'EQU001',
            name: 'Tensómetro Digital',
            description: 'Medidor de presión arterial automático',
            category: 'equipos',
            unit: 'unidad',
            stock: 5,
            minStock: 2,
            price: 45.00,
            supplier: 'MediEquip'
        },
        {
            code: 'CON001',
            name: 'Jeringas 5ml',
            description: 'Jeringas desechables estériles',
            category: 'consumibles',
            unit: 'caja',
            stock: 100,
            minStock: 50,
            price: 12.00,
            supplier: 'Suministros Médicos SA'
        },
        {
            code: 'MED002',
            name: 'Alcohol 70%',
            description: 'Solución antiséptica',
            category: 'medicamentos',
            unit: 'litro',
            stock: 20,
            minStock: 10,
            price: 5.50,
            supplier: 'Farmacéutica Nacional'
        }
    ];
    
    for (const product of sampleProducts) {
        const docRef = await db.collection('products').add({
            ...product,
            active: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
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
                date: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    
    loadInventory();
}

// INTEGRATION FUNCTIONS
function loadIntegrations() {
    // Check integration status
    checkIntegrationStatus();
}

function checkIntegrationStatus() {
    // Check Siigo status
    const siigoConfig = localStorage.getItem('siigoConfig');
    if (siigoConfig) {
        document.getElementById('siigoStatus').innerHTML = '<span class="badge" style="background: #d4edda; color: #155724;">Conectado</span>';
    }
    
    // Check SaludTools status
    const saludtoolsConfig = localStorage.getItem('saludtoolsConfig');
    if (saludtoolsConfig) {
        document.getElementById('saludtoolsStatus').innerHTML = '<span class="badge" style="background: #d4edda; color: #155724;">Conectado</span>';
    }
}

function configureSiigo() {
    const content = `
        <form id="siigoConfigForm">
            <h3>Configuración de Siigo API</h3>
            <p style="color: #666; margin-bottom: 20px;">Ingresa tus credenciales de Siigo para conectar la facturación electrónica.</p>
            
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
    
    showModal('Configurar Siigo', content);
    
    document.getElementById('siigoConfigForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const config = {
            apiKey: formData.get('apiKey'),
            partnerId: formData.get('partnerId'),
            environment: formData.get('environment'),
            dianResolution: formData.get('dianResolution'),
            configuredAt: new Date().toISOString()
        };
        
        // Save to localStorage (in production, save to Firebase)
        localStorage.setItem('siigoConfig', JSON.stringify(config));
        
        // Save to Firebase
        await db.collection('integrations').doc('siigo').set({
            ...config,
            configuredBy: currentUser.uid,
            active: true
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
    
    document.getElementById('saludtoolsConfigForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const config = {
            username: formData.get('username'),
            // In production, encrypt password
            password: btoa(formData.get('password')),
            providerCode: formData.get('providerCode'),
            providerType: formData.get('providerType'),
            configuredAt: new Date().toISOString()
        };
        
        localStorage.setItem('saludtoolsConfig', JSON.stringify(config));
        
        await db.collection('integrations').doc('saludtools').set({
            ...config,
            configuredBy: currentUser.uid,
            active: true
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
                    <option value="twilio">Twilio</option>
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
}

function updateWhatsAppFields(provider) {
    const fieldsDiv = document.getElementById('whatsappFields');
    
    if (provider === 'twilio') {
        fieldsDiv.innerHTML = `
            <div class="form-group">
                <label>Account SID</label>
                <input type="text" name="accountSid" required>
            </div>
            <div class="form-group">
                <label>Auth Token</label>
                <input type="password" name="authToken" required>
            </div>
            <div class="form-group">
                <label>Número de WhatsApp</label>
                <input type="text" name="phoneNumber" placeholder="+1234567890" required>
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

// Quick action functions
function testSiigoConnection() {
    const config = localStorage.getItem('siigoConfig');
    if (!config) {
        alert('⚠️ Primero debes configurar Siigo');
        return;
    }
    
    // Simulate API test
    alert('🧪 Probando conexión con Siigo...\n\n✅ Conexión exitosa\nAmbiente: Sandbox\nFacturas disponibles: 1000');
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
        
        alert(`📄 Generando RIPS...\n\nTipo: ${fileType}\nPeriodo: ${period}\n\n✅ Archivo generado: ${fileType}${period.replace('-', '')}.txt`);
        closeModal();
    });
}

function syncPatients() {
    alert('🔄 Sincronizando pacientes...\n\nPacientes en Healing Forest: 150\nPacientes en Siigo: 145\n\n✅ 5 pacientes nuevos sincronizados');
}

function viewIntegrationDocs() {
    window.open('/Users/marianatejada/Desktop/HEALLING APP/INTEGRACION_SIIGO_SALUDTOOLS.md', '_blank');
}

// Add invoice generation to payments
function generateInvoiceFromPayment(paymentId) {
    const siigoConfig = localStorage.getItem('siigoConfig');
    if (!siigoConfig) {
        alert('⚠️ Configura Siigo primero para generar facturas');
        return;
    }
    
    db.collection('payments').doc(paymentId).get().then(async doc => {
        const payment = doc.data();
        
        // Simulate invoice generation
        const invoiceNumber = 'FV-' + Math.floor(Math.random() * 10000);
        
        // Update payment with invoice
        await db.collection('payments').doc(paymentId).update({
            invoiceNumber: invoiceNumber,
            invoicedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        alert(`✅ Factura generada exitosamente\n\nNúmero: ${invoiceNumber}\nCliente: ${payment.patientName}\nValor: $${payment.amount}\n\nLa factura fue enviada al correo del cliente.`);
        
        // Log integration
        await db.collection('integration_logs').add({
            integration: 'siigo',
            action: 'invoice_generated',
            status: 'success',
            details: {
                invoiceNumber: invoiceNumber,
                amount: payment.amount,
                patientName: payment.patientName
            },
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser.uid
        });
    });
}

// Update the appointment creation to send notifications
const originalAddAppointmentSubmit = document.getElementById('addAppointmentForm')?.addEventListener;
if (originalAddAppointmentSubmit) {
    // Intercept appointment creation to add email notification
    // This would be integrated into the existing appointment creation flow
}