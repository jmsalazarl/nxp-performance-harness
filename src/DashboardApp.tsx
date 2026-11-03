/**
 * DashboardApp component
 * 
 * Root component of the Performance Dashboard application.
 * Provides ReportContext to all child components.
 * 
 * Requirements: 1.1, 7.1
 */

import { ReportProvider } from './context/ReportContext';
import { LanguageProvider } from './i18n';
import { DashboardLayout } from './components/DashboardLayout';
import './assets/styles/global.css';

function DashboardApp() {
  return (
    <LanguageProvider>
      <ReportProvider>
        <DashboardLayout />
      </ReportProvider>
    </LanguageProvider>
  );
}

export default DashboardApp;
