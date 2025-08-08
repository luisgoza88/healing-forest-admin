// Configuration loader for Healing Forest Admin
// Loads required credentials from environment variables at runtime

(function () {
  function getEnvVar(name) {
    const value =
      (typeof process !== 'undefined' && process.env && process.env[name]) ||
      (typeof window !== 'undefined' && window.__ENV__ && window.__ENV__[name]);
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }

  const Config = {
    // Firebase Configuration
    firebase: {
      apiKey: getEnvVar('FIREBASE_API_KEY'),
      authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN'),
      projectId: getEnvVar('FIREBASE_PROJECT_ID'),
      storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
      appId: getEnvVar('FIREBASE_APP_ID'),
    },

    // Twilio Configuration (for WhatsApp)
    twilio: {
      accountSid: getEnvVar('TWILIO_ACCOUNT_SID'),
      authToken: getEnvVar('TWILIO_AUTH_TOKEN'),
      whatsappNumber: getEnvVar('TWILIO_WHATSAPP_NUMBER'),
    },

    // EmailJS Configuration
    emailjs: {
      serviceId: getEnvVar('EMAILJS_SERVICE_ID'),
      templateId: getEnvVar('EMAILJS_TEMPLATE_ID'),
      publicKey: getEnvVar('EMAILJS_PUBLIC_KEY'),
    },

    // Siigo Configuration
    siigo: {
      apiKey: getEnvVar('SIIGO_API_KEY'),
      companyId: getEnvVar('SIIGO_COMPANY_ID'),
    },

    // Application Settings
    app: {
      name: 'Healing Forest Admin',
      version: '1.0.0',
      environment:
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
          ? 'development'
          : 'production',
    },
  };

  window.AppConfig = Config;
})();
