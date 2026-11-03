/**
 * App component
 * 
 * Root component of the Config Builder UI application.
 * 
 * Layout structure:
 * - ConfigProvider wraps the entire app with state management
 * - Three-column layout:
 *   1. Left sidebar: EndpointList (endpoint management)
 *   2. Main area: EndpointEditor (request configuration, headers, payload, profiles)
 *   3. Right panel: PreviewPanel (preview and export)
 * 
 * Requirements: 1.1, 1.2, 1.3
 */

import { ConfigProvider } from './context/ConfigContext';
import { LanguageProvider } from './i18n';
import { EndpointList } from './components/EndpointList';
import { EndpointEditor } from './components/EndpointEditor';
import { PreviewPanel } from './components/PreviewPanel';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import './assets/styles/global.css';
import './App.css';

function App() {
  return (
    <LanguageProvider>
      <ConfigProvider>
        <div className="app">
          {/* Left sidebar - Endpoint list */}
          <aside className="app-sidebar">
            <div className="app-language">
              <LanguageSwitcher />
            </div>
            <EndpointList />
          </aside>

          {/* Main area - Endpoint editor */}
          <main className="app-main">
            <EndpointEditor />
          </main>

          {/* Right panel - Preview and export */}
          <aside className="app-preview">
            <PreviewPanel />
          </aside>
        </div>
      </ConfigProvider>
    </LanguageProvider>
  );
}

export default App;
