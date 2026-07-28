import type { RefObject } from 'react';
import type { View }      from 'react-native';
import { Alert }         from 'react-native';
import { captureRef }    from 'react-native-view-shot';
import * as Print        from 'expo-print';
import * as Sharing      from 'expo-sharing';
import { Paths, File, Directory } from 'expo-file-system';
import qrcode             from 'qrcode-generator';

function slugify(s: string): string {
    return (s ?? '').replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16) || 'Ticket';
}

// The booking reference is already the unique, human-meaningful ID printed
// on the ticket itself and the one a driver or support agent would actually
// ask for — using it (plus this specific passenger's name) means a saved
// file is identifiable at a glance in a downloads folder, and distinct from
// the other passengers' files saved from the same booking. Previously this
// used an in-session counter (reset to 1 every app launch) that looked like
// a meaningless random number and had no relationship to the actual ticket.
function buildStem(bookingRef: string, passengerLabel: string, origin: string, destination: string): string {
    const now = new Date();
    const d = String(now.getFullYear())
            + String(now.getMonth() + 1).padStart(2, '0')
            + String(now.getDate()).padStart(2, '0');
    return `Adrash_${slugify(bookingRef)}_${slugify(passengerLabel)}_${slugify(origin)}-to-${slugify(destination)}_${d}`;
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

// ── QR → inline SVG (for the PDF, which can't render the app's own <QRCode>
//    React Native view) ─────────────────────────────────────────────────────
function qrToSvg(value: string, sizePx = 180): string {
    const qr = qrcode(0, 'M');
    qr.addData(value.length > 0 ? value : ' ');
    qr.make();
    const count = qr.getModuleCount();
    const cell = sizePx / count;
    let rects = '';
    for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
            if (qr.isDark(r, c)) {
                const x = (c * cell).toFixed(2);
                const y = (r * cell).toFixed(2);
                const s = (cell + 0.5).toFixed(2);
                rects += `<rect x="${x}" y="${y}" width="${s}" height="${s}" fill="#000"/>`;
            }
        }
    }
    return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 ${sizePx} ${sizePx}" xmlns="http://www.w3.org/2000/svg" style="background:#fff;border-radius:8px">${rects}</svg>`;
}

// ── Per-passenger receipt data ────────────────────────────────────────────────
// One of these = one passenger's own receipt/boarding pass, even when several
// passengers share the same booking. Each passenger has their own
// individually-verifiable QR and seat (confirmed with the backend team — not
// one QR shared across the whole booking), so each gets their own document
// rather than all being listed inside a single combined receipt. The route,
// payment, and booking reference are the same across every passenger on the
// same booking; only the name/seat/QR differ per document.
export interface TicketData {
    bookingRef:         string;
    passengerName:      string;
    /** 1-based position among this booking's passengers, e.g. 2 of 6. */
    passengerIndex:     number;
    passengerCount:      number;
    seat:               string;
    /** This passenger's own boarding QR value. Null = not issued yet
     *  (booking not yet Confirmed) — never fall back to a plaintext
     *  reference here, since that's forgeable. */
    qrCode:              string | null;
    origin:             string;
    destination:        string;
    departureTime:      string;
    departureEthiopian: string;
    driverName:         string | null;
    busLabel:           string | null;
    pickup:             string;
    dropoff:            string;
    subtotal:           number;
    serviceFee:         number;
    rewardsDiscount:    number;
    totalFare:          number;
    paymentMethod:      string;
    purchasedAt:        string;
}

// ── Image export ──────────────────────────────────────────────────────────────
export async function saveTicketAsImage(
    ref:            RefObject<View | null>,
    bookingRef:     string,
    passengerLabel: string,
    origin:         string,
    destination:    string,
): Promise<void> {
    try {
        const tmp  = await captureRef(ref, { format: 'jpg', quality: 0.95 });
        const stem = buildStem(bookingRef, passengerLabel, origin, destination);
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
        const stem = buildStem(data.bookingRef, data.passengerName, data.origin, data.destination);
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
    const isGroup = d.passengerCount > 1;

    const fareRows = [
        d.subtotal > 0
            ? infoRow(`Fare (${d.passengerCount} seat${d.passengerCount !== 1 ? 's' : ''})`,
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

    return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Adrash Receipt — ${esc(d.bookingRef)}${isGroup ? ` — ${esc(d.passengerName)}` : ''}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,Helvetica Neue,Arial,sans-serif;background:#F4F8FB;padding:20px;color:#111}
.wrap{max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;
      box-shadow:0 4px 24px rgba(0,0,0,.13)}
.hdr{background:linear-gradient(135deg,#0C3A5C 0%,#13598A 100%);color:#fff;
     padding:24px 28px 18px;text-align:center}
.brand{font-size:26px;font-weight:900;letter-spacing:3px}
.brand-am{font-size:15px;opacity:.8;margin-top:3px;letter-spacing:1px}
.hdr-sub{font-size:11px;opacity:.6;margin-top:6px;letter-spacing:.8px;text-transform:uppercase}
.badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.2);
       border-radius:24px;padding:6px 18px;font-size:13px;font-weight:700;margin-top:14px}
.group-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.14);
       border-radius:24px;padding:4px 14px;font-size:11px;font-weight:700;margin-top:8px}
.ref-bar{display:flex;justify-content:space-between;align-items:center;
         background:#E8F2FA;padding:14px 28px;border-bottom:1px solid #CFE3F2}
.ref-l{font-size:10px;font-weight:700;color:#0C3A5C;letter-spacing:1.2px;text-transform:uppercase}
.ref-v{font-size:20px;font-weight:900;color:#0C3A5C;font-family:monospace;letter-spacing:2px;margin-top:3px}
.purch{text-align:right}
.purch-l{font-size:10px;font-weight:700;color:#888;letter-spacing:1px;text-transform:uppercase}
.purch-v{font-size:12px;font-weight:600;color:#333;margin-top:3px}
.route-bar{text-align:center;padding:18px 28px;background:#F4F8FB;border-bottom:1px solid #E1EDF5}
.route{font-size:22px;font-weight:900;color:#0C3A5C}
.passenger-bar{text-align:center;padding:12px 28px;background:#fff;border-bottom:1px solid #eee}
.passenger-name{font-size:16px;font-weight:800;color:#111}
.passenger-seat{font-size:12px;color:#0C3A5C;font-weight:700;margin-top:2px}
.sec{padding:14px 28px;border-bottom:1px solid #eee}
.sec-t{font-size:10px;font-weight:700;color:#bbb;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:10px}
.row{display:flex;justify-content:space-between;align-items:flex-start;
     padding:5px 0;border-bottom:1px solid #f5f5f5}
.row:last-child{border-bottom:none}
.lbl{font-size:13px;color:#777;flex-shrink:0;margin-right:12px}
.val{font-size:13px;font-weight:600;color:#111;text-align:right;word-break:break-word}
.green{color:#16a34a}
.qr-section{padding:22px 28px;text-align:center;background:#fff}
.qr-prompt{font-size:12px;color:#6B7280;font-weight:600;margin-top:10px}
.qr-pending{width:180px;height:180px;border:1.5px dashed #E5E7EB;border-radius:8px;
     display:flex;align-items:center;justify-content:center;margin:0 auto;
     font-size:12px;color:#6B7280;font-weight:700;text-align:center;padding:16px}
.fare-sec{padding:14px 28px;border-bottom:1px solid #eee}
.total-row{display:flex;justify-content:space-between;align-items:center;
           margin-top:12px;padding-top:12px;border-top:2px solid #0C3A5C}
.total-lbl{font-size:15px;font-weight:800;color:#111;letter-spacing:.3px}
.total-val{font-size:22px;font-weight:900;color:#0C3A5C}
.foot{padding:16px 28px;text-align:center;background:#f9f9f9}
.foot-t{font-size:11px;color:#bbb;line-height:18px}
.foot-b{font-size:12px;font-weight:700;color:#0C3A5C;margin-top:6px;letter-spacing:.5px}
</style>
</head>
<body><div class="wrap">

<div class="hdr">
  <div class="brand">ADRASH</div>
  <div class="brand-am">አድራሽ</div>
  <div class="hdr-sub">Official Travel Receipt</div>
  <div class="badge">&#10003;&nbsp;&nbsp;BOOKING CONFIRMED</div>
  ${isGroup ? `<div class="group-badge">Passenger ${d.passengerIndex} of ${d.passengerCount}</div>` : ''}
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

<div class="passenger-bar">
  <div class="passenger-name">${esc(d.passengerName)}</div>
  <div class="passenger-seat">Seat ${esc(d.seat)}</div>
</div>

<div class="qr-section">
  ${d.qrCode
      ? qrToSvg(d.qrCode, 180)
      : '<div class="qr-pending">QR code not ready yet<br>Check back shortly</div>'}
  <div class="qr-prompt">This passenger's own boarding pass — show at boarding</div>
</div>

<div class="sec">
  <div class="sec-t">Trip Details</div>
  ${infoRow('Departure', d.departureTime)}
  ${infoRow('Departure (Ethiopian)', d.departureEthiopian)}
  ${d.driverName ? infoRow('Driver', d.driverName) : ''}
  ${d.busLabel   ? infoRow('Vehicle', d.busLabel)  : ''}
</div>

<div class="sec">
  <div class="sec-t">Boarding</div>
  ${infoRow('Pickup point', d.pickup)}
  ${infoRow('Drop-off', d.dropoff)}
</div>

<div class="fare-sec">
  <div class="sec-t">${isGroup ? `Fare Breakdown — Group total (${d.passengerCount} passengers)` : 'Fare Breakdown'}</div>
  ${fareRows}
  <div class="total-row">
    <span class="total-lbl">${isGroup ? 'TOTAL PAID (WHOLE GROUP)' : 'TOTAL PAID'}</span>
    <span class="total-val">ETB ${d.totalFare.toFixed(2)}</span>
  </div>
  ${isGroup ? infoRow('Paid together as', 'One transaction') : ''}
</div>

<div class="sec">
  <div class="sec-t">Payment</div>
  ${infoRow('Method', d.paymentMethod)}
  <div class="row"><span class="lbl">Status</span><span class="val">&#10003; Confirmed</span></div>
</div>

<div class="foot">
  <div class="foot-t">
    This is ${esc(d.passengerName)}'s official Adrash digital travel receipt.<br>
    Present this QR code or the booking reference when boarding.<br>
    Ref: ${esc(d.bookingRef)} &nbsp;&#183;&nbsp; ${esc(d.purchasedAt)}
  </div>
  <div class="foot-b">ADRASH &nbsp;&#183;&nbsp; አድራሽ &nbsp;&#183;&nbsp; adrash.et</div>
</div>

</div></body></html>`;
}
