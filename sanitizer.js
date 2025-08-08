// HTML Sanitization Utility
// Provides safe HTML insertion methods using DOMPurify

(function(global) {
  // Check if DOMPurify is loaded
  if (typeof DOMPurify === 'undefined') {
    console.error('DOMPurify not loaded. HTML sanitization disabled.');
    // Fallback that escapes HTML
    global.SafeHTML = {
      sanitize: function(html) {
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
      },
      setInnerHTML: function(element, html) {
        if (element) {
          element.textContent = html;
        }
      }
    };
    return;
  }

  // Configure DOMPurify options
  const purifyConfig = {
    // Allow basic HTML tags
    ALLOWED_TAGS: [
      'a', 'b', 'i', 'em', 'strong', 'u', 'p', 'br', 'span', 'div',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'img', 'code', 'pre', 'blockquote', 'hr',
      'button', 'input', 'select', 'option', 'textarea', 'label',
      'form', 'fieldset', 'legend', 'small', 'sup', 'sub'
    ],
    // Allow safe attributes
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'class', 'id', 'style',
      'type', 'name', 'value', 'placeholder', 'required', 'disabled',
      'checked', 'selected', 'readonly', 'multiple', 'min', 'max',
      'step', 'pattern', 'for', 'colspan', 'rowspan',
      'data-*', 'aria-*', 'role', 'tabindex'
    ],
    // Allow data: URLs for images
    ALLOW_DATA_ATTR: true,
    // Keep classes and IDs
    KEEP_CONTENT: true,
    // Allow inline styles (but sanitized)
    ALLOW_STYLE: true,
    // Remove dangerous elements completely
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'link', 'meta'],
    // Remove dangerous attributes
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur']
  };

  // Create SafeHTML utility
  global.SafeHTML = {
    /**
     * Sanitize HTML string
     * @param {string} html - HTML to sanitize
     * @param {Object} customConfig - Optional custom DOMPurify config
     * @returns {string} Sanitized HTML
     */
    sanitize: function(html, customConfig) {
      if (!html) return '';
      
      try {
        const config = customConfig ? { ...purifyConfig, ...customConfig } : purifyConfig;
        return DOMPurify.sanitize(html, config);
      } catch (error) {
        console.error('Sanitization error:', error);
        // Fallback to text content
        const div = document.createElement('div');
        div.textContent = html;
        return div.innerHTML;
      }
    },

    /**
     * Safely set innerHTML of an element
     * @param {HTMLElement|string} element - Element or selector
     * @param {string} html - HTML to insert
     * @param {Object} customConfig - Optional custom DOMPurify config
     */
    setInnerHTML: function(element, html, customConfig) {
      const el = typeof element === 'string' ? document.querySelector(element) : element;
      if (el) {
        el.innerHTML = this.sanitize(html, customConfig);
      }
    },

    /**
     * Safely append HTML to an element
     * @param {HTMLElement|string} element - Element or selector
     * @param {string} html - HTML to append
     * @param {Object} customConfig - Optional custom DOMPurify config
     */
    appendHTML: function(element, html, customConfig) {
      const el = typeof element === 'string' ? document.querySelector(element) : element;
      if (el) {
        el.insertAdjacentHTML('beforeend', this.sanitize(html, customConfig));
      }
    },

    /**
     * Safely prepend HTML to an element
     * @param {HTMLElement|string} element - Element or selector
     * @param {string} html - HTML to prepend
     * @param {Object} customConfig - Optional custom DOMPurify config
     */
    prependHTML: function(element, html, customConfig) {
      const el = typeof element === 'string' ? document.querySelector(element) : element;
      if (el) {
        el.insertAdjacentHTML('afterbegin', this.sanitize(html, customConfig));
      }
    },

    /**
     * Create safe HTML from template
     * @param {string} template - Template string with placeholders
     * @param {Object} data - Data to interpolate
     * @returns {string} Sanitized HTML
     */
    fromTemplate: function(template, data) {
      // First escape all data values
      const escapedData = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          const value = data[key];
          if (typeof value === 'string') {
            const div = document.createElement('div');
            div.textContent = value;
            escapedData[key] = div.innerHTML;
          } else {
            escapedData[key] = value;
          }
        }
      }

      // Replace placeholders
      let html = template;
      for (const key in escapedData) {
        const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
        html = html.replace(regex, escapedData[key]);
      }

      // Sanitize final HTML
      return this.sanitize(html);
    },

    /**
     * Check if HTML contains dangerous content
     * @param {string} html - HTML to check
     * @returns {boolean} True if dangerous content detected
     */
    isDangerous: function(html) {
      const clean = this.sanitize(html);
      return clean !== html;
    },

    /**
     * Escape HTML entities
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escape: function(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  };

  // Log successful initialization
  Logger.log('SafeHTML sanitizer initialized with DOMPurify');

})(window);