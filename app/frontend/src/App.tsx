import { useState } from 'react';
import { Dashboard } from './components/Dashboard';
import { CompanyList } from './components/CompanyList';
import { CompanyDetail } from './components/CompanyDetail';

type View =
  | { name: 'dashboard' }
  | { name: 'list' }
  | { name: 'detail'; id: number };

export function App() {
  const [view, setView] = useState<View>({ name: 'dashboard' });

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">🧭 就活コンパス</h1>
        <nav className="nav">
          <button
            className={view.name === 'dashboard' ? 'active' : ''}
            onClick={() => setView({ name: 'dashboard' })}
          >
            ダッシュボード
          </button>
          <button
            className={view.name === 'list' || view.name === 'detail' ? 'active' : ''}
            onClick={() => setView({ name: 'list' })}
          >
            企業一覧
          </button>
        </nav>
      </header>

      <main className="main">
        {view.name === 'dashboard' && (
          <Dashboard onOpenCompany={(id) => setView({ name: 'detail', id })} />
        )}
        {view.name === 'list' && (
          <CompanyList onOpenCompany={(id) => setView({ name: 'detail', id })} />
        )}
        {view.name === 'detail' && (
          <CompanyDetail id={view.id} onBack={() => setView({ name: 'list' })} />
        )}
      </main>

      <footer className="footer">
        就活コンパス — ローカル完結・完全無料 / データはこのPC内のみに保存されます
      </footer>
    </div>
  );
}
