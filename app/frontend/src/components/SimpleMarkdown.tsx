import { Fragment, type ReactNode } from 'react';

// インラインの **太字** を解析して ReactNode に変換する。
// 文字列は React が自動エスケープするため、HTML を直接挿入せず XSS 安全。
function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    const m = /^\*\*([^*]+)\*\*$/.exec(p);
    if (m) return <strong key={i}>{m[1]}</strong>;
    return <Fragment key={i}>{p}</Fragment>;
  });
}

interface Props {
  text: string;
}

// 無依存の簡易 Markdown 表示（見出し #／箇条書き -・*／太字 **／段落・改行）。
// 軽量・ローカル完結の方針に沿い、外部ライブラリを使わない最小実装。
export default function SimpleMarkdown({ text }: Props) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let key = 0;

  const flushList = () => {
    if (list.length === 0) return;
    const items = list;
    blocks.push(
      <ul key={`ul-${key++}`}>
        {items.map((it, i) => (
          <li key={i}>{renderInline(it)}</li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);

    if (bullet) {
      list.push(bullet[1]);
      continue;
    }
    flushList();

    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2]);
      if (level === 1) blocks.push(<h4 key={key++}>{content}</h4>);
      else if (level === 2) blocks.push(<h5 key={key++}>{content}</h5>);
      else blocks.push(<h6 key={key++}>{content}</h6>);
    } else if (line.trim() !== '') {
      blocks.push(<p key={key++}>{renderInline(line)}</p>);
    }
    // 空行は段落区切り（何も追加しない）
  }
  flushList();

  return <div className="md">{blocks}</div>;
}
