/**
 * Generates a self-contained HTML file for a dashboard.
 * PDFs are embedded as base64 and opened via Blob URL (works in file:// context).
 * Links are regular anchors.
 */
export function generateDashboardHtml(dashboard) {
  const resources = dashboard.resources || [];

  // Collect PDF data separately to avoid huge inline onclick attributes
  const pdfResources = resources.filter((r) => r.type === 'pdf');
  const pdfDataScript = pdfResources.length > 0
    ? `<script>
var PDF_DATA = {
${pdfResources.map((r) => `  "${r.id}": "${r.data}"`).join(',\n')}
};
function openPdf(id) {
  var dataUrl = PDF_DATA[id];
  var base64 = dataUrl.split(',')[1];
  var binary = atob(base64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) { bytes[i] = binary.charCodeAt(i); }
  var blob = new Blob([bytes], { type: 'application/pdf' });
  window.open(URL.createObjectURL(blob), '_blank');
}
<\/script>`
    : '';

  const cards = resources.map((r) => {
    if (r.type === 'link') {
      return `
        <a class="card link-card" href="${escapeAttr(r.url)}" target="_blank" rel="noopener">
          <div class="card-icon">🔗</div>
          <div class="card-title">${escapeHtml(r.title)}</div>
          <div class="card-sub">${escapeHtml(r.url)}</div>
        </a>`;
    } else {
      // PDF - use Blob URL via JS so it works when opened from file://
      return `
        <div class="card pdf-card" onclick="openPdf('${r.id}')" style="cursor:pointer">
          <div class="card-icon">📄</div>
          <div class="card-title">${escapeHtml(r.title)}</div>
          <div class="card-sub">${escapeHtml(r.filename || '')}</div>
        </div>`;
    }
  }).join('\n');

  const date = new Date(dashboard.createdAt).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(dashboard.title)} - 수업 자료</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', sans-serif;
      background: #f0f4f8;
      color: #1a202c;
      min-height: 100vh;
      padding: 32px 20px;
    }
    .container { max-width: 1000px; margin: 0 auto; }
    .header { margin-bottom: 32px; }
    .title { font-size: 28px; font-weight: 700; color: #2d3748; margin-bottom: 6px; }
    .meta { font-size: 13px; color: #a0aec0; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
      gap: 16px;
    }
    .card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      border: 1px solid #e2e8f0;
      text-decoration: none;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-height: 110px;
      transition: all 0.2s;
    }
    .card:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }
    .link-card:hover { border-color: #bee3f8; background: #ebf8ff; }
    .pdf-card:hover  { border-color: #fed7d7; background: #fff5f5; }
    .card-icon { font-size: 26px; }
    .card-title { font-size: 14px; font-weight: 600; color: #2d3748; flex: 1; line-height: 1.4; }
    .card-sub { font-size: 11px; color: #a0aec0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .empty { text-align: center; padding: 60px; color: #a0aec0; font-size: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="title">📚 ${escapeHtml(dashboard.title)}</div>
      <div class="meta">생성일: ${date} · 자료 ${resources.length}개</div>
    </div>
    <div class="grid">
      ${resources.length === 0
        ? '<div class="empty">자료가 없습니다.</div>'
        : cards}
    </div>
  </div>
  ${pdfDataScript}
</body>
</html>`;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str ?? '').replace(/"/g, '&quot;');
}
