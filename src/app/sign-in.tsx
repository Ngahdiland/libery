import { Link, router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { useReaderPreferences } from '../context/ReaderPreferences';
import { palette, radii, spacing } from '../theme';

export default function SignInScreen() {
  const { signIn, register } = useAuth();
  const { preferences } = useReaderPreferences();
  const { accountType: accountTypeParam } = useLocalSearchParams<{ accountType?: string }>();
  const [mode, setMode] = useState<'sign-in' | 'register'>(() => accountTypeParam === 'provider' ? 'register' : 'sign-in');
  const [accountType, setAccountType] = useState<'reader' | 'provider'>(() => accountTypeParam === 'provider' ? 'provider' : 'reader');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [providerName, setProviderName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const displayNameRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const usernameRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const providerNameRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const emailRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const passwordRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const submit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      if (mode === 'sign-in') {
        await signIn(email.trim(), password);
      } else {
        if (preferences.ageGroup === 'kids') {
          throw new Error('Child accounts need a verified guardian-consent flow, which is not available yet.');
        }
        if (accountType === 'provider' && preferences.ageGroup !== 'adults') {
          throw new Error('Provider accounts are limited to adults. Update your age group in Profile before registering.');
        }
        await register({
          email: email.trim(),
          username: username.trim(),
          displayName: displayName.trim(),
          password,
          ageGroup: preferences.ageGroup,
          focusAreas: preferences.focusAreas,
          languages: preferences.languages,
          accountType,
          ...(accountType === 'provider' ? { providerName: providerName.trim() } : {}),
        });
      }
      router.replace('/(tabs)/profile');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not connect your account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 16 : 0}
        style={styles.keyboardAvoid}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Link href="/(tabs)/profile" style={styles.backLink}>Back to profile</Link>
            <Text style={styles.eyebrow}>Your library, everywhere</Text>
            <Text style={styles.title}>
              {mode === 'sign-in' ? 'Sign in to Libery' : accountType === 'provider' ? 'Create your provider account' : 'Create your reader account'}
            </Text>
            <Text style={styles.description}>
              Your account connects this app to your private Libery API and MongoDB Atlas catalog.
            </Text>

            <View style={styles.form}>
              {mode === 'register' && (
                <>
                  <Text style={styles.fieldLabel}>Account type</Text>
                  <View style={styles.accountTypeRow}>
                    {(['reader', 'provider'] as const).map((value) => (
                      <Pressable
                        key={value}
                        accessibilityRole="button"
                        accessibilityState={{ selected: accountType === value }}
                        onPress={() => setAccountType(value)}
                        style={[styles.accountTypeButton, accountType === value && styles.accountTypeButtonSelected]}
                      >
                        <Text style={[styles.accountTypeText, accountType === value && styles.accountTypeTextSelected]}>
                          {value === 'reader' ? 'Reader' : 'Provider'}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <TextInput
                    ref={displayNameRef}
                    accessibilityLabel="Display name"
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => usernameRef.current?.focus()}
                    onFocus={() => setFocusedField('displayName')}
                    onBlur={() => setFocusedField((curr) => curr === 'displayName' ? null : curr)}
                    onChangeText={setDisplayName}
                    placeholder="Display name"
                    placeholderTextColor={palette.muted}
                    style={[styles.input, focusedField === 'displayName' && styles.inputFocused]}
                    value={displayName}
                  />
                  <TextInput
                    ref={usernameRef}
                    accessibilityLabel="Username"
                    autoCapitalize="none"
                    returnKeyType="next"
                    onSubmitEditing={() => {
                      if (accountType === 'provider') {
                        providerNameRef.current?.focus();
                      } else {
                        emailRef.current?.focus();
                      }
                    }}
                    onFocus={() => setFocusedField('username')}
                    onBlur={() => setFocusedField((curr) => curr === 'username' ? null : curr)}
                    onChangeText={setUsername}
                    placeholder="Username"
                    placeholderTextColor={palette.muted}
                    style={[styles.input, focusedField === 'username' && styles.inputFocused]}
                    value={username}
                  />
                  {accountType === 'provider' && (
                    <TextInput
                      ref={providerNameRef}
                      accessibilityLabel="Provider organization"
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => emailRef.current?.focus()}
                      onFocus={() => setFocusedField('providerName')}
                      onBlur={() => setFocusedField((curr) => curr === 'providerName' ? null : curr)}
                      onChangeText={setProviderName}
                      placeholder="Publisher or organization name"
                      placeholderTextColor={palette.muted}
                      style={[styles.input, focusedField === 'providerName' && styles.inputFocused]}
                      value={providerName}
                    />
                  )}
                </>
              )}
              <TextInput
                ref={emailRef}
                accessibilityLabel="Email"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField((curr) => curr === 'email' ? null : curr)}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={palette.muted}
                style={[styles.input, focusedField === 'email' && styles.inputFocused]}
                value={email}
              />
              <TextInput
                ref={passwordRef}
                accessibilityLabel="Password"
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                returnKeyType={mode === 'sign-in' ? 'go' : 'done'}
                onSubmitEditing={() => void submit()}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField((curr) => curr === 'password' ? null : curr)}
                onChangeText={setPassword}
                placeholder={mode === 'sign-in' ? 'Password' : 'Password (12+ characters)'}
                placeholderTextColor={palette.muted}
                secureTextEntry
                style={[styles.input, focusedField === 'password' && styles.inputFocused]}
                value={password}
              />
              {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
              <Pressable
                accessibilityRole="button"
                disabled={isSubmitting}
                onPress={() => void submit()}
                style={[styles.submitButton, isSubmitting && styles.disabled]}
              >
                <Text style={styles.submitText}>
                  {isSubmitting ? 'Connecting…' : mode === 'sign-in' ? 'Sign in' : 'Create account'}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  setError(null);
                  setMode((current) => current === 'sign-in' ? 'register' : 'sign-in');
                }}
                style={styles.modeButton}
              >
                <Text style={styles.modeText}>
                  {mode === 'sign-in' ? 'New to Libery? Create an account' : 'Already registered? Sign in'}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.note}>
              Keep database credentials on the API server. This app stores only its rotated session token securely on mobile.
            </Text>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.surfaceLight,
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },
  backLink: {
    color: palette.primary,
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  eyebrow: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: palette.textLight,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
    lineHeight: 34,
  },
  description: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
    marginBottom: spacing.xl,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldLabel: {
    color: palette.textLight,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  accountTypeRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  accountTypeButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: '#EFF5F1',
    marginRight: spacing.xs,
  },
  accountTypeButtonSelected: {
    backgroundColor: palette.primary,
  },
  accountTypeText: {
    color: palette.textLight,
    fontWeight: '700',
  },
  accountTypeTextSelected: {
    color: '#fff',
  },
  input: {
    minHeight: 52,
    backgroundColor: '#F3F7F4',
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: '#E2EBE4',
    color: palette.textLight,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    fontSize: 15,
  },
  inputFocused: {
    borderColor: palette.primary,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  error: {
    color: '#A9342B',
    fontSize: 13,
    lineHeight: 19,
    marginVertical: spacing.sm,
  },
  submitButton: {
    minHeight: 52,
    borderRadius: radii.md,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  disabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },
  modeButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeText: {
    color: palette.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  note: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
