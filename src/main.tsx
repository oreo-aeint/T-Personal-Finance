import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './theme/ThemeContext';
import { registerSW } from 'virtual:pwa-register';

// Automatically register and update Service Worker
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
