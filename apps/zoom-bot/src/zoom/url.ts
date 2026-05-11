export type ParsedZoomUrl = {
  meetingId: string;
  password?: string;
};

// Accepted forms:
//   https://zoom.us/j/123456789
//   https://us02web.zoom.us/j/123456789?pwd=abcdef
//   https://zoom.us/w/123456789
//   https://<host>.zoom.us/my/<personal-link>
export function parseZoomUrl(rawUrl: string): ParsedZoomUrl {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error(`Не удалось распарсить URL: ${rawUrl}`);
  }

  if (!/zoom\.us$/i.test(url.hostname) && !/\.zoom\.us$/i.test(url.hostname)) {
    throw new Error(`Хост не похож на zoom.us: ${url.hostname}`);
  }

  const match = url.pathname.match(/\/(j|w|my)\/([^/?#]+)/i);
  if (!match) {
    throw new Error(`Не нашёл meeting id в пути: ${url.pathname}`);
  }

  const meetingId = match[2]!.replace(/\D/g, '');
  if (!meetingId) {
    throw new Error('Meeting id пустой после нормализации');
  }

  const pwd = url.searchParams.get('pwd') ?? undefined;
  return { meetingId, password: pwd };
}
