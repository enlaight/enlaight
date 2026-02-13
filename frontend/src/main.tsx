import { createRoot } from 'react-dom/client'
import App from './App';
import './index.css'
import './App.css'; // css overrides
import './lib/i18-utils.js'

import logger from './lib/logger';

logger.info('Frontend app starting...');

createRoot(document.getElementById("root")!).render(<App />);
