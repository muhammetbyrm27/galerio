const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'client', 'src');

function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // socket.js
    content = content.replace(/const URL = 'http:\/\/localhost:5000';/g, "const URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';");

    // Replace straight string literals
    content = content.replace(/'http:\/\/localhost:5000/g, "`\\${process.env.REACT_APP_API_URL || 'http://localhost:5000'}");
    // Some strings ended with a single quote. If we replaced the start with a backtick, we need to replace the end quote too.
    // Instead, it's easier to use a global env fallback if we just replace the substring.
    // Actually, the regex above replaces: 'http://localhost:5000/api/vehicles' WITH `${process.env...}/api/vehicles' which is broken because of the closing single quote.

    // A better approach is to replace exact matches:
    content = content.replace(/'http:\/\/localhost:5000\/api\/([^']+)'/g, "`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/$1`");

    // Replace inside backticks
    content = content.replace(/http:\/\/localhost:5000/g, "${process.env.REACT_APP_API_URL || 'http://localhost:5000'}");

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('Modified:', filePath);
    }
}

function traverseDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseDir(fullPath);
        } else if (file.endsWith('.js')) {
            replaceInFile(fullPath);
        }
    }
}

traverseDir(srcDir);
console.log('Done!');
