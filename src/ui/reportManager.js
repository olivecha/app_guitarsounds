// Report manager: tracks queued chart entries and generates the .docx report.

const _entries   = []; // { key, label, dataUrl, plotHeight }
const _listeners = [];

export function onReportChanged(fn) { _listeners.push(fn); }
function _notify() { _listeners.forEach(fn => fn([..._entries])); }

export function isInReport(key) {
  return _entries.some(e => e.key === key);
}

export function addToReport(key, label, dataUrl, plotHeight = 420) {
  if (!isInReport(key)) {
    _entries.push({ key, label, dataUrl, plotHeight });
    _notify();
  }
}

export function removeFromReport(key) {
  const idx = _entries.findIndex(e => e.key === key);
  if (idx !== -1) { _entries.splice(idx, 1); _notify(); }
}

export function getReportEntries() { return [..._entries]; }

export async function generateDocx() {
  const { Document, Packer, Paragraph, ImageRun, HeadingLevel } = window.docx;

  const W_PX = 580; // target display width in docx (pixels at 96dpi ≈ 6 inches)

  const children = [
    new Paragraph({
      text:    "Rapport d'analyse — Sons de guitare",
      heading: HeadingLevel.HEADING_1,
    }),
  ];

  for (const { label, dataUrl, plotHeight } of _entries) {
    children.push(new Paragraph({ text: label, heading: HeadingLevel.HEADING_2 }));

    const base64  = dataUrl.split(',')[1];
    const binary  = atob(base64);
    const imgData = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) imgData[i] = binary.charCodeAt(i);

    const scaledH = Math.round(plotHeight * W_PX / 900);
    children.push(new Paragraph({
      children: [new ImageRun({
        data:           imgData,
        transformation: { width: W_PX, height: scaledH },
        type:           'png',
      })],
    }));

    children.push(new Paragraph({ text: '' })); // spacing
  }

  const doc  = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);

  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: 'rapport.docx' }).click();
  URL.revokeObjectURL(url);
}
