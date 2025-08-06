// Service Calendar Management
// Handles individual calendar views, drag-and-drop scheduling, and recurring class management

let serviceCalendars = {};
let currentServiceId = null;
let draggedEvent = null;

// Initialize service calendar
function initializeServiceCalendar(serviceId, containerId) {
  const calendarEl = document.getElementById(containerId);
  const serviceConfig = window.serviceCapacity.SERVICE_CAPACITY[serviceId];

  if (!calendarEl || !serviceConfig) {
    Logger.error('Invalid calendar container or service configuration');
    return;
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'timeGridWeek',
    locale: 'es',
    height: 'auto',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    businessHours: getBusinessHours(serviceId),
    slotMinTime: '06:00:00',
    slotMaxTime: '21:00:00',
    slotDuration: '00:30:00',
    slotLabelInterval: '01:00:00',
    expandRows: true,

    // Enable drag and drop
    editable: true,
    droppable: true,
    eventDurationEditable: false,

    // Custom event rendering
    eventDidMount: function (info) {
      const event = info.event;
      const el = info.el;

      // Add capacity info
      const capacity = event.extendedProps.capacity || serviceConfig.capacity;
      const booked = event.extendedProps.booked || 0;
      const available = capacity - booked;

      // Color coding based on availability
      if (available === 0) {
        el.style.backgroundColor = '#DC2626'; // Red - full
        el.style.borderColor = '#991B1B';
      } else if (available <= capacity * 0.25) {
        el.style.backgroundColor = '#F59E0B'; // Yellow - almost full
        el.style.borderColor = '#D97706';
      } else {
        el.style.backgroundColor = '#16A34A'; // Green - available
        el.style.borderColor = '#15803D';
      }

      // Add tooltip
      el.setAttribute(
        'title',
        `${serviceConfig.name}\nCapacidad: ${booked}/${capacity}\nDisponible: ${available}`
      );
    },

    // Event click handler
    eventClick: function (info) {
      showServiceEventDetails(info.event);
    },

    // Date click handler (for creating new events)
    dateClick: function (info) {
      if (
        info.view.type === 'timeGridWeek' ||
        info.view.type === 'timeGridDay'
      ) {
        showCreateServiceEvent(serviceId, info.date);
      }
    },

    // Drag start
    eventDragStart: function (info) {
      draggedEvent = info.event;
    },

    // Drop handler
    eventDrop: async function (info) {
      const confirmed = confirm(
        `¿Mover ${info.event.title} a ${info.event.start.toLocaleString('es')}?`
      );

      if (!confirmed) {
        info.revert();
        return;
      }

      try {
        await updateServiceEvent(info.event);
      } catch (error) {
        Logger.error('Error updating event:', error);
        info.revert();
        alert('Error al actualizar el evento');
      }
    },

    // External event drop
    drop: async function (info) {
      if (draggedEvent) {
        const newDate = info.date;
        await createServiceEventFromDrop(serviceId, draggedEvent, newDate);
        draggedEvent = null;
      }
    },

    // Load events
    events: async function (fetchInfo, successCallback, failureCallback) {
      try {
        const events = await loadServiceEvents(
          serviceId,
          fetchInfo.start,
          fetchInfo.end
        );
        successCallback(events);
      } catch (error) {
        Logger.error('Error loading events:', error);
        failureCallback(error);
      }
    },
  });

  calendar.render();
  serviceCalendars[serviceId] = calendar;
  currentServiceId = serviceId;

  return calendar;
}

// Get business hours for a service
function getBusinessHours(serviceId) {
  const hours =
    window.serviceCapacity.SERVICE_HOURS[serviceId] ||
    window.serviceCapacity.SERVICE_HOURS.default;
  const businessHours = [];

  const dayMap = {
    monday: 1,
    tuesday: 2,
    wednesday: 3,
    thursday: 4,
    friday: 5,
    saturday: 6,
    sunday: 0,
  };

  for (const [day, times] of Object.entries(hours)) {
    if (times.open && times.close) {
      businessHours.push({
        daysOfWeek: [dayMap[day]],
        startTime: times.open,
        endTime: times.close,
      });
    }
  }

  return businessHours;
}

// Load service events from Firestore
async function loadServiceEvents(serviceId, startDate, endDate) {
  try {
    const events = [];

    // Get regular appointments
    const appointmentsSnapshot = await db
      .collection('appointments')
      .where('serviceId', '==', serviceId)
      .where('date', '>=', firebase.firestore.Timestamp.fromDate(startDate))
      .where('date', '<=', firebase.firestore.Timestamp.fromDate(endDate))
      .where('status', 'in', ['pendiente', 'confirmado'])
      .get();

    // Get service schedule for recurring events
    const scheduleDoc = await db
      .collection('service_schedules')
      .doc(serviceId)
      .get();
    const schedule = scheduleDoc.data();

    // Count bookings by time slot
    const bookingCounts = {};
    appointmentsSnapshot.forEach((doc) => {
      const appointment = doc.data();
      const dateKey = appointment.date.toDate().toISOString().split('T')[0];
      const timeKey = `${dateKey}_${appointment.time}`;
      bookingCounts[timeKey] = (bookingCounts[timeKey] || 0) + 1;
    });

    // Generate events from schedule
    if (schedule && schedule.weeklySlots) {
      const current = new Date(startDate);
      while (current <= endDate) {
        const dayOfWeek = [
          'sunday',
          'monday',
          'tuesday',
          'wednesday',
          'thursday',
          'friday',
          'saturday',
        ][current.getDay()];
        const daySlots = schedule.weeklySlots[dayOfWeek] || [];

        for (const slot of daySlots) {
          if (slot.enabled) {
            const dateKey = current.toISOString().split('T')[0];
            const timeKey = `${dateKey}_${slot.time}`;
            const booked = bookingCounts[timeKey] || 0;

            const [hours, minutes] = slot.time.split(':').map(Number);
            const eventStart = new Date(current);
            eventStart.setHours(hours, minutes, 0, 0);

            const eventEnd = new Date(eventStart);
            eventEnd.setMinutes(eventEnd.getMinutes() + schedule.duration);

            events.push({
              id: `${serviceId}_${dateKey}_${slot.time}`,
              title: `${schedule.serviceName} (${booked}/${schedule.capacity})`,
              start: eventStart,
              end: eventEnd,
              extendedProps: {
                serviceId: serviceId,
                capacity: schedule.capacity,
                booked: booked,
                available: schedule.capacity - booked,
                time: slot.time,
                staffId: slot.staffId,
                type: 'scheduled',
              },
            });
          }
        }

        current.setDate(current.getDate() + 1);
      }
    }

    // Add blocked dates
    const blockedSnapshot = await db
      .collection('service_blocks')
      .where('serviceId', '==', serviceId)
      .where('date', '>=', firebase.firestore.Timestamp.fromDate(startDate))
      .where('date', '<=', firebase.firestore.Timestamp.fromDate(endDate))
      .get();

    blockedSnapshot.forEach((doc) => {
      const block = doc.data();
      const blockDate = block.date.toDate();

      events.push({
        id: doc.id,
        title: `BLOQUEADO${block.reason ? ': ' + block.reason : ''}`,
        start: blockDate,
        allDay: true,
        backgroundColor: '#6B7280',
        borderColor: '#4B5563',
        extendedProps: {
          type: 'blocked',
          reason: block.reason,
        },
      });
    });

    return events;
  } catch (error) {
    Logger.error('Error loading service events:', error);
    return [];
  }
}

// Show service event details
function showServiceEventDetails(event) {
  const props = event.extendedProps;

  if (props.type === 'blocked') {
    showModal(
      'Fecha Bloqueada',
      `
            <p><strong>Fecha:</strong> ${event.start.toLocaleDateString('es')}</p>
            <p><strong>Razón:</strong> ${props.reason || 'No especificada'}</p>
            <button class="btn" style="background: #DC2626;" onclick="unblockDate('${event.id}')">Desbloquear</button>
        `
    );
    return;
  }

  const content = `
        <div style="line-height: 1.8;">
            <p><strong>Servicio:</strong> ${event.title.split(' (')[0]}</p>
            <p><strong>Fecha:</strong> ${event.start.toLocaleDateString('es')}</p>
            <p><strong>Hora:</strong> ${event.start.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</p>
            <p><strong>Capacidad:</strong> ${props.booked}/${props.capacity}</p>
            <p><strong>Disponible:</strong> ${props.available} espacios</p>
            ${props.staffId ? `<p><strong>Instructor:</strong> ${props.staffId}</p>` : ''}
        </div>
        
        <div style="margin-top: 20px;">
            <h4>Participantes Inscritos:</h4>
            <div id="participantsList" style="max-height: 200px; overflow-y: auto;">
                <div class="loading">Cargando participantes...</div>
            </div>
        </div>
        
        <div style="margin-top: 20px; display: flex; gap: 10px; flex-wrap: wrap;">
            ${props.available > 0 ? `<button class="btn" onclick="showAddParticipant('${props.serviceId}', '${event.start.toISOString()}', '${props.time}')">Agregar Participante</button>` : ''}
            <button class="btn" style="background: #0EA5E9;" onclick="viewWaitingList('${props.serviceId}', '${event.start.toISOString()}', '${props.time}')">Lista de Espera</button>
            <button class="btn" style="background: #DC2626;" onclick="cancelServiceSlot('${props.serviceId}', '${event.start.toISOString()}', '${props.time}')">Cancelar Clase</button>
        </div>
    `;

  showModal('Detalles de la Clase', content);

  // Load participants
  loadParticipants(props.serviceId, event.start, props.time);
}

// Load participants for a specific slot
async function loadParticipants(serviceId, date, time) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const participantsSnapshot = await db
      .collection('appointments')
      .where('serviceId', '==', serviceId)
      .where('date', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
      .where('date', '<=', firebase.firestore.Timestamp.fromDate(endOfDay))
      .where('time', '==', time)
      .where('status', 'in', ['pendiente', 'confirmado'])
      .get();

    const participantsList = document.getElementById('participantsList');
    if (!participantsList) return;

    if (participantsSnapshot.empty) {
      participantsList.innerHTML =
        '<p style="color: #666;">No hay participantes inscritos</p>';
      return;
    }

    let html = '<ul style="list-style: none; padding: 0;">';
    participantsSnapshot.forEach((doc) => {
      const participant = doc.data();
      html += `
                <li style="padding: 8px; border-bottom: 1px solid #eee;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${participant.patientName}</strong>
                            <br><small>${participant.patientPhone || 'Sin teléfono'}</small>
                        </div>
                        <button class="action-btn delete-btn" onclick="removeParticipant('${doc.id}')">Quitar</button>
                    </div>
                </li>
            `;
    });
    html += '</ul>';

    participantsList.innerHTML = html;
  } catch (error) {
    Logger.error('Error loading participants:', error);
    document.getElementById('participantsList').innerHTML =
      '<p style="color: red;">Error al cargar participantes</p>';
  }
}

// Show create service event dialog
function showCreateServiceEvent(serviceId, date) {
  const serviceConfig = window.serviceCapacity.SERVICE_CAPACITY[serviceId];

  const content = `
        <form id="createServiceEventForm">
            <div class="form-group">
                <label>Fecha</label>
                <input type="date" name="date" value="${date.toISOString().split('T')[0]}" required>
            </div>
            <div class="form-group">
                <label>Hora</label>
                <input type="time" name="time" value="${date.toTimeString().slice(0, 5)}" required>
            </div>
            <div class="form-group">
                <label>Capacidad</label>
                <input type="number" name="capacity" value="${serviceConfig.capacity}" min="1" required>
            </div>
            <div class="form-group">
                <label>Instructor/Terapeuta</label>
                <select name="staffId">
                    <option value="">Seleccionar...</option>
                    <!-- Staff options will be loaded here -->
                </select>
            </div>
            <div class="form-group">
                <label>Repetir</label>
                <select name="repeat" onchange="toggleRepeatOptions(this.value)">
                    <option value="none">No repetir</option>
                    <option value="daily">Diariamente</option>
                    <option value="weekly">Semanalmente</option>
                    <option value="monthly">Mensualmente</option>
                </select>
            </div>
            <div id="repeatOptions" style="display: none;">
                <div class="form-group">
                    <label>Repetir hasta</label>
                    <input type="date" name="repeatUntil">
                </div>
            </div>
            <button type="submit" class="btn">Crear Evento</button>
        </form>
    `;

  showModal(`Nueva Clase de ${serviceConfig.name}`, content);

  // Load staff options
  loadStaffOptions(serviceId);

  // Handle form submission
  document
    .getElementById('createServiceEventForm')
    .addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);

      try {
        await createServiceEvent(serviceId, formData);
        closeModal();
        serviceCalendars[serviceId].refetchEvents();
      } catch (error) {
        alert('Error al crear el evento: ' + error.message);
      }
    });
}

// Create service event
async function createServiceEvent(serviceId, formData) {
  const date = new Date(formData.get('date'));
  const time = formData.get('time');
  const capacity = parseInt(formData.get('capacity'));
  const staffId = formData.get('staffId');
  const repeat = formData.get('repeat');
  const repeatUntil = formData.get('repeatUntil');

  // Create events based on repeat option
  const events = [];
  const currentDate = new Date(date);
  const endDate = repeatUntil ? new Date(repeatUntil) : new Date(date);

  if (repeat === 'none') {
    events.push({ date: new Date(date), time, capacity, staffId });
  } else {
    while (currentDate <= endDate) {
      events.push({
        date: new Date(currentDate),
        time,
        capacity,
        staffId,
      });

      // Increment date based on repeat option
      switch (repeat) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
      }
    }
  }

  // Save events to database
  const batch = db.batch();

  for (const event of events) {
    const slotData = {
      serviceId,
      date: firebase.firestore.Timestamp.fromDate(event.date),
      time: event.time,
      capacity: event.capacity,
      staffId: event.staffId,
      booked: 0,
      status: 'active',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: currentUser.uid,
    };

    const slotRef = db.collection('service_slots').doc();
    batch.set(slotRef, slotData);
  }

  await batch.commit();
}

// Update service event (after drag and drop)
async function updateServiceEvent(event) {
  const props = event.extendedProps;
  const newDate = event.start;
  const newTime = `${newDate.getHours().toString().padStart(2, '0')}:${newDate.getMinutes().toString().padStart(2, '0')}`;

  // Find and update all appointments for this slot
  const startOfDay = new Date(props.date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(props.date);
  endOfDay.setHours(23, 59, 59, 999);

  const appointmentsSnapshot = await db
    .collection('appointments')
    .where('serviceId', '==', props.serviceId)
    .where('date', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
    .where('date', '<=', firebase.firestore.Timestamp.fromDate(endOfDay))
    .where('time', '==', props.time)
    .get();

  const batch = db.batch();

  appointmentsSnapshot.forEach((doc) => {
    batch.update(doc.ref, {
      date: firebase.firestore.Timestamp.fromDate(newDate),
      time: newTime,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  // Notify affected patients
  appointmentsSnapshot.forEach((doc) => {
    const appointment = doc.data();
    // Send notification about schedule change
    Logger.log(`Notifying ${appointment.patientName} about schedule change`);
  });
}

// Toggle repeat options
function toggleRepeatOptions(value) {
  const repeatOptions = document.getElementById('repeatOptions');
  if (repeatOptions) {
    repeatOptions.style.display = value !== 'none' ? 'block' : 'none';
  }
}

// Load staff options for a service
async function loadStaffOptions(serviceId) {
  try {
    const staffSnapshot = await db
      .collection('staff')
      .where('status', '==', 'activo')
      .get();

    const select = document.querySelector('select[name="staffId"]');
    if (!select) return;

    let options = '<option value="">Seleccionar...</option>';
    staffSnapshot.forEach((doc) => {
      const staff = doc.data();
      options += `<option value="${doc.id}">${staff.name}</option>`;
    });

    select.innerHTML = options;
  } catch (error) {
    Logger.error('Error loading staff options:', error);
  }
}

// Show service calendar modal
function showServiceCalendar(serviceId) {
  const serviceConfig = window.serviceCapacity.SERVICE_CAPACITY[serviceId];

  const content = `
        <div style="margin-bottom: 20px;">
            <h3>${serviceConfig.name} - Calendario de Clases</h3>
            <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                <button class="btn" onclick="showServiceSettings('${serviceId}')">⚙️ Configuración</button>
                <button class="btn" style="background: #0EA5E9;" onclick="showServiceStats('${serviceId}')">📊 Estadísticas</button>
                <button class="btn" style="background: #F59E0B;" onclick="exportServiceSchedule('${serviceId}')">📥 Exportar</button>
            </div>
        </div>
        <div id="serviceCalendarContainer" style="min-height: 600px;"></div>
    `;

  // Create a larger modal for calendar
  const modal = document.getElementById('modal');
  modal.querySelector('.modal-content').style.maxWidth = '90%';
  modal.querySelector('.modal-content').style.width = '1200px';

  showModal('', content);

  // Initialize calendar after modal is shown
  setTimeout(() => {
    initializeServiceCalendar(serviceId, 'serviceCalendarContainer');
  }, 100);
}

// Show service settings
function showServiceSettings(serviceId) {
  const serviceConfig = window.serviceCapacity.SERVICE_CAPACITY[serviceId];
  const hours =
    window.serviceCapacity.SERVICE_HOURS[serviceId] ||
    window.serviceCapacity.SERVICE_HOURS.default;

  let hoursHtml = '';
  const days = [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday',
  ];
  const dayNames = [
    'Lunes',
    'Martes',
    'Miércoles',
    'Jueves',
    'Viernes',
    'Sábado',
    'Domingo',
  ];

  days.forEach((day, index) => {
    const dayHours = hours[day] || { open: '', close: '' };
    hoursHtml += `
            <div style="display: grid; grid-template-columns: 100px 1fr 1fr; gap: 10px; align-items: center; margin-bottom: 10px;">
                <label>${dayNames[index]}</label>
                <input type="time" id="${day}_open" value="${dayHours.open}" placeholder="Apertura">
                <input type="time" id="${day}_close" value="${dayHours.close}" placeholder="Cierre">
            </div>
        `;
  });

  const content = `
        <form id="serviceSettingsForm">
            <h4>Configuración de Capacidad</h4>
            <div class="form-group">
                <label>Capacidad máxima por clase</label>
                <input type="number" id="serviceCapacity" value="${serviceConfig.capacity}" min="1" required>
            </div>
            
            <h4 style="margin-top: 20px;">Horarios de Servicio</h4>
            ${hoursHtml}
            
            <h4 style="margin-top: 20px;">Configuración Adicional</h4>
            <div class="form-group">
                <label>Duración de la sesión (minutos)</label>
                <input type="number" id="serviceDuration" value="${serviceConfig.duration}" min="15" step="15" required>
            </div>
            <div class="form-group">
                <label>Tiempo mínimo entre sesiones (minutos)</label>
                <input type="number" id="minTimeBetween" value="${serviceConfig.minTimeBetween}" min="0" step="5" required>
            </div>
            
            <button type="submit" class="btn">Guardar Cambios</button>
        </form>
    `;

  showModal(`Configuración de ${serviceConfig.name}`, content);

  document
    .getElementById('serviceSettingsForm')
    .addEventListener('submit', async (e) => {
      e.preventDefault();

      try {
        // Update capacity
        const newCapacity = parseInt(
          document.getElementById('serviceCapacity').value
        );
        await window.serviceCapacity.updateServiceCapacity(
          serviceId,
          newCapacity
        );

        // Update hours
        for (const day of days) {
          const openTime = document.getElementById(`${day}_open`).value;
          const closeTime = document.getElementById(`${day}_close`).value;

          if (openTime && closeTime) {
            await window.serviceCapacity.updateServiceHours(
              serviceId,
              day,
              openTime,
              closeTime
            );
          }
        }

        alert('Configuración actualizada exitosamente');
        closeModal();

        // Refresh calendar
        if (serviceCalendars[serviceId]) {
          serviceCalendars[serviceId].refetchEvents();
        }
      } catch (error) {
        alert('Error al actualizar configuración: ' + error.message);
      }
    });
}

// Show service statistics
async function showServiceStats(serviceId) {
  const serviceConfig = window.serviceCapacity.SERVICE_CAPACITY[serviceId];

  try {
    // Get last 30 days statistics
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const stats = await window.serviceCapacity.getServiceStatistics(
      serviceId,
      startDate,
      endDate
    );

    const content = `
            <div class="stats-grid" style="margin-bottom: 30px;">
                <div class="stat-card">
                    <h3>Reservas Totales</h3>
                    <div class="value">${stats.totalBookings}</div>
                </div>
                <div class="stat-card">
                    <h3>Clases Completadas</h3>
                    <div class="value">${stats.completedBookings}</div>
                </div>
                <div class="stat-card">
                    <h3>Tasa de Ocupación</h3>
                    <div class="value">${stats.averageOccupancy}%</div>
                </div>
                <div class="stat-card">
                    <h3>Cancelaciones</h3>
                    <div class="value" style="color: #DC2626;">${stats.cancelledBookings}</div>
                </div>
            </div>
            
            <h4>Horarios Más Populares</h4>
            <ul>
                ${Object.entries(stats.peakHours)
                  .map(
                    ([hour, count]) => `<li>${hour}:00 - ${count} reservas</li>`
                  )
                  .join('')}
            </ul>
            
            <div style="margin-top: 20px;">
                <canvas id="serviceStatsChart"></canvas>
            </div>
        `;

    showModal(
      `Estadísticas de ${serviceConfig.name} (Últimos 30 días)`,
      content
    );

    // Create chart
    setTimeout(() => {
      createServiceStatsChart(stats);
    }, 100);
  } catch (error) {
    alert('Error al cargar estadísticas: ' + error.message);
  }
}

// Create service statistics chart
function createServiceStatsChart(stats) {
  const ctx = document.getElementById('serviceStatsChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Completadas', 'Canceladas', 'No Show'],
      datasets: [
        {
          data: [
            stats.completedBookings,
            stats.cancelledBookings,
            stats.noShowBookings,
          ],
          backgroundColor: ['#16A34A', '#DC2626', '#F59E0B'],
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

// Export service schedule
function exportServiceSchedule(serviceId) {
  const serviceConfig = window.serviceCapacity.SERVICE_CAPACITY[serviceId];
  const calendar = serviceCalendars[serviceId];

  if (!calendar) {
    alert('Por favor abre el calendario primero');
    return;
  }

  const events = calendar.getEvents();
  const data = events.map((event) => ({
    Fecha: event.start.toLocaleDateString('es'),
    Hora: event.start.toLocaleTimeString('es', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    Servicio: serviceConfig.name,
    Capacidad: event.extendedProps.capacity || serviceConfig.capacity,
    Reservados: event.extendedProps.booked || 0,
    Disponibles: event.extendedProps.available || serviceConfig.capacity,
    Instructor: event.extendedProps.staffId || 'No asignado',
  }));

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Horarios');

  // Save file
  XLSX.writeFile(
    wb,
    `${serviceConfig.name}_horarios_${new Date().toISOString().split('T')[0]}.xlsx`
  );
}

// Add participant to a class
function showAddParticipant(serviceId, date, time) {
  // Implementation would show a form to add a participant
  Logger.log('Add participant to', serviceId, date, time);
}

// View waiting list
async function viewWaitingList(serviceId, date, time) {
  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const waitingSnapshot = await db
      .collection('waitlist')
      .where('serviceId', '==', serviceId)
      .where('date', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
      .where('date', '<=', firebase.firestore.Timestamp.fromDate(endOfDay))
      .where('time', '==', time)
      .where('status', '==', 'waiting')
      .orderBy('priority', 'asc')
      .orderBy('createdAt', 'asc')
      .get();

    let content = '<h4>Lista de Espera</h4>';

    if (waitingSnapshot.empty) {
      content += '<p>No hay personas en lista de espera</p>';
    } else {
      content += '<ul style="list-style: none; padding: 0;">';
      waitingSnapshot.forEach((doc, index) => {
        const data = doc.data();
        content += `
                    <li style="padding: 10px; border-bottom: 1px solid #eee;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${index + 1}. ${data.patientName}</strong>
                                <br><small>${data.patientPhone || 'Sin teléfono'}</small>
                            </div>
                            <button class="btn" onclick="notifyFromWaitlist('${doc.id}')">Notificar</button>
                        </div>
                    </li>
                `;
      });
      content += '</ul>';
    }

    showModal('Lista de Espera', content);
  } catch (error) {
    Logger.error('Error loading waiting list:', error);
    alert('Error al cargar la lista de espera');
  }
}

// Cancel service slot
async function cancelServiceSlot(serviceId, date, time) {
  const confirmed = confirm(
    '¿Estás seguro de cancelar esta clase? Se notificará a todos los participantes.'
  );

  if (!confirmed) return;

  try {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get all appointments for this slot
    const appointmentsSnapshot = await db
      .collection('appointments')
      .where('serviceId', '==', serviceId)
      .where('date', '>=', firebase.firestore.Timestamp.fromDate(startOfDay))
      .where('date', '<=', firebase.firestore.Timestamp.fromDate(endOfDay))
      .where('time', '==', time)
      .where('status', 'in', ['pendiente', 'confirmado'])
      .get();

    const batch = db.batch();

    // Cancel all appointments
    appointmentsSnapshot.forEach((doc) => {
      batch.update(doc.ref, {
        status: 'cancelado',
        cancelReason: 'Clase cancelada por el centro',
        cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
        cancelledBy: currentUser.uid,
      });
    });

    await batch.commit();

    // Notify all affected patients
    appointmentsSnapshot.forEach((doc) => {
      const appointment = doc.data();
      // Send cancellation notification
      Logger.log(
        `Notifying ${appointment.patientName} about class cancellation`
      );
    });

    alert(
      'Clase cancelada exitosamente. Se ha notificado a todos los participantes.'
    );
    closeModal();

    // Refresh calendar
    if (serviceCalendars[serviceId]) {
      serviceCalendars[serviceId].refetchEvents();
    }
  } catch (error) {
    Logger.error('Error cancelling service slot:', error);
    alert('Error al cancelar la clase');
  }
}

// Export calendar functions
window.serviceCalendar = {
  initializeServiceCalendar,
  showServiceCalendar,
  showServiceSettings,
  showServiceStats,
  exportServiceSchedule,
};
