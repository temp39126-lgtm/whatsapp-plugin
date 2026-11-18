export function buildTemplateVisibilityKey(name: string, language: string): string {
  return `${name.trim()}::${language.trim()}`;
}

export function parseTemplateVisibilityKey(key: string): { name: string; language: string } | null {
  const index = key.indexOf('::');
  if (index <= 0 || index === key.length - 2) return null;
  return {
    name: key.slice(0, index),
    language: key.slice(index + 2),
  };
}