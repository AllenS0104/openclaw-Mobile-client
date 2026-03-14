export async function webSearch(query: string): Promise<string> {
  try {
    // Use a simple fetch approach - in production you'd use a proper search API
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    return `🔍 搜索查询: "${query}"\n\n请在浏览器中打开以下链接查看结果:\n${url}\n\n提示：要启用真正的网页搜索功能，请配置搜索 API（如 SerpAPI、Bing Search API 等）。`;
  } catch (error: any) {
    return `搜索出错: ${error.message}`;
  }
}

export async function fetchUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OpenClaw/1.0' },
    });
    const text = await response.text();
    // Strip HTML tags for basic text extraction
    const cleaned = text
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned.substring(0, 3000) + (cleaned.length > 3000 ? '\n\n...(已截断)' : '');
  } catch (error: any) {
    return `获取URL失败: ${error.message}`;
  }
}
