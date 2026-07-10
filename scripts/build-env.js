import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const env = {
  GOOGLE_SCRIPT_URL: process.env.GOOGLE_SCRIPT_URL || '',
  WHATSAPP: process.env.WHATSAPP || '',
  NOMBRE_NEGOCIO: process.env.NOMBRE_NEGOCIO || '',
  SECRET_TOKEN: process.env.SECRET_TOKEN || '',
  RESEND_FROM: process.env.RESEND_FROM || '',
};

const content = `// Generado en build por scripts/build-env.js
window.ENV = ${JSON.stringify(env, null, 2)};
`;

const distDir = 'dist';
if (existsSync(distDir)) rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });

cpSync('index.html', join(distDir, 'index.html'));
cpSync('src', join(distDir, 'src'), { recursive: true });
if (existsSync('assets')) {
  cpSync('assets', join(distDir, 'assets'), { recursive: true });
}
cpSync('public', join(distDir, 'public'), { recursive: true });

writeFileSync(join(distDir, 'public', 'env.js'), content);
console.log('dist generado');
