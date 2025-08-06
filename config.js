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
    accountSid: process.env.TWILIO_ACCOUNT_SID || '',
    authToken: process.env.TWILIO_AUTH_TOKEN || '',
    whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886',
  },

  // EmailJS Configuration
  emailjs: {
    serviceId: process.env.EMAILJS_SERVICE_ID || 'YOUR_SERVICE_ID',
    templateId: process.env.EMAILJS_TEMPLATE_ID || 'YOUR_TEMPLATE_ID',
    publicKey: process.env.EMAILJS_PUBLIC_KEY || 'YOUR_PUBLIC_KEY',
  },

  // Siigo Configuration
  siigo: {
    apiKey: process.env.SIIGO_API_KEY || '',
    companyId: process.env.SIIGO_COMPANY_ID || '',
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
