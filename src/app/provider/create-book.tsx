import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pickAndUploadCover = async () => {
    setCoverUploadError(null);
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setCoverUploadError('Permission to access photos is needed to select a book cover.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [2, 3],
        quality: 0.85,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      const maxBytes = 5 * 1024 * 1024;
      if (asset.fileSize && asset.fileSize > maxBytes) {
        setCoverUploadError('Cover images must be 5 MB or smaller.');
        return;
      }

      const uri = asset.uri;
      const filename = asset.fileName || uri.split('/').pop() || 'cover.jpg';
      const match = /\.(jpe?g|png|webp)$/i.exec(filename);
      const mimeType = asset.mimeType ?? (match ? `image/${match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase()}` : 'image/jpeg');

      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
        setCoverUploadError('Cover must be a JPEG, PNG, or WebP image.');
        return;
      }

      setIsUploadingCover(true);

      const formData = new FormData();
      if (Platform.OS === 'web') {
        const res = await fetch(uri);
        const blob = await res.blob();
        if (blob.size > maxBytes) {
          setCoverUploadError('Cover images must be 5 MB or smaller.');
          setIsUploadingCover(false);
          return;
        }
        formData.append('cover', blob, filename);
      } else {
        formData.append('cover', {
          uri,
          name: filename,
          type: mimeType,
        } as unknown as Blob);
      }

      const uploadResult = await request<{ coverImageUrl: string }>('/provider/covers', {
        method: 'POST',
        body: formData,
      });

      setCoverImageUrl(uploadResult.coverImageUrl);
      setNotice('Cover image uploaded successfully.');
    } catch (uploadError) {
      setCoverUploadError(uploadError instanceof Error ? uploadError.message : 'Could not upload this cover image.');
    } finally {
      setIsUploadingCover(false);
    }
  };

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
          <Text style={styles.fieldLabel}>Book cover</Text>
          {coverImageUrl ? (
            <View style={styles.coverPreviewContainer}>
              <Image source={{ uri: coverImageUrl }} style={styles.coverPreview} resizeMode="cover" />
              <View style={styles.coverPreviewActions}>
                <Pressable
                  accessibilityRole="button"
                  disabled={isUploadingCover}
                  onPress={() => void pickAndUploadCover()}
                  style={styles.coverActionButton}
                >
                  <Ionicons name="image-outline" size={16} color={palette.primaryDark} />
                  <Text style={styles.coverActionText}>Replace cover</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  disabled={isUploadingCover}
                  onPress={() => setCoverImageUrl('')}
                  style={[styles.coverActionButton, styles.coverRemoveButton]}
                >
                  <Ionicons name="trash-outline" size={16} color="#A9342B" />
                  <Text style={styles.coverRemoveText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <View style={styles.uploadBox}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Upload cover image"
                disabled={isUploadingCover}
                onPress={() => void pickAndUploadCover()}
                style={styles.uploadButton}
              >
                {isUploadingCover ? (
                  <View style={styles.uploadingRow}>
                    <ActivityIndicator size="small" color={palette.primary} />
                    <Text style={styles.uploadingText}>Uploading cover…</Text>
                  </View>
                ) : (
                  <View style={styles.uploadingRow}>
                    <Ionicons name="cloud-upload-outline" size={20} color={palette.primaryDark} />
                    <Text style={styles.uploadButtonText}>Choose cover image</Text>
                  </View>
                )}
              </Pressable>
              <Text style={styles.uploadHint}>JPEG, PNG, or WebP up to 5 MB (2:3 aspect ratio)</Text>
              {!showManualUrl ? (
                <Pressable onPress={() => setShowManualUrl(true)} style={styles.toggleUrlButton}>
                  <Text style={styles.toggleUrlText}>Or enter a cover URL</Text>
                </Pressable>
              ) : (
                <TextInput
                  accessibilityLabel="Cover image URL"
                  autoCapitalize="none"
                  keyboardType="url"
                  onChangeText={setCoverImageUrl}
                  placeholder="Cover image HTTPS URL"
                  style={[styles.input, styles.urlInput]}
                  value={coverImageUrl}
                />
              )}
            </View>
          )}
          {coverUploadError && <Text accessibilityRole="alert" style={styles.error}>{coverUploadError}</Text>}

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
  coverPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F7F4',
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E2EBE4',
  },
  coverPreview: {
    width: 72,
    height: 108,
    borderRadius: radii.md,
    backgroundColor: '#E8EFEA',
  },
  coverPreviewActions: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  coverActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#D4E2D8',
    marginBottom: spacing.xs,
  },
  coverActionText: {
    color: palette.primaryDark,
    fontSize: 13,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  coverRemoveButton: {
    borderColor: '#F2D6D3',
    backgroundColor: '#FDF7F7',
  },
  coverRemoveText: {
    color: '#A9342B',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: spacing.xs,
  },
  uploadBox: {
    backgroundColor: '#F3F7F4',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#C3D7CA',
    padding: spacing.md,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  uploadButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 280,
  },
  uploadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonText: {
    color: palette.primaryDark,
    fontWeight: '700',
    fontSize: 14,
    marginLeft: spacing.xs,
  },
  uploadingText: {
    color: palette.primary,
    fontWeight: '600',
    fontSize: 13,
    marginLeft: spacing.xs,
  },
  uploadHint: {
    color: palette.muted,
    fontSize: 12,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  toggleUrlButton: {
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  toggleUrlText: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  urlInput: {
    width: '100%',
    marginTop: spacing.sm,
    marginBottom: 0,
    backgroundColor: '#fff',
  },
});
