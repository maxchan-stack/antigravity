const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));
let hasError = false;

for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const lines = content.split('\n');
    let inScript = false;

    lines.forEach((line, index) => {
        if (line.includes('<script>')) inScript = true;
        if (line.includes('</script>')) inScript = false;

        if (inScript) {
            // Find single-line comments
            const commentIndex = line.indexOf('//');
            if (commentIndex !== -1) {
                const commentText = line.substring(commentIndex);
                if (commentText.includes('<') || commentText.includes('>')) {
                    console.error(`\x1b[31m[ERROR]\x1b[0m ${file}:${index + 1}`);
                    console.error(`Unsafe character '<' or '>' found in JS comment (breaks GAS parser):`);
                    console.error(line);
                    hasError = true;
                }
            }
        }
    });
}

if (hasError) {
    console.error("\x1b[31m\nPlease remove '<' and '>' from JS comments in HTML files before pushing to GAS.\x1b[0m");
    process.exit(1);
} else {
    console.log("\x1b[32m[PASS]\x1b[0m GAS HTML Comment Safety Check");
}
