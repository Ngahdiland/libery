import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { palette, radii, spacing } from '../../theme';

type BookDraftResponse = { book: { id: string } };
type AgeRating = 'Kids' | 'Teen' | 'Adult';

export default function CreateProviderBookScreen() {
  const { accessToken, isReady, request, user } = useAuth();
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Fiction');
  const [language, setLanguage] = useState<'English' | 'French'>('English');
  const [ageRating, setAgeRating] = useState<AgeRating>('Adult');
  const [pages, setPages] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createDraft = async () => {
    setError(null);
    setNotice(null);
    setIsSubmitting(true);
    try {
      const result = await request<BookDraftResponse>('/provider/books', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          authors: [author.trim()],
          description: description.trim(),
          categories: [category.trim()],
          tags: [],
          language,
          ageRating,
          pages: Number(pages),
          ...(coverImageUrl.trim() ? { coverImageUrl: coverImageUrl.trim() } : {}),
          rightsConfirmed,
        }),
      });
      setDraftId(result.book.id);
      setNotice('Draft saved. Submit it for review when the details are ready.');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save this listing.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitForReview = async () => {
    if (!draftId) return;
    setError(null);
    setIsSubmitting(true);
    try {
      await request(`/provider/books/${encodeURIComponent(draftId)}/submit`, { method: 'POST' });
      setNotice('Your book listing was submitted for review.');
      setDraftId(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not submit this listing for review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isReady) {
    return <GateState message="Loading your account…" />;
  }
  if (!accessToken || !user) {
    return (
      <GateState
        message="Sign in with a provider account to create a book listing."
        action={<Link href="/sign-in" style={styles.actionLink}>Sign in</Link>}
      />
    );
  }
  if (user.role !== 'provider') {
    return (
      <GateState
        message="Book listings are available to provider accounts. Create a provider account to get started."
        action={<Link href="/sign-in?accountType=provider" style={styles.actionLink}>Create provider account</Link>}
      />
    );
  }
  if (user.providerStatus !== 'verified') {
    return (
      <GateState
        message={user.providerStatus === 'rejected'
          ? 'Your provider application was not approved. Contact Libery support for next steps.'
          : 'Your provider account is waiting for verification. You can create listings after approval.'}
      />
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Link href="/(tabs)" style={styles.backLink}>Back to Libery</Link>
        <Text style={styles.title}>Create a book listing</Text>
        <Text style={styles.description}>Add book details and confirm you have the rights to list this book and cover.</Text>

        <View style={styles.form}>
          <TextInput accessibilityLabel="Book title" onChangeText={setTitle} placeholder="Book title" style={styles.input} value={title} />
          <TextInput accessibilityLabel="Author" onChangeText={setAuthor} placeholder="Author name" style={styles.input} value={author} />
          <TextInput
            accessibilityLabel="Description"
            multiline
            onChangeText={setDescription}
            placeholder="Description"
            style={[styles.input, styles.descriptionInput]}
            value={description}
          />
          <TextInput accessibilityLabel="Category" onChangeText={setCategory} placeholder="Category" style={styles.input} value={category} />
          <TextInput
            accessibilityLabel="Page count"
            keyboardType="number-pad"
            onChangeText={setPages}
            placeholder="Page count"
            style={styles.input}
            value={pages}
          />
          <TextInput
            accessibilityLabel="Cover image URL"
            autoCapitalize="none"
            keyboardType="url"
            onChangeText={setCoverImageUrl}
            placeholder="Cover image HTTPS URL (optional)"
            style={styles.input}
            value={coverImageUrl}
          />

          <Text style={styles.fieldLabel}>Language</Text>
          <View style={styles.choiceRow}>
            {(['English', 'French'] as const).map((value) => (
              <Choice key={value} label={value} selected={language === value} onPress={() => setLanguage(value)} />
            ))}
          </View>
          <Text style={styles.fieldLabel}>Age rating</Text>
          <View style={styles.choiceRow}>
            {(['Kids', 'Teen', 'Adult'] as const).map((value) => (
              <Choice key={value} label={value} selected={ageRating === value} onPress={() => setAgeRating(value)} />
            ))}
          </View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: rightsConfirmed }}
            onPress={() => setRightsConfirmed((current) => !current)}
            style={styles.rightsRow}
          >
            <View style={[styles.checkbox, rightsConfirmed && styles.checkboxChecked]}>
              {rightsConfirmed && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.rightsText}>I own or have permission to publish this book and its cover.</Text>
          </Pressable>

          {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          {notice && <Text accessibilityRole="status" style={styles.notice}>{notice}</Text>}
          {draftId ? (
            <Pressable accessibilityRole="button" disabled={isSubmitting} onPress={() => void submitForReview()} style={styles.submitButton}>
              <Text style={styles.submitText}>{isSubmitting ? 'Submitting…' : 'Submit draft for review'}</Text>
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting || !rightsConfirmed}
              onPress={() => void createDraft()}
              style={[styles.submitButton, (!rightsConfirmed || isSubmitting) && styles.disabled]}
            >
              <Text style={styles.submitText}>{isSubmitting ? 'Saving…' : 'Save book listing'}</Text>
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GateState({ message, action }: { message: string; action?: React.ReactNode }) {
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <View style={styles.gateContent}>
        <Link href="/(tabs)" style={styles.backLink}>Back to Libery</Link>
        <Text style={styles.description}>{message}</Text>
        {action}
      </View>
    </SafeAreaView>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.surfaceLight,
  },
  content: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  gateContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  backLink: {
    color: palette.primary,
    fontWeight: '700',
    marginBottom: spacing.lg,
  },
  title: {
    color: palette.textLight,
    fontSize: 28,
    fontWeight: '800',
  },
  description: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    padding: spacing.md,
  },
  input: {
    minHeight: 50,
    backgroundColor: '#F3F7F4',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#E2EBE4',
    color: palette.textLight,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  descriptionInput: {
    minHeight: 100,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
  fieldLabel: {
    color: palette.textLight,
    fontWeight: '700',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  choiceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.sm,
  },
  choice: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: 999,
    backgroundColor: '#EFF5F1',
    marginRight: spacing.xs,
    marginBottom: spacing.xs,
  },
  choiceSelected: {
    backgroundColor: palette.primary,
  },
  choiceText: {
    color: palette.textLight,
    fontWeight: '600',
  },
  choiceTextSelected: {
    color: '#fff',
  },
  rightsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.muted,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    borderColor: palette.primary,
    backgroundColor: palette.primary,
  },
  checkmark: {
    color: '#fff',
    fontWeight: '800',
  },
  rightsText: {
    flex: 1,
    color: palette.textLight,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: '#A9342B',
    fontSize: 13,
    marginVertical: spacing.sm,
  },
  notice: {
    color: palette.primaryDark,
    fontSize: 13,
    marginVertical: spacing.sm,
  },
  submitButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: palette.primary,
    marginTop: spacing.sm,
  },
  disabled: {
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontWeight: '800',
  },
  actionLink: {
    color: palette.primary,
    fontWeight: '800',
  },
});
