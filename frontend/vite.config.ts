import { defineConfig } from "vite";
import react from '@vitejs/plugin-react';
import path from "node:path";
import { componentTagger } from "lovable-tagger";

export default defineConfig(({ mode }) => ({
	server: {
		host: "::",
		port: 8080,
		watch: {
			usePolling: true,
			interval: 300,
		},

		proxy: {
			'/charts': {
				target: 'http://quickchart:3400',
				changeOrigin: true,
				rewrite: (path) => path.replace(/^\/charts/, ''),
			},
		},
	},
	plugins: [
		react(),
		mode === 'development' && componentTagger(),
	].filter(Boolean),
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	test: {
		environment: 'jsdom',
		globals: true,
		setupFiles: './vitest.setup.ts',
		pool: 'forks',
		poolOptions: {
			forks: {
				execArgv: ['--max-old-space-size=4096'],
			},
		},
	}
}));
