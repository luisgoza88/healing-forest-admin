// WhatsApp Configuration Example
// Copy this file to whatsapp_config.js and fill with your credentials

const WHATSAPP_CONFIG = {
    // Twilio Credentials
    ACCOUNT_SID: 'YOUR_TWILIO_ACCOUNT_SID',
    AUTH_TOKEN: 'YOUR_TWILIO_AUTH_TOKEN',
    
    // WhatsApp Numbers
    SANDBOX_NUMBER: '+14155238886', // Twilio Sandbox number
    PRODUCTION_NUMBER: 'YOUR_WHATSAPP_BUSINESS_NUMBER',
    
    // API Keys (optional)
    API_KEY_SID: 'YOUR_API_KEY_SID',
    API_KEY_SECRET: 'YOUR_API_KEY_SECRET',
    
    // Default settings
    MODE: 'sandbox', // 'sandbox' or 'production'
    ADMIN_PHONE: 'YOUR_ADMIN_PHONE_NUMBER'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WHATSAPP_CONFIG;
}