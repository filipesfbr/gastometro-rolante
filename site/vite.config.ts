import { cpSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';

// Os dados ficam em /data (raiz do repositório, branch `data`) e são servidos em ./dados/.
const DATA = resolve(import.meta.dirname, '../data');

function dados(): Plugin {
  return {
    name: 'dados',
    configureServer(server) {
      server.middlewares.use('/dados', (req, res, next) => {
        const arquivo = resolve(DATA, `.${decodeURIComponent((req.url ?? '').split('?')[0]!)}`);
        if (!arquivo.startsWith(DATA) || !existsSync(arquivo)) return next();
        res.setHeader('Content-Type', arquivo.endsWith('.csv') ? 'text/csv; charset=utf-8' : 'application/json');
        res.end(readFileSync(arquivo));
      });
    },
    closeBundle() {
      // O CI de PR builda sem dados; o deploy confere que /data existe antes de buildar.
      if (!existsSync(DATA)) return this.warn('pasta /data não encontrada: o site vai sem dados (rode `npm run coletar`)');
      cpSync(DATA, resolve(import.meta.dirname, 'dist/dados'), { recursive: true, filter: (f) => !f.includes('/.git') });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), dados()],
});
