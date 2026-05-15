const fs = require('fs');
const html = fs.readFileSync('Index.html', 'utf8');
const match = html.match(/<script>\s*\/\/ Init[\s\S]*?<\/script>/);
if (match) {
    console.log("Script block found length:", match[0].length);
} else {
    console.log("Script block not found");
}
