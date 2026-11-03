/**
 * Performance Dashboard Entry Point
 * 
 * Entry point for the K6 Performance Dashboard application.
 * This is a separate React application from the Config Builder.
 * 
 * Requirements: 1.1, 7.1
 */

import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import DashboardApp from './DashboardApp';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Make sure there is a div with id="root" in your HTML.');
}

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <DashboardApp />
  </StrictMode>
);
