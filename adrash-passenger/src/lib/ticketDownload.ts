import type { RefObject } from 'react';
import type { View }      from 'react-native';
import { Alert }         from 'react-native';
import { captureRef }    from 'react-native-view-shot';
import * as Print        from 'expo-print';
import * as Sharing      from 'expo-sharing';
import { Paths, File, Directory } from 'expo-file-system';
import qrcode            from 'qrcode-generator';

// ── QR helper (kept for backward compat) ─────────────────────────────────────
export function buildQRSvg(value: string, size = 220): string {
    const qr = qrcode(0, 'M');
    qr.addData(value && value.length > 0 ? value : ' ');
    qr.make();
    const n    = qr.getModuleCount();
    const cell = size / n;
    let rects  = '';
    for (let r = 0; r < n; r++) {
        for (let c = 0; c < n; c++) {
            if (qr.isDark(r, c)) {
                rects += `<rect x="${(c * cell).toFixed(2)}" y="${(r * cell).toFixed(2)}" `
                       + `width="${(cell + 0.5).toFixed(2)}" height="${(cell + 0.5).toFixed(2)}" fill="#000"/>`;
            }
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">`
         + `<rect width="${size}" height="${size}" fill="#fff"/>${rects}</svg>`;
}

// ── Sequential counter (resets each app launch) ───────────────────────────────
let _seq = 0;
function nextSeq(): string {
    _seq = (_seq % 999) + 1;
    return String(_seq).padStart(3, '0');
}

function slugify(s: string): string {
    return (s ?? '').replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'Ticket';
}

function buildStem(origin: string, destination: string): string {
    const now = new Date();
    const d   = String(now.getFullYear())
              + String(now.getMonth() + 1).padStart(2, '0')
              + String(now.getDate()).padStart(2, '0');
    const t   = String(now.getHours()).padStart(2, '0')
              + String(now.getMinutes()).padStart(2, '0')
              + String(now.getSeconds()).padStart(2, '0');
    return `${d}_${t}_${slugify(origin)}-${slugify(destination)}_${nextSeq()}`;
}

function withName(tmpUri: string, stem: string, ext: 'jpg' | 'pdf'): string {
    const ticketsDir = new Directory(Paths.cache, 'adrash_tickets');
    if (!ticketsDir.exists) {
        ticketsDir.create();
    }
    const dest = new File(ticketsDir, `${stem}.${ext}`);
    new File(tmpUri).copy(dest);
    return dest.uri;
}

// ── Legacy interface kept for backward compat ─────────────────────────────────
export interface TicketParams {
    qrData:          string;
    bookingRef:      string;
    origin:          string;
    destination:     string;
    seats:           string;
    totalFare:       number;
    departureTime?:  string | undefined;
    pickup?:         string | undefined;
    passengers?:     { name: string; seat: string }[] | undefined;
}

// ── Full receipt data type ────────────────────────────────────────────────────
export interface TicketData {
    bookingRef:      string;
    origin:          string;
    destination:     string;
    departureTime:   string;
    arrivalEstimate: string;
    duration:        string;
    driverName:      string | null;
    busLabel:        string | null;
    pickup:          string;
    dropoff:         string;
    seats:           string;
    subtotal:        number;
    serviceFee:      number;
    rewardsDiscount: number;
    totalFare:       number;
    passengers:      Array<{ name: string; phone: string; seat: string }>;
    paymentMethod:   string;
    purchasedAt:     string;
}

// ── Image export ──────────────────────────────────────────────────────────────
export async function saveTicketAsImage(
    ref:         RefObject<View | null>,
    origin:      string,
    destination: string,
): Promise<void> {
    try {
        const tmp  = await captureRef(ref, { format: 'jpg', quality: 0.95 });
        const stem = buildStem(origin, destination);
        const uri  = withName(tmp, stem, 'jpg');
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType:    'image/jpeg',
                dialogTitle: `${stem}.jpg`,
                UTI:         'public.jpeg',
            });
        }
    } catch {
        Alert.alert('Error', 'Could not capture ticket image. Please try again.');
        throw new Error('capture_failed');
    }
}

// ── PDF export ────────────────────────────────────────────────────────────────
export async function saveTicketAsPDF(data: TicketData): Promise<void> {
    try {
        const html = buildReceiptHtml(data);
        const { uri: tmp } = await Print.printToFileAsync({ html, base64: false });
        const stem = buildStem(data.origin, data.destination);
        const uri  = withName(tmp, stem, 'pdf');
        if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(uri, {
                mimeType:    'application/pdf',
                dialogTitle: `${stem}.pdf`,
                UTI:         'com.adobe.pdf',
            });
        }
    } catch {
        Alert.alert('Error', 'Could not generate PDF. Please try again.');
        throw new Error('pdf_failed');
    }
}

// ── HTML receipt ──────────────────────────────────────────────────────────────
function esc(s: string): string {
    return (s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function infoRow(label: string, value: string): string {
    if (!value || value === '—') return '';
    return `<div class="row"><span class="lbl">${esc(label)}</span><span class="val">${esc(value)}</span></div>`;
}

export function buildReceiptHtml(d: TicketData): string {
    const pRows = d.passengers.map((p, i) =>
        `<div class="p-row"><span class="p-name">${i + 1}. ${esc(p.name)}</span>`
      + `<span class="p-seat">Seat ${esc(p.seat)}${p.phone ? `  ·  ${esc(p.phone)}` : ''}</span></div>`
    ).join('');

    const fareRows = [
        d.subtotal > 0
            ? infoRow(`Fare (${d.passengers.length} seat${d.passengers.length !== 1 ? 's' : ''})`,
                      `ETB ${d.subtotal.toFixed(2)}`)
            : '',
        d.serviceFee > 0
            ? infoRow('Service fee', `ETB ${d.serviceFee.toFixed(2)}`)
            : '',
        d.rewardsDiscount > 0
            ? `<div class="row"><span class="lbl">Rewards discount</span>`
            + `<span class="val green">&#8722;ETB ${d.rewardsDiscount.toFixed(2)}</span></div>`
            : '',
    ].filter(Boolean).join('');

    const durationNote = d.duration ? `  ·  ${esc(d.duration)}` : '';

    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Adrash Receipt — ${esc(d.bookingRef)}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,Helvetica Neue,Arial,sans-serif;background:#f0f2ef;padding:20px;color:#111}
.wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;
      box-shadow:0 4px 24px rgba(0,0,0,.13)}
.hdr{background:linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%);color:#fff;
     padding:24px 28px 18px;text-align:center}
.brand{font-size:26px;font-weight:900;letter-spacing:3px}
.brand-am{font-size:15px;opacity:.8;margin-top:3px;letter-spacing:1px}
.hdr-sub{font-size:11px;opacity:.6;margin-top:6px;letter-spacing:.8px;text-transform:uppercase}
.badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.2);
       border-radius:24px;padding:6px 18px;font-size:13px;font-weight:700;margin-top:14px}
.ref-bar{display:flex;justify-content:space-between;align-items:center;
         background:#edf7f1;padding:14px 28px;border-bottom:1px solid #d1e7da}
.ref-l{font-size:10px;font-weight:700;color:#1B4332;letter-spacing:1.2px;text-transform:uppercase}
.ref-v{font-size:20px;font-weight:900;color:#1B4332;font-family:monospace;letter-spacing:2px;margin-top:3px}
.purch{text-align:right}
.purch-l{font-size:10px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase}
.purch-v{font-size:12px;font-weight:600;color:#333;margin-top:3px}
.route-bar{text-align:center;padding:18px 28px;background:#f9fbfa;border-bottom:1px solid #e8ede9}
.route{font-size:22px;font-weight:900;color:#1B4332}
.sec{padding:14px 28px;border-bottom:1px solid #eee}
.sec-t{font-size:10px;font-weight:700;color:#bbb;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:10px}
.row{display:flex;justify-content:space-between;align-items:flex-start;
     padding:5px 0;border-bottom:1px solid #f5f5f5}
.row:last-child{border-bottom:none}
.lbl{font-size:13px;color:#777;flex-shrink:0;margin-right:12px}
.val{font-size:13px;font-weight:600;color:#111;text-align:right;word-break:break-word}
.green{color:#16a34a}
.p-row{display:flex;justify-content:space-between;align-items:center;
       padding:7px 0;border-bottom:1px solid #f5f5f5;font-size:13px}
.p-row:last-child{border-bottom:none}
.p-name{color:#111;font-weight:500}
.p-seat{background:#edf7f1;color:#1B4332;border-radius:6px;padding:2px 8px;
        font-weight:700;font-size:12px;flex-shrink:0;margin-left:8px}
.fare-sec{padding:14px 28px;border-bottom:1px solid #eee}
.total-row{display:flex;justify-content:space-between;align-items:center;
           margin-top:12px;padding-top:12px;border-top:2px solid #1B4332}
.total-lbl{font-size:15px;font-weight:800;color:#111;letter-spacing:.3px}
.total-val{font-size:22px;font-weight:900;color:#1B4332}
.foot{padding:16px 28px;text-align:center;background:#f9f9f9}
.foot-t{font-size:11px;color:#bbb;line-height:18px}
.foot-b{font-size:12px;font-weight:700;color:#1B4332;margin-top:6px;letter-spacing:.5px}
</style>
</head>
<body><div class="wrap">

<div class="hdr">
  <div class="brand">ADRASH</div>
  <div class="brand-am">አድራሽ</div>
  <div class="hdr-sub">Official Travel Receipt</div>
  <div class="badge">&#10003;&nbsp;&nbsp;BOOKING CONFIRMED</div>
</div>

<div class="ref-bar">
  <div>
    <div class="ref-l">Booking Reference</div>
    <div class="ref-v">${esc(d.bookingRef)}</div>
  </div>
  <div class="purch">
    <div class="purch-l">Purchased</div>
    <div class="purch-v">${esc(d.purchasedAt)}</div>
  </div>
</div>

<div class="route-bar">
  <div class="route">${esc(d.origin)} &nbsp;&#8594;&nbsp; ${esc(d.destination)}</div>
</div>

<div class="sec">
  <div class="sec-t">Trip Details</div>
  ${infoRow('Departure', d.departureTime)}
  <div class="row"><span class="lbl">Arrival (est.)${durationNote}</span><span class="val">${esc(d.arrivalEstimate)}</span></div>
  ${d.driverName ? infoRow('Driver', d.driverName) : ''}
  ${d.busLabel   ? infoRow('Vehicle', d.busLabel)  : ''}
</div>

<div class="sec">
  <div class="sec-t">Boarding</div>
  ${infoRow('Pickup point', d.pickup)}
  ${infoRow('Drop-off', d.dropoff)}
  ${infoRow('Seat(s)', d.seats)}
</div>

${d.passengers.length > 0 ? `<div class="sec">
  <div class="sec-t">Passengers (${d.passengers.length})</div>
  ${pRows}
</div>` : ''}

<div class="fare-sec">
  <div class="sec-t">Fare Breakdown</div>
  ${fareRows}
  <div class="total-row">
    <span class="total-lbl">TOTAL PAID</span>
    <span class="total-val">ETB ${d.totalFare.toFixed(2)}</span>
  </div>
</div>

<div class="sec">
  <div class="sec-t">Payment</div>
  ${infoRow('Method', d.paymentMethod)}
  <div class="row"><span class="lbl">Status</span><span class="val">&#10003; Confirmed</span></div>
</div>

<div class="foot">
  <div class="foot-t">
    This is your official Adrash digital travel receipt.<br>
    Present your QR code or booking reference when boarding.<br>
    Ref: ${esc(d.bookingRef)} &nbsp;&#183;&nbsp; ${esc(d.purchasedAt)}
  </div>
  <div class="foot-b">ADRASH &nbsp;&#183;&nbsp; አድራሽ &nbsp;&#183;&nbsp; adrash.et</div>
</div>

</div></body></html>`;
}

// ── Legacy buildTicketHTML (kept so old callers still compile) ────────────────
export function buildTicketHTML(p: TicketParams): string {
    const svgContent = buildQRSvg(p.qrData, 220);
    const svgEncoded = encodeURIComponent(svgContent);
    const passengerRows = (p.passengers ?? []).map(
        (x) => `<tr><td style="padding:6px 0;color:#374151;font-weight:600">${x.name}</td>`
              + `<td style="padding:6px 0;color:#6B7280;text-align:right">Seat ${x.seat}</td></tr>`
    ).join('');
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
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
</body></html>`;
}
