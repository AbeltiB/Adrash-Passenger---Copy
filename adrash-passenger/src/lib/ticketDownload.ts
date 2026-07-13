import type { RefObject } from 'react';
import type { View }      from 'react-native';
import { Alert }         from 'react-native';
import { captureRef }    from 'react-native-view-shot';
import * as Print        from 'expo-print';
import * as Sharing      from 'expo-sharing';
import { Paths, File, Directory } from 'expo-file-system';

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
    // Paths.document (not Paths.cache) — cache can be purged by the OS under
    // storage pressure at any time, which would silently break "offline
    // access to a ticket I already downloaded."
    const ticketsDir = new Directory(Paths.document, 'adrash_tickets');
    if (!ticketsDir.exists) {
        ticketsDir.create();
    }
    const dest = new File(ticketsDir, `${stem}.${ext}`);
    new File(tmpUri).copy(dest);
    return dest.uri;
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

