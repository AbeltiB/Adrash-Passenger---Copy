// Shared Gregorian ⇄ Ethiopian calendar conversion + locale name tables.
// Single source of truth so the search date picker and any other screen that
// shows a date (booking summary, confirmation, trip cards, ...) agree on
// month names, weekday abbreviations, and the GC/EC conversion math.
//
// Verified: May 9 2026 GC = Ginbot 1 2018 EC; May 27 2026 GC = Ginbot 19 2018 EC

export interface EthiopianDate {
    year:  number;
    month: number;
    day:   number;
}

const ETH_EPOCH = 1724221; // JDN of 1 Meskerem 1 EC

function gregorianToJDN(y: number, m: number, d: number): number {
    const a = Math.floor((14 - m) / 12);
    const Y = y + 4800 - a;
    const M = m + 12 * a - 3;
    return (
        d +
        Math.floor((153 * M + 2) / 5) +
        365 * Y +
        Math.floor(Y / 4) -
        Math.floor(Y / 100) +
        Math.floor(Y / 400) -
        32045
    );
}

function jdnToEth(jdn: number): EthiopianDate {
    const J = jdn - ETH_EPOCH;
    const r = J % 1461;
    const n = r % 365 + 365 * Math.floor(r / 1460);
    return {
        year:  4 * Math.floor(J / 1461) + Math.floor(r / 365) - Math.floor(r / 1460) + 1,
        month: Math.floor(n / 30) + 1,
        day:   (n % 30) + 1,
    };
}

export function dateToEthiopian(date: Date): EthiopianDate {
    return jdnToEth(gregorianToJDN(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}

// ── Locale name tables ────────────────────────────────────────────────────────

export const ETH_MONTHS = [
    'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
    'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ',
];

export const GREG_MONTHS_SHORT_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
export const GREG_MONTHS_FULL_EN  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
export const GREG_MONTHS_OM       = ['Amajjii','Guraandhala','Bitootessa','Elba','Caamsa','Waxabajjii','Adoolessa','Hagayya','Fuulbana','Onkoloolessa','Sadaasa','Muddee'];

export const DOW_EN = ['Su','Mo','Tu','We','Th','Fr','Sa'];
export const DOW_AM = ['እሑ','ሰኞ','ማክ','ረቡ','ሐሙ','ዓር','ቅዳ'];
export const DOW_OM = ['Di','Wi','Qi','Ro','Ka','Ji','Sa'];

/** Explicit calendar-system tag — the same numeric day means a different date
 *  depending on whether it's read as Ethiopian or Gregorian, so this is never
 *  left implicit anywhere a date is displayed. */
export function calendarTag(lang: string): string {
    return lang === 'am' ? 'ኢ.አ.' : 'GC';
}

// ── Ethiopian clock ────────────────────────────────────────────────────────
// 4 periods, each covering 6 Gregorian hours:
//   ጥዋት (morning)  Greg 06–11 → Eth 12,1,2,3,4,5
//   ቀን   (daytime)  Greg 12–17 → Eth 6,7,8,9,10,11
//   ምሽት  (evening)  Greg 18–23 → Eth 12,1,2,3,4,5
//   ሌሊት  (night)    Greg 00–05 → Eth 6,7,8,9,10,11

export const ETH_AM_PERIODS = ['ጥዋት', 'ቀን', 'ምሽት', 'ሌሊት'] as const;

export function greg24ToEthPeriod(h: number): number {
    if (h >= 6  && h < 12) return 0;
    if (h >= 12 && h < 18) return 1;
    if (h >= 18)            return 2;
    return 3; // 0–5
}

export function greg24ToEthHour(h: number): number {
    return (h + 6) % 12 || 12;
}

export function greg24To12h(h: number): number {
    return h % 12 || 12;
}
