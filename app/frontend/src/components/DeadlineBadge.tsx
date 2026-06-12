import { deadlineInfo } from '../utils/deadline';

interface Props {
  deadline: string | null | undefined;
  showDate?: boolean;
}

// 締切の残日数を色付きバッジで表示する
export default function DeadlineBadge({ deadline, showDate = true }: Props) {
  const info = deadlineInfo(deadline);
  if (info.level === 'none') return <span className="muted">—</span>;
  return (
    <span className={`deadline-badge level-${info.level}`}>
      {showDate && <span className="dl-date">{deadline}</span>}
      <span className="dl-label">{info.label}</span>
    </span>
  );
}
