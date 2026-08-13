import { CodeOutlined, FormOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useT } from '../../i18n';

export type EditorViewMode = 'visual' | 'json';

interface EditorViewModeToggleProps {
  mode: EditorViewMode;
  onToggle: () => void;
}

export default function EditorViewModeToggle({ mode, onToggle }: EditorViewModeToggleProps) {
  const t = useT();
  const isVisual = mode === 'visual';

  return (
    <Button
      icon={isVisual ? <CodeOutlined /> : <FormOutlined />}
      onClick={onToggle}
    >
      {isVisual ? t('common.switchToJson') : t('common.switchToVisual')}
    </Button>
  );
}
