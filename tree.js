const fs = require('fs');
const path = require('path');

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const ignoredDirs = new Set(['.git', 'node_modules']);

function buildTree(dir, prefix = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.isDirectory() || !ignoredDirs.has(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name));

  let output = '';

  entries.forEach((entry, index) => {
    const isLast = index === entries.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    output += `${prefix}${connector}${entry.name}\n`;

    if (entry.isDirectory()) {
      output += buildTree(path.join(dir, entry.name), childPrefix);
    }
  });

  return output;
}

console.log(root);
console.log(buildTree(root));
