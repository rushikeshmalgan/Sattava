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

export default function SignUp() {
    const { user, signUp, signInWithGoogle } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user) {
            router.replace('/');
        }
    }, [user, router]);

    const [name, setName] = useState('');
    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [pendingVerification, setPendingVerification] = useState(false);
    const [loading, setLoading] = useState(false);

    const onSignUpPress = async () => {
        setLoading(true);
        try {
            await signUp(emailAddress, password);
            setPendingVerification(true);
        } catch (err: any) {
            alert(err.message || 'Sign up failed');
        } finally {
            setLoading(false);
        }
    };

    const onPressVerify = async () => {
        setLoading(true);
        try {
            const { sendEmailVerification } = await import('firebase/auth');
            const { auth } = await import('../../firebaseConfig');
            if (auth?.currentUser) {
                await sendEmailVerification(auth.currentUser);
                alert('Verification email sent. Please check your inbox.');
            }
            router.replace('/');
        } catch (err: any) {
            console.error('[AUTH] Verification error:', err);
            alert(err?.message || 'Verification failed');
        } finally {
            setLoading(false);
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

    if (pendingVerification) {
        return (
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
                <View style={styles.headerContainer}>
                    <Ionicons name="mail-open-outline" size={80} color={Colors.PRIMARY} style={styles.iconSpaced} />
                    <Text style={styles.title}>Check your email</Text>
                    <Text style={styles.subtitle}>We sent a verification code to {emailAddress}</Text>
                </View>

                <View style={styles.formContainer}>
                    <View style={styles.inputWrapper}>
                        <Ionicons name="keypad-outline" size={20} color={Colors.TEXT_MUTED} style={styles.icon} />
                        <TextInput
                            style={styles.input}
                            value={name}
                            placeholder="Full Name"
                            placeholderTextColor={Colors.TEXT_MUTED}
                            onChangeText={(n) => setName(n)}
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
                <View style={styles.inputWrapper}>
                    <Ionicons name="person-outline" size={20} color={Colors.TEXT_MUTED} style={styles.icon} />
                    <TextInput
                        style={styles.input}
                        value={name}
                        placeholder="Full Name"
                        placeholderTextColor={Colors.TEXT_MUTED}
                        onChangeText={(n) => setName(n)}
                    />
                </View>

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
                        secureTextEntry={true}
                        onChangeText={(password) => setPassword(password)}
                    />
                </View>

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
        backgroundColor: Colors.BACKGROUND,
    },
    headerContainer: {
        alignItems: 'center',
        paddingTop: 80,
        paddingBottom: 30,
    },
    iconSpaced: {
        marginBottom: 20,
        marginTop: 20,
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
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    formContainer: {
        paddingHorizontal: 24,
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
    input: {
        flex: 1,
        fontSize: 16,
        color: Colors.TEXT_MAIN,
    },
    primaryButton: {
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
    signInText: {
        color: Colors.PRIMARY,
        fontSize: 15,
        fontWeight: '600',
    },
    logo: {
        width: 80,
        height: 80,
        marginBottom: 20,
        borderRadius: 20,
    },
});
