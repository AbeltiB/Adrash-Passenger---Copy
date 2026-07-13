import { format, formatDistanceToNow, parseISO } from 'date-fns';
import {
    dateToEthiopian, calendarTag, ETH_MONTHS,
    GREG_MONTHS_SHORT_EN, GREG_MONTHS_OM,
    DOW_EN, DOW_AM, DOW_OM,
    ETH_AM_PERIODS, greg24ToEthPeriod, greg24ToEthHour, greg24To12h,
} from '../lib/ethiopianCalendar';
// NOTE: install date-fns when date formatting is needed:  npm install date-fns

/** 'Mon, 12 Jun 2025' */
export function formatDate(iso: string): string {
    return format(parseISO(iso), 'EEE, d MMM yyyy');
}

/** 'Mon, 12 Jun 2025 · 08:30' */
export function formatDateTime(iso: string): string {
    return format(parseISO(iso), "EEE, d MMM yyyy · HH:mm");
}

/** '08:30' */
export function formatTime(iso: string): string {
    return format(parseISO(iso), 'HH:mm');
}

/** '2 hours ago' */
export function timeAgo(iso: string): string {
    return formatDistanceToNow(parseISO(iso), { addSuffix: true });
}

/** Duration  75 -> '1h 15m' */
export function formatDuration(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ── Language-aware date/time (Ethiopian calendar for Amharic) ─────────────────
// The plain formatDate/formatDateTime/formatTime above are always Gregorian —
// fine for logs/internal use, but passenger-facing trip dates should follow
// the user's language and always say which calendar system they're in, since
// the same numeric day means a different date in GC vs EC.

/** e.g. 'Mon, 13 Jul 2026 (GC)' or 'ሰኞ、ሐምሌ 6 2018 (ኢ.አ.)' */
export function formatDateForLang(iso: string, lang: string): string {
    const date = parseISO(iso);
    const dow  = date.getDay();

    if (lang === 'am') {
        const eth = dateToEthiopian(date);
        return `${DOW_AM[dow]}、${ETH_MONTHS[eth.month - 1]} ${eth.day} ${eth.year} (${calendarTag(lang)})`;
    }
    if (lang === 'om') {
        return `${DOW_OM[dow]}, ${GREG_MONTHS_OM[date.getMonth()]} ${date.getDate()} ${date.getFullYear()} (${calendarTag(lang)})`;
    }
    return `${DOW_EN[dow]}, ${date.getDate()} ${GREG_MONTHS_SHORT_EN[date.getMonth()]} ${date.getFullYear()} (${calendarTag(lang)})`;
}

/** e.g. '2:30 PM', '8:30 ጥዋት' */
export function formatTimeForLang(iso: string, lang: string): string {
    const date = parseISO(iso);
    const h    = date.getHours();
    const min  = String(date.getMinutes()).padStart(2, '0');

    if (lang === 'am') {
        return `${greg24ToEthHour(h)}:${min} ${ETH_AM_PERIODS[greg24ToEthPeriod(h)]}`;
    }
    if (lang === 'om') {
        return `${greg24To12h(h)}:${min} ${h < 12 ? 'ganama' : 'galgala'}`;
    }
    return `${greg24To12h(h)}:${min} ${h < 12 ? 'AM' : 'PM'}`;
}

/** e.g. 'Mon, 13 Jul 2026 (GC) · 2:30 PM' */
export function formatDateTimeForLang(iso: string, lang: string): string {
    return `${formatDateForLang(iso, lang)} · ${formatTimeForLang(iso, lang)}`;
}