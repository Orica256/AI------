import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import { Dashboard } from './components/Dashboard';
import { CompanyList } from './components/CompanyList';
import { CompanyDetail } from './components/CompanyDetail';
import KanbanBoard from './components/KanbanBoard';
import CalendarView from './components/CalendarView';

type View =
  | { name: 'dashboard' }
  | { name: 'list' }
  | { name: 'kanban' }
  | { name: 'calendar' }
  | { name: 'detail'; id: number };

export function App() {
  const [view, setView] = useState<View>({ name: 'dashboard' });
  const fileRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => (localStorage.getItem('theme') === 'dark' ? 'dark' : 'light'),
  );

  // テーマを html 要素に反映し、localStorage に保持する
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  async function handleExport() {
    try {
      const data = await api.exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `shukatsu-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('エクスポートに失敗しました: ' + (err as Error).message);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('現在のデータを、選んだファイルの内容で置き換えます。よろしいですか？（先にエクスポートでのバックアップを推奨）')) return;
    try {
      const bundle = JSON.parse(await file.text());
      await api.importData(bundle);
      alert('インポートが完了しました。');
      setView({ name: 'dashboard' });
    } catch (err) {
      alert('インポートに失敗しました: ' + (err as Error).message);
    }
  }

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
          <button
            className={view.name === 'kanban' ? 'active' : ''}
            onClick={() => setView({ name: 'kanban' })}
          >
            カンバン
          </button>
          <button
            className={view.name === 'calendar' ? 'active' : ''}
            onClick={() => setView({ name: 'calendar' })}
          >
            カレンダー
          </button>
        </nav>
        <div className="header-actions">
          <button onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? '☀️ ライト' : '🌙 ダーク'}
          </button>
          <button onClick={handleExport}>エクスポート</button>
          <button onClick={() => fileRef.current?.click()}>インポート</button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            onChange={handleImportFile}
          />
        </div>
      </header>

      <main className={view.name === 'kanban' ? 'main wide' : 'main'}>
        {view.name === 'dashboard' && (
          <Dashboard onOpenCompany={(id) => setView({ name: 'detail', id })} />
        )}
        {view.name === 'list' && (
          <CompanyList onOpenCompany={(id) => setView({ name: 'detail', id })} />
        )}
        {view.name === 'kanban' && (
          <KanbanBoard onSelect={(id) => setView({ name: 'detail', id })} />
        )}
        {view.name === 'calendar' && (
          <CalendarView onSelect={(id) => setView({ name: 'detail', id })} />
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
