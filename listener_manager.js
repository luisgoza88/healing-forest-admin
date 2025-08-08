// Centralized listener manager to track Firestore onSnapshot listeners
const ListenerManager = {
  listeners: [],

  add(unsubscribe) {
    if (typeof unsubscribe === 'function') {
      this.listeners.push(unsubscribe);
    }
  },

  clearAll() {
    this.listeners.forEach((unsub) => {
      try {
        unsub();
      } catch (err) {
        console.error('Error clearing listener', err);
      }
    });
    this.listeners = [];
  },
};

// Expose globally
window.ListenerManager = ListenerManager;

// Clean up on page unload
window.addEventListener('beforeunload', () => ListenerManager.clearAll());
