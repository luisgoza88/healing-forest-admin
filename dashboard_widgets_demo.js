// Demo implementation of new widgets in dashboard
// Shows how to use ApexCharts, Toastify, and SweetAlert2

// Function to enhance dashboard with new widgets
function enhanceDashboardWithWidgets() {
    console.log('Enhancing dashboard with new widgets...');
    
    // Replace existing Chart.js charts with ApexCharts
    setTimeout(() => {
        // Check if we're on the overview page
        if (!document.getElementById('overview').classList.contains('active')) {
            return;
        }
        
        // 1. Replace appointments chart with ApexCharts
        const appointmentsChartEl = document.getElementById('appointmentsChart');
        if (appointmentsChartEl) {
            // Hide old canvas
            appointmentsChartEl.style.display = 'none';
            
            // Create new div for ApexChart
            const apexDiv = document.createElement('div');
            apexDiv.id = 'appointmentsApexChart';
            appointmentsChartEl.parentNode.appendChild(apexDiv);
            
            // Sample data for last 7 days
            const last7Days = [];
            const appointmentCounts = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                last7Days.push(date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }));
                appointmentCounts.push(Math.floor(Math.random() * 15) + 5);
            }
            
            widgets.createLineChart('appointmentsApexChart', 'Citas por Día', last7Days, appointmentCounts);
        }
        
        // 2. Replace services chart with ApexCharts donut
        const servicesChartEl = document.getElementById('servicesChart');
        if (servicesChartEl) {
            // Hide old canvas
            servicesChartEl.style.display = 'none';
            
            // Create new div for ApexChart
            const apexDiv = document.createElement('div');
            apexDiv.id = 'servicesApexChart';
            servicesChartEl.parentNode.appendChild(apexDiv);
            
            // Sample data
            widgets.createDonutChart(
                'servicesApexChart', 
                'Servicios Más Solicitados',
                ['Yoga', 'Masajes', 'Sauna', 'Cámara Hiperbárica', 'Sueros IV'],
                [45, 30, 20, 15, 25]
            );
        }
        
        // 3. Add a new heatmap for appointment times
        const overviewSection = document.getElementById('overview');
        if (overviewSection && !document.getElementById('appointmentHeatmap')) {
            const heatmapContainer = document.createElement('div');
            heatmapContainer.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-top: 30px;">
                    <div id="appointmentHeatmap"></div>
                </div>
            `;
            
            const chartsSection = overviewSection.querySelector('h2');
            if (chartsSection) {
                chartsSection.parentNode.insertBefore(heatmapContainer, chartsSection);
                
                // Create heatmap data
                const heatmapData = [
                    { name: 'Lunes', data: generateRandomHeatmapData() },
                    { name: 'Martes', data: generateRandomHeatmapData() },
                    { name: 'Miércoles', data: generateRandomHeatmapData() },
                    { name: 'Jueves', data: generateRandomHeatmapData() },
                    { name: 'Viernes', data: generateRandomHeatmapData() },
                    { name: 'Sábado', data: generateRandomHeatmapData() },
                ];
                
                widgets.createHeatmapChart('appointmentHeatmap', 'Mapa de Calor - Horarios Más Solicitados', heatmapData);
            }
        }
        
    }, 1000);
}

// Generate random heatmap data
function generateRandomHeatmapData() {
    const data = [];
    for (let i = 0; i < 15; i++) {
        data.push(Math.floor(Math.random() * 10));
    }
    return data;
}

// Replace existing notifications with Toastify
function enhanceNotifications() {
    // Override the showNotification function if it exists
    if (typeof window.showNotification !== 'undefined') {
        window.showNotification = function(title, message) {
            widgets.showInfo(`${title}: ${message}`);
        };
    }
    
    // Show welcome notification
    setTimeout(() => {
        if (window.currentUser) {
            widgets.showSuccess(`¡Bienvenido ${window.currentUser.name || window.currentUser.email}!`);
        }
    }, 1000);
}

// Enhance form submissions with SweetAlert2
function enhanceFormSubmissions() {
    // Example: Enhance the appointment creation
    const originalShowAddAppointment = window.showAddAppointment;
    if (originalShowAddAppointment) {
        window.showAddAppointment = async function() {
            const formHtml = `
                <div style="text-align: left;">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px;">Paciente</label>
                        <select id="patientSelect" class="swal2-input" style="width: 100%;">
                            <option value="">Seleccionar paciente...</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px;">Servicio</label>
                        <select id="serviceSelect" class="swal2-input" style="width: 100%;">
                            <option value="">Seleccionar servicio...</option>
                        </select>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px;">Fecha</label>
                        <input type="date" id="appointmentDate" class="swal2-input" min="${new Date().toISOString().split('T')[0]}">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; margin-bottom: 5px;">Hora</label>
                        <input type="time" id="appointmentTime" class="swal2-input">
                    </div>
                </div>
            `;
            
            const result = await widgets.showFormModal('Nueva Cita', formHtml);
            
            if (result) {
                // Process the form
                console.log('New appointment data:', result);
                widgets.showSuccess('¡Cita creada exitosamente!');
                // You would call the actual save function here
            }
        };
    }
}

// Enhance delete confirmations
function enhanceDeleteConfirmations() {
    // Override deleteService if it exists
    const originalDeleteService = window.deleteService;
    if (originalDeleteService) {
        window.deleteService = async function(serviceId) {
            const confirmed = await widgets.confirmAction(
                '¿Eliminar servicio?',
                'Esta acción no se puede deshacer. ¿Estás seguro?',
                'Sí, eliminar',
                'Cancelar'
            );
            
            if (confirmed) {
                originalDeleteService(serviceId);
            }
        };
    }
}

// Initialize all enhancements when dashboard loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            enhanceDashboardWithWidgets();
            enhanceNotifications();
            enhanceFormSubmissions();
            enhanceDeleteConfirmations();
        }, 2000);
    });
} else {
    setTimeout(() => {
        enhanceDashboardWithWidgets();
        enhanceNotifications();
        enhanceFormSubmissions();
        enhanceDeleteConfirmations();
    }, 2000);
}

// Make enhancement functions available globally
window.dashboardWidgets = {
    enhance: enhanceDashboardWithWidgets,
    enhanceNotifications,
    enhanceFormSubmissions,
    enhanceDeleteConfirmations
};

console.log('✨ Dashboard widgets demo loaded! The dashboard will be enhanced automatically.');