import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../context/AuthContext';
import { useCatalog } from '../../context/CatalogContext';
import { useReaderPreferences, type AgeGroup } from '../../context/ReaderPreferences';
import { useReadingLibrary } from '../../context/ReadingLibraryContext';
import { palette, radii, spacing } from '../../theme';

const ageGroups: { id: AgeGroup; title: string; range: string }[] = [
  { id: 'kids', title: 'Kids', range: '0–12' },
  { id: 'teens', title: 'Teens', range: '13–17' },
  { id: 'adults', title: 'Adults', range: '18+' },
];

const languages = ['English', 'French'];

const curatedAvatars = [
  {
    name: 'Jane Austen',
    tag: 'Classic',
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Marcus Aurelius',
    tag: 'Stoic',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Virginia Woolf',
    tag: 'Modernist',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Leo Tolstoy',
    tag: 'Epic',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80',
  },
  {
    name: 'Frederick Douglass',
    tag: 'Philosopher',
    url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
  },
];

export default function ProfileScreen() {
  const { preferences, updatePreferences } = useReaderPreferences();
  const { books } = useCatalog();
  const { user, error: authError, signOut, updateProfile, uploadAvatar, removeAvatar } = useAuth();
  const { items: libraryItems } = useReadingLibrary();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPhotoPickerOpen, setIsPhotoPickerOpen] = useState(false);

  const focusAreas = Array.from(new Set(books.map((book) => book.category)));

  const handlePickFromGallery = async () => {
    setIsPhotoPickerOpen(false);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Gallery permission is required to select a profile photo.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      const maxBytes = 5 * 1024 * 1024;
      if (asset.fileSize && asset.fileSize > maxBytes) {
        setErrorMessage('Photo must be 5 MB or smaller.');
        return;
      }

      setIsUploadingPhoto(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const uri = asset.uri;
      const filename = asset.fileName || uri.split('/').pop() || 'avatar.jpg';
      const match = /\.(jpe?g|png|webp)$/i.exec(filename);
      const mimeType = asset.mimeType ?? (match ? `image/${match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase()}` : 'image/jpeg');

      await uploadAvatar(uri, mimeType, filename);
      setStatusMessage('Profile photo saved to database.');
    } catch (uploadErr) {
      setErrorMessage(uploadErr instanceof Error ? uploadErr.message : 'Could not upload photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleTakePhoto = async () => {
    setIsPhotoPickerOpen(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setErrorMessage('Camera permission is required to take a profile photo.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const asset = result.assets[0];
      setIsUploadingPhoto(true);
      setErrorMessage(null);
      setStatusMessage(null);

      const uri = asset.uri;
      const filename = 'camera_photo.jpg';
      await uploadAvatar(uri, 'image/jpeg', filename);
      setStatusMessage('Profile photo taken and saved to database.');
    } catch (cameraErr) {
      setErrorMessage(cameraErr instanceof Error ? cameraErr.message : 'Could not take photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSelectCuratedAvatar = async (avatarUrl: string) => {
    setIsPhotoPickerOpen(false);
    try {
      setIsUploadingPhoto(true);
      setErrorMessage(null);
      setStatusMessage(null);
      await updateProfile({ avatarUrl });
      setStatusMessage('Avatar preset saved to database.');
    } catch (avatarErr) {
      setErrorMessage(avatarErr instanceof Error ? avatarErr.message : 'Could not set avatar.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    setIsPhotoPickerOpen(false);
    try {
      setIsUploadingPhoto(true);
      setErrorMessage(null);
      setStatusMessage(null);
      await removeAvatar();
      setStatusMessage('Profile photo removed.');
    } catch (removeErr) {
      setErrorMessage(removeErr instanceof Error ? removeErr.message : 'Could not remove photo.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      setErrorMessage('Display name cannot be empty.');
      return;
    }

    setErrorMessage(null);
    setStatusMessage(null);
    setIsSavingProfile(true);

    try {
      await updateProfile({
        displayName: displayName.trim(),
        bio: bio.trim(),
      });
      setIsEditing(false);
      setStatusMessage('Profile changes saved to database.');
    } catch (saveErr) {
      setErrorMessage(saveErr instanceof Error ? saveErr.message : 'Could not save profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const savePreferences = async (updates: Parameters<typeof updatePreferences>[0]) => {
    setErrorMessage(null);
    try {
      await updatePreferences(updates);
      setStatusMessage('Preferences updated in database.');
    } catch (prefErr) {
      setErrorMessage(prefErr instanceof Error ? prefErr.message : 'Could not save preferences.');
    }
  };

  const toggleFocus = (focus: string) => {
    const focusSelection = preferences.focusAreas.includes(focus)
      ? preferences.focusAreas.filter((item) => item !== focus)
      : [...preferences.focusAreas, focus];
    void savePreferences({ focusAreas: focusSelection });
  };

  const toggleLanguage = (language: string) => {
    const languageSelection = preferences.languages.includes(language)
      ? preferences.languages.filter((item) => item !== language)
      : [...preferences.languages, language];
    if (languageSelection.length > 0) void savePreferences({ languages: languageSelection });
  };

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).filter(Boolean).join('').slice(0, 2).toUpperCase()
    : 'A';

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Profile Card Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              {isUploadingPhoto && (
                <View style={styles.avatarUploadingOverlay}>
                  <ActivityIndicator color="#fff" size="small" />
                </View>
              )}
              {user && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change profile photo"
                  onPress={() => setIsPhotoPickerOpen(true)}
                  style={styles.cameraBadge}
                >
                  <Ionicons name="camera" size={15} color="#fff" />
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>{user?.displayName ?? 'Guest Reader'}</Text>
              {user?.role === 'provider' && (
                <View style={styles.roleBadge}>
                  <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                  <Text style={styles.roleBadgeText}>Provider</Text>
                </View>
              )}
            </View>
            <Text style={styles.handle}>
              {user ? `@${user.username} · ${user.email}` : 'Personalized on this device'}
            </Text>
            {user?.bio ? (
              <Text style={styles.bioText}>{user.bio}</Text>
            ) : (
              <Text style={styles.bioPlaceholder}>
                {user ? 'No bio set. Tap "Edit Profile" to add one.' : 'Sign in to save your shelf and preferences in the MongoDB cloud database.'}
              </Text>
            )}

            {user && (
              <View style={styles.profileActionRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isEditing ? 'Cancel editing' : 'Edit profile'}
                  onPress={() => {
                    if (!isEditing) {
                      setDisplayName(user.displayName);
                      setBio(user.bio ?? '');
                      setIsEditing(true);
                    } else {
                      setIsEditing(false);
                    }
                  }}
                  style={[styles.smallEditBtn, isEditing && styles.smallEditBtnActive]}
                >
                  <Ionicons name={isEditing ? 'close' : 'create-outline'} size={14} color={isEditing ? '#fff' : palette.primary} />
                  <Text style={[styles.smallEditBtnText, isEditing && styles.smallEditBtnTextActive]}>
                    {isEditing ? 'Cancel' : 'Edit Profile'}
                  </Text>
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change photo"
                  onPress={() => setIsPhotoPickerOpen(true)}
                  style={styles.smallPhotoBtn}
                >
                  <Ionicons name="image-outline" size={14} color="#4B5563" />
                  <Text style={styles.smallPhotoBtnText}>Photo</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Notices and Alerts */}
        {statusMessage && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={16} color="#059669" />
            <Text style={styles.successBannerText}>{statusMessage}</Text>
          </View>
        )}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        )}
        {authError && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={16} color="#DC2626" />
            <Text style={styles.errorBannerText}>{authError}</Text>
          </View>
        )}

        {/* In-place Profile Editor Form */}
        {user && isEditing && (
          <View style={styles.editorCard}>
            <Text style={styles.editorHeading}>Edit Reader Profile</Text>

            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput
              style={styles.textInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name or reader alias"
              placeholderTextColor="#94A3B8"
              maxLength={80}
            />

            <Text style={styles.inputLabel}>Bio / Reader Tagline</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={bio}
              onChangeText={setBio}
              placeholder="What do you love to read? Share your favorite genres, philosophy, or goals…"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              maxLength={300}
            />
            <Text style={styles.charCount}>{bio.length}/300</Text>

            <View style={styles.editorActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save profile"
                onPress={() => void handleSaveProfile()}
                disabled={isSavingProfile}
                style={[styles.saveBtn, isSavingProfile && styles.saveBtnDisabled]}
              >
                {isSavingProfile ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>Save to Database</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Account Button (Sign In / Sign Out) */}
        {user ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out of cloud library"
            onPress={() => {
              Alert.alert(
                'Sign Out',
                'Are you sure you want to sign out of your Libra Hub cloud account?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: () => void signOut() },
                ],
              );
            }}
            style={styles.signOutButton}
          >
            <Ionicons name="log-out-outline" size={16} color="#DC2626" />
            <Text style={styles.signOutButtonText}>Sign out of cloud library</Text>
          </Pressable>
        ) : (
          <Link href="/sign-in" asChild>
            <Pressable accessibilityRole="button" style={styles.accountButton}>
              <Ionicons name="log-in-outline" size={18} color="#fff" />
              <Text style={styles.accountButtonText}>Sign in / Create Account</Text>
            </Pressable>
          </Link>
        )}

        {/* Reading Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{libraryItems.length}</Text>
            <Text style={styles.statLabel}>Saved books</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{preferences.focusAreas.length}</Text>
            <Text style={styles.statLabel}>Focus areas</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{preferences.languages.length}</Text>
            <Text style={styles.statLabel}>Languages</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {ageGroups.find((group) => group.id === preferences.ageGroup)?.title ?? 'Adults'}
            </Text>
            <Text style={styles.statLabel}>Age rating</Text>
          </View>
        </View>

        {/* Settings & Reading Preferences Card */}
        <View style={styles.settingsCard}>
          <View style={styles.settingsHeader}>
            <Ionicons name="options-outline" size={18} color={palette.primary} />
            <Text style={styles.cardMainTitle}>Reader Preferences</Text>
            <View style={styles.cloudBadge}>
              <Ionicons name="cloud-done" size={12} color="#059669" />
              <Text style={styles.cloudBadgeText}>Atlas Synced</Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Age Group</Text>
          <Text style={styles.sectionHint}>We’ll only show books suitable for this age range.</Text>
          <View style={styles.chipRow}>
            {ageGroups.map((group) => {
              const selected = preferences.ageGroup === group.id;
              return (
                <Pressable
                  key={group.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => void savePreferences({ ageGroup: group.id })}
                  style={[styles.chip, selected && styles.selectedChip]}
                >
                  <Text style={[styles.chipTitle, selected && styles.selectedChipText]}>{group.title}</Text>
                  <Text style={[styles.chipSubtitle, selected && styles.selectedChipText]}>{group.range}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Focus Areas</Text>
          <Text style={styles.sectionHint}>Select topics to shape your personalized recommendations.</Text>
          <View style={styles.chipRow}>
            {focusAreas.map((focus) => {
              const selected = preferences.focusAreas.includes(focus);
              return (
                <Pressable
                  key={focus}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => toggleFocus(focus)}
                  style={[styles.focusChip, selected && styles.selectedChip]}
                >
                  <Text style={[styles.focusText, selected && styles.selectedChipText]}>{focus}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.sectionTitle}>Languages</Text>
          <Text style={styles.sectionHint}>At least one language must be selected.</Text>
          <View style={styles.chipRow}>
            {languages.map((language) => {
              const selected = preferences.languages.includes(language);
              return (
                <Pressable
                  key={language}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => toggleLanguage(language)}
                  style={[styles.focusChip, selected && styles.selectedChip]}
                >
                  <Text style={[styles.focusText, selected && styles.selectedChipText]}>{language}</Text>
                </Pressable>
              );
            })}
          </View>

          {preferences.ageGroup === 'kids' && (
            <View style={styles.guardianNotice}>
              <Ionicons name="information-circle-outline" size={16} color="#92400E" />
              <Text style={styles.guardianNoticeText}>
                Accounts for children under 13 require verified guardian consent. {user
                  ? 'Your account age filter is also enforced by the Libra Hub API.'
                  : 'This setting filters sample books on this device.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Profile Photo Picker Modal */}
      <Modal
        visible={isPhotoPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setIsPhotoPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsPhotoPickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalDragHandle} />
            <Text style={styles.modalSheetTitle}>Change Profile Photo</Text>
            <Text style={styles.modalSheetSubtitle}>Upload a picture or choose a timeless literary avatar</Text>

            <View style={styles.pickerOptionsRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose from gallery"
                onPress={() => void handlePickFromGallery()}
                style={styles.pickerOptionCard}
              >
                <View style={[styles.pickerIconWrap, { backgroundColor: '#EEF2FF' }]}>
                  <Ionicons name="images" size={24} color="#4F46E5" />
                </View>
                <Text style={styles.pickerOptionTitle}>Gallery</Text>
                <Text style={styles.pickerOptionSub}>Choose photo</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Take a photo"
                onPress={() => void handleTakePhoto()}
                style={styles.pickerOptionCard}
              >
                <View style={[styles.pickerIconWrap, { backgroundColor: '#ECFDF5' }]}>
                  <Ionicons name="camera" size={24} color="#059669" />
                </View>
                <Text style={styles.pickerOptionTitle}>Camera</Text>
                <Text style={styles.pickerOptionSub}>Take new</Text>
              </Pressable>

              {user?.avatarUrl && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove photo"
                  onPress={() => void handleRemovePhoto()}
                  style={styles.pickerOptionCard}
                >
                  <View style={[styles.pickerIconWrap, { backgroundColor: '#FEF2F2' }]}>
                    <Ionicons name="trash-outline" size={24} color="#DC2626" />
                  </View>
                  <Text style={[styles.pickerOptionTitle, { color: '#DC2626' }]}>Remove</Text>
                  <Text style={styles.pickerOptionSub}>Use initials</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.curatedTitle}>Or choose a Literary Avatar:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.curatedRow}>
              {curatedAvatars.map((av) => (
                <Pressable
                  key={av.name}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${av.name} avatar`}
                  onPress={() => void handleSelectCuratedAvatar(av.url)}
                  style={styles.curatedItem}
                >
                  <Image source={{ uri: av.url }} style={styles.curatedImage} />
                  <Text style={styles.curatedName} numberOfLines={1}>{av.name}</Text>
                  <Text style={styles.curatedTag}>{av.tag}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel"
              onPress={() => setIsPhotoPickerOpen(false)}
              style={styles.modalCancelBtn}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAF9',
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 40,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#0B1B14',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EAF0EC',
  },
  avatarSection: {
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E2E8F0',
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '800',
  },
  avatarUploadingOverlay: {
    ...StyleSheet.absoluteFill,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.primary,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
    elevation: 3,
  },
  profileInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    color: palette.textLight,
    fontSize: 20,
    fontWeight: '800',
    flexShrink: 1,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  roleBadgeText: {
    color: '#065F46',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  handle: {
    marginTop: 2,
    fontSize: 12,
    color: palette.muted,
  },
  bioText: {
    color: '#334155',
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  bioPlaceholder: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 6,
    fontStyle: 'italic',
  },
  profileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  smallEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EAF5EE',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  smallEditBtnActive: {
    backgroundColor: palette.primary,
  },
  smallEditBtnText: {
    color: palette.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  smallEditBtnTextActive: {
    color: '#fff',
  },
  smallPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.sm,
  },
  smallPhotoBtnText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 12,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  successBannerText: {
    color: '#065F46',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: {
    color: '#991B1B',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  editorCard: {
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#D4E8DC',
    shadowColor: '#0B1B14',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 2,
  },
  editorHeading: {
    color: palette.textLight,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0F172A',
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  charCount: {
    alignSelf: 'flex-end',
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
  },
  editorActions: {
    marginTop: 12,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: palette.primary,
    paddingVertical: 12,
    borderRadius: radii.md,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  accountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    backgroundColor: palette.primary,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  accountButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  signOutButtonText: {
    color: '#DC2626',
    fontWeight: '700',
    fontSize: 13,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EAF0EC',
  },
  statNumber: {
    color: palette.textLight,
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  settingsCard: {
    backgroundColor: '#fff',
    borderRadius: radii.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#EAF0EC',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F2',
  },
  cardMainTitle: {
    color: palette.textLight,
    fontSize: 16,
    fontWeight: '800',
    flex: 1,
  },
  cloudBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#EAF5EE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  cloudBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '700',
  },
  sectionTitle: {
    color: palette.textLight,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 12,
  },
  sectionHint: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  chip: {
    minWidth: 80,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAF9',
    borderRadius: radii.md,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E4ECE6',
  },
  chipTitle: {
    color: palette.textLight,
    fontWeight: '700',
    fontSize: 13,
  },
  chipSubtitle: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 2,
  },
  focusChip: {
    minHeight: 38,
    justifyContent: 'center',
    backgroundColor: '#F8FAF9',
    borderRadius: 999,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E4ECE6',
  },
  focusText: {
    color: palette.textLight,
    fontSize: 12,
    fontWeight: '600',
  },
  selectedChip: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  selectedChipText: {
    color: '#fff',
  },
  guardianNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: '#FFFBEB',
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  guardianNoticeText: {
    color: '#92400E',
    fontSize: 12,
    lineHeight: 17,
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    maxHeight: '85%',
  },
  modalDragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalSheetTitle: {
    color: palette.textLight,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalSheetSubtitle: {
    color: palette.muted,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: spacing.md,
  },
  pickerOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  pickerOptionCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  pickerOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  pickerOptionSub: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  curatedTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    marginTop: 4,
    marginBottom: 8,
  },
  curatedRow: {
    gap: 10,
    paddingVertical: 4,
    marginBottom: spacing.md,
  },
  curatedItem: {
    alignItems: 'center',
    width: 68,
  },
  curatedImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E2E8F0',
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  curatedName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  curatedTag: {
    fontSize: 10,
    color: palette.muted,
  },
  modalCancelBtn: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: radii.md,
    alignItems: 'center',
    marginTop: 4,
  },
  modalCancelBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '700',
  },
});
