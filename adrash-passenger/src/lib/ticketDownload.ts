import { Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import qrcode from 'qrcode-generator';

export function buildQRSvg(value: string, size = 220): string {
    const qr = qrcode(0, 'M');
    qr.addData(value && value.length > 0 ? value : ' ');
    qr.make();
    const n = qr.getModuleCount();
    const cell = size / n;
    let rects = '';
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (qr.isDark(r, c)) {
                rects += `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" width="${(cell + 0.5).toFixed(2)}" height="${(cell + 0.5).toFixed(2)}" fill="#000"/>`;
            }
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="#fff"/>${rects}</svg>`;
}

export interface TicketParams {
    qrData: string;
    bookingRef: string;
    origin: string;
    destination: string;
    seats: string;
    totalFare: number;
    departureTime?: string | undefined;
    pickup?: string | undefined;
    passengers?: { name: string; seat: string }[] | undefined;
}

export function buildTicketHTML(p: TicketParams): string {
    const svgContent  = buildQRSvg(p.qrData, 220);
    const svgEncoded  = encodeURIComponent(svgContent);
    const passengerRows = (p.passengers ?? []).map(
        (x) => `<tr><td style="padding:6px 0;color:#374151;font-weight:600">${x.name}</td><td style="padding:6px 0;color:#6B7280;text-align:right">Seat ${x.seat}</td></tr>`
    ).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body{margin:0;padding:20px;background:#F4F8FB;font-family:Arial,sans-serif}
    .ticket{background:#fff;border-radius:16px;max-width:420px;margin:0 auto;overflow:hidden;box-shadow:0 4px 20px rgba(12,58,92,0.15)}
    .header{background:#0C3A5C;padding:20px;text-align:center}
    .brand{color:#C8E0F0;font-size:13px;font-weight:900;letter-spacing:2px}
    .confirmed{color:#fff;font-size:20px;font-weight:900;margin-top:6px}
    .qr-section{padding:24px;text-align:center;border-bottom:2px dashed #E5E7EB}
    .prompt{color:#374151;font-size:13px;font-weight:600;margin-top:12px}
    .ref-section{padding:16px 24px;text-align:center;border-bottom:1px solid #E5E7EB}
    .ref-label{color:#6B7280;font-size:11px;font-weight:700;letter-spacing:1px}
    .ref{color:#13598A;font-size:22px;font-weight:900;letter-spacing:3px;font-family:monospace;margin-top:4px}
    .details{padding:16px 24px}
    .row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #F3F4F6}
    .row:last-child{border-bottom:none}
    .lbl{color:#6B7280;font-size:13px;font-weight:600}
    .val{color:#111827;font-size:13px;font-weight:700;text-align:right;max-width:55%}
    .total-val{color:#13598A;font-size:15px;font-weight:900}
    .passengers{padding:0 24px 20px}
    .section-title{color:#111827;font-weight:800;font-size:14px;margin-bottom:8px}
    table{width:100%;border-collapse:collapse}
    .footer{background:#F4F8FB;padding:14px 24px;text-align:center}
    .footer-text{color:#9CA3AF;font-size:11px}
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <div class="brand">አድራሽ · ADRASH</div>
      <div class="confirmed">✓ Booking Confirmed</div>
    </div>
    <div class="qr-section">
      <img width="220" height="220" src="data:image/svg+xml,${svgEncoded}"/>
      <div class="prompt">Show this QR code to your driver</div>
    </div>
    <div class="ref-section">
      <div class="ref-label">BOOKING REFERENCE</div>
      <div class="ref">${p.bookingRef}</div>
    </div>
    <div class="details">
      <div class="row"><span class="lbl">Route</span><span class="val">${p.origin} → ${p.destination}</span></div>
      ${p.pickup ? `<div class="row"><span class="lbl">Pickup</span><span class="val">${p.pickup}</span></div>` : ''}
      <div class="row"><span class="lbl">Seat(s)</span><span class="val">${p.seats}</span></div>
      ${p.departureTime ? `<div class="row"><span class="lbl">Departure</span><span class="val">${p.departureTime}</span></div>` : ''}
      <div class="row"><span class="lbl">Total paid</span><span class="val total-val">ETB ${p.totalFare.toFixed(2)}</span></div>
    </div>
    ${passengerRows ? `<div class="passengers"><div class="section-title">Passengers</div><table>${passengerRows}</table></div>` : ''}
    <div class="footer"><div class="footer-text">Adrash — Ethiopia's intercity bus booking</div></div>
  </div>
</body>
</html>`;
}

export async function saveTicketAsImage(ref: React.RefObject<unknown>): Promise<void> {
    try {
        const uri = await captureRef(ref, { format: 'png', quality: 1 });
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: 'Save ticket as image',
                UTI: 'public.png',
            });
        }
    } catch {
        Alert.alert('Error', 'Could not capture ticket image. Please try again.');
        throw new Error('capture_failed');
    }
}

export async function saveTicketAsPDF(params: TicketParams): Promise<void> {
    try {
        const html = buildTicketHTML(params);
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: 'Save ticket as PDF',
                UTI: 'com.adobe.pdf',
            });
        }
    } catch {
        Alert.alert('Error', 'Could not generate PDF. Please try again.');
        throw new Error('pdf_failed');
    }
}
