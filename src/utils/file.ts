/** Map file extension → accent colour displayed in the UI. */
const extensionColors: Record<string, string> = {
  // Documents
  pdf: '#E53935',
  doc: '#1565C0',
  docx: '#1565C0',
  txt: '#546E7A',
  rtf: '#546E7A',
  // Spreadsheets
  xls: '#2E7D32',
  xlsx: '#2E7D32',
  csv: '#2E7D32',
  // Presentations
  ppt: '#D84315',
  pptx: '#D84315',
  // Images
  jpg: '#7B1FA2',
  jpeg: '#7B1FA2',
  png: '#7B1FA2',
  gif: '#7B1FA2',
  svg: '#7B1FA2',
  webp: '#7B1FA2',
  // Video
  mp4: '#C62828',
  mov: '#C62828',
  avi: '#C62828',
  mkv: '#C62828',
  // Audio
  mp3: '#AD1457',
  wav: '#AD1457',
  flac: '#AD1457',
  // Archives
  zip: '#F9A825',
  rar: '#F9A825',
  tar: '#F9A825',
  gz: '#F9A825',
  '7z': '#F9A825',
  // Code
  js: '#F7DF1E',
  ts: '#3178C6',
  tsx: '#3178C6',
  jsx: '#F7DF1E',
  json: '#546E7A',
  html: '#E44D26',
  css: '#1572B6',
  py: '#3776AB',
  go: '#00ADD8',
  rs: '#DEA584',
  java: '#ED8B00',
  // Config / Misc
  yml: '#546E7A',
  yaml: '#546E7A',
  toml: '#546E7A',
  md: '#546E7A',
  env: '#546E7A',
};

export function getFileExtension(name: string): string {
  const lastDot = name.lastIndexOf('.');
  if (lastDot < 1) return '';
  return name.slice(lastDot + 1).toLowerCase();
}

export function getExtensionColor(name: string): string {
  const ext = getFileExtension(name);
  return extensionColors[ext] ?? '#78909C';
}

export function getExtensionLabel(name: string): string {
  const ext = getFileExtension(name);
  return ext ? ext.toUpperCase() : 'FILE';
}
