import React, { useEffect, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

export interface ToastConfig {
    message: string;
    icon?: string;
    color?: string;
    duration?: number;
}

export const showSmartToast = (config: ToastConfig | string) => {
    if (typeof config === 'string') {
        DeviceEventEmitter.emit('SHOW_TOAST', { message: config });
    } else {
        DeviceEventEmitter.emit('SHOW_TOAST', config);
    }
};

export default function SmartToast() {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const [config, setConfig] = useState<ToastConfig | null>(null);
    const slideAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener('SHOW_TOAST', (cfg: ToastConfig) => {
            setConfig(cfg);
            // Slide in
            Animated.spring(slideAnim, {
                toValue: insets.top + 10,
                damping: 15,
                stiffness: 150,
                useNativeDriver: true,
            }).start();

            // Slide out after duration
            setTimeout(() => {
                Animated.timing(slideAnim, {
                    toValue: -100,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => setConfig(null));
            }, cfg.duration || 3000);
        });

        return () => listener.remove();
    }, [insets.top]);

    if (!config) return null;

    const iconColor = config.color || theme.primary;

    return (
        <Animated.View style={[
            styles.container,
            { backgroundColor: theme.card, borderColor: theme.border, transform: [{ translateY: slideAnim }] }
        ]}>
            <View style={[styles.iconBox, { backgroundColor: iconColor + '20' }]}>
                <Ionicons name={(config.icon as any) || 'checkmark-circle'} size={20} color={iconColor} />
            </View>
            <Text style={[styles.message, { color: theme.text }]}>{config.message}</Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 20,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        elevation: 10,
        zIndex: 9999,
        gap: 12,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    message: {
        flex: 1,
        fontSize: 14,
        fontWeight: '600',
    },
});
