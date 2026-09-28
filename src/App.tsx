import { AddWidgetMenu } from './components/canvas/AddWidgetMenu';
import { CanvasBoard } from './components/canvas/CanvasBoard';
import { TopBar } from './components/canvas/TopBar';
import { I18nProvider } from './i18n';

function App() {
  return (
    <I18nProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden bg-canvas">
        <TopBar />
        <div className="relative flex min-h-0 flex-1">
          <CanvasBoard />
          <AddWidgetMenu />
        </div>
      </div>
    </I18nProvider>
  );
}

export default App;
