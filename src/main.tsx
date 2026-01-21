import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found. Make sure there is a div with id='root' in your HTML.");
}

try {
  createRoot(rootElement).render(<App />);
} catch (error) {
  console.error("Error rendering app:", error);
  rootElement.innerHTML = `
    <div style="padding: 20px; font-family: sans-serif;">
      <h1>Error loading application</h1>
      <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
      <p>Check the console for more details.</p>
    </div>
  `;
}
