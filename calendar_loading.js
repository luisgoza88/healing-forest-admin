// Calendar Loading Indicators System
// Provides visual feedback during loading operations

class CalendarLoadingManager {
  constructor() {
    this.activeLoaders = new Map();
    this.globalLoaderId = 'calendar-global-loader';
    this.styles = this.injectStyles();
  }

  // Inject required CSS styles
  injectStyles() {
    if (document.getElementById('calendar-loading-styles')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'calendar-loading-styles';
    style.textContent = `
      /* Global calendar loader */
      .calendar-global-loader {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.85);
        color: white;
        padding: 20px 40px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        gap: 15px;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        animation: fadeIn 0.3s ease-out;
      }

      /* Calendar overlay loader */
      .calendar-overlay-loader {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(255, 255, 255, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeIn 0.2s ease-out;
      }

      /* Inline loader for small areas */
      .calendar-inline-loader {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 10px;
        color: #666;
      }

      /* Spinner animation */
      .calendar-spinner {
        width: 24px;
        height: 24px;
        border: 3px solid rgba(255, 255, 255, 0.3);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      .calendar-spinner-dark {
        border-color: rgba(0, 0, 0, 0.1);
        border-top-color: #16a34a;
      }

      /* Pulse loader for subtle loading indication */
      .calendar-pulse-loader {
        position: absolute;
        top: 10px;
        right: 10px;
        width: 12px;
        height: 12px;
        background: #16a34a;
        border-radius: 50%;
        animation: pulse 1.5s ease-out infinite;
      }

      /* Skeleton loader for calendar grid */
      .calendar-skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: shimmer 1.5s infinite;
        border-radius: 4px;
      }

      .calendar-skeleton-event {
        height: 30px;
        margin: 4px;
        border-radius: 4px;
      }

      .calendar-skeleton-header {
        height: 40px;
        margin-bottom: 10px;
      }

      /* Loading message styles */
      .calendar-loading-message {
        margin-top: 10px;
        font-size: 14px;
        color: #666;
        text-align: center;
      }

      /* Progress bar for long operations */
      .calendar-progress-bar {
        width: 200px;
        height: 4px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 2px;
        overflow: hidden;
        margin-top: 15px;
      }

      .calendar-progress-fill {
        height: 100%;
        background: #16a34a;
        transition: width 0.3s ease;
      }

      /* Animations */
      @keyframes spin {
        to { transform: rotate(360deg); }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes pulse {
        0% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.2); opacity: 0.7; }
        100% { transform: scale(1); opacity: 1; }
      }

      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .calendar-global-loader {
          padding: 15px 25px;
          font-size: 14px;
        }
        
        .calendar-spinner {
          width: 20px;
          height: 20px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  // Show global loading indicator
  showGlobalLoader(message = 'Cargando...') {
    this.hideGlobalLoader(); // Remove any existing loader

    const loader = document.createElement('div');
    loader.id = this.globalLoaderId;
    loader.className = 'calendar-global-loader';
    loader.innerHTML = `
      <div class="calendar-spinner"></div>
      <span>${this.escapeHtml(message)}</span>
    `;

    document.body.appendChild(loader);
  }

  // Hide global loading indicator
  hideGlobalLoader() {
    const loader = document.getElementById(this.globalLoaderId);
    if (loader) {
      loader.remove();
    }
  }

  // Show overlay loader on specific calendar element
  showCalendarLoader(calendarEl, message = 'Cargando eventos...') {
    const loaderId = `loader-${Date.now()}`;
    
    const loader = document.createElement('div');
    loader.id = loaderId;
    loader.className = 'calendar-overlay-loader';
    loader.innerHTML = `
      <div class="calendar-spinner calendar-spinner-dark"></div>
      <div class="calendar-loading-message">${this.escapeHtml(message)}</div>
    `;

    // Make calendar container relative if not already
    const position = window.getComputedStyle(calendarEl).position;
    if (position === 'static') {
      calendarEl.style.position = 'relative';
    }

    calendarEl.appendChild(loader);
    this.activeLoaders.set(calendarEl, loaderId);

    return loaderId;
  }

  // Hide overlay loader from specific calendar
  hideCalendarLoader(calendarEl) {
    const loaderId = this.activeLoaders.get(calendarEl);
    if (loaderId) {
      const loader = document.getElementById(loaderId);
      if (loader) {
        loader.remove();
      }
      this.activeLoaders.delete(calendarEl);
    }
  }

  // Show inline loader for small areas
  showInlineLoader(container, message = 'Cargando...') {
    const loader = document.createElement('div');
    loader.className = 'calendar-inline-loader';
    loader.innerHTML = `
      <div class="calendar-spinner calendar-spinner-dark" style="width: 16px; height: 16px;"></div>
      <span>${this.escapeHtml(message)}</span>
    `;
    
    container.appendChild(loader);
    return loader;
  }

  // Show pulse loader for subtle indication
  showPulseLoader(container) {
    const loader = document.createElement('div');
    loader.className = 'calendar-pulse-loader';
    container.style.position = 'relative';
    container.appendChild(loader);
    return loader;
  }

  // Show skeleton loader for calendar grid
  showSkeletonLoader(calendarEl, weeks = 5) {
    const skeleton = document.createElement('div');
    skeleton.className = 'calendar-skeleton-container';
    skeleton.style.cssText = 'padding: 20px;';

    // Header skeleton
    skeleton.innerHTML = `
      <div class="calendar-skeleton calendar-skeleton-header"></div>
      <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; margin-top: 20px;">
        ${this.generateSkeletonEvents(weeks * 7)}
      </div>
    `;

    calendarEl.appendChild(skeleton);
    return skeleton;
  }

  // Generate skeleton event placeholders
  generateSkeletonEvents(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
      const height = Math.random() * 40 + 30; // Random heights for variety
      html += `<div class="calendar-skeleton calendar-skeleton-event" style="height: ${height}px;"></div>`;
    }
    return html;
  }

  // Show progress bar for long operations
  showProgressLoader(container, message = 'Procesando...') {
    const loader = document.createElement('div');
    loader.className = 'calendar-progress-loader';
    loader.innerHTML = `
      <div class="calendar-loading-message">${this.escapeHtml(message)}</div>
      <div class="calendar-progress-bar">
        <div class="calendar-progress-fill" style="width: 0%"></div>
      </div>
    `;

    container.appendChild(loader);

    // Return update function
    return {
      element: loader,
      updateProgress: (percent) => {
        const fill = loader.querySelector('.calendar-progress-fill');
        if (fill) {
          fill.style.width = `${Math.min(100, Math.max(0, percent))}%`;
        }
      },
      updateMessage: (newMessage) => {
        const messageEl = loader.querySelector('.calendar-loading-message');
        if (messageEl) {
          messageEl.textContent = newMessage;
        }
      }
    };
  }

  // Loading wrapper for async functions
  async withLoader(asyncFn, options = {}) {
    const {
      type = 'global',
      message = 'Cargando...',
      container = null,
      minDuration = 300 // Minimum display time to prevent flashing
    } = options;

    const startTime = Date.now();
    let loader;

    try {
      // Show appropriate loader
      switch (type) {
        case 'global':
          this.showGlobalLoader(message);
          break;
        case 'calendar':
          if (container) {
            loader = this.showCalendarLoader(container, message);
          }
          break;
        case 'inline':
          if (container) {
            loader = this.showInlineLoader(container, message);
          }
          break;
        case 'pulse':
          if (container) {
            loader = this.showPulseLoader(container);
          }
          break;
      }

      // Execute async function
      const result = await asyncFn();

      // Ensure minimum display time
      const elapsed = Date.now() - startTime;
      if (elapsed < minDuration) {
        await new Promise(resolve => setTimeout(resolve, minDuration - elapsed));
      }

      return result;
    } finally {
      // Hide appropriate loader
      switch (type) {
        case 'global':
          this.hideGlobalLoader();
          break;
        case 'calendar':
          if (container) {
            this.hideCalendarLoader(container);
          }
          break;
        case 'inline':
        case 'pulse':
          if (loader && loader.remove) {
            loader.remove();
          }
          break;
      }
    }
  }

  // Utility to escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Clean up all active loaders
  cleanup() {
    this.hideGlobalLoader();
    this.activeLoaders.forEach((loaderId, container) => {
      this.hideCalendarLoader(container);
    });
  }
}

// Initialize global loading manager
window.calendarLoadingManager = new CalendarLoadingManager();

// Convenience functions
window.showCalendarLoading = (message) => window.calendarLoadingManager.showGlobalLoader(message);
window.hideCalendarLoading = () => window.calendarLoadingManager.hideGlobalLoader();

// Add loading states to window for debugging
if (window.location.hostname === 'localhost') {
  window.debugLoading = {
    showAll: () => {
      console.log('Active loaders:', window.calendarLoadingManager.activeLoaders.size);
      console.log('Loaders:', Array.from(window.calendarLoadingManager.activeLoaders.entries()));
    },
    testLoaders: async () => {
      console.log('Testing global loader...');
      window.showCalendarLoading('Testing global loader');
      await new Promise(r => setTimeout(r, 2000));
      window.hideCalendarLoading();

      console.log('Testing calendar overlay...');
      const testDiv = document.createElement('div');
      testDiv.style.cssText = 'width: 400px; height: 300px; border: 1px solid #ccc; margin: 20px;';
      document.body.appendChild(testDiv);
      
      await window.calendarLoadingManager.withLoader(
        () => new Promise(r => setTimeout(r, 2000)),
        { type: 'calendar', container: testDiv, message: 'Testing calendar loader' }
      );
      
      testDiv.remove();
      console.log('Tests complete!');
    }
  };
}

console.log('Calendar loading system initialized');