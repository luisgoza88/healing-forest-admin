// Calendar Utilities Module
// Centralized FullCalendar configuration and instance management

(function (global) {
  // Store calendar instances
  const calendars = {};

  // Default calendar options
  const defaultOptions = {
    initialView: 'dayGridMonth',
    locale: 'es',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay',
    },
    editable: true,
    droppable: true,
    eventDurationEditable: false,
    height: 'auto',
    slotMinTime: '06:00:00',
    slotMaxTime: '21:00:00',
    slotDuration: '00:30:00',
    expandRows: true,
    nowIndicator: true,
    dayMaxEvents: true,
    eventMaxStack: 4,
  };

  // Calendar type specific options
  const calendarTypes = {
    main: {
      // Dashboard calendar specific options
      editable: false,
      droppable: false,
    },
    service: {
      // Service calendar specific options
      slotLabelInterval: '01:00:00',
      allDaySlot: false,
      weekends: true,
    },
  };

  /**
   * Create a new calendar instance
   * @param {string} id - Unique identifier for the calendar
   * @param {HTMLElement} element - DOM element to render calendar
   * @param {Object} options - Custom options to override defaults
   * @param {string} type - Calendar type ('main' or 'service')
   * @returns {Object} FullCalendar instance or null if error
   */
  function createCalendar(id, element, options = {}, type = 'main') {
    // Validate inputs
    if (!id || !element) {
      console.error('Calendar ID and element are required');
      return null;
    }

    if (typeof FullCalendar === 'undefined') {
      console.error('FullCalendar library not loaded');
      return null;
    }

    // Check if calendar already exists
    if (calendars[id]) {
      console.warn(`Calendar with ID '${id}' already exists. Destroying old instance.`);
      destroyCalendar(id);
    }

    try {
      // Merge options: defaults -> type-specific -> custom
      const typeOptions = calendarTypes[type] || {};
      const finalOptions = {
        ...defaultOptions,
        ...typeOptions,
        ...options,
      };

      // Create calendar instance
      const calendar = new FullCalendar.Calendar(element, finalOptions);
      
      // Render calendar
      calendar.render();
      
      // Store instance
      calendars[id] = {
        instance: calendar,
        element: element,
        type: type,
        options: finalOptions,
      };

      Logger.log(`Calendar '${id}' created successfully`);
      return calendar;
    } catch (error) {
      console.error(`Error creating calendar '${id}':`, error);
      return null;
    }
  }

  /**
   * Get existing calendar instance
   * @param {string} id - Calendar identifier
   * @returns {Object} FullCalendar instance or null
   */
  function getCalendar(id) {
    const calendarData = calendars[id];
    return calendarData ? calendarData.instance : null;
  }

  /**
   * Destroy calendar instance and clean up
   * @param {string} id - Calendar identifier
   * @returns {boolean} Success status
   */
  function destroyCalendar(id) {
    const calendarData = calendars[id];
    
    if (!calendarData) {
      console.warn(`Calendar '${id}' not found`);
      return false;
    }

    try {
      // Destroy FullCalendar instance
      calendarData.instance.destroy();
      
      // Clear element
      if (calendarData.element) {
        calendarData.element.innerHTML = '';
      }
      
      // Remove from storage
      delete calendars[id];
      
      Logger.log(`Calendar '${id}' destroyed`);
      return true;
    } catch (error) {
      console.error(`Error destroying calendar '${id}':`, error);
      return false;
    }
  }

  /**
   * Refresh calendar events
   * @param {string} id - Calendar identifier
   */
  function refreshCalendar(id) {
    const calendar = getCalendar(id);
    if (calendar) {
      calendar.removeAllEvents();
      calendar.refetchEvents();
      Logger.log(`Calendar '${id}' refreshed`);
    }
  }

  /**
   * Refetch events from sources
   * @param {string} id - Calendar identifier
   */
  function refetchEvents(id) {
    const calendar = getCalendar(id);
    if (calendar) {
      calendar.refetchEvents();
      Logger.log(`Calendar '${id}' events refetched`);
    }
  }

  /**
   * Update calendar options
   * @param {string} id - Calendar identifier
   * @param {Object} options - Options to update
   */
  function updateCalendarOptions(id, options) {
    const calendar = getCalendar(id);
    if (calendar) {
      Object.entries(options).forEach(([key, value]) => {
        calendar.setOption(key, value);
      });
      Logger.log(`Calendar '${id}' options updated`);
    }
  }

  /**
   * Get all calendar instances
   * @returns {Object} All calendar instances
   */
  function getAllCalendars() {
    const result = {};
    Object.entries(calendars).forEach(([id, data]) => {
      result[id] = data.instance;
    });
    return result;
  }

  /**
   * Destroy all calendar instances
   */
  function destroyAllCalendars() {
    Object.keys(calendars).forEach(id => {
      destroyCalendar(id);
    });
    Logger.log('All calendars destroyed');
  }

  /**
   * Add events to calendar
   * @param {string} id - Calendar identifier
   * @param {Array} events - Array of event objects
   */
  function addEvents(id, events) {
    const calendar = getCalendar(id);
    if (calendar && Array.isArray(events)) {
      calendar.addEventSource(events);
      Logger.log(`${events.length} events added to calendar '${id}'`);
    }
  }

  /**
   * Remove all events from calendar
   * @param {string} id - Calendar identifier
   */
  function removeAllEvents(id) {
    const calendar = getCalendar(id);
    if (calendar) {
      calendar.removeAllEvents();
      Logger.log(`All events removed from calendar '${id}'`);
    }
  }

  /**
   * Go to specific date
   * @param {string} id - Calendar identifier
   * @param {Date} date - Date to navigate to
   */
  function gotoDate(id, date) {
    const calendar = getCalendar(id);
    if (calendar && date instanceof Date) {
      calendar.gotoDate(date);
    }
  }

  /**
   * Change calendar view
   * @param {string} id - Calendar identifier
   * @param {string} viewName - View name (e.g., 'dayGridMonth', 'timeGridWeek')
   */
  function changeView(id, viewName) {
    const calendar = getCalendar(id);
    if (calendar) {
      calendar.changeView(viewName);
    }
  }

  // Clean up on page unload
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      destroyAllCalendars();
    });
  }

  // Export public API
  global.calendarUtils = {
    createCalendar,
    getCalendar,
    destroyCalendar,
    refreshCalendar,
    refetchEvents,
    updateCalendarOptions,
    getAllCalendars,
    destroyAllCalendars,
    addEvents,
    removeAllEvents,
    gotoDate,
    changeView,
    // Export constants for external use
    defaultOptions,
    calendarTypes,
  };

  Logger.log('Calendar utilities module loaded');
})(window);