import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { useReaderPreferences } from '../context/ReaderPreferences';
import { palette, radii, spacing } from '../theme';

// ── Algorithm Training Options ──────────────────────────────────────────────────

const CURIOSITY_HOOK_OPTIONS = [
  { id: 'dilemmas', label: 'Moral Dilemmas', icon: 'bulb-outline', desc: 'Tough ethical questions and human nature' },
  { id: 'hot_takes', label: 'Hot Takes & Debates', icon: 'flame-outline', desc: 'Spicy, controversial classic perspectives' },
  { id: 'mysteries', label: 'Detective Logic & Suspense', icon: 'search-outline', desc: 'Cliffhangers, clues, and deduction' },
  { id: 'satire', label: 'Sharp Wit & Satire', icon: 'sparkles-outline', desc: 'Biting irony and psychological comedy' },
  { id: 'philosophy', label: 'Philosophy & Stoicism', icon: 'compass-outline', desc: 'Timeless principles for peace and resilience' },
  { id: 'romance', label: 'Tension & Romance', icon: 'heart-outline', desc: 'Enemies-to-lovers and social intrigue' },
];

const CATEGORY_OPTIONS = [
  'Fiction',
  'Philosophy',
  'Mystery & Detective',
  'Literature',
  'Adventure',
  'History',
  'Science & Technology',
  'Poetry',
];

const READING_STYLE_OPTIONS = [
  { id: 'hooks', label: 'Curiosity feed & quick highlights', icon: 'flash-outline' },
  { id: 'chapters', label: 'Full chapter reading in-app', icon: 'book-outline' },
  { id: 'audio', label: 'Audio narration & listening', icon: 'headset-outline' },
];

export default function SignInScreen() {
  const { signIn, register } = useAuth();
  const { preferences, updatePreferences } = useReaderPreferences();
  const { accountType: accountTypeParam } = useLocalSearchParams<{ accountType?: string }>();

  // Main Mode: 'sign-in' or 'register'
  const [mode, setMode] = useState<'sign-in' | 'register'>(() =>
    accountTypeParam === 'provider' ? 'register' : 'sign-in',
  );

  // Sign-in step: 1 (Email) -> 2 (Password)
  const [loginStep, setLoginStep] = useState<1 | 2>(1);

  // Register steps: 1 (Name) -> 2 (Email) -> 3 (Password) -> 4 (Algorithm Training)
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3 | 4>(1);

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [providerName, setProviderName] = useState('');
  const [accountType, setAccountType] = useState<'reader' | 'provider'>(() =>
    accountTypeParam === 'provider' ? 'provider' : 'reader',
  );

  // Algorithm preference answers
  const [selectedHooks, setSelectedHooks] = useState<string[]>(['dilemmas', 'hot_takes']);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Fiction', 'Philosophy']);
  const [selectedStyle, setSelectedStyle] = useState<string>('chapters');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Refs
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const emailInputRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const passwordInputRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const confirmPasswordInputRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const displayNameInputRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const usernameInputRef = useRef<React.ElementRef<typeof TextInput>>(null);
  const providerNameInputRef = useRef<React.ElementRef<typeof TextInput>>(null);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleInputFocus = (field: string, yOffset = 100) => {
    setFocusedField(field);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: yOffset, animated: true });
    }, 120);
  };

  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(14));

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(14);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 320,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 320,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim, mode, loginStep, registerStep]);

  // ── Validation Helpers ────────────────────────────────────────────────────────

  const isValidEmail = (val: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim());
  };

  // ── Navigation between Steps ──────────────────────────────────────────────────

  const handleBack = () => {
    setError(null);
    if (mode === 'sign-in') {
      if (loginStep === 2) {
        setLoginStep(1);
        scrollToTop();
      } else {
        router.back();
      }
    } else {
      if (registerStep > 1) {
        setRegisterStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
        scrollToTop();
      } else {
        router.back();
      }
    }
  };

  // ── Login Step 1 -> 2 ─────────────────────────────────────────────────────────

  const handleLoginContinueToPassword = () => {
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address to continue.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address (e.g. reader@example.com).');
      return;
    }
    setLoginStep(2);
    scrollToTop();
  };

  // ── Register Step 1 -> 2 (Name -> Email) ──────────────────────────────────────

  const handleRegisterStep1Next = () => {
    setError(null);
    if (!displayName.trim()) {
      setError('Please tell us your name so we can personalize your profile.');
      return;
    }
    if (!username.trim()) {
      // Auto-generate username from display name
      const derived = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 20);
      setUsername(derived || `reader_${Math.floor(Math.random() * 9000 + 1000)}`);
    }
    if (accountType === 'provider' && !providerName.trim()) {
      setError('Please enter your publishing or organization name.');
      return;
    }
    setRegisterStep(2);
    scrollToTop();
  };

  // ── Register Step 2 -> 3 (Email -> Password) ──────────────────────────────────

  const handleRegisterStep2Next = () => {
    setError(null);
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setRegisterStep(3);
    scrollToTop();
  };

  // ── Register Step 3 -> 4 (Password -> Algorithm Questions) ────────────────────

  const handleRegisterStep3Next = () => {
    setError(null);
    if (!password) {
      setError('Please create a password for your account.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter to confirm.');
      return;
    }
    setRegisterStep(4);
    scrollToTop();
  };

  // ── Final Submissions ─────────────────────────────────────────────────────────

  const handleSignInSubmit = async () => {
    setError(null);
    if (!password) {
      setError('Please enter your password.');
      return;
    }
    setIsSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterFinalSubmit = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      if (preferences.ageGroup === 'kids') {
        throw new Error('Child accounts need a verified guardian-consent flow, which is not available yet.');
      }
      if (accountType === 'provider' && preferences.ageGroup !== 'adults') {
        throw new Error('Provider accounts are limited to adults.');
      }

      // Combine user's chosen themes and categories into focusAreas to train the feed
      const combinedFocusAreas = Array.from(new Set([...selectedCategories, ...selectedHooks]));

      await register({
        email: email.trim(),
        username: username.trim(),
        displayName: displayName.trim(),
        password,
        ageGroup: preferences.ageGroup,
        focusAreas: combinedFocusAreas,
        languages: preferences.languages,
        accountType,
        ...(accountType === 'provider' ? { providerName: providerName.trim() } : {}),
      });

      // Update local preferences to match chosen tastes
      await updatePreferences({ focusAreas: combinedFocusAreas });

      router.replace('/(tabs)');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Toggle Helper for Multi-selects ───────────────────────────────────────────

  const toggleHook = (hookId: string) => {
    setSelectedHooks((prev) =>
      prev.includes(hookId) ? prev.filter((id) => id !== hookId) : [...prev, hookId],
    );
  };

  const toggleCategory = (cat: string) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={Keyboard.dismiss}
        >
            {/* Top Navigation Bar: Back Arrow & Step Counter */}
            <View style={styles.navBar}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Go back"
                onPress={handleBack}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={22} color={palette.textLight} />
              </Pressable>

              <View style={styles.stepIndicatorContainer}>
                {mode === 'sign-in' ? (
                  <Text style={styles.stepIndicatorText}>
                    Step {loginStep} of 2
                  </Text>
                ) : (
                  <View style={styles.progressBarWrapper}>
                    <Text style={styles.stepIndicatorText}>
                      Step {registerStep} of 4
                    </Text>
                    <View style={styles.progressBarTrack}>
                      <View
                        style={[
                          styles.progressBarFill,
                          { width: `${(registerStep / 4) * 100}%` },
                        ]}
                      />
                    </View>
                  </View>
                )}
              </View>

              <View style={{ width: 40 }} />
            </View>

            {/* Error Banner */}
            {error ? (
              <View accessibilityRole="alert" style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color="#A9342B" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* App Branding Header */}
            <View style={styles.brandContainer}>
              <Image
                source={require('../../assets/app-logo.png')}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>

            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* ════════════════════════════════════════════════════════════════════
                SIGN-IN FLOW
               ════════════════════════════════════════════════════════════════════ */}
            {mode === 'sign-in' && (
              <>
                {loginStep === 1 && (
                  <View style={styles.stepCard}>
                    <Text style={styles.stepEyebrow}>Welcome back</Text>
                    <Text style={styles.stepTitle}>What’s your email?</Text>
                    <Text style={styles.stepSubtitle}>
                      Sign in to resume reading where you left off, access your personal library, and explore today’s fresh feed.
                    </Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>Email address</Text>
                      <View style={[styles.inputWrapper, focusedField === 'loginEmail' && styles.inputWrapperFocused]}>
                        <Ionicons name="mail-outline" size={20} color={palette.muted} style={styles.inputIcon} />
                        <TextInput
                          ref={emailInputRef}
                          accessibilityLabel="Email address"
                          autoCapitalize="none"
                          autoComplete="email"
                          keyboardType="email-address"
                          returnKeyType="next"
                          onSubmitEditing={handleLoginContinueToPassword}
                          onFocus={() => handleInputFocus('loginEmail', 40)}
                          onBlur={() => setFocusedField(null)}
                          onChangeText={setEmail}
                          placeholder="reader@example.com"
                          placeholderTextColor={palette.muted}
                          style={styles.textInput}
                          value={email}
                          autoFocus
                        />
                      </View>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      onPress={handleLoginContinueToPassword}
                      style={styles.primaryBtn}
                    >
                      <Text style={styles.primaryBtnText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setError(null);
                        setMode('register');
                        setRegisterStep(1);
                        scrollToTop();
                      }}
                      style={styles.switchModeBtn}
                    >
                      <Text style={styles.switchModeText}>
                        New to Libra Hub? <Text style={styles.switchModeHighlight}>Create an account</Text>
                      </Text>
                    </Pressable>
                  </View>
                )}

                {loginStep === 2 && (
                  <View style={styles.stepCard}>
                    <Text style={styles.stepEyebrow}>Security check</Text>
                    <Text style={styles.stepTitle}>Enter your password</Text>

                    {/* Email badge chip */}
                    <View style={styles.emailPill}>
                      <Ionicons name="person-circle-outline" size={18} color={palette.primaryDark} />
                      <Text style={styles.emailPillText} numberOfLines={1}>{email}</Text>
                      <Pressable onPress={() => { setLoginStep(1); scrollToTop(); }}>
                        <Text style={styles.emailPillAction}>Edit</Text>
                      </Pressable>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>Password</Text>
                      <View style={[styles.inputWrapper, focusedField === 'loginPassword' && styles.inputWrapperFocused]}>
                        <Ionicons name="lock-closed-outline" size={20} color={palette.muted} style={styles.inputIcon} />
                        <TextInput
                          ref={passwordInputRef}
                          accessibilityLabel="Password"
                          autoComplete="current-password"
                          returnKeyType="go"
                          onSubmitEditing={() => void handleSignInSubmit()}
                          onFocus={() => handleInputFocus('loginPassword', 60)}
                          onBlur={() => setFocusedField(null)}
                          onChangeText={setPassword}
                          placeholder="Enter your password"
                          placeholderTextColor={palette.muted}
                          secureTextEntry={!showPassword}
                          style={styles.textInput}
                          value={password}
                          autoFocus
                        />
                        <Pressable
                          onPress={() => setShowPassword((prev) => !prev)}
                          style={styles.eyeIconBtn}
                          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={palette.muted}
                          />
                        </Pressable>
                      </View>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      disabled={isSubmitting}
                      onPress={() => void handleSignInSubmit()}
                      style={[styles.primaryBtn, isSubmitting && styles.btnDisabled]}
                    >
                      <Text style={styles.primaryBtnText}>
                        {isSubmitting ? 'Signing in…' : 'Sign in to Libra Hub'}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </>
            )}

            {/* ════════════════════════════════════════════════════════════════════
                CREATE ACCOUNT FLOW (MULTI-STEP ONBOARDING)
               ════════════════════════════════════════════════════════════════════ */}
            {mode === 'register' && (
              <>
                {/* Step 1: Name & Username */}
                {registerStep === 1 && (
                  <View style={styles.stepCard}>
                    <Text style={styles.stepEyebrow}>Welcome to Libra Hub</Text>
                    <Text style={styles.stepTitle}>What should we call you?</Text>
                    <Text style={styles.stepSubtitle}>
                      Let’s set up your literary persona and profile.
                    </Text>

                    {/* Account Type Toggle */}
                    <Text style={styles.fieldLabel}>I am joining as a</Text>
                    <View style={styles.segmentRow}>
                      <Pressable
                        onPress={() => setAccountType('reader')}
                        style={[styles.segmentBtn, accountType === 'reader' && styles.segmentBtnActive]}
                      >
                        <Ionicons
                          name="book-outline"
                          size={18}
                          color={accountType === 'reader' ? '#fff' : palette.textLight}
                        />
                        <Text style={[styles.segmentBtnText, accountType === 'reader' && styles.segmentBtnTextActive]}>
                          Reader
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setAccountType('provider')}
                        style={[styles.segmentBtn, accountType === 'provider' && styles.segmentBtnActive]}
                      >
                        <Ionicons
                          name="business-outline"
                          size={18}
                          color={accountType === 'provider' ? '#fff' : palette.textLight}
                        />
                        <Text style={[styles.segmentBtnText, accountType === 'provider' && styles.segmentBtnTextActive]}>
                          Publisher
                        </Text>
                      </Pressable>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>Your Display Name</Text>
                      <View style={[styles.inputWrapper, focusedField === 'displayName' && styles.inputWrapperFocused]}>
                        <Ionicons name="person-outline" size={20} color={palette.muted} style={styles.inputIcon} />
                        <TextInput
                          ref={displayNameInputRef}
                          accessibilityLabel="Display name"
                          autoCapitalize="words"
                          returnKeyType="next"
                          onSubmitEditing={() => usernameInputRef.current?.focus()}
                          onFocus={() => handleInputFocus('displayName', 40)}
                          onBlur={() => setFocusedField(null)}
                          onChangeText={(val) => {
                            setDisplayName(val);
                            if (!username) {
                              const derived = val
                                .toLowerCase()
                                .replace(/[^a-z0-9]/g, '_')
                                .replace(/_+/g, '_')
                                .replace(/^_|_$/g, '')
                                .slice(0, 20);
                              setUsername(derived);
                            }
                          }}
                          placeholder="e.g. Jane Austen"
                          placeholderTextColor={palette.muted}
                          style={styles.textInput}
                          value={displayName}
                          autoFocus
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>Username</Text>
                      <View style={[styles.inputWrapper, focusedField === 'username' && styles.inputWrapperFocused]}>
                        <Text style={styles.atPrefix}>@</Text>
                        <TextInput
                          ref={usernameInputRef}
                          accessibilityLabel="Username"
                          autoCapitalize="none"
                          returnKeyType={accountType === 'provider' ? 'next' : 'done'}
                          onSubmitEditing={() => {
                            if (accountType === 'provider') {
                              providerNameInputRef.current?.focus();
                            } else {
                              handleRegisterStep1Next();
                            }
                          }}
                          onFocus={() => handleInputFocus('username', 100)}
                          onBlur={() => setFocusedField(null)}
                          onChangeText={setUsername}
                          placeholder="janeausten"
                          placeholderTextColor={palette.muted}
                          style={styles.textInput}
                          value={username}
                        />
                      </View>
                    </View>

                    {accountType === 'provider' && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Publisher or Organization</Text>
                        <View style={[styles.inputWrapper, focusedField === 'providerName' && styles.inputWrapperFocused]}>
                          <Ionicons name="business-outline" size={20} color={palette.muted} style={styles.inputIcon} />
                          <TextInput
                            ref={providerNameInputRef}
                            accessibilityLabel="Publisher name"
                            autoCapitalize="words"
                            returnKeyType="done"
                            onSubmitEditing={handleRegisterStep1Next}
                            onFocus={() => handleInputFocus('providerName', 140)}
                            onBlur={() => setFocusedField(null)}
                            onChangeText={setProviderName}
                            placeholder="Publishing house / archive name"
                            placeholderTextColor={palette.muted}
                            style={styles.textInput}
                            value={providerName}
                          />
                        </View>
                      </View>
                    )}

                    <Pressable
                      accessibilityRole="button"
                      onPress={handleRegisterStep1Next}
                      style={styles.primaryBtn}
                    >
                      <Text style={styles.primaryBtnText}>Continue to Email</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
                    </Pressable>

                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        setError(null);
                        setMode('sign-in');
                        setLoginStep(1);
                        scrollToTop();
                      }}
                      style={styles.switchModeBtn}
                    >
                      <Text style={styles.switchModeText}>
                        Already registered? <Text style={styles.switchModeHighlight}>Sign in</Text>
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* Step 2: Email */}
                {registerStep === 2 && (
                  <View style={styles.stepCard}>
                    <Text style={styles.stepEyebrow}>Step 2</Text>
                    <Text style={styles.stepTitle}>What’s your email?</Text>
                    <Text style={styles.stepSubtitle}>
                      We’ll use this to keep your annotations, reading progress, and chapters synced across your devices.
                    </Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>Email address</Text>
                      <View style={[styles.inputWrapper, focusedField === 'registerEmail' && styles.inputWrapperFocused]}>
                        <Ionicons name="mail-outline" size={20} color={palette.muted} style={styles.inputIcon} />
                        <TextInput
                          ref={emailInputRef}
                          accessibilityLabel="Email address"
                          autoCapitalize="none"
                          autoComplete="email"
                          keyboardType="email-address"
                          returnKeyType="next"
                          onSubmitEditing={handleRegisterStep2Next}
                          onFocus={() => handleInputFocus('registerEmail', 40)}
                          onBlur={() => setFocusedField(null)}
                          onChangeText={setEmail}
                          placeholder="reader@example.com"
                          placeholderTextColor={palette.muted}
                          style={styles.textInput}
                          value={email}
                          autoFocus
                        />
                      </View>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      onPress={handleRegisterStep2Next}
                      style={styles.primaryBtn}
                    >
                      <Text style={styles.primaryBtnText}>Continue to Password</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
                    </Pressable>
                  </View>
                )}

                {/* Step 3: Create & Confirm Password */}
                {registerStep === 3 && (
                  <View style={styles.stepCard}>
                    <Text style={styles.stepEyebrow}>Step 3</Text>
                    <Text style={styles.stepTitle}>Create a secure password</Text>
                    <Text style={styles.stepSubtitle}>
                      Ensure your account and reading bookmarks remain safe. Must be at least 8 characters.
                    </Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>Password</Text>
                      <View style={[styles.inputWrapper, focusedField === 'regPassword' && styles.inputWrapperFocused]}>
                        <Ionicons name="lock-closed-outline" size={20} color={palette.muted} style={styles.inputIcon} />
                        <TextInput
                          ref={passwordInputRef}
                          accessibilityLabel="Password"
                          autoComplete="new-password"
                          returnKeyType="next"
                          onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                          onFocus={() => handleInputFocus('regPassword', 40)}
                          onBlur={() => setFocusedField(null)}
                          onChangeText={setPassword}
                          placeholder="At least 8 characters"
                          placeholderTextColor={palette.muted}
                          secureTextEntry={!showPassword}
                          style={styles.textInput}
                          value={password}
                          autoFocus
                        />
                        <Pressable
                          onPress={() => setShowPassword((prev) => !prev)}
                          style={styles.eyeIconBtn}
                        >
                          <Ionicons
                            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={palette.muted}
                          />
                        </Pressable>
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldLabel}>Confirm Password</Text>
                      <View style={[styles.inputWrapper, focusedField === 'confirmPassword' && styles.inputWrapperFocused]}>
                        <Ionicons name="shield-checkmark-outline" size={20} color={palette.muted} style={styles.inputIcon} />
                        <TextInput
                          ref={confirmPasswordInputRef}
                          accessibilityLabel="Confirm Password"
                          autoComplete="new-password"
                          returnKeyType="done"
                          onSubmitEditing={handleRegisterStep3Next}
                          onFocus={() => handleInputFocus('confirmPassword', 100)}
                          onBlur={() => setFocusedField(null)}
                          onChangeText={setConfirmPassword}
                          placeholder="Re-enter your password"
                          placeholderTextColor={palette.muted}
                          secureTextEntry={!showConfirmPassword}
                          style={styles.textInput}
                          value={confirmPassword}
                        />
                        <Pressable
                          onPress={() => setShowConfirmPassword((prev) => !prev)}
                          style={styles.eyeIconBtn}
                        >
                          <Ionicons
                            name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                            size={20}
                            color={palette.muted}
                          />
                        </Pressable>
                      </View>
                    </View>

                    {/* Password Match Status Indicators */}
                    <View style={styles.validationRow}>
                      <View style={styles.validationItem}>
                        <Ionicons
                          name={password.length >= 8 ? 'checkmark-circle' : 'ellipse-outline'}
                          size={15}
                          color={password.length >= 8 ? palette.primary : palette.muted}
                        />
                        <Text style={[styles.validationText, password.length >= 8 && styles.validationTextPass]}>
                          At least 8 characters
                        </Text>
                      </View>
                      <View style={styles.validationItem}>
                        <Ionicons
                          name={confirmPassword && password === confirmPassword ? 'checkmark-circle' : 'ellipse-outline'}
                          size={15}
                          color={confirmPassword && password === confirmPassword ? palette.primary : palette.muted}
                        />
                        <Text style={[styles.validationText, confirmPassword && password === confirmPassword && styles.validationTextPass]}>
                          Passwords match
                        </Text>
                      </View>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      onPress={handleRegisterStep3Next}
                      style={styles.primaryBtn}
                    >
                      <Text style={styles.primaryBtnText}>Personalize Algorithm</Text>
                      <Ionicons name="sparkles" size={18} color="#fff" style={{ marginLeft: 6 }} />
                    </Pressable>
                  </View>
                )}

                {/* Step 4: Algorithm Training Questions */}
                {registerStep === 4 && (
                  <View style={styles.stepCard}>
                    <Text style={styles.stepEyebrow}>Train Your Feed</Text>
                    <Text style={styles.stepTitle}>What hooks your curiosity?</Text>
                    <Text style={styles.stepSubtitle}>
                      Answer these questions so the algorithm serves the right curiosity hooks, questions, and books tailored to your taste.
                    </Text>

                    {/* Question 1: What hooks pull you in? */}
                    <Text style={styles.questionHeading}>
                      1. Which story hooks make you stop and read?
                    </Text>
                    <Text style={styles.questionSubheading}>
                      Select all that catch your interest:
                    </Text>

                    <View style={styles.cardsGrid}>
                      {CURIOSITY_HOOK_OPTIONS.map((item) => {
                        const isSelected = selectedHooks.includes(item.id);
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => toggleHook(item.id)}
                            style={[styles.hookCard, isSelected && styles.hookCardSelected]}
                          >
                            <View style={styles.hookCardHeader}>
                              <Ionicons
                                name={item.icon as any}
                                size={20}
                                color={isSelected ? palette.primary : palette.muted}
                              />
                              <Ionicons
                                name={isSelected ? 'checkbox' : 'square-outline'}
                                size={18}
                                color={isSelected ? palette.primary : palette.muted}
                              />
                            </View>
                            <Text style={[styles.hookCardTitle, isSelected && styles.hookCardTitleSelected]}>
                              {item.label}
                            </Text>
                            <Text style={styles.hookCardDesc}>{item.desc}</Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Question 2: Favorite topics & genres */}
                    <Text style={[styles.questionHeading, { marginTop: spacing.xl }]}>
                      2. What topics or genres do you love exploring?
                    </Text>
                    <View style={styles.chipsWrap}>
                      {CATEGORY_OPTIONS.map((cat) => {
                        const isSelected = selectedCategories.includes(cat);
                        return (
                          <Pressable
                            key={cat}
                            onPress={() => toggleCategory(cat)}
                            style={[styles.chip, isSelected && styles.chipSelected]}
                          >
                            <Ionicons
                              name={isSelected ? 'checkmark' : 'add'}
                              size={15}
                              color={isSelected ? '#fff' : palette.textLight}
                              style={{ marginRight: 4 }}
                            />
                            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                              {cat}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Question 3: Preferred reading mode */}
                    <Text style={[styles.questionHeading, { marginTop: spacing.xl }]}>
                      3. How do you prefer to experience stories?
                    </Text>
                    <View style={styles.readingStyleContainer}>
                      {READING_STYLE_OPTIONS.map((opt) => {
                        const isSelected = selectedStyle === opt.id;
                        return (
                          <Pressable
                            key={opt.id}
                            onPress={() => setSelectedStyle(opt.id)}
                            style={[styles.styleRow, isSelected && styles.styleRowSelected]}
                          >
                            <Ionicons
                              name={opt.icon as any}
                              size={20}
                              color={isSelected ? palette.primary : palette.muted}
                            />
                            <Text style={[styles.styleRowText, isSelected && styles.styleRowTextSelected]}>
                              {opt.label}
                            </Text>
                            <Ionicons
                              name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                              size={20}
                              color={isSelected ? palette.primary : palette.muted}
                            />
                          </Pressable>
                        );
                      })}
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      disabled={isSubmitting}
                      onPress={() => void handleRegisterFinalSubmit()}
                      style={[styles.primaryBtn, isSubmitting && styles.btnDisabled, { marginTop: spacing.xl }]}
                    >
                      <Text style={styles.primaryBtnText}>
                        {isSubmitting ? 'Personalizing your feed…' : 'Enter Libra Hub'}
                      </Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
                    </Pressable>
                  </View>
                )}
              </>
            )}
            </Animated.View>

            <Text style={styles.footerNote}>
              Protected by private authentication & rotation tokens. No passwords stored in plain text.
            </Text>
          </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 580,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    // Generous bottom padding so focused inputs and continue buttons
    // remain completely visible above the virtual keyboard!
    paddingBottom: 280,
  },
  brandContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    marginTop: spacing.xs,
  },
  brandLogo: {
    width: 172,
    height: 60,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicatorText: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  progressBarWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  progressBarTrack: {
    width: 100,
    height: 4,
    borderRadius: 2,
    backgroundColor: palette.border,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: palette.primary,
    borderRadius: 2,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#F8B4B4',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  errorText: {
    color: '#A9342B',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  stepCard: {
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  stepEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.primary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: palette.textLight,
    letterSpacing: -0.5,
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    fontSize: 14,
    color: palette.muted,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: palette.textLight,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceLight,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: palette.border,
    paddingHorizontal: spacing.md,
    minHeight: 52,
  },
  inputWrapperFocused: {
    borderColor: palette.primary,
    backgroundColor: '#fff',
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  atPrefix: {
    fontSize: 16,
    fontWeight: '700',
    color: palette.muted,
    marginRight: spacing.xs,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: palette.textLight,
    paddingVertical: 12,
  },
  eyeIconBtn: {
    padding: spacing.xs,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.primary,
    borderRadius: radii.md,
    minHeight: 52,
    marginTop: spacing.sm,
    shadowColor: palette.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  btnDisabled: {
    opacity: 0.65,
  },
  switchModeBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 14,
    color: palette.muted,
  },
  switchModeHighlight: {
    color: palette.primary,
    fontWeight: '800',
  },
  emailPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5EE',
    borderRadius: 30,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  emailPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.primaryDark,
    maxWidth: 240,
  },
  emailPillAction: {
    fontSize: 12,
    fontWeight: '800',
    color: palette.primary,
    marginLeft: spacing.xs,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: palette.surfaceLight,
    borderRadius: radii.md,
    padding: 4,
    marginBottom: spacing.lg,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: radii.sm,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: palette.primary,
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.muted,
  },
  segmentBtnTextActive: {
    color: '#fff',
  },
  validationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  validationText: {
    fontSize: 12,
    color: palette.muted,
  },
  validationTextPass: {
    color: palette.primaryDark,
    fontWeight: '600',
  },
  questionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: palette.textLight,
    marginBottom: 4,
  },
  questionSubheading: {
    fontSize: 12,
    color: palette.muted,
    marginBottom: spacing.sm,
  },
  cardsGrid: {
    gap: spacing.sm,
  },
  hookCard: {
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: palette.border,
    padding: spacing.md,
    backgroundColor: palette.surfaceLight,
  },
  hookCardSelected: {
    borderColor: palette.primary,
    backgroundColor: '#F0FBF5',
  },
  hookCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  hookCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.textLight,
    marginBottom: 2,
  },
  hookCardTitleSelected: {
    color: palette.primaryDark,
  },
  hookCardDesc: {
    fontSize: 12,
    color: palette.muted,
    lineHeight: 16,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceLight,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: 24,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.textLight,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  readingStyleContainer: {
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  styleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.surfaceLight,
    borderWidth: 1.5,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.sm,
  },
  styleRowSelected: {
    borderColor: palette.primary,
    backgroundColor: '#F0FBF5',
  },
  styleRowText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: palette.textLight,
  },
  styleRowTextSelected: {
    color: palette.primaryDark,
    fontWeight: '700',
  },
  footerNote: {
    textAlign: 'center',
    fontSize: 11,
    color: palette.muted,
    lineHeight: 16,
    marginTop: spacing.lg,
  },
});
