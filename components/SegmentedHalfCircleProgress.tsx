import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../constants/Colors';

type Props = {
    progress: number; // 0 to 1
    size?: number;
    strokeWidth?: number;
    segments?: number;
    gapAngle?: number;
    value?: number | string;
    label?: string;
};

export function SegmentedHalfCircleProgress({
    progress,
    size = 300,
    strokeWidth = 28,
    segments = 18,
    gapAngle = 6,
    value,
    label,
}: Props) {
    const clampedProgress = Math.max(0, Math.min(1, progress));
    const outerRadius = size / 2;
    const innerRadius = outerRadius - strokeWidth;
    const cx = size / 2;
    const cy = size / 2;

    const totalAngle = 180;
    const totalGap = gapAngle * (segments - 1);
    const segmentAngle = (totalAngle - totalGap) / segments;

    const activeSegmentsCount = Math.floor(clampedProgress * segments);

    const polarToCartesian = (angle: number, r: number) => {
        const rad = (Math.PI / 180) * angle;
        return {
            x: cx + r * Math.cos(rad),
            y: cy - r * Math.sin(rad),
        };
    };

    const createSegmentPath = (startAngle: number, endAngle: number) => {
        const p1 = polarToCartesian(startAngle, outerRadius);
        const p2 = polarToCartesian(endAngle, outerRadius);
        const p3 = polarToCartesian(endAngle, innerRadius);
        const p4 = polarToCartesian(startAngle, innerRadius);

             return `M ${p1.x} ${p1.y} A ${outerRadius} ${outerRadius} 0 0 1 ${p2.x} ${p2.y} L ${p3.x} ${p3.y} A ${innerRadius} ${innerRadius} 0 0 0 ${p4.x} ${p4.y} Z`;
    };

    let currentAngle = 180; 

    return (
        <View style={[styles.wrapper, { width: size, height: size / 2 + 10 }]}>
            <Svg width={size} height={size / 2 + 10}>
                {Array.from({ length: segments }).map((_, i) => {
                    const start = currentAngle;
                    const end = currentAngle - segmentAngle;

                    currentAngle = end - gapAngle;

                    const isActive = i < activeSegmentsCount;

                    return (
                        <Path
                            key={i}
                            d={createSegmentPath(start, end)}
                            fill={isActive ? Colors.PRIMARY : '#E5E7EB'}
                        />
                    );
                })}
            </Svg>

            <View style={styles.textOverlay}>
                <Text style={styles.flameEmoji}>🔥</Text>
                {value !== undefined && (
                    <Text style={styles.mainText}>{value}</Text>
                )}
                {label && <Text style={styles.subText}>{label}</Text>}
            </View>
        </View>
    );
}
const styles = StyleSheet.create({
    wrapper: {
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    textOverlay: {
        position: 'absolute',
        top: '41%',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    flameEmoji: {
        fontSize: 22,
        marginBottom: 0,
    },
    mainText: {
        fontSize: 44,
        fontWeight: '800',
        color: Colors.TEXT_MAIN,
        lineHeight: 48,
    },
    subText: {
        fontSize: 14,
        fontWeight: '700',
        color: Colors.TEXT_MUTED,
        marginTop: -2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
