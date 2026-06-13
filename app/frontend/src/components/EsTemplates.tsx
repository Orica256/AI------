import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { api } from '../api';
import { ES_CATEGORIES, type EsCategory, type EsTemplate } from '../types';

type CategoryFilter = EsCategory | '';

interface FormState {
  category: EsCategory;
  title: string;
  body: string;
}

const emptyForm: FormState = {
  category: ES_CATEGORIES[0],
  title: '',
  body: '',
};

export function EsTemplates() {
  const [templates, setTemplates] = useState<EsTemplate[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    api.listEsTemplates().then(setTemplates).catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  const visible = useMemo(
    () => templates.filter((template) => !filter || template.category === filter),
    [templates, filter],
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingId === null) {
        await api.createEsTemplate(form);
      } else {
        await api.updateEsTemplate(editingId, form);
      }
      resetForm();
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const startEdit = (template: EsTemplate) => {
    setEditingId(template.id);
    setForm({
      category: template.category,
      title: template.title,
      body: template.body,
    });
  };

  const handleDelete = async (template: EsTemplate) => {
    if (!confirm(`「${template.title}」を削除しますか？`)) return;
    setError(null);
    try {
      await api.deleteEsTemplate(template.id);
      if (editingId === template.id) resetForm();
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCopy = async (template: EsTemplate) => {
    setError(null);
    try {
      await navigator.clipboard.writeText(template.body);
      setCopiedId(template.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError('本文をクリップボードにコピーできませんでした');
    }
  };

  return (
    <div>
      <div className="list-header">
        <h2>ESテンプレート</h2>
        {editingId !== null && (
          <button type="button" onClick={resetForm}>
            編集をやめる
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      <form className="card form es-form" onSubmit={handleSubmit}>
        <h3>{editingId === null ? 'テンプレートを追加' : 'テンプレートを編集'}</h3>
        <div className="form-row">
          <label>
            カテゴリ
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as EsCategory })}
            >
              {ES_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            タイトル *
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </label>
        </div>
        <label>
          本文
          <textarea
            className="es-body-input"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />
        </label>
        <button type="submit" className="primary">
          {editingId === null ? '追加する' : '保存する'}
        </button>
      </form>

      <div className="filter-bar">
        <button className={filter === '' ? 'active' : ''} onClick={() => setFilter('')}>
          すべて
        </button>
        {ES_CATEGORIES.map((category) => (
          <button
            key={category}
            className={filter === category ? 'active' : ''}
            onClick={() => setFilter(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="empty">ESテンプレートはまだありません。</p>
      ) : (
        <div className="es-template-list">
          {visible.map((template) => (
            <article key={template.id} className="card es-template-card">
              <div className="es-template-head">
                <div>
                  <span className="badge">{template.category}</span>
                  <h3>{template.title}</h3>
                </div>
                <div className="es-template-actions">
                  <button type="button" onClick={() => handleCopy(template)}>
                    {copiedId === template.id ? 'コピー済み' : '本文コピー'}
                  </button>
                  <button type="button" onClick={() => startEdit(template)}>
                    編集
                  </button>
                  <button type="button" className="danger" onClick={() => handleDelete(template)}>
                    削除
                  </button>
                </div>
              </div>
              <pre className="es-template-body">{template.body || '本文なし'}</pre>
              <p className="hint">更新: {template.updated_at.slice(0, 10)}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
