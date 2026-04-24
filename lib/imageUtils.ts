/**
 * 判断字符串是否为裸图片 URL
 * 规则：trim 后，以 http:// 或 https:// 开头，以图片扩展名结尾（大小写不敏感）
 */
export function isImageUrl(value: string): boolean {
  return /^https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)$/i.test(value.trim())
}

/**
 * 将文本中的裸图片 URL 转换为 Markdown 图片语法
 * 例："请看图 https://example.com/a.png 说明"
 *  → "请看图 ![image](https://example.com/a.png) 说明"
 */
export function preprocessBareImageUrls(text: string): string {
  return text.replace(
    /https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp)/gi,
    (url) => `![image](${url})`
  )
}
