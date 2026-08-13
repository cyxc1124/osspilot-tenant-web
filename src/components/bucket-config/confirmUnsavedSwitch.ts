import { Modal } from 'antd';
import type { useT } from '../../i18n';

type Translate = ReturnType<typeof useT>;

export function confirmUnsavedSwitch(t: Translate): Promise<boolean> {
  return new Promise((resolve) => {
    Modal.confirm({
      title: t('common.unsavedSwitchTitle'),
      content: t('common.unsavedSwitchDesc'),
      okText: t('common.unsavedSwitchConfirm'),
      cancelText: t('common.cancel'),
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}
