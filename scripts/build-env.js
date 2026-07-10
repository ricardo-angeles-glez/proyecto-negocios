import { writeFileSync } from 'node:fs';

const env = {
  GOOGLE_SCRIPT_URL: process.env.GOOGLE_SCRIPT_URL || '',
  WHATSAPP: process.env.WHATSAPP || '',
  NOMBRE_NEGOCIO: process.env.NOMBRE_NEGOCIO || '',
  SECRET_TOKEN: process.env.SECRET_TOKEN || '',
};

const content = `// Generado en build por scripts/build-env.js
window.ENV = ${JSON.stringify(env, null, 2)};
`;

writeFileSync('public/env.js', content);
console.log('public/env.js generado');
