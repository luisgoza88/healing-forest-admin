// Configuration loader for Healing Forest Admin
// This file handles loading configuration from environment or defaults

// In production, these should come from environment variables
// For now, we'll use a config object that can be easily modified

const Config = {
  // Firebase Configuration
  firebase: {
    apiKey: 'AIzaSyAlOrxlLbZV-ZzxDcFrretv2dycKtF4dyM',
    authDomain: 'healling-forest.firebaseapp.com',
    projectId: 'healling-forest',
    storageBucket: 'healling-forest.firebasestorage.app',
    messagingSenderId: '657330224656',
    appId: '1:657330224656:web:admin',
  },

  // Twilio Configuration (for WhatsApp)
  twilio: {
    accountSid: '',
    authToken: '',
    whatsappNumber: '+14155238886',
  },

  // EmailJS Configuration
  emailjs: {
    serviceId: 'YOUR_SERVICE_ID',
    templateId: 'YOUR_TEMPLATE_ID',
    publicKey: 'YOUR_PUBLIC_KEY',
  },

  // Siigo Configuration
  siigo: {
    apiKey: '',
    companyId: '',
  },

  // Application Settings
  app: {
    name: 'Healing Forest Admin',
    version: '1.0.0',
    environment:
      window.location.hostname === 'localhost' ? 'development' : 'production',
  },
};

// WARNING: Firebase config is currently hardcoded for development
// In production, these should be loaded from secure environment variables
// Never commit real credentials to version control

if (Config.app.environment === 'production') {
  console.warn(
    '⚠️ Running in production with hardcoded credentials. Please configure environment variables.'
  );
}

// Export configuration
window.AppConfig = Config;
