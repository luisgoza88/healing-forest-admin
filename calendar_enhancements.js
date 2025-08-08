// Calendar and Booking Enhancements
// Implements Flatpickr, Resource Timeline, Cal-Heatmap, and Real-time updates

// ============= FLATPICKR ENHANCEMENTS =============

// Global configuration for consistency
const FLATPICKR_CONFIG = {
  locale: 'es',
  theme: 'material_green',
  animate: true,
  altInput: true,
  altFormat: 'j F, Y',
  weekNumbers: true,
  monthSelectorType: 'dropdown',
};

// Initialize Flatpickr for all date inputs
function initializeFlatpickr() {
  // Set Spanish locale
  flatpickr.localize(flatpickr.l10ns.es);

  // Enhanced date inputs replacement with context awareness
  enhanceDateInputs();

  // Enhanced datetime inputs
  enhanceDateTimeInputs();

  // Enhanced time inputs
  enhanceTimeInputs();

  // Special handling for report date filters
  enhanceReportFilters();

  // Observe DOM for dynamically added inputs
  observeDOMForNewInputs();
}

// Enhanced date inputs with context-specific configurations
function enhanceDateInputs() {
  const dateInputs = document.querySelectorAll(
    'input[type="date"], input.date-picker, input[data-date-picker]'
  );

  dateInputs.forEach((input) => {
    // Skip if already initialized
    if (input._flatpickr) return;

    const config = {
      ...FLATPICKR_CONFIG,
      dateFormat: 'Y-m-d',
      minDate: input.hasAttribute('data-min-date')
        ? input.getAttribute('data-min-date')
        : 'today',
      maxDate: input.hasAttribute('data-max-date')
        ? input.getAttribute('data-max-date')
        : null,
      disable: [
        // Disable Sundays unless specified otherwise
        function (date) {
          if (input.hasAttribute('data-allow-sundays')) return false;
          return date.getDay() === 0;
        },
        // Disable Colombian holidays
        ...getColombianHolidays(),
      ],
      onReady: function (selectedDates, dateStr, instance) {
        // Add quick select buttons
        addQuickSelectButtons(instance);

        // Add holiday indicator
        addHolidayIndicator(instance);
      },
      onChange: function (selectedDates, dateStr, instance) {
        // Trigger custom event for other scripts
        input.dispatchEvent(
          new CustomEvent('dateChanged', {
            detail: { date: selectedDates[0], dateStr },
          })
        );

        // Update availability and calendar if this is an appointment form
        if (input.closest('.appointment-form')) {
          // Recalculate available slots using global handler if available
          const serviceSelect = input
            .closest('.appointment-form')
            .querySelector('select[name="serviceId"]');
          if (
            serviceSelect &&
            serviceSelect.value &&
            typeof window.updateAvailableSlots === 'function'
          ) {
            window.updateAvailableSlots(serviceSelect.value);
          }

          // Refresh event rendering on the active calendar
          if (window.currentCalendarInstance) {
            window.currentCalendarInstance.refetchEvents();
            window.currentCalendarInstance.rerenderEvents();
          }
        }
      },
    };

    // Apply specific configurations based on context
    if (input.closest('.report-filters')) {
      config.mode = 'range';
      config.showMonths = 2;
    }

    flatpickr(input, config);
  });
}

// Enhanced datetime inputs
function enhanceDateTimeInputs() {
  const datetimeInputs = document.querySelectorAll(
    'input[type="datetime-local"], input.datetime-picker'
  );

  datetimeInputs.forEach((input) => {
    if (input._flatpickr) return;

    flatpickr(input, {
      ...FLATPICKR_CONFIG,
      enableTime: true,
      dateFormat: input.dataset.dateFormat || 'Y-m-d H:i',
      altFormat: input.dataset.altFormat || 'j F, Y - H:i',
      minDate: input.dataset.minDate || 'today',
      maxDate: input.dataset.maxDate || null,
      time_24hr: true,
      minuteIncrement: input.dataset.increment || 15,
      defaultHour: 9,
      minTime: input.dataset.minTime,
      maxTime: input.dataset.maxTime,
      onReady: function (selectedDates, dateStr, instance) {
        addTimePresets(instance);
      },
    });
  });
}

// Enhanced time inputs
function enhanceTimeInputs() {
  const timeInputs = document.querySelectorAll(
    'input[type="time"], input.time-picker'
  );

  timeInputs.forEach((input) => {
    if (input._flatpickr) return;

    flatpickr(input, {
      ...FLATPICKR_CONFIG,
      enableTime: true,
      noCalendar: true,
      dateFormat: 'H:i',
      time_24hr: true,
      minuteIncrement: input.dataset.increment || 30,
      minTime: input.dataset.minTime || '06:00',
      maxTime: input.dataset.maxTime || '21:00',
      onReady: function (selectedDates, dateStr, instance) {
        addCommonTimeSlots(instance);
      },
    });
  });
}

// Add quick select buttons to date pickers
function addQuickSelectButtons(instance) {
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'flatpickr-quick-buttons';
  buttonsContainer.style.cssText =
    'display: flex; gap: 5px; padding: 5px; border-top: 1px solid #e0e0e0;';

  const buttons = [
    { label: 'Hoy', action: () => instance.setDate(new Date()) },
    {
      label: 'Mañana',
      action: () => instance.setDate(moment().add(1, 'day').toDate()),
    },
    {
      label: 'Próx. Semana',
      action: () => instance.setDate(moment().add(1, 'week').toDate()),
    },
    {
      label: 'Próx. Mes',
      action: () => instance.setDate(moment().add(1, 'month').toDate()),
    },
  ];

  buttons.forEach((btn) => {
    const button = document.createElement('button');
    button.innerHTML = btn.label;
    button.className = 'flatpickr-quick-btn';
    button.style.cssText =
      'flex: 1; background: #16A34A; color: white; border: none; padding: 5px; border-radius: 4px; font-size: 12px; cursor: pointer;';
    button.addEventListener('click', function (e) {
      e.preventDefault();
      btn.action();
    });
    buttonsContainer.appendChild(button);
  });

  instance.calendarContainer.appendChild(buttonsContainer);
}

// Add holiday indicator to calendar
function addHolidayIndicator(instance) {
  const holidays = getColombianHolidays();

  instance.config.onDayCreate = function (dObj, dStr, fp, dayElem) {
    const dateStr = moment(dayElem.dateObj).format('YYYY-MM-DD');
    if (holidays.includes(dateStr)) {
      dayElem.innerHTML +=
        '<span class="holiday-indicator" title="Día festivo">🎉</span>';
      dayElem.classList.add('flatpickr-holiday');
    }
  };
}

// Add time presets for datetime pickers
function addTimePresets(instance) {
  const presetsContainer = document.createElement('div');
  presetsContainer.className = 'flatpickr-time-presets';
  presetsContainer.style.cssText =
    'display: flex; flex-wrap: wrap; gap: 5px; padding: 5px; border-top: 1px solid #e0e0e0;';

  const commonTimes = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
  ];

  commonTimes.forEach((time) => {
    const button = document.createElement('button');
    button.innerHTML = time;
    button.style.cssText =
      'background: #f3f4f6; border: 1px solid #d1d5db; padding: 3px 8px; border-radius: 4px; font-size: 12px; cursor: pointer;';
    button.addEventListener('click', function (e) {
      e.preventDefault();
      const [hours, minutes] = time.split(':');
      instance.setDate(instance.selectedDates[0] || new Date());
      instance.setHours(parseInt(hours), parseInt(minutes));
    });
    presetsContainer.appendChild(button);
  });

  instance.calendarContainer.appendChild(presetsContainer);
}

// Add common time slots for time-only pickers
function addCommonTimeSlots(instance) {
  const slotsContainer = document.createElement('div');
  slotsContainer.className = 'flatpickr-time-slots';
  slotsContainer.style.cssText =
    'display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; padding: 5px;';

  const slots = [];
  for (let h = 6; h <= 20; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    if (h < 20) slots.push(`${h.toString().padStart(2, '0')}:30`);
  }

  slots.forEach((time) => {
    const button = document.createElement('button');
    button.innerHTML = time;
    button.style.cssText =
      'background: #f3f4f6; border: 1px solid #d1d5db; padding: 5px; border-radius: 4px; font-size: 12px; cursor: pointer;';
    button.addEventListener('click', function (e) {
      e.preventDefault();
      instance.setDate(time, true);
    });
    slotsContainer.appendChild(button);
  });

  instance.calendarContainer.appendChild(slotsContainer);
}

// Enhanced report filters with date ranges
function enhanceReportFilters() {
  const reportContainers = document.querySelectorAll(
    '.report-filters, .reports-section, [data-report-filter]'
  );

  reportContainers.forEach((container) => {
    const dateInputs = container.querySelectorAll('input[type="date"]');

    if (dateInputs.length >= 2) {
      // Create a single range picker replacing both inputs
      const rangeInput = document.createElement('input');
      rangeInput.type = 'text';
      rangeInput.className = 'date-range-picker form-control';
      rangeInput.placeholder = 'Seleccionar rango de fechas';

      dateInputs[0].parentNode.insertBefore(rangeInput, dateInputs[0]);
      dateInputs.forEach((input) => (input.style.display = 'none'));

      flatpickr(rangeInput, {
        ...FLATPICKR_CONFIG,
        mode: 'range',
        dateFormat: 'Y-m-d',
        altFormat: 'j F, Y',
        showMonths: 2,
        maxDate: 'today',
        defaultDate: [moment().subtract(30, 'days').toDate(), new Date()],
        onClose: function (selectedDates, dateStr, instance) {
          if (selectedDates.length === 2) {
            dateInputs[0].value = moment(selectedDates[0]).format('YYYY-MM-DD');
            dateInputs[1].value = moment(selectedDates[1]).format('YYYY-MM-DD');

            // Trigger report update
            if (typeof updateReportData === 'function') {
              updateReportData(selectedDates[0], selectedDates[1]);
            }
          }
        },
      });
    }
  });
}

// Observe DOM for dynamically added inputs
function observeDOMForNewInputs() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Element node
          // Check if the node itself is a date input
          if (
            node.matches &&
            node.matches(
              'input[type="date"], input[type="time"], input[type="datetime-local"]'
            )
          ) {
            setTimeout(() => initializeFlatpickr(), 100);
          }
          // Check for date inputs within the added node
          else if (node.querySelectorAll) {
            const inputs = node.querySelectorAll(
              'input[type="date"], input[type="time"], input[type="datetime-local"]'
            );
            if (inputs.length > 0) {
              setTimeout(() => initializeFlatpickr(), 100);
            }
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Create date range picker for reports (legacy function maintained for compatibility)
function createDateRangePicker(elementId, onRangeSelected) {
  const element = document.getElementById(elementId);
  if (!element) return null;

  return flatpickr(element, {
    ...FLATPICKR_CONFIG,
    mode: 'range',
    dateFormat: 'Y-m-d',
    altFormat: 'j F - j F, Y',
    showMonths: 2,
    maxDate: 'today',
    onChange: function (selectedDates, dateStr, instance) {
      if (selectedDates.length === 2) {
        onRangeSelected(selectedDates[0], selectedDates[1]);
      }
    },
  });
}

// ============= ENHANCED FULLCALENDAR =============

// Global calendar configuration
const CALENDAR_CONFIG = {
  locale: 'es',
  height: 'auto',
  editable: true,
  droppable: true,
  navLinks: true,
  dayMaxEvents: true,
  weekNumbers: true,
  weekText: 'Sem',
  businessHours: {
    daysOfWeek: [1, 2, 3, 4, 5, 6], // Monday - Saturday
    startTime: '06:00',
    endTime: '21:00',
  },
  slotMinTime: '06:00',
  slotMaxTime: '21:00',
  slotDuration: '00:30',
  slotLabelInterval: '01:00',
  expandRows: true,
  nowIndicator: true,
  eventTimeFormat: {
    hour: '2-digit',
    minute: '2-digit',
    meridiem: false,
  },
};

// Enhanced FullCalendar for all calendar instances
function enhanceAllCalendars() {
  // Find all calendar containers
  const calendarContainers = document.querySelectorAll(
    '[id*="calendar"], .calendar-container, [data-calendar]'
  );

  calendarContainers.forEach((container) => {
    if (!container._fcCalendar) {
      const calendarType = container.dataset.calendarType || 'default';

      switch (calendarType) {
        case 'service':
          createEnhancedServiceCalendar(container);
          break;
        case 'resource':
          createResourceTimeline(container);
          break;
        default:
          createStandardCalendar(container);
      }
    }
  });
}

// Create enhanced service calendar with drag & drop
function createEnhancedServiceCalendar(container) {
  const serviceId = container.dataset.serviceId;
  const serviceConfig = window.serviceCapacity?.SERVICE_CAPACITY?.[serviceId];

  const calendar = new FullCalendar.Calendar(container, {
    ...CALENDAR_CONFIG,
    initialView: 'timeGridWeek',

    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
    },

    views: {
      dayGridMonth: {
        dayMaxEventRows: 3,
      },
      timeGrid: {
        dayMaxEventRows: 6,
      },
    },

    // Custom buttons
    customButtons: {
      today: {
        text: 'Hoy',
        click: function () {
          calendar.today();
        },
      },
    },

    // Drag & Drop from external elements
    drop: function (info) {
      handleExternalDrop(info, serviceId);
    },

    // Event rendering with capacity info
    eventDidMount: function (info) {
      enhanceEventDisplay(info, serviceConfig);
    },

    // Event click with enhanced modal
    eventClick: function (info) {
      showEnhancedEventModal(info.event);
    },

    // Date click for creating events
    dateClick: function (info) {
      if (info.view.type.includes('timeGrid')) {
        createQuickEvent(info.date, serviceId);
      }
    },

    // Enhanced drag and drop
    eventDrop: async function (info) {
      await handleEventDrop(info);
    },

    // Event resize
    eventResize: async function (info) {
      await handleEventResize(info);
    },

    // Load events with real-time updates
    eventSources: [
      {
        id: 'firebase',
        events: async function (info) {
          return await loadServiceEvents(info, serviceId);
        },
      },
    ],
  });

  // Store calendar instance
  container._fcCalendar = calendar;
  calendar.render();

  // Add external draggables
  setupExternalDraggables(container, calendar);

  // Add toolbar enhancements
  addCalendarToolbar(container, calendar);

  return calendar;
}

// Create resource timeline view for all professionals
function createResourceTimeline(container) {
  const calendar = new FullCalendar.Calendar(container, {
    ...CALENDAR_CONFIG,
    schedulerLicenseKey: 'CC-Attribution-NonCommercial-NoDerivatives',
    plugins: ['resourceTimeline', 'interaction'],
    initialView: 'resourceTimelineDay',

    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth',
    },

    resourceAreaHeaderContent: 'Recursos',
    resourceAreaWidth: '25%',

    resources: async function (info, successCallback) {
      const resources = await loadResources();
      successCallback(resources);
    },

    resourceLabelDidMount: function (info) {
      // Add capacity indicator
      const resource = info.resource;
      if (resource.extendedProps.capacity) {
        const capacityBadge = document.createElement('span');
        capacityBadge.className = 'resource-capacity';
        capacityBadge.textContent = `Cap: ${resource.extendedProps.capacity}`;
        capacityBadge.style.cssText =
          'margin-left: 10px; font-size: 0.8em; color: #666;';
        info.el
          .querySelector('.fc-datagrid-cell-main')
          .appendChild(capacityBadge);
      }
    },

    events: async function (info, successCallback, failureCallback) {
      try {
        const events = await loadTimelineEvents(info);
        successCallback(events);
      } catch (error) {
        Logger.error('Error loading timeline events:', error);
        failureCallback(error);
      }
    },

    eventDidMount: function (info) {
      enhanceTimelineEvent(info);
    },

    eventClick: function (info) {
      showEnhancedEventModal(info.event);
    },

    eventDrop: async function (info) {
      await handleResourceEventDrop(info);
    },
  });

  container._fcCalendar = calendar;
  calendar.render();

  return calendar;
}

// Create standard calendar for general use
function createStandardCalendar(container) {
  const calendar = new FullCalendar.Calendar(container, {
    ...CALENDAR_CONFIG,
    initialView: container.dataset.initialView || 'dayGridMonth',

    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
    },

    events: async function (info) {
      return await loadGeneralEvents(info);
    },

    eventClick: function (info) {
      showEventDetails(info.event);
    },

    dateClick: function (info) {
      if (container.dataset.allowCreate !== 'false') {
        createNewEvent(info.date);
      }
    },
  });

  container._fcCalendar = calendar;
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
      min: '#E8F5E9',
      max: '#1B5E20',
      empty: '#FAFAFA',
    },
    tooltip: true,
    itemName: ['cita', 'citas'],
    subDomainTextFormat: '%d',
    displayLegend: true,
    legendCellSize: 15,
    legendMargin: [0, 0, 0, 10],

    onClick: function (date, nb) {
      showDayDetails(date, nb);
    },

    afterLoadData: function (data) {
      // Add labels
      d3.selectAll('.cal-heatmap-container .graph-label')
        .style('fill', '#666')
        .style('font-size', '12px');
    },
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

    const snapshot = await db
      .collection('appointments')
      .where('date', '>=', threeMonthsAgo)
      .get();

    const data = {};
    snapshot.forEach((doc) => {
      const apt = doc.data();
      const timestamp = Math.floor(apt.date.toDate().getTime() / 1000);
      data[timestamp] = (data[timestamp] || 0) + 1;
    });

    calInstance.update(data);
  } catch (error) {
    Logger.error('Error loading heatmap data:', error);
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
    showCloseButton: true,
  });
}

// ============= REAL-TIME UPDATES =============

// Initialize Socket.io for real-time updates
let socket = null;

function initializeRealTimeUpdates() {
  // For now, we'll use Firebase's real-time listeners
  // In production, you would connect to a Socket.io server

  Logger.log('Initializing real-time updates...');

  // Listen for new appointments
  db.collection('appointments')
    .where('createdAt', '>=', new Date())
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && change.doc.data().createdAt) {
          const apt = change.doc.data();

          // Show notification
          widgets.showInfo(
            `Nueva cita: ${apt.serviceName} - ${apt.patientName}`
          );

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
  const row = document.querySelector(
    `tr[data-appointment-id="${appointmentId}"]`
  );
  if (row) {
    // Update row data
    row.querySelector('.patient-name').textContent =
      appointmentData.patientName;
    row.querySelector('.service-name').textContent =
      appointmentData.serviceName;
    row.querySelector('.appointment-time').textContent = appointmentData.time;
  }
}

// ============= HELPER FUNCTIONS =============

// Get color for service type
function getServiceColor(serviceType) {
  const colors = {
    yoga: '#16A34A',
    massage: '#3B82F6',
    sauna: '#F59E0B',
    hyperbaric: '#8B5CF6',
    iv_therapy: '#EC4899',
    consultation: '#6B7280',
    cryotherapy: '#06B6D4',
    floatation: '#7C3AED',
    acupuncture: '#DC2626',
  };

  return colors[serviceType] || '#16A34A';
}

// Get Colombian holidays for current and next year
function getColombianHolidays() {
  const currentYear = new Date().getFullYear();
  const holidays = [];

  // Holidays for current year and next year
  [currentYear, currentYear + 1].forEach((year) => {
    holidays.push(
      `${year}-01-01`, // Año Nuevo
      `${year}-01-08`, // Reyes Magos (aproximado)
      `${year}-03-25`, // San José (aproximado)
      `${year}-05-01`, // Día del Trabajo
      `${year}-06-03`, // Corpus Christi (aproximado)
      `${year}-06-10`, // Sagrado Corazón (aproximado)
      `${year}-07-01`, // San Pedro y San Pablo (aproximado)
      `${year}-07-20`, // Independencia
      `${year}-08-07`, // Batalla de Boyacá
      `${year}-08-19`, // Asunción (aproximado)
      `${year}-10-14`, // Día de la Raza (aproximado)
      `${year}-11-04`, // Todos los Santos (aproximado)
      `${year}-11-11`, // Independencia de Cartagena (aproximado)
      `${year}-12-25` // Navidad
    );
  });

  return holidays;
}

// Check if date is holiday
function isHoliday(date) {
  const dateStr = moment(date).format('YYYY-MM-DD');
  return getColombianHolidays().includes(dateStr);
}

// Calendar enhancement helper functions
function enhanceEventDisplay(info, serviceConfig) {
  const event = info.event;
  const el = info.el;

  // Add capacity info if available
  if (serviceConfig) {
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

    // Add capacity badge
    const badge = document.createElement('span');
    badge.className = 'event-capacity-badge';
    badge.textContent = `${booked}/${capacity}`;
    badge.style.cssText =
      'position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.5); color: white; font-size: 10px; padding: 2px 4px; border-radius: 3px;';
    el.appendChild(badge);
  }

  // Add tooltip
  el.setAttribute(
    'data-tippy-content',
    `
        ${event.title}
        ${event.extendedProps.service ? `Servicio: ${event.extendedProps.service}` : ''}
        Hora: ${moment(event.start).format('HH:mm')} - ${moment(event.end).format('HH:mm')}
        ${event.extendedProps.phone ? `Tel: ${event.extendedProps.phone}` : ''}
    `
  );

  // Initialize Tippy tooltip
  if (typeof tippy !== 'undefined') {
    tippy(el, {
      theme: 'light',
      placement: 'top',
      arrow: true,
    });
  }
}

// Show enhanced event modal
function showEnhancedEventModal(event) {
  const modalContent = `
        <div class="event-details">
            <h3>${event.title}</h3>
            ${event.extendedProps.service ? `<p><strong>Servicio:</strong> ${event.extendedProps.service}</p>` : ''}
            <p><strong>Fecha:</strong> ${moment(event.start).format('dddd, D [de] MMMM [de] YYYY')}</p>
            <p><strong>Hora:</strong> ${moment(event.start).format('HH:mm')} - ${moment(event.end).format('HH:mm')}</p>
            ${event.extendedProps.phone ? `<p><strong>Teléfono:</strong> ${event.extendedProps.phone}</p>` : ''}
            ${event.extendedProps.notes ? `<p><strong>Notas:</strong> ${event.extendedProps.notes}</p>` : ''}
            ${event.extendedProps.capacity ? `<p><strong>Ocupación:</strong> ${event.extendedProps.booked || 0}/${event.extendedProps.capacity}</p>` : ''}
        </div>
    `;

  Swal.fire({
    html: modalContent,
    showCancelButton: true,
    confirmButtonText: 'Editar',
    cancelButtonText: 'Cerrar',
    confirmButtonColor: '#16A34A',
    showDenyButton: true,
    denyButtonText: 'Eliminar',
    denyButtonColor: '#DC2626',
  }).then((result) => {
    if (result.isConfirmed) {
      editAppointment(event.id);
    } else if (result.isDenied) {
      deleteAppointment(event.id);
    }
  });
}

// Handle external drop
async function handleExternalDrop(info, serviceId) {
  const eventData = JSON.parse(info.draggedEl.dataset.event);

  try {
    await db.collection('appointments').add({
      ...eventData,
      serviceId: serviceId,
      date: firebase.firestore.Timestamp.fromDate(info.date),
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    widgets.showSuccess('Evento creado exitosamente');
    info.draggedEl.remove();
  } catch (error) {
    widgets.showError('Error al crear evento');
    Logger.error(error);
  }
}

// Handle event drop
async function handleEventDrop(info) {
  const confirmed = await Swal.fire({
    title: 'Confirmar cambio',
    text: `¿Mover "${info.event.title}" a ${moment(info.event.start).format('DD/MM/YYYY HH:mm')}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, mover',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#16A34A',
  });

  if (!confirmed.isConfirmed) {
    info.revert();
    return;
  }

  try {
    await db
      .collection('appointments')
      .doc(info.event.id)
      .update({
        date: firebase.firestore.Timestamp.fromDate(info.event.start),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    widgets.showSuccess('Cita reprogramada exitosamente');
  } catch (error) {
    widgets.showError('Error al reprogramar cita');
    info.revert();
  }
}

// Setup external draggables
function setupExternalDraggables(container, calendar) {
  const draggableContainer = document.createElement('div');
  draggableContainer.className = 'external-events';
  draggableContainer.innerHTML = `
        <h4>Eventos rápidos</h4>
        <div class="draggable-events">
            <div class="fc-event draggable" data-event='{"title":"Consulta","duration":"01:00"}'>Consulta (1h)</div>
            <div class="fc-event draggable" data-event='{"title":"Terapia","duration":"01:30"}'>Terapia (1.5h)</div>
            <div class="fc-event draggable" data-event='{"title":"Clase grupal","duration":"01:00"}'>Clase grupal (1h)</div>
            <div class="fc-event draggable" data-event='{"title":"Evaluación","duration":"00:30"}'>Evaluación (30min)</div>
        </div>
    `;

  container.parentNode.insertBefore(draggableContainer, container);

  // Make events draggable
  const draggables = draggableContainer.querySelectorAll('.draggable');
  draggables.forEach((el) => {
    new FullCalendar.Draggable(el, {
      eventData: function (eventEl) {
        const data = JSON.parse(eventEl.dataset.event);
        return {
          title: data.title,
          duration: data.duration,
        };
      },
    });
  });
}

// Add calendar toolbar enhancements
function addCalendarToolbar(container, calendar) {
  const toolbar = document.createElement('div');
  toolbar.className = 'calendar-toolbar-extra';
  toolbar.innerHTML = `
        <div class="toolbar-actions">
            <button class="btn-print" onclick="printCalendar()">🖨️ Imprimir</button>
            <button class="btn-export" onclick="exportCalendar()">📥 Exportar</button>
            <button class="btn-fullscreen" onclick="toggleFullscreen()">🔳 Pantalla completa</button>
            <select class="view-filter" onchange="filterCalendarView(this.value)">
                <option value="">Todos los recursos</option>
                <option value="rooms">Solo salas</option>
                <option value="staff">Solo personal</option>
            </select>
        </div>
    `;

  const calendarHeader = container.querySelector('.fc-header-toolbar');
  if (calendarHeader) {
    calendarHeader.appendChild(toolbar);
  }
}

// Load service events
async function loadServiceEvents(info, serviceId) {
  try {
    const snapshot = await db
      .collection('appointments')
      .where('serviceId', '==', serviceId)
      .where('date', '>=', info.start)
      .where('date', '<=', info.end)
      .get();

    const events = [];
    snapshot.forEach((doc) => {
      const apt = doc.data();
      events.push({
        id: doc.id,
        title: apt.patientName || 'Reservado',
        start: apt.date.toDate(),
        end: moment(apt.date.toDate())
          .add(apt.duration || 60, 'minutes')
          .toDate(),
        backgroundColor: getServiceColor(apt.serviceType),
        extendedProps: {
          service: apt.serviceName,
          phone: apt.patientPhone,
          notes: apt.notes,
          capacity: apt.capacity,
          booked: apt.booked,
        },
      });
    });

    return events;
  } catch (error) {
    Logger.error('Error loading service events:', error);
    return [];
  }
}

// Load resources for timeline
async function loadResources() {
  try {
    const resources = [];

    // Load rooms
    const roomsSnapshot = await db.collection('rooms').get();
    roomsSnapshot.forEach((doc) => {
      const room = doc.data();
      resources.push({
        id: doc.id,
        title: room.name,
        eventColor: '#3B82F6',
        extendedProps: {
          type: 'room',
          capacity: room.capacity,
        },
      });
    });

    // Load staff
    const staffSnapshot = await db.collection('staff').get();
    staffSnapshot.forEach((doc) => {
      const staff = doc.data();
      resources.push({
        id: doc.id,
        title: staff.name,
        eventColor: '#16A34A',
        extendedProps: {
          type: 'staff',
          specialty: staff.specialty,
        },
      });
    });

    return resources;
  } catch (error) {
    Logger.error('Error loading resources:', error);
    return [];
  }
}

// Load timeline events
async function loadTimelineEvents(info) {
  try {
    const snapshot = await db
      .collection('appointments')
      .where('date', '>=', info.start)
      .where('date', '<=', info.end)
      .get();

    const events = [];
    snapshot.forEach((doc) => {
      const apt = doc.data();
      const resourceId = apt.roomId || apt.staffId || 'sala1';

      events.push({
        id: doc.id,
        resourceId: resourceId,
        title: apt.patientName || 'Reservado',
        start: apt.date.toDate(),
        end: moment(apt.date.toDate())
          .add(apt.duration || 60, 'minutes')
          .toDate(),
        backgroundColor: getServiceColor(apt.serviceType),
        extendedProps: {
          service: apt.serviceName,
          phone: apt.patientPhone,
          notes: apt.notes,
        },
      });
    });

    return events;
  } catch (error) {
    Logger.error('Error loading timeline events:', error);
    return [];
  }
}

// Load general events
async function loadGeneralEvents(info) {
  try {
    const snapshot = await db
      .collection('appointments')
      .where('date', '>=', info.start)
      .where('date', '<=', info.end)
      .get();

    const events = [];
    snapshot.forEach((doc) => {
      const apt = doc.data();
      events.push({
        id: doc.id,
        title: `${apt.patientName} - ${apt.serviceName}`,
        start: apt.date.toDate(),
        end: moment(apt.date.toDate())
          .add(apt.duration || 60, 'minutes')
          .toDate(),
        backgroundColor: getServiceColor(apt.serviceType),
        extendedProps: apt,
      });
    });

    return events;
  } catch (error) {
    Logger.error('Error loading general events:', error);
    return [];
  }
}

// Enhanced timeline event display
function enhanceTimelineEvent(info) {
  enhanceEventDisplay(info, null);

  // Add resource-specific styling
  const resource = info.event.getResources()[0];
  if (resource && resource.extendedProps.type === 'room') {
    info.el.style.borderLeft = '4px solid #3B82F6';
  } else if (resource && resource.extendedProps.type === 'staff') {
    info.el.style.borderLeft = '4px solid #16A34A';
  }
}

// Handle resource event drop
async function handleResourceEventDrop(info) {
  const newResource = info.event.getResources()[0];
  const confirmed = await Swal.fire({
    title: 'Confirmar cambio',
    html: `¿Mover "${info.event.title}" a:<br>
               <strong>${newResource.title}</strong><br>
               ${moment(info.event.start).format('DD/MM/YYYY HH:mm')}?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, mover',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#16A34A',
  });

  if (!confirmed.isConfirmed) {
    info.revert();
    return;
  }

  try {
    const updateData = {
      date: firebase.firestore.Timestamp.fromDate(info.event.start),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    if (newResource.extendedProps.type === 'room') {
      updateData.roomId = newResource.id;
    } else if (newResource.extendedProps.type === 'staff') {
      updateData.staffId = newResource.id;
    }

    await db.collection('appointments').doc(info.event.id).update(updateData);

    widgets.showSuccess('Cita reprogramada exitosamente');
  } catch (error) {
    widgets.showError('Error al reprogramar cita');
    info.revert();
  }
}

// Handle event resize
async function handleEventResize(info) {
  const duration = moment(info.event.end).diff(
    moment(info.event.start),
    'minutes'
  );

  const confirmed = await Swal.fire({
    title: 'Confirmar cambio de duración',
    text: `¿Cambiar duración de "${info.event.title}" a ${duration} minutos?`,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, cambiar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#16A34A',
  });

  if (!confirmed.isConfirmed) {
    info.revert();
    return;
  }

  try {
    await db.collection('appointments').doc(info.event.id).update({
      duration: duration,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    widgets.showSuccess('Duración actualizada');
  } catch (error) {
    widgets.showError('Error al actualizar duración');
    info.revert();
  }
}

// Create quick event
function createQuickEvent(date, serviceId) {
  Swal.fire({
    title: 'Nueva cita rápida',
    html: `
            <input type="text" id="swal-name" class="swal2-input" placeholder="Nombre del paciente">
            <input type="tel" id="swal-phone" class="swal2-input" placeholder="Teléfono">
            <select id="swal-duration" class="swal2-select">
                <option value="30">30 minutos</option>
                <option value="60" selected>1 hora</option>
                <option value="90">1.5 horas</option>
                <option value="120">2 horas</option>
            </select>
        `,
    confirmButtonText: 'Crear cita',
    showCancelButton: true,
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#16A34A',
    preConfirm: () => {
      const name = document.getElementById('swal-name').value;
      const phone = document.getElementById('swal-phone').value;
      const duration = document.getElementById('swal-duration').value;

      if (!name || !phone) {
        Swal.showValidationMessage('Por favor complete todos los campos');
        return false;
      }

      return { name, phone, duration: parseInt(duration) };
    },
  }).then(async (result) => {
    if (result.isConfirmed) {
      try {
        await db.collection('appointments').add({
          serviceId: serviceId,
          patientName: result.value.name,
          patientPhone: result.value.phone,
          date: firebase.firestore.Timestamp.fromDate(date),
          duration: result.value.duration,
          status: 'confirmed',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        });

        widgets.showSuccess('Cita creada exitosamente');

        // Refresh calendar
        const calendar = document.querySelector(
          `[data-service-id="${serviceId}"]`
        )?._fcCalendar;
        if (calendar) {
          calendar.refetchEvents();
        }
      } catch (error) {
        widgets.showError('Error al crear cita');
        Logger.error(error);
      }
    }
  });
}

// Show event details
function showEventDetails(event) {
  showEnhancedEventModal(event);
}

// Create new event
function createNewEvent(date) {
  if (typeof showAddAppointment === 'function') {
    showAddAppointment(date);
  } else {
    createQuickEvent(date, null);
  }
}

// Edit appointment
function editAppointment(appointmentId) {
  if (typeof showEditAppointment === 'function') {
    showEditAppointment(appointmentId);
  } else {
    Logger.log('Edit appointment:', appointmentId);
  }
}

// Delete appointment
async function deleteAppointment(appointmentId) {
  const confirmed = await Swal.fire({
    title: '¿Eliminar cita?',
    text: 'Esta acción no se puede deshacer',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#DC2626',
  });

  if (confirmed.isConfirmed) {
    try {
      await db.collection('appointments').doc(appointmentId).delete();
      widgets.showSuccess('Cita eliminada');

      // Refresh all calendars
      document.querySelectorAll('[data-calendar]').forEach((container) => {
        if (container._fcCalendar) {
          container._fcCalendar.refetchEvents();
        }
      });
    } catch (error) {
      widgets.showError('Error al eliminar cita');
      Logger.error(error);
    }
  }
}

// Update available slots (compatibility function)
function updateAvailableSlots(date) {
  // This function is called by the date change event
  // Implementation depends on the specific form structure
  Logger.log('Updating available slots for date:', date);
}

// ============= INITIALIZATION =============

// Initialize all calendar enhancements when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
  // Initialize Flatpickr for all date inputs
  initializeFlatpickr();

  // Initialize FullCalendar enhancements
  enhanceAllCalendars();

  // Initialize real-time updates
  initializeRealTimeUpdates();

  // Re-initialize on dynamic content
  observeForDynamicContent();

  Logger.log('📅 Calendar enhancements loaded!');
});

// Observe for dynamic content (modals, etc.)
function observeForDynamicContent() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Check for calendar modals
          if (
            node.id === 'calendarModal' ||
            node.classList?.contains('calendar-modal')
          ) {
            setTimeout(() => {
              initializeModalCalendar(node);
            }, 100);
          }

          // Check for date inputs in forms
          if (
            node.querySelector &&
            node.querySelector('input[type="date"], input[type="time"]')
          ) {
            setTimeout(initializeFlatpickr, 100);
          }
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Initialize calendar in modal (for service schedules)
function initializeModalCalendar(modal) {
  const calendarContainer = modal.querySelector(
    '#serviceCalendar, [data-calendar-container]'
  );
  if (calendarContainer && !calendarContainer._fcCalendar) {
    const serviceId =
      modal.dataset.serviceId || calendarContainer.dataset.serviceId;

    // Create enhanced service calendar
    const calendar = createEnhancedServiceCalendar(calendarContainer);

    // Add specific modal enhancements
    addModalCalendarFeatures(calendar, serviceId);
  }
}

// Add modal-specific calendar features
function addModalCalendarFeatures(calendar, serviceId) {
  // Add quick booking form
  const modalContent = calendar.el.closest('.modal-content');
  if (modalContent && !modalContent.querySelector('.quick-booking')) {
    const quickBooking = document.createElement('div');
    quickBooking.className = 'quick-booking';
    quickBooking.innerHTML = `
            <h4>Reserva Rápida</h4>
            <div class="quick-booking-form">
                <input type="text" id="quickPatientName" placeholder="Nombre del paciente" class="form-control">
                <input type="tel" id="quickPatientPhone" placeholder="Teléfono" class="form-control">
                <select id="quickTimeSlot" class="form-control">
                    <option value="">Seleccionar horario...</option>
                </select>
                <button onclick="quickBookAppointment('${serviceId}')" class="btn btn-primary">Reservar</button>
            </div>
        `;
    modalContent.appendChild(quickBooking);
  }

  // Update available slots when date changes
  calendar.on('dateClick', function (info) {
    updateQuickBookingSlots(info.date, serviceId);
  });
}

// Quick booking function
window.quickBookAppointment = async function (serviceId) {
  const name = document.getElementById('quickPatientName').value;
  const phone = document.getElementById('quickPatientPhone').value;
  const timeSlot = document.getElementById('quickTimeSlot').value;

  if (!name || !phone || !timeSlot) {
    widgets.showError('Por favor complete todos los campos');
    return;
  }

  try {
    const [date, time] = timeSlot.split('T');
    await db.collection('appointments').add({
      serviceId: serviceId,
      patientName: name,
      patientPhone: phone,
      date: firebase.firestore.Timestamp.fromDate(new Date(timeSlot)),
      time: time,
      status: 'confirmed',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    widgets.showSuccess('Cita reservada exitosamente');

    // Refresh calendar
    const calendar = document.querySelector(
      '.calendar-modal .calendar-container'
    )?._fcCalendar;
    if (calendar) {
      calendar.refetchEvents();
    }

    // Clear form
    document.getElementById('quickPatientName').value = '';
    document.getElementById('quickPatientPhone').value = '';
    document.getElementById('quickTimeSlot').value = '';
  } catch (error) {
    widgets.showError('Error al reservar cita');
    Logger.error(error);
  }
};

// Update quick booking slots
async function updateQuickBookingSlots(date, serviceId) {
  const select = document.getElementById('quickTimeSlot');
  if (!select) return;

  // Clear current options
  select.innerHTML = '<option value="">Cargando horarios...</option>';

  try {
    // Get existing appointments for the date
    const startOfDay = moment(date).startOf('day').toDate();
    const endOfDay = moment(date).endOf('day').toDate();

    const snapshot = await db
      .collection('appointments')
      .where('serviceId', '==', serviceId)
      .where('date', '>=', startOfDay)
      .where('date', '<=', endOfDay)
      .get();

    const bookedSlots = [];
    snapshot.forEach((doc) => {
      const apt = doc.data();
      bookedSlots.push(moment(apt.date.toDate()).format('HH:mm'));
    });

    // Generate available slots
    const slots = [];
    for (let hour = 6; hour <= 20; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        if (!bookedSlots.includes(time)) {
          const dateTime = moment(date).set({ hour, minute: min });
          slots.push({
            value: dateTime.toISOString(),
            label: time,
          });
        }
      }
    }

    // Update select options
    select.innerHTML = '<option value="">Seleccionar horario...</option>';
    slots.forEach((slot) => {
      const option = document.createElement('option');
      option.value = slot.value;
      option.textContent = slot.label;
      select.appendChild(option);
    });
  } catch (error) {
    Logger.error('Error loading slots:', error);
    select.innerHTML = '<option value="">Error al cargar horarios</option>';
  }
}

// Override the global showServiceCalendar function to use enhanced calendar
window.showServiceCalendar = function (serviceId) {
  const modal = document.getElementById('calendarModal');
  const modalTitle = document.getElementById('calendarModalTitle');
  const calendarContainer = document.getElementById('serviceCalendar');

  // Get service info
  const serviceCard = document.querySelector(
    `[data-service-id="${serviceId}"]`
  );
  const serviceName =
    serviceCard?.querySelector('h3')?.textContent || 'Servicio';

  modalTitle.textContent = `Calendario - ${serviceName}`;
  modal.dataset.serviceId = serviceId;
  calendarContainer.dataset.serviceId = serviceId;
  calendarContainer.dataset.calendarType = 'service';

  // Show modal
  modal.style.display = 'block';

  // Initialize enhanced calendar
  setTimeout(() => {
    initializeModalCalendar(modal);
  }, 100);
};

// Add CSS styles for enhanced calendars
function addCalendarStyles() {
  const style = document.createElement('style');
  style.textContent = `
        /* Flatpickr enhancements */
        .flatpickr-calendar {
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border: 1px solid #e5e7eb;
        }
        
        .flatpickr-day.flatpickr-holiday {
            background-color: #fee2e2;
            color: #dc2626;
        }
        
        .holiday-indicator {
            position: absolute;
            top: 2px;
            right: 2px;
            font-size: 10px;
        }
        
        .flatpickr-quick-buttons button:hover {
            opacity: 0.9;
        }
        
        .flatpickr-time-presets button:hover,
        .flatpickr-time-slots button:hover {
            background-color: #16A34A !important;
            color: white !important;
        }
        
        /* FullCalendar enhancements */
        .fc-event {
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .fc-event:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .event-capacity-badge {
            font-weight: bold;
        }
        
        .external-events {
            padding: 15px;
            background: #f9fafb;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        
        .draggable-events {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin-top: 10px;
        }
        
        .draggable {
            padding: 8px 12px;
            background: #16A34A;
            color: white;
            border-radius: 4px;
            cursor: move;
            text-align: center;
            transition: all 0.2s;
        }
        
        .draggable:hover {
            background: #15803d;
            transform: scale(1.05);
        }
        
        .calendar-toolbar-extra {
            margin-left: auto;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .toolbar-actions {
            display: flex;
            gap: 10px;
            align-items: center;
        }
        
        .toolbar-actions button {
            padding: 6px 12px;
            background: #f3f4f6;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
        }
        
        .toolbar-actions button:hover {
            background: #e5e7eb;
        }
        
        .view-filter {
            padding: 6px 12px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 14px;
        }
        
        /* Quick booking form */
        .quick-booking {
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .quick-booking h4 {
            margin-bottom: 15px;
            color: #111827;
        }
        
        .quick-booking-form {
            display: grid;
            gap: 10px;
        }
        
        .quick-booking-form .form-control {
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .quick-booking-form .btn {
            padding: 10px 20px;
            background: #16A34A;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            transition: background 0.2s;
        }
        
        .quick-booking-form .btn:hover {
            background: #15803d;
        }
        
        /* Resource timeline specific */
        .fc-resource-timeline .fc-datagrid-cell {
            font-size: 14px;
        }
        
        .resource-capacity {
            background: #e5e7eb;
            padding: 2px 6px;
            border-radius: 12px;
        }
        
        /* Calendar in modal */
        .calendar-modal .fc {
            max-height: 60vh;
            overflow-y: auto;
        }
        
        /* Date range picker */
        .date-range-picker {
            min-width: 300px;
        }
        
        /* Loading states */
        .fc-event.loading {
            opacity: 0.5;
            pointer-events: none;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
            .toolbar-actions {
                flex-wrap: wrap;
            }
            
            .flatpickr-calendar {
                font-size: 14px;
            }
            
            .draggable-events {
                grid-template-columns: 1fr;
            }
        }
    `;
  document.head.appendChild(style);
}

// Call addCalendarStyles on initialization
addCalendarStyles();

// Export all functions
window.calendarEnhancements = {
  initializeFlatpickr,
  enhanceDateInputs,
  enhanceDateTimeInputs,
  enhanceTimeInputs,
  enhanceReportFilters,
  createDateRangePicker,
  enhanceAllCalendars,
  createEnhancedServiceCalendar,
  createResourceTimeline,
  createStandardCalendar,
  createOccupancyHeatmap,
  initializeRealTimeUpdates,
  showServiceCalendar,
  quickBookAppointment,
};
