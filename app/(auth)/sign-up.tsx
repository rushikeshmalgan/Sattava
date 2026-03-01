import { useOAuth, useSignUp } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from "expo-linking";
import { Link, useRouter } from 'expo-router';
import * as WebBrowser from "expo-web-browser";
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';


WebBrowser.maybeCompleteAuthSession();

export default function SignUp() {
    const { isLoaded, signUp, setActive } = useSignUp();
    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
    const router = useRouter();

    const [name, setName] = useState('');
    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [pendingVerification, setPendingVerification] = useState(false);
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [secureText, setSecureText] = useState(true);

    // Email/Password Sign Up
    const onSignUpPress = async () => {
        if (!isLoaded) return;
        setLoading(true);
        try {
            await signUp.create({
                emailAddress,
                password,
                firstName: name.split(' ')[0] || '',
                lastName: name.split(' ')[1] || '',
            });
            // Send the OTP
            await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
            setPendingVerification(true);
        } catch (err: any) {
            alert(err.errors[0]?.message || 'Sign up failed');
        } finally {
            setLoading(false);
        }
    };

    // Verify Email OTP
    const onPressVerify = async () => {
        if (!isLoaded) return;
        setLoading(true);
        try {
            const completeSignUp = await signUp.attemptEmailAddressVerification({
                code,
            });

            if (completeSignUp.status === 'complete') {
                await setActive({ session: completeSignUp.createdSessionId });

            } else {
                console.error(JSON.stringify(completeSignUp, null, 2));
            }
        } catch (err: any) {
            alert(err.errors[0]?.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    // Google OAuth Sign In/Up
    const onPressGoogle = async () => {
        try {
            const { createdSessionId, signIn, signUp, setActive } = await startOAuthFlow({
                redirectUrl: Linking.createURL('/'),
            });
            if (createdSessionId) {
                await setActive!({ session: createdSessionId });

            }
        } catch (err) {
            console.error('OAuth error', err);
        }
    };

    if (pendingVerification) {
        return (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <View style={styles.headerContainer}>
                    <Ionicons name="mail-open-outline" size={80} color="#10B981" style={styles.iconSpaced} />
                    <Text style={styles.title}>Check your email</Text>
                    <Text style={styles.subtitle}>We sent a verification code to {emailAddress}</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="keypad-outline" size={20} color="#9CA3AF" style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            value={code}
                            placeholder="Verification Code"
                            placeholderTextColor="#9CA3AF"
                            keyboardType="numeric"
                            onChangeText={(code) => setCode(code)}
                        />
                    </View>

                    <TouchableOpacity style={styles.primaryButton} onPress={onPressVerify} disabled={loading}>
                        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Verify Email</Text>}
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.headerContainer}>
                <Image
                    source={require('../../assets/images/icon.png')}
                    style={styles.logo}
                    resizeMode="contain"
                />
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Start tracking your calories today</Text>
            </View>

            <View style={styles.formContainer}>
                {/* Name Input */}
                <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color="#9CA3AF" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        value={name}
                        placeholder="Full Name"
                        placeholderTextColor="#9CA3AF"
                        onChangeText={(n) => setName(n)}
                    />
                </View>

                {/* Email Input */}
                <View style={styles.inputWrapper}>
                    <Ionicons name="mail-outline" size={20} color="#9CA3AF" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        autoCapitalize="none"
                        value={emailAddress}
                        placeholder="Email Address"
                        placeholderTextColor="#9CA3AF"
                        onChangeText={(email) => setEmailAddress(email)}
                    />
                </View>

                {/* Password Input */}
                <View style={styles.inputWrapper}>
                    <Ionicons name="lock-closed-outline" size={20} color="#9CA3AF" style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        value={password}
                        placeholder="Password"
                        placeholderTextColor="#9CA3AF"
                        secureTextEntry={secureText}
                        onChangeText={(password) => setPassword(password)}
                    />
                    <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
                        <Ionicons name={secureText ? "eye-off-outline" : "eye-outline"} size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                {/* Sign Up Button */}
                <TouchableOpacity style={styles.primaryButton} onPress={onSignUpPress} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.primaryButtonText}>Sign Up</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.divider} />
                </View>

                {/* Google OAuth Button */}
                <TouchableOpacity style={styles.googleButton} onPress={onPressGoogle}>
                    <Ionicons name="logo-google" size={20} color="#DB4437" />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <Link href="/(auth)/sign-in" asChild>
                        <TouchableOpacity>
                            <Text style={styles.signInText}>Sign In</Text>
                        </TouchableOpacity>
                    </Link>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    headerContainer: {
        alignItems: 'center',
        paddingTop: 80,
        paddingBottom: 30,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 20,
        borderRadius: 20,
    },
    iconSpaced: {
        marginBottom: 20,
        marginTop: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    formContainer: {
        paddingHorizontal: 24,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        marginBottom: 16,
        paddingHorizontal: 16,
        height: 56,
    },
    icon: {
        marginRight: 10,
    },
    eyeIcon: {
        padding: 10,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
    },
    primaryButton: {
        backgroundColor: '#10B981',
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#10B981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
        marginTop: 8,
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        color: '#9CA3AF',
        paddingHorizontal: 16,
        fontSize: 14,
        fontWeight: '500',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        height: 56,
    },
    googleButtonText: {
        color: '#374151',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 12,
    },
    footerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 32,
    },
    footerText: {
        color: '#6B7280',
        fontSize: 15,
    },
    signInText: {
        color: '#10B981',
        fontSize: 15,
        fontWeight: '600',
    },
});
