const TEXT_EDIT_EXTENSIONS = new Set([
  'txt',
  'md',
  'json',
  'yaml',
  'yml',
  'xml',
  'conf',
  'ini',
  'sh',
  'py',
  'js',
  'ts',
  'go',
  'java',
  'sql',
]);

const OFFICE_EXTENSIONS = new Set(['docx', 'xlsx', 'pptx']);

function fileExtension(objectKey: string): string {
  const basename = objectKey.split('/').pop() ?? objectKey;
  const dot = basename.lastIndexOf('.');
  if (dot < 0) {
    return '';
  }
  return basename.slice(dot + 1).toLowerCase();
}

export function isOfficeFile(objectKey: string): boolean {
  const ext = fileExtension(objectKey);
  return Boolean(ext && OFFICE_EXTENSIONS.has(ext));
}

export function isTextEditable(objectKey: string, contentType?: string | null): boolean {
  const ext = fileExtension(objectKey);
  if (TEXT_EDIT_EXTENSIONS.has(ext)) {
    return true;
  }
  if (!contentType) {
    return false;
  }
  const lower = contentType.toLowerCase();
  return (
    lower.startsWith('text/') ||
    lower === 'application/json' ||
    lower === 'application/xml' ||
    lower === 'application/yaml' ||
    lower === 'application/x-yaml'
  );
}

const MONACO_LANGUAGE_MAP: Record<string, string> = {
  py: 'python',
  js: 'javascript',
  ts: 'typescript',
  java: 'java',
  go: 'go',
  sql: 'sql',
  sh: 'shell',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  xml: 'xml',
  md: 'markdown',
  ini: 'ini',
  conf: 'ini',
  txt: 'plaintext',
};

export function monacoLanguage(objectKey: string, language?: string): string {
  if (language && language !== 'text') {
    const mapped = {
      python: 'python',
      javascript: 'javascript',
      typescript: 'typescript',
      java: 'java',
      go: 'go',
      sql: 'sql',
      bash: 'shell',
      json: 'json',
      yaml: 'yaml',
      xml: 'xml',
      markdown: 'markdown',
      ini: 'ini',
      csv: 'plaintext',
      log: 'plaintext',
    }[language];
    if (mapped) {
      return mapped;
    }
  }
  const ext = fileExtension(objectKey);
  return MONACO_LANGUAGE_MAP[ext] ?? 'plaintext';
}
