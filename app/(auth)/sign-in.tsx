import { useOAuth, useSignIn } from '@clerk/clerk-expo';
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
import { Colors } from '../../constants/Colors';


WebBrowser.maybeCompleteAuthSession();

export default function SignIn() {
    const { signIn, setActive, isLoaded } = useSignIn();
    const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
    const router = useRouter();

    const [emailAddress, setEmailAddress] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSendingReset, setIsSendingReset] = useState(false);
    const [secureText, setSecureText] = useState(true);

    // Email/Password Sign in
    const onSignInPress = async () => {
        if (!isLoaded) return;
        setLoading(true);
        try {
            const completeSignIn = await signIn.create({
                identifier: emailAddress,
                password,
            });
            // This indicates the user is signed in
            await setActive({ session: completeSignIn.createdSessionId });

        } catch (err: any) {
            alert(err?.errors?.[0]?.message || err?.message || 'Sign in failed');
        } finally {
            setLoading(false);
        }
    };

    const onForgotPasswordPress = async () => {
        if (!isLoaded) return;

        if (!emailAddress.trim()) {
            alert('Please enter your email first to reset password.');
            return;
        }

        setIsSendingReset(true);
        try {
            await signIn.create({
                strategy: 'reset_password_email_code',
                identifier: emailAddress.trim(),
            } as any);

            alert('Password reset code sent to your email. Please follow the reset flow in Clerk.');
        } catch (err: any) {
            alert(err?.errors?.[0]?.message || err?.message || 'Failed to send password reset code');
        } finally {
            setIsSendingReset(false);
        }
    };

    // Google OAuth Sign In
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

                <TouchableOpacity style={styles.forgotPassword} onPress={onForgotPasswordPress} disabled={isSendingReset}>
                    <Text style={styles.forgotPasswordText}>
                        {isSendingReset ? 'Sending reset code...' : 'Forgot Password?'}
                    </Text>
                </TouchableOpacity>

                {/* Sign In Button */}
                <TouchableOpacity style={styles.signInButton} onPress={onSignInPress} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.signInButtonText}>Sign In</Text>
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
        backgroundColor: '#FFFFFF',
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
        color: '#111827',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#6B7280',
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
    signUpText: {
        color: Colors.PRIMARY,
        fontSize: 15,
        fontWeight: '600',
    },
});
