import React, { useEffect, useRef, useState } from 'react';
import { Animated, DeviceEventEmitter, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '../context/ThemeContext';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'unhealthy';

export interface ToastConfig {
    message: string;
    type?: ToastType;
    icon?: string;
    color?: string;
    duration?: number;
}

export const showSmartToast = (config: ToastConfig | string) => {
    if (typeof config === 'string') {
        DeviceEventEmitter.emit('SHOW_TOAST', { message: config, type: 'info' });
    } else {
        DeviceEventEmitter.emit('SHOW_TOAST', config);
    }
};

export default function SmartToast() {
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [config, setConfig] = useState<ToastConfig | null>(null);
    const slideAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener('SHOW_TOAST', (cfg: ToastConfig) => {
            setConfig(cfg);
            // Slide in
            Animated.spring(slideAnim, {
                toValue: insets.top + 10,
                damping: 20,
                stiffness: 120,
                useNativeDriver: true,
            }).start();

            // Slide out after duration
            const timer = setTimeout(() => {
                Animated.timing(slideAnim, {
                    toValue: -100,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => setConfig(null));
            }, cfg.duration || 3000);

            return () => clearTimeout(timer);
        });

        return () => listener.remove();
    }, [insets.top]);

    if (!config) return null;

    const getTypeDetails = () => {
        switch (config.type) {
            case 'success':
                return { color: '#10B981', icon: 'checkmark-circle' };
            case 'error':
                return { color: '#EF4444', icon: 'alert-circle' };
            case 'warning':
                return { color: '#F59E0B', icon: 'warning' };
            case 'unhealthy':
                return { color: '#F97316', icon: 'fast-food' };
            case 'info':
            default:
                return { color: theme.primary, icon: 'information-circle' };
        }
    };

    const details = getTypeDetails();
    const iconColor = config.color || details.color;
    const iconName = config.icon || details.icon;

    return (
        <Animated.View style={[
            styles.container,
            { transform: [{ translateY: slideAnim }] }
        ]}>
            <BlurView intensity={isDark ? 40 : 80} tint={isDark ? 'dark' : 'light'} style={styles.blurContainer}>
                <View style={[styles.iconBox, { backgroundColor: iconColor + '20' }]}>
                    <Ionicons name={iconName as any} size={20} color={iconColor} />
                </View>
                <View style={styles.textContainer}>
                    <Text style={[styles.message, { color: theme.text }]}>{config.message}</Text>
                </View>
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 0,
        left: 16,
        right: 16,
        zIndex: 9999,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 12,
    },
    blurContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        gap: 12,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    textContainer: {
        flex: 1,
    },
    message: {
        fontSize: 15,
        fontWeight: '600',
    },
});
