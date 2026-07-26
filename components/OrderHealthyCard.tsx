import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface OrderHealthyCardProps {
    suggestion: string;
    type: 'meal' | 'ingredients';
}

export default function OrderHealthyCard({ suggestion, type }: OrderHealthyCardProps) {
    const { theme, isDark } = useTheme();

    const handleLink = async (platform: 'zomato' | 'swiggy' | 'blinkit') => {
        let url = '';
        const encoded = encodeURIComponent(suggestion);
        
        switch (platform) {
            case 'zomato':
                // Zomato deep link scheme
                url = `zomato://search?keyword=${encoded}`;
                break;
            case 'swiggy':
                // Swiggy scheme
                url = `swiggy://explore?query=${encoded}`;
                break;
            case 'blinkit':
                // Blinkit scheme
                url = `blinkit://search?q=${encoded}`;
                break;
        }

        try {
            const supported = await Linking.canOpenURL(url);
            if (supported) {
                await Linking.openURL(url);
            } else {
                // Fallbacks to web
                let webUrl = '';
                if (platform === 'zomato') webUrl = `https://www.zomato.com/search?keyword=${encoded}`;
                if (platform === 'swiggy') webUrl = `https://www.swiggy.com/search?query=${encoded}`;
                if (platform === 'blinkit') webUrl = `https://blinkit.com/s/?q=${encoded}`;
                await Linking.openURL(webUrl);
            }
        } catch (error) {
            Alert.alert("Error", "Could not open the app.");
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#1F2937' : '#F9FAFB', borderColor: theme.border }]}>
            <View style={styles.header}>
                <Ionicons name={type === 'meal' ? 'restaurant' : 'cart'} size={18} color={theme.primary} />
                <Text style={[styles.title, { color: theme.text }]}>
                    {type === 'meal' ? "Order Healthy Now" : "Buy Ingredients"}
                </Text>
            </View>

            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
                {type === 'meal' 
                    ? `Get ${suggestion} delivered right to your door.` 
                    : `Get groceries for ${suggestion} delivered in minutes.`}
            </Text>

            <View style={styles.buttonsRow}>
                {type === 'meal' ? (
                    <>
                        <TouchableOpacity style={[styles.button, { backgroundColor: '#E23744' }]} onPress={() => handleLink('zomato')}>
                            <Text style={styles.buttonText}>Zomato</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.button, { backgroundColor: '#FC8019' }]} onPress={() => handleLink('swiggy')}>
                            <Text style={styles.buttonText}>Swiggy</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <TouchableOpacity style={[styles.button, { backgroundColor: '#F8CB46' }]} onPress={() => handleLink('blinkit')}>
                        <Text style={[styles.buttonText, { color: '#000000' }]}>Blinkit</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 16,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 13,
        marginBottom: 16,
        lineHeight: 18,
    },
    buttonsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
    },
});
