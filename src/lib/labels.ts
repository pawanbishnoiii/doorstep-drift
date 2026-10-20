// Browser-only label builder. IDs always come from saved database records.
import { brand, publicBaseUrl } from "./brand";

export type LabelShipment = {
  tracking_number: string;
  service: string;
  created_at: string;
  weight_kg: number;
  price: number;
  payment_method: string;
  sender_name: string; sender_city: string; sender_pincode: string; sender_phone: string;
  receiver_name: string; receiver_address: string; receiver_city: string; receiver_pincode: string; receiver_phone: string;
};
export type LabelPiece = { piece_code: string; seq_no: number; total: number; weight_kg: number | null };

async function code128(text: string) {
  const bwip = await import("bwip-js/browser");
  const canvas = document.createElement("canvas");
  bwip.toCanvas(canvas, { bcid: "code128", text, scale: 3, height: 14, includetext: true, textxalign: "center" });
  return { url: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height };
}
async function qr(text: string) {
  const QR = await import("qrcode");
  return QR.toDataURL(text, { margin: 0, width: 300, errorCorrectionLevel: "M" });
}

export const trackUrl = (code: string) => `${publicBaseUrl()}/track?id=${encodeURIComponent(code)}`;

type Doc = import("jspdf").jsPDF;

/** Draws one label in a w×h mm box (designed at 100×150). */
async function drawLabel(doc: Doc, s: LabelShipment, p: LabelPiece, x: number, y: number, w: number, h: number) {
  const k = Math.min(w / 100, h / 150);
  const X = (v: number) => x + v * k;
  const Y = (v: number) => y + v * k;
  const fs = (v: number) => doc.setFontSize(v * k);
  doc.setDrawColor(0); doc.setLineWidth(0.4 * k);
  doc.rect(X(2), Y(2), 96 * k, 146 * k);
  // Header
  doc.setFillColor(0, 0, 0); doc.rect(X(2), Y(2), 96 * k, 12 * k, "F");
  doc.setTextColor(255); doc.setFont("helvetica", "bold"); fs(16);
  doc.text(brand.name.toUpperCase(), X(5), Y(10.5));
  fs(9); doc.text(`${s.service.replace("_", " ").toUpperCase()} · ${p.seq_no} of ${p.total}`, X(95), Y(10.5), { align: "right" });
  doc.setTextColor(0);
  // Master AWB barcode
  fs(7); doc.setFont("helvetica", "normal"); doc.text("MASTER AWB", X(5), Y(19));
  const awb = await code128(s.tracking_number);
  doc.addImage(awb.url, "PNG", X(5), Y(20), 90 * k, 20 * k);
  // Destination block
  doc.line(X(2), Y(43), X(98), Y(43));
  fs(7); doc.text("DELIVER TO", X(5), Y(48));
  doc.setFont("helvetica", "bold"); fs(11); doc.text(s.receiver_name.slice(0, 34), X(5), Y(53));
  doc.setFont("helvetica", "normal"); fs(8);
  const addr = doc.splitTextToSize(s.receiver_address, 60 * k).slice(0, 3) as string[];
  doc.text(addr, X(5), Y(58));
  doc.setFont("helvetica", "bold"); fs(13);
  doc.text(`${s.receiver_city.slice(0, 20)} - ${s.receiver_pincode}`, X(5), Y(73));
  doc.setFont("helvetica", "normal"); fs(8); doc.text(`Ph: ${s.receiver_phone}`, X(5), Y(78));
  const q = await qr(trackUrl(p.piece_code));
  doc.addImage(q, "PNG", X(68), Y(46), 28 * k, 28 * k);
  // From block
  doc.line(X(2), Y(82), X(98), Y(82));
  fs(7); doc.text("FROM", X(5), Y(87));
  fs(8); doc.text(`${s.sender_name.slice(0, 30)}, ${s.sender_city} - ${s.sender_pincode}`, X(5), Y(91));
  doc.text(`Ph: ${s.sender_phone}`, X(5), Y(95));
  doc.text(`Wt: ${p.weight_kg ?? s.weight_kg} kg · ${s.payment_method === "online" ? "PREPAID" : `COLLECT ₹${s.price}`.replace("₹", "Rs ")}`, X(95), Y(95), { align: "right" });
  // Piece barcode
  doc.line(X(2), Y(99), X(98), Y(99));
  fs(7); doc.text(`PIECE ID · PARCEL ${p.seq_no} OF ${p.total}`, X(5), Y(104));
  const pc = await code128(p.piece_code);
  doc.addImage(pc.url, "PNG", X(5), Y(106), 90 * k, 26 * k);
  fs(6.5);
  doc.text(`Booked ${new Date(s.created_at).toLocaleDateString("en-IN")} · Scan QR or visit ${publicBaseUrl().replace(/^https?:\/\//, "")}/track`, X(50), Y(141), { align: "center" });
}

export async function buildLabelsPdf(s: LabelShipment, pieces: LabelPiece[], layout: "thermal" | "a4") {
  const { jsPDF } = await import("jspdf");
  if (layout === "thermal") {
    const doc = new jsPDF({ unit: "mm", format: [101.6, 152.4] });
    for (const [i, p] of pieces.entries()) {
      if (i) doc.addPage([101.6, 152.4]);
      await drawLabel(doc, s, p, 0.8, 1.2, 100, 150);
    }
    return doc.output("blob");
  }
  // A4: 4 labels per sheet (2×2, 100×140 each)
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  for (const [i, p] of pieces.entries()) {
    if (i && i % 4 === 0) doc.addPage();
    const slot = i % 4;
    await drawLabel(doc, s, p, 5 + (slot % 2) * 100, 5 + Math.floor(slot / 2) * 144, 100, 142);
  }
  return doc.output("blob");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
