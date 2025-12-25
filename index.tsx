import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Corrected the import path for App.tsx to be a relative path './App' to resolve the module loading error.
import App from './App';

// FIX: Ensure the root element exists before attempting to mount the app.
let rootElement = document.getElementById('root');
if (!rootElement) {
  rootElement = document.createElement('div');
  rootElement.id = 'root';
  document.body.appendChild(rootElement);
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);