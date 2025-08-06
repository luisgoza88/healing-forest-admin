// Logger utility for Healing Forest Admin
// Provides controlled logging with environment awareness

const Logger = {
  isDevelopment:
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1',

  log: function (...args) {
    if (this.isDevelopment) {
      console.log('[LOG]', ...args);
    }
  },

  info: function (...args) {
    if (this.isDevelopment) {
      console.info('[INFO]', ...args);
    }
  },

  warn: function (...args) {
    // Warnings are shown in production too
    console.warn('[WARN]', ...args);
  },

  error: function (...args) {
    // Errors are always shown
    console.error('[ERROR]', ...args);

    // Could send to error tracking service in production
    if (!this.isDevelopment) {
      // Example: Send to error tracking service
      // errorTracker.logError(args);
    }
  },

  debug: function (...args) {
    if (this.isDevelopment) {
      console.debug('[DEBUG]', ...args);
    }
  },

  table: function (data) {
    if (this.isDevelopment && console.table) {
      console.table(data);
    }
  },

  time: function (label) {
    if (this.isDevelopment) {
      console.time(label);
    }
  },

  timeEnd: function (label) {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  },
};

// Export for use
window.Logger = Logger;

// Replace console.log globally (optional)
if (!Logger.isDevelopment) {
  console.log = function () {};
  console.debug = function () {};
  console.info = function () {};
}
