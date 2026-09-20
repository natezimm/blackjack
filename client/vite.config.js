import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react({
        include: '**/*.{jsx,js}',
      }),
    ],
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: {
          '.js': 'jsx',
        },
      },
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'build',
    },
    define: {
      'process.env.REACT_APP_API_URL': JSON.stringify(
        process.env.REACT_APP_API_URL || env.REACT_APP_API_URL || ''
      ),
      'process.env.REACT_APP_ENABLE_ANALYTICS': JSON.stringify(
        process.env.REACT_APP_ENABLE_ANALYTICS ||
          env.REACT_APP_ENABLE_ANALYTICS ||
          'false'
      ),
      'process.env.NODE_ENV': JSON.stringify(
        mode === 'production' ? 'production' : 'development'
      ),
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/setupTests.js',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'lcov', 'html'],
        include: ['src/**/*.{js,jsx}'],
        exclude: ['src/index.js', 'src/**/*.test.{js,jsx}'],
        thresholds: {
          lines: 90,
          statements: 85,
          functions: 85,
          branches: 80,
        },
      },
    },
  };
});
