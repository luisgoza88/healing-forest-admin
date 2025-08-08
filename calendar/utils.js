(function (global) {
  const calendars = {};

  function createCalendar(id, element, options = {}) {
    if (!element) {
      console.error('Calendar element not found for id', id);
      return null;
    }
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
    };
    const calendar = new FullCalendar.Calendar(element, {
      ...defaultOptions,
      ...options,
    });
    calendar.render();
    calendars[id] = calendar;
    return calendar;
  }

  function getCalendar(id) {
    return calendars[id] || null;
  }

  function destroyCalendar(id) {
    const calendar = calendars[id];
    if (calendar) {
      calendar.destroy();
      delete calendars[id];
    }
  }

  global.calendarUtils = {
    createCalendar,
    getCalendar,
    destroyCalendar,
  };
})(window);
