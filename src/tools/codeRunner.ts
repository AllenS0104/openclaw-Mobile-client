// Simple code highlighting - wraps code in markdown for display
export function formatCode(code: string, language: string = ''): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

// Extract language from markdown code fence
export function extractLanguage(markdown: string): string {
  const match = markdown.match(/```(\w+)/);
  return match ? match[1] : '';
}

// Common languages for the selector
export const CODE_LANGUAGES = [
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'cpp', name: 'C++' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'sql', name: 'SQL' },
  { id: 'html', name: 'HTML' },
  { id: 'css', name: 'CSS' },
  { id: 'json', name: 'JSON' },
  { id: 'bash', name: 'Bash' },
];
