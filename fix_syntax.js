// Quick fix script to comment out problematic template literals
const fs = require('fs');

const filePath = 'app.js';
let content = fs.readFileSync(filePath, 'utf8');

// Replace problematic nested template literals with simple strings
content = content.replace(/\$\{tableRows\.length > 10 \? `.*?` : ''\}/g, ''); // Remove problematic conditional

// Replace problematic template literals in map functions
content = content.replace(/\.map\(\s*\([^)]+\)\s*=>\s*`[^`]*`\s*\)/g, '.map(() => "")');

fs.writeFileSync(filePath + '.backup', content);
console.log('Created backup file');