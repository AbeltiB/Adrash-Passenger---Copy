// src/features/passenger-booking/components/DateTimePicker.tsx
//
// Language-aware date + time picker:
//   en  → Gregorian calendar, 12h AM/PM
//   am  → Ethiopian (Ge'ez) calendar, Ethiopian clock with 4 periods (ጥዋት/ቀን/ምሽት/ሌሊት)
//   om  → Gregorian calendar with Oromiffa month/period names, 12h
//
// Storage always uses ISO Gregorian: date = "YYYY-MM-DD", time = "HH:MM" (24h).

import { useState, useMemo, useCallback } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors, Spacing, BorderRadius, Shadow } from '@/constants';

// ─── Ethiopian calendar (JDN-based) ──────────────────────────────────────────
// Verified: May 9 2026 GC = Ginbot 1 2018 EC; May 27 2026 GC = Ginbot 19 2018 EC

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

function jdnToEth(jdn: number): { year: number; month: number; day: number } {
    const J = jdn - ETH_EPOCH;
    const r = J % 1461;
    const n = r % 365 + 365 * Math.floor(r / 1460);
    return {
        year:  4 * Math.floor(J / 1461) + Math.floor(r / 365) - Math.floor(r / 1460) + 1,
        month: Math.floor(n / 30) + 1,
        day:   (n % 30) + 1,
    };
}

function dateToEth(date: Date) {
    return jdnToEth(gregorianToJDN(date.getFullYear(), date.getMonth() + 1, date.getDate()));
}

// ─── Locale data ──────────────────────────────────────────────────────────────

const ETH_MONTHS = [
    'መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት',
    'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ',
];

const GREG_MONTHS_SHORT_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const GREG_MONTHS_FULL_EN  = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const GREG_MONTHS_OM       = ['Amajjii','Guraandhala','Bitootessa','Elba','Caamsa','Waxabajjii','Adoolessa','Hagayya','Fuulbana','Onkoloolessa','Sadaasa','Muddee'];

const DOW_EN = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const DOW_AM = ['እሑ','ሰኞ','ማክ','ረቡ','ሐሙ','ዓር','ቅዳ'];
const DOW_OM = ['Di','Wi','Qi','Ro','Ka','Ji','Sa'];

// Ethiopian clock: 4 periods — each covers 6 Gregorian hours
// ጥዋት  (morning)  Greg 06–11 → Eth 12,1,2,3,4,5
// ቀን   (daytime)  Greg 12–17 → Eth 6,7,8,9,10,11
// ምሽት  (evening)  Greg 18–23 → Eth 12,1,2,3,4,5
// ሌሊት  (night)    Greg 00–05 → Eth 6,7,8,9,10,11

const AM_PERIODS = ['ጥዋት', 'ቀን', 'ምሽት', 'ሌሊት'] as const;
const AM_PERIOD_HOURS: ReadonlyArray<ReadonlyArray<number>> = [
    [12, 1, 2, 3, 4, 5],   // ጥዋት
    [6, 7, 8, 9, 10, 11],  // ቀን
    [12, 1, 2, 3, 4, 5],   // ምሽት
    [6, 7, 8, 9, 10, 11],  // ሌሊት
];

const STD_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES   = [0, 15, 30, 45];

// ─── Time conversion helpers ──────────────────────────────────────────────────

// Gregorian 24h → Ethiopian period index (0=ጥዋት, 1=ቀን, 2=ምሽት, 3=ሌሊት)
function greg24ToEthPeriod(h: number): number {
    if (h >= 6  && h < 12) return 0;
    if (h >= 12 && h < 18) return 1;
    if (h >= 18)            return 2;
    return 3; // 0–5
}

// Gregorian 24h → Ethiopian hour (1–12)
function greg24ToEthHour(h: number): number {
    return (h + 6) % 12 || 12;
}

// Ethiopian hour + period index → Gregorian 24h
function ethToGreg24(ethH: number, period: number): number {
    switch (period) {
        case 0: return (ethH % 12) + 6;      // ጥዋት: 12→6, 1→7 … 5→11
        case 1: return ethH + 6;               // ቀን:  6→12 … 11→17
        case 2: return ((ethH % 12) + 18) % 24; // ምሽት: 12→18 … 5→23
        case 3: return (ethH + 18) % 24;       // ሌሊት: 6→0 … 11→5
        default: return (ethH % 12) + 6;
    }
}

// Gregorian 24h → standard AM(0)/PM(1)
function greg24ToAmPm(h: number): number { return h < 12 ? 0 : 1; }

// Gregorian 24h → 12h display
function greg24To12h(h: number): number { return h % 12 || 12; }

// Standard 12h + AM/PM → Gregorian 24h
function std12ToGreg24(h12: number, period: number): number {
    return period === 0
        ? h12 === 12 ? 0  : h12
        : h12 === 12 ? 12 : h12 + 12;
}

// ─── Public display formatters (used outside this component too) ──────────────

export function formatDateDisplay(dateStr: string, lang: string): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const dow = date.getDay();

    if (lang === 'am') {
        const eth = dateToEth(date);
        return `${DOW_AM[dow]}、${ETH_MONTHS[eth.month - 1]} ${eth.day}`;
    }
    if (lang === 'om') {
        return `${DOW_OM[dow]}, ${GREG_MONTHS_OM[m - 1]} ${d}`;
    }
    return `${DOW_EN[dow]}, ${GREG_MONTHS_SHORT_EN[m - 1]} ${d}`;
}

export function formatTimeDisplay(timeStr: string, lang: string): string {
    const [h, min] = timeStr.split(':').map(Number);
    const ms = String(min).padStart(2, '0');

    if (lang === 'am') {
        const ethH = greg24ToEthHour(h);
        return `${ethH}:${ms} ${AM_PERIODS[greg24ToEthPeriod(h)]}`;
    }
    if (lang === 'om') {
        return `${greg24To12h(h)}:${ms} ${h < 12 ? 'ganama' : 'galgala'}`;
    }
    return `${greg24To12h(h)}:${ms} ${h < 12 ? 'AM' : 'PM'}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export interface DateTimePickerProps {
    date: string;   // YYYY-MM-DD (Gregorian)
    time: string;   // HH:MM (24h Gregorian)
    onChange: (date: string, time: string) => void;
}

export function DateTimePicker({ date, time, onChange }: DateTimePickerProps) {
    const { t, i18n } = useTranslation();
    const lang = i18n.language ?? 'en';

    const [open,         setOpen]         = useState(false);
    const [pickerDate,   setPickerDate]   = useState(date);
    const [pickerPeriod, setPickerPeriod] = useState(0);
    const [pickerHour,   setPickerHour]   = useState(9);
    const [pickerMinute, setPickerMinute] = useState(0);

    // Next 14 days (today inclusive)
    const dateOptions = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return Array.from({ length: 14 }, (_, i) => {
            const d = new Date(today);
            d.setDate(d.getDate() + i);
            return d.toISOString().slice(0, 10);
        });
    }, []);

    const openPicker = useCallback(() => {
        setPickerDate(date);
        const [h, m] = time.split(':').map(Number);
        if (lang === 'am') {
            setPickerPeriod(greg24ToEthPeriod(h));
            setPickerHour(greg24ToEthHour(h));
        } else {
            setPickerPeriod(greg24ToAmPm(h));
            setPickerHour(greg24To12h(h));
        }
        setPickerMinute(Math.round(m / 15) * 15 % 60);
        setOpen(true);
    }, [date, time, lang]);

    const onPeriodChange = useCallback((p: number) => {
        setPickerPeriod(p);
        const valid = lang === 'am' ? (AM_PERIOD_HOURS[p] ?? STD_HOURS) : STD_HOURS;
        if (!valid.includes(pickerHour)) setPickerHour(valid[0] ?? 1);
    }, [lang, pickerHour]);

    const confirm = useCallback(() => {
        let h24: number;
        if (lang === 'am') {
            h24 = ((ethToGreg24(pickerHour, pickerPeriod)) % 24 + 24) % 24;
        } else {
            h24 = std12ToGreg24(pickerHour, pickerPeriod);
        }
        onChange(pickerDate, `${String(h24).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`);
        setOpen(false);
    }, [lang, pickerHour, pickerPeriod, pickerMinute, pickerDate, onChange]);

    const validHours = lang === 'am' ? (AM_PERIOD_HOURS[pickerPeriod] ?? STD_HOURS) : STD_HOURS;
    const periods = lang === 'am'
        ? AM_PERIODS
        : lang === 'om'
            ? (['ganama', 'galgala'] as const)
            : (['AM', 'PM'] as const);

    // ── Date chip renderer ──────────────────────────────────────────────────
    function renderDateChip(dateStr: string) {
        const [y, m, d] = dateStr.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        const dow = dt.getDay();
        const active = dateStr === pickerDate;

        let topLabel: string;
        let bottomLabel: string | number;

        if (lang === 'am') {
            const eth = dateToEth(dt);
            topLabel    = DOW_AM[dow] ?? '';
            bottomLabel = eth.day;
        } else if (lang === 'om') {
            topLabel    = DOW_OM[dow] ?? '';
            bottomLabel = d;
        } else {
            topLabel    = DOW_EN[dow] ?? '';
            bottomLabel = d;
        }

        return (
            <Pressable
                key={dateStr}
                style={[styles.dateChip, active && styles.dateChipActive]}
                onPress={() => setPickerDate(dateStr)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
            >
                <Text style={[styles.dateChipTop, active && styles.dateChipActiveText]}>{topLabel}</Text>
                <Text style={[styles.dateChipBot, active && styles.dateChipActiveText]}>{bottomLabel}</Text>
            </Pressable>
        );
    }

    // ── Month / year header ──────────────────────────────────────────────────
    function monthYearLabel(): string {
        const [y, m] = pickerDate.split('-').map(Number);
        if (lang === 'am') {
            const eth = dateToEth(new Date(y, m - 1, 1));
            return `${ETH_MONTHS[eth.month - 1]} ${eth.year}`;
        }
        if (lang === 'om') return `${GREG_MONTHS_OM[m - 1]} ${y}`;
        return `${GREG_MONTHS_FULL_EN[m - 1]} ${y}`;
    }

    return (
        <>
            {/* ── Display trigger ── */}
            <Pressable style={styles.trigger} onPress={openPicker} accessibilityRole="button">
                <View style={styles.triggerContent}>
                    <Text style={styles.triggerLabel}>{t('home.date_time')}</Text>
                    <Text style={styles.triggerValue} numberOfLines={1}>
                        {formatDateDisplay(date, lang)}{'  ·  '}{formatTimeDisplay(time, lang)}
                    </Text>
                </View>
                <Text style={styles.calIcon}>📅</Text>
            </Pressable>

            {/* ── Bottom-sheet modal ── */}
            <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
                <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
                    <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>

                        {/* Header */}
                        <View style={styles.sheetHeader}>
                            <Text style={styles.sheetTitle}>{t('booking.date_picker.title')}</Text>
                            <Pressable onPress={() => setOpen(false)} style={styles.closeBtn}>
                                <Text style={styles.closeBtnText}>✕</Text>
                            </Pressable>
                        </View>

                        {/* ── DATE ── */}
                        <Text style={styles.sectionLabel}>{t('booking.date_picker.select_date')}</Text>
                        <Text style={styles.monthYear}>{monthYearLabel()}</Text>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.dateRow}
                        >
                            {dateOptions.map(renderDateChip)}
                        </ScrollView>

                        {/* ── TIME ── */}
                        <Text style={[styles.sectionLabel, styles.timeSectionLabel]}>
                            {t('booking.date_picker.select_time')}
                        </Text>

                        {/* Period tabs */}
                        <View style={styles.periodRow}>
                            {periods.map((label, i) => (
                                <Pressable
                                    key={label}
                                    style={[styles.periodBtn, pickerPeriod === i && styles.periodBtnActive]}
                                    onPress={() => onPeriodChange(i)}
                                >
                                    <Text style={[styles.periodText, pickerPeriod === i && styles.periodTextActive]}>
                                        {label}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Hour chips */}
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.hourRow}
                        >
                            {validHours.map((h) => (
                                <Pressable
                                    key={h}
                                    style={[styles.hourChip, pickerHour === h && styles.hourChipActive]}
                                    onPress={() => setPickerHour(h)}
                                >
                                    <Text style={[styles.hourText, pickerHour === h && styles.hourTextActive]}>
                                        {h}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        {/* Minute chips */}
                        <View style={styles.minuteRow}>
                            {MINUTES.map((m) => (
                                <Pressable
                                    key={m}
                                    style={[styles.minuteChip, pickerMinute === m && styles.minuteChipActive]}
                                    onPress={() => setPickerMinute(m)}
                                >
                                    <Text style={[styles.minuteText, pickerMinute === m && styles.minuteTextActive]}>
                                        :{String(m).padStart(2, '0')}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        {/* Confirm */}
                        <Pressable style={styles.confirmBtn} onPress={confirm} accessibilityRole="button">
                            <Text style={styles.confirmText}>{t('booking.date_picker.confirm')}</Text>
                        </Pressable>

                    </Pressable>
                </Pressable>
            </Modal>
        </>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    // Trigger button
    trigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: Colors.border.medium,
        borderRadius: BorderRadius.md,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.md,
        backgroundColor: Colors.background.primary,
        gap: Spacing.sm,
    },
    triggerContent: { flex: 1, gap: 3 },
    triggerLabel:   { color: Colors.text.tertiary, fontWeight: '700', fontSize: 11, letterSpacing: 0.4 },
    triggerValue:   { color: Colors.text.primary, fontWeight: '600', fontSize: 14 },
    calIcon:        { fontSize: 18 },

    // Backdrop + sheet
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        backgroundColor: Colors.background.primary,
        borderTopLeftRadius:  BorderRadius['2xl'],
        borderTopRightRadius: BorderRadius['2xl'],
        padding: Spacing.xl,
        paddingBottom: Spacing['3xl'],
        gap: Spacing.md,
        ...Shadow.lg,
    },

    // Sheet header
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: Spacing.xs,
    },
    sheetTitle:   { fontSize: 18, fontWeight: '900', color: Colors.text.primary },
    closeBtn:     { padding: 6 },
    closeBtnText: { fontSize: 18, color: Colors.text.tertiary, fontWeight: '700' },

    // Section labels
    sectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: Colors.text.tertiary,
        letterSpacing: 0.7,
        textTransform: 'uppercase',
    },
    timeSectionLabel: { marginTop: Spacing.sm },
    monthYear: {
        fontSize: 13,
        fontWeight: '600',
        color: Colors.text.secondary,
        marginTop: -Spacing.xs,
    },

    // Date chips
    dateRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
    dateChip: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 50,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.lg,
        borderWidth: 1.5,
        borderColor: Colors.border.light,
        gap: 3,
    },
    dateChipActive:     { borderColor: Colors.brand.primary, backgroundColor: Colors.brand.primary },
    dateChipTop:        { fontSize: 11, fontWeight: '700', color: Colors.text.tertiary },
    dateChipBot:        { fontSize: 16, fontWeight: '800', color: Colors.text.primary },
    dateChipActiveText: { color: Colors.neutral.white },

    // Period tabs
    periodRow: { flexDirection: 'row', gap: Spacing.sm },
    periodBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: Colors.border.light,
        alignItems: 'center',
        backgroundColor: Colors.background.secondary,
    },
    periodBtnActive:  { borderColor: Colors.brand.primary, backgroundColor: Colors.brand.primaryTint },
    periodText:       { fontWeight: '700', color: Colors.text.secondary, fontSize: 13 },
    periodTextActive: { color: Colors.brand.primary },

    // Hour chips
    hourRow: { gap: Spacing.sm, paddingVertical: Spacing.xs },
    hourChip: {
        width: 46,
        height: 46,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: Colors.border.light,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.background.secondary,
    },
    hourChipActive:  { borderColor: Colors.brand.primary, backgroundColor: Colors.brand.primary },
    hourText:        { fontSize: 15, fontWeight: '700', color: Colors.text.primary },
    hourTextActive:  { color: Colors.neutral.white },

    // Minute chips
    minuteRow: { flexDirection: 'row', gap: Spacing.sm },
    minuteChip: {
        flex: 1,
        paddingVertical: 13,
        borderRadius: BorderRadius.md,
        borderWidth: 1.5,
        borderColor: Colors.border.light,
        alignItems: 'center',
        backgroundColor: Colors.background.secondary,
    },
    minuteChipActive:  { borderColor: Colors.brand.primary, backgroundColor: Colors.brand.primaryTint },
    minuteText:        { fontWeight: '700', color: Colors.text.secondary, fontSize: 15 },
    minuteTextActive:  { color: Colors.brand.primary, fontWeight: '800' },

    // Confirm button
    confirmBtn: {
        backgroundColor: Colors.brand.primary,
        borderRadius: BorderRadius.lg,
        paddingVertical: 15,
        alignItems: 'center',
        marginTop: Spacing.sm,
        ...Shadow.sm,
    },
    confirmText: { color: Colors.neutral.white, fontWeight: '800', fontSize: 16 },
});
