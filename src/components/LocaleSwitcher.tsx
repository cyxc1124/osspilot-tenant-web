import { useSyncExternalStore } from 'react';
import { GlobalOutlined } from '@ant-design/icons';
import { Select } from 'antd';
import {
  getAppLocale,
  LOCALE_OPTIONS,
  setAppLocale,
  subscribeLocale,
  type AppLocale,
} from '../lib/locale';

export default function LocaleSwitcher() {
  const locale = useSyncExternalStore(
    subscribeLocale,
    getAppLocale,
    () => 'zh-CN' as AppLocale,
  );

  return (
    <Select<AppLocale>
      value={locale}
      options={LOCALE_OPTIONS}
      onChange={setAppLocale}
      suffixIcon={<GlobalOutlined />}
      popupMatchSelectWidth={false}
      aria-label="Language"
      style={{ width: 116 }}
    />
  );
}
