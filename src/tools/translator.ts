export async function translate(text: string, targetLang: string = 'en'): Promise<string> {
  // This is a placeholder - in production, call a translation API
  // or leverage the AI model itself for translation
  const langMap: Record<string, string> = {
    en: '英语',
    zh: '中文',
    ja: '日语',
    ko: '韩语',
    fr: '法语',
    de: '德语',
    es: '西班牙语',
  };
  const langName = langMap[targetLang] || targetLang;
  return `📝 翻译请求\n原文: ${text}\n目标语言: ${langName}\n\n提示：请使用 AI 对话功能进行翻译。发送消息：\n"请将以下文字翻译成${langName}：${text}"`;
}

export const LANGUAGES = [
  { code: 'en', name: '英语' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日语' },
  { code: 'ko', name: '韩语' },
  { code: 'fr', name: '法语' },
  { code: 'de', name: '德语' },
  { code: 'es', name: '西班牙语' },
  { code: 'ru', name: '俄语' },
  { code: 'pt', name: '葡萄牙语' },
  { code: 'ar', name: '阿拉伯语' },
];
