import { format, formatDistanceToNow, parseISO } from 'date-fns';
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