import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import type { ConfirmationResult } from 'firebase/auth';

type AuthMode = 'email' | 'phone';

export default function SignIn() {
    const { user, signIn, signInWithGoogle, signInWithPhone, verifyPhoneCode } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.replace('/');
        }
    }, [user, router]);

    const [authMode, setAuthMode] = useState<AuthMode>('email');
    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);
    const [secureText, setSecureText] = useState(true);

    const onSignInPress = async () => {
        setLoading(true);
        try {
            await signIn(emailAddress, password);
            router.replace('/');
        } catch (err: any) {
            alert(err.message || 'Sign in failed');
        } finally {
            setLoading(false);
        }
    };

    const onForgotPasswordPress = async () => {
        if (!emailAddress.trim()) {
            alert('Please enter your email first to reset password.');
            return;
        }

        setIsSendingReset(true);
        try {
            const { sendPasswordResetEmail } = await import('firebase/auth');
            const { auth: authInstance } = await import('../../firebaseConfig');
            if (!authInstance) throw new Error('Firebase Auth not initialized');
            await sendPasswordResetEmail(authInstance, emailAddress.trim());
            alert('Password reset email sent. Please follow the instructions in your email.');
        } catch (err: any) {
            console.error('[AUTH] Password reset error:', err);
            alert(err?.message || 'Failed to send password reset email');
        } finally {
            setIsSendingReset(false);
        }
    };

    const onPressGoogle = async () => {
        try {
            await signInWithGoogle();
            router.replace('/');
        } catch (err: any) {
            alert(err.message || 'Google sign-in failed. Please try again.');
        }
    };

    const onSendOtp = async () => {
        if (!phoneNumber.trim()) {
            alert('Please enter your phone number.');
            return;
        }
        setLoading(true);
        try {
            const result = await signInWithPhone(phoneNumber);
            setConfirmationResult(result);
            alert('OTP sent to ' + phoneNumber);
        } catch (err: any) {
            alert(err.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const onVerifyOtp = async () => {
        if (!confirmationResult || !verificationCode.trim()) {
            alert('Please enter the verification code.');
            return;
        }
        setLoading(true);
        try {
            await verifyPhoneCode(confirmationResult, verificationCode);
            router.replace('/');
        } catch (err: any) {
            alert(err.message || 'Invalid verification code');
        } finally {
            setLoading(false);
        }
    };

    const renderEmailForm = () => (
        <>
            <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color={Colors.TEXT_MUTED} style={styles.icon} />
                <TextInput
                    style={styles.input}
                    autoCapitalize="none"
                    value={emailAddress}
                    placeholder="Email Address"
                    placeholderTextColor={Colors.TEXT_MUTED}
                    onChangeText={(email) => setEmailAddress(email)}
                />
            </View>

            <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.TEXT_MUTED} style={styles.icon} />
                <TextInput
                    style={styles.input}
                    value={password}
                    placeholder="Password"
                    placeholderTextColor={Colors.TEXT_MUTED}
                    secureTextEntry={secureText}
                    onChangeText={(password) => setPassword(password)}
                />
                <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
                    <Ionicons name={secureText ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.TEXT_MUTED} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotPassword} onPress={onForgotPasswordPress} disabled={isSendingReset}>
                <Text style={styles.forgotPasswordText}>
                    {isSendingReset ? 'Sending reset code...' : 'Forgot Password?'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.signInButton} onPress={onSignInPress} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.signInButtonText}>Sign In</Text>
                )}
            </TouchableOpacity>
        </>
    );

    const renderPhoneForm = () => (
        <>
            {!confirmationResult ? (
                <>
                    <Text style={styles.phoneHelper}>Enter your phone number to receive a verification code.</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="call-outline" size={20} color={Colors.TEXT_MUTED} style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            value={phoneNumber}
                            placeholder="Phone Number"
                            placeholderTextColor={Colors.TEXT_MUTED}
                            keyboardType="phone-pad"
                            onChangeText={(phone) => setPhoneNumber(phone)}
                        />
                    </View>
                    <TouchableOpacity style={styles.signInButton} onPress={onSendOtp} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.signInButtonText}>Send OTP</Text>
                        )}
                    </TouchableOpacity>
                </>
            ) : (
                <>
                    <Text style={styles.phoneHelper}>Enter the 6-digit code sent to {phoneNumber}</Text>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="keypad-outline" size={20} color={Colors.TEXT_MUTED} style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            value={verificationCode}
                            placeholder="Verification Code"
                            placeholderTextColor={Colors.TEXT_MUTED}
                            keyboardType="number-pad"
                            onChangeText={(code) => setVerificationCode(code)}
                        />
                    </View>
                    <TouchableOpacity style={styles.signInButton} onPress={onVerifyOtp} disabled={loading}>
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.signInButtonText}>Verify</Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.backButton} onPress={() => { setConfirmationResult(null); setVerificationCode(''); }}>
                        <Text style={styles.backButtonText}>Change Phone Number</Text>
                    </TouchableOpacity>
                </>
            )}
        </>
    );

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
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to track your calories</Text>
            </View>

            <View style={styles.formContainer}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, authMode === 'email' && styles.activeTab]}
                        onPress={() => setAuthMode('email')}
                    >
                        <Text style={[styles.tabText, authMode === 'email' && styles.activeTabText]}>Email</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, authMode === 'phone' && styles.activeTab]}
                        onPress={() => setAuthMode('phone')}
                    >
                        <Text style={[styles.tabText, authMode === 'phone' && styles.activeTabText]}>Phone</Text>
                    </TouchableOpacity>
                </View>

                {authMode === 'email' ? renderEmailForm() : renderPhoneForm()}

                <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.divider} />
                </View>

                <TouchableOpacity style={styles.googleButton} onPress={onPressGoogle}>
                    <Ionicons name="logo-google" size={20} color="#DB4437" />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <View style={styles.footerContainer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <Link href="/(auth)/sign-up" asChild>
                        <TouchableOpacity>
                            <Text style={styles.signUpText}>Sign Up</Text>
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
        backgroundColor: Colors.BACKGROUND,
    },
    headerContainer: {
        alignItems: 'center',
        paddingTop: 80,
        paddingBottom: 40,
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 20,
        borderRadius: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.TEXT_MAIN,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: Colors.TEXT_MUTED,
    },
    formContainer: {
        paddingHorizontal: 24,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 24,
        backgroundColor: Colors.SURFACE,
        borderRadius: 12,
        padding: 4,
    },
    tab: {
        flex: 1,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: Colors.PRIMARY,
    },
    tabText: {
        fontSize: 15,
        fontWeight: '600',
        color: Colors.TEXT_MUTED,
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.SURFACE,
        borderWidth: 1,
        borderColor: Colors.BORDER,
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
        color: Colors.TEXT_MAIN,
    },
    phoneHelper: {
        fontSize: 14,
        color: Colors.TEXT_MUTED,
        marginBottom: 12,
        textAlign: 'center',
    },
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: 24,
    },
    forgotPasswordText: {
        color: Colors.PRIMARY,
        fontWeight: '500',
    },
    signInButton: {
        backgroundColor: Colors.PRIMARY,
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: Colors.PRIMARY,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    signInButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    backButton: {
        marginTop: 12,
        alignItems: 'center',
    },
    backButtonText: {
        color: Colors.PRIMARY,
        fontSize: 14,
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
        backgroundColor: Colors.BORDER,
    },
    dividerText: {
        color: Colors.TEXT_MUTED,
        paddingHorizontal: 16,
        fontSize: 14,
        fontWeight: '500',
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: Colors.SURFACE_ELEVATED,
        borderWidth: 1,
        borderColor: Colors.BORDER,
        borderRadius: 12,
        height: 56,
    },
    googleButtonText: {
        color: Colors.TEXT_MAIN,
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
        color: Colors.TEXT_MUTED,
        fontSize: 15,
    },
    signUpText: {
        color: Colors.PRIMARY,
        fontSize: 15,
        fontWeight: '600',
    },
});
