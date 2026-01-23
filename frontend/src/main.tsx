import { createRoot } from 'react-dom/client'
import App from './App';
import './index.css'
import './App.css'; // css overrides
import './lib/i18-utils.js'

createRoot(document.getElementById("root")!).render(<App />);
