// Script to replace console.log with Logger.log in all JS files
// Run this with Node.js: node replace-console-logs.js

const fs = require('fs');
const path = require('path');

// Files to process
const jsFiles = [
  'app.js',
  'calendar_enhancements.js',
  'service_capacity.js',
  'service_calendar.js',
  'patient_sync.js',
  'migrate_services.js',
  'siigo_integration.js',
  'ai_predictions.js',
  'whatsapp_automation.js',
  'whatsapp_functions.js',
  'dashboard_widgets_demo.js',
  'apex_charts_config.js',
  'tabulator_config.js',
  'spinkit_loaders.js',
  'widgets_helpers.js',
];

// Patterns to replace
const replacements = [
  {
    pattern: /console\.log\(/g,
    replacement: 'Logger.log(',
  },
  {
    pattern: /console\.error\(/g,
    replacement: 'Logger.error(',
  },
  {
    pattern: /console\.warn\(/g,
    replacement: 'Logger.warn(',
  },
  {
    pattern: /console\.info\(/g,
    replacement: 'Logger.info(',
  },
  {
    pattern: /console\.debug\(/g,
    replacement: 'Logger.debug(',
  },
];

// Process each file
jsFiles.forEach((file) => {
  const filePath = path.join(__dirname, file);
  
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    replacements.forEach(({ pattern, replacement }) => {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ Updated ${file}`);
    } else {
      console.log(`⏭️  No changes needed in ${file}`);
    }
  } else {
    console.log(`❌ File not found: ${file}`);
  }
});

console.log('\n✨ Console.log replacement complete!');
console.log('Remember to test the application to ensure everything works correctly.');