// Calendar and Booking Enhancements
// Implements Flatpickr, Resource Timeline, Cal-Heatmap, and Real-time updates

// ============= FLATPICKR ENHANCEMENTS =============

// Initialize Flatpickr for all date inputs
function initializeFlatpickr() {
    // Set Spanish locale
    flatpickr.localize(flatpickr.l10ns.es);
    
    // Replace all date inputs with Flatpickr
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        flatpickr(input, {
            dateFormat: "Y-m-d",
            minDate: "today",
            locale: "es",
            animate: true,
            theme: "material_green",
            disable: [
                // Disable Sundays
                function(date) {
                    return (date.getDay() === 0);
                }
            ],
            onReady: function(selectedDates, dateStr, instance) {
                // Add custom button for "Today"
                const customButton = document.createElement("button");
                customButton.innerHTML = "Hoy";
                customButton.classList.add("flatpickr-today-button");
                customButton.style.cssText = "background: #16A34A; color: white; border: none; padding: 5px 10px; border-radius: 4px; margin: 5px;";
                customButton.addEventListener("click", function(e) {
                    e.preventDefault();
                    instance.setDate(new Date());
                });
                instance.calendarContainer.appendChild(customButton);
            }
        });
    });
    
    // Replace all datetime inputs
    const datetimeInputs = document.querySelectorAll('input[type="datetime-local"]');
    datetimeInputs.forEach(input => {
        flatpickr(input, {
            enableTime: true,
            dateFormat: "Y-m-d H:i",
            minDate: "today",
            time_24hr: true,
            locale: "es",
            theme: "material_green"
        });
    });
    
    // Replace all time inputs
    const timeInputs = document.querySelectorAll('input[type="time"]');
    timeInputs.forEach(input => {
        flatpickr(input, {
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            time_24hr: true,
            locale: "es",
            theme: "material_green",
            minuteIncrement: 30
        });
    });
}

// Create date range picker for reports
function createDateRangePicker(elementId, onRangeSelected) {
    return flatpickr(document.getElementById(elementId), {
        mode: "range",
        dateFormat: "Y-m-d",
        locale: "es",
        theme: "material_green",
        showMonths: 2,
        animate: true,
        onChange: function(selectedDates, dateStr, instance) {
            if (selectedDates.length === 2) {
                onRangeSelected(selectedDates[0], selectedDates[1]);
            }
        }
    });
}

// ============= RESOURCE TIMELINE =============

// Create resource timeline view for all professionals
function createResourceTimeline(containerId) {
    const calendarEl = document.getElementById(containerId);
    
    const calendar = new FullCalendar.Calendar(calendarEl, {
        schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives',
        plugins: ['resourceTimeline', 'interaction'],
        initialView: 'resourceTimelineDay',
        locale: 'es',
        height: 'auto',
        
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'resourceTimelineDay,resourceTimelineWeek'
        },
        
        slotMinTime: '06:00',
        slotMaxTime: '21:00',
        slotDuration: '00:30',
        
        resourceAreaHeaderContent: 'Profesionales',
        
        resources: [
            { id: 'sala1', title: 'Sala 1 - Yoga', occupancy: 16 },
            { id: 'sala2', title: 'Sala 2 - Masajes' },
            { id: 'sala3', title: 'Sala 3 - Terapias' },
            { id: 'dr1', title: 'Dra. María González' },
            { id: 'dr2', title: 'Dr. Carlos Rodríguez' },
            { id: 'dr3', title: 'Terapeuta Ana Martínez' }
        ],
        
        events: async function(info, successCallback, failureCallback) {
            try {
                // Load appointments from Firebase
                const snapshot = await db.collection('appointments')
                    .where('date', '>=', info.start)
                    .where('date', '<=', info.end)
                    .get();
                
                const events = [];
                snapshot.forEach(doc => {
                    const apt = doc.data();
                    const resourceId = apt.roomId || apt.staffId || 'sala1';
                    
                    events.push({
                        id: doc.id,
                        resourceId: resourceId,
                        title: apt.patientName || 'Reservado',
                        start: apt.date.toDate(),
                        end: moment(apt.date.toDate()).add(apt.duration || 60, 'minutes').toDate(),
                        backgroundColor: getServiceColor(apt.serviceType),
                        extendedProps: {
                            service: apt.serviceName,
                            phone: apt.patientPhone
                        }
                    });
                });
                
                successCallback(events);
            } catch (error) {
                console.error('Error loading events:', error);
                failureCallback(error);
            }
        },
        
        eventClick: function(info) {
            Swal.fire({
                title: info.event.title,
                html: `
                    <p><strong>Servicio:</strong> ${info.event.extendedProps.service || 'N/A'}</p>
                    <p><strong>Hora:</strong> ${moment(info.event.start).format('HH:mm')} - ${moment(info.event.end).format('HH:mm')}</p>
                    <p><strong>Teléfono:</strong> ${info.event.extendedProps.phone || 'N/A'}</p>
                `,
                showCancelButton: true,
                confirmButtonText: 'Editar',
                cancelButtonText: 'Cerrar',
                confirmButtonColor: '#16A34A'
            }).then((result) => {
                if (result.isConfirmed) {
                    // Edit appointment
                    editAppointment(info.event.id);
                }
            });
        },
        
        // Enable drag and drop
        editable: true,
        
        eventDrop: async function(info) {
            // Update appointment when dropped
            try {
                await db.collection('appointments').doc(info.event.id).update({
                    date: firebase.firestore.Timestamp.fromDate(info.event.start),
                    resourceId: info.event.getResources()[0].id,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                widgets.showSuccess('Cita reprogramada exitosamente');
            } catch (error) {
                widgets.showError('Error al reprogramar cita');
                info.revert();
            }
        }
    });
    
    calendar.render();
    return calendar;
}

// ============= CAL-HEATMAP =============

// Create occupancy heatmap
function createOccupancyHeatmap(containerId) {
    const cal = new CalHeatmap();
    
    cal.init({
        itemSelector: `#${containerId}`,
        domain: 'month',
        subDomain: 'day',
        range: 3,
        cellSize: 20,
        cellPadding: 5,
        cellRadius: 3,
        domainGutter: 10,
        weekStartOnMonday: true,
        legend: [2, 4, 6, 8, 10],
        legendColors: {
            min: "#E8F5E9",
            max: "#1B5E20",
            empty: "#FAFAFA"
        },
        tooltip: true,
        itemName: ['cita', 'citas'],
        subDomainTextFormat: "%d",
        displayLegend: true,
        legendCellSize: 15,
        legendMargin: [0, 0, 0, 10],
        
        onClick: function(date, nb) {
            showDayDetails(date, nb);
        },
        
        afterLoadData: function(data) {
            // Add labels
            d3.selectAll(".cal-heatmap-container .graph-label")
                .style("fill", "#666")
                .style("font-size", "12px");
        }
    });
    
    // Load data from Firebase
    loadHeatmapData(cal);
    
    return cal;
}

// Load appointment data for heatmap
async function loadHeatmapData(calInstance) {
    try {
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        
        const snapshot = await db.collection('appointments')
            .where('date', '>=', threeMonthsAgo)
            .get();
        
        const data = {};
        snapshot.forEach(doc => {
            const apt = doc.data();
            const timestamp = Math.floor(apt.date.toDate().getTime() / 1000);
            data[timestamp] = (data[timestamp] || 0) + 1;
        });
        
        calInstance.update(data);
    } catch (error) {
        console.error('Error loading heatmap data:', error);
    }
}

// Show details for a specific day
function showDayDetails(date, appointmentCount) {
    const formattedDate = moment(date).format('DD/MM/YYYY');
    
    Swal.fire({
        title: `Citas del ${formattedDate}`,
        html: `
            <p>Total de citas: <strong>${appointmentCount}</strong></p>
            <button class="swal2-confirm swal2-styled" onclick="viewDayAppointments('${date}')">
                Ver Detalles
            </button>
        `,
        showConfirmButton: false,
        showCloseButton: true
    });
}

// ============= REAL-TIME UPDATES =============

// Initialize Socket.io for real-time updates
let socket = null;

function initializeRealTimeUpdates() {
    // For now, we'll use Firebase's real-time listeners
    // In production, you would connect to a Socket.io server
    
    console.log('Initializing real-time updates...');
    
    // Listen for new appointments
    db.collection('appointments')
        .where('createdAt', '>=', new Date())
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' && change.doc.data().createdAt) {
                    const apt = change.doc.data();
                    
                    // Show notification
                    widgets.showInfo(`Nueva cita: ${apt.serviceName} - ${apt.patientName}`);
                    
                    // Update calendar if visible
                    if (window.currentCalendarInstance) {
                        window.currentCalendarInstance.refetchEvents();
                    }
                    
                    // Update dashboard stats
                    if (typeof updateDashboardStats === 'function') {
                        updateDashboardStats();
                    }
                }
            });
        });
    
    // Listen for appointment updates
    db.collection('appointments')
        .where('updatedAt', '>=', new Date())
        .onSnapshot((snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'modified') {
                    const apt = change.doc.data();
                    
                    // Update UI without refresh
                    updateAppointmentInUI(change.doc.id, apt);
                }
            });
        });
}

// Update appointment in UI without refresh
function updateAppointmentInUI(appointmentId, appointmentData) {
    // Update in calendar
    if (window.currentCalendarInstance) {
        const event = window.currentCalendarInstance.getEventById(appointmentId);
        if (event) {
            event.setProp('title', appointmentData.patientName);
            event.setStart(appointmentData.date.toDate());
        }
    }
    
    // Update in table if visible
    const row = document.querySelector(`tr[data-appointment-id="${appointmentId}"]`);
    if (row) {
        // Update row data
        row.querySelector('.patient-name').textContent = appointmentData.patientName;
        row.querySelector('.service-name').textContent = appointmentData.serviceName;
        row.querySelector('.appointment-time').textContent = appointmentData.time;
    }
}

// ============= HELPER FUNCTIONS =============

// Get color for service type
function getServiceColor(serviceType) {
    const colors = {
        'yoga': '#16A34A',
        'massage': '#3B82F6',
        'sauna': '#F59E0B',
        'hyperbaric': '#8B5CF6',
        'iv_therapy': '#EC4899',
        'consultation': '#6B7280'
    };
    
    return colors[serviceType] || '#16A34A';
}

// Colombian holidays
const colombianHolidays = [
    '2024-01-01', '2024-01-08', '2024-03-25', '2024-03-28', '2024-03-29',
    '2024-05-01', '2024-05-13', '2024-06-03', '2024-06-10', '2024-07-01',
    '2024-07-20', '2024-08-07', '2024-08-19', '2024-10-14', '2024-11-04',
    '2024-11-11', '2024-12-25'
];

// Check if date is holiday
function isHoliday(date) {
    const dateStr = moment(date).format('YYYY-MM-DD');
    return colombianHolidays.includes(dateStr);
}

// ============= INITIALIZATION =============

// Initialize all calendar enhancements when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize Flatpickr
    setTimeout(initializeFlatpickr, 1000);
    
    // Initialize real-time updates
    initializeRealTimeUpdates();
    
    console.log('📅 Calendar enhancements loaded!');
});

// Export functions
window.calendarEnhancements = {
    initializeFlatpickr,
    createDateRangePicker,
    createResourceTimeline,
    createOccupancyHeatmap,
    initializeRealTimeUpdates
};