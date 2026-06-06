// Pure-JS QR code, rendered with plain Views (no native module / no rebuild).
//
// react-native-svg isn't installed, so instead of an <svg>/<Image> we compute
// the module matrix with `qrcode-generator` and paint it. To keep the View
// count low even for long ticket payloads, each row's dark modules are merged
// into horizontal run-length bars rather than one View per module.

import { useMemo } from 'react';
import { View } from 'react-native';
import qrcode from 'qrcode-generator';

interface QRCodeProps {
    value: string;
    /** Outer size in px (including quiet-zone padding). */
    size?: number;
    color?: string;
    background?: string;
    /** Quiet-zone padding in px on each side. */
    padding?: number;
}

export function QRCode({
    value,
    size = 180,
    color = '#000000',
    background = '#FFFFFF',
    padding = 10,
}: QRCodeProps) {
    const { count, bars } = useMemo(() => {
        const qr = qrcode(0, 'M');
        qr.addData(value && value.length > 0 ? value : ' ');
        qr.make();
        const n = qr.getModuleCount();
        const runs: { row: number; start: number; len: number }[] = [];
        for (let r = 0; r < n; r++) {
            let c = 0;
            while (c < n) {
                if (qr.isDark(r, c)) {
                    const start = c;
                    while (c < n && qr.isDark(r, c)) c++;
                    runs.push({ row: r, start, len: c - start });
                } else {
                    c++;
                }
            }
        }
        return { count: n, bars: runs };
    }, [value]);

    const inner = size - padding * 2;
    const cell = inner / count;

    return (
        <View
            style={{
                width: size,
                height: size,
                padding,
                backgroundColor: background,
                borderRadius: 8,
            }}
        >
            <View style={{ width: inner, height: inner }}>
                {bars.map((b, i) => (
                    <View
                        key={i}
                        style={{
                            position: 'absolute',
                            top: b.row * cell,
                            left: b.start * cell,
                            // Slight overscan removes hairline gaps from fractional cells.
                            width: b.len * cell + 0.6,
                            height: cell + 0.6,
                            backgroundColor: color,
                        }}
                    />
                ))}
            </View>
        </View>
    );
}
