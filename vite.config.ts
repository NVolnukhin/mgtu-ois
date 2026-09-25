import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Относительные пути: сборка откроется и с GitHub Pages (/mgtu-ois/), и из любой папки.
  base: './',
  plugins: [react()],
});
