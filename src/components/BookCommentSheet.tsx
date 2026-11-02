import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
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
import { useComments } from '../context/CommentsContext';
import { BookCover } from './BookCover';
import { palette, radii, spacing } from '../theme';

export function BookCommentSheet() {
  const { user } = useAuth();
  const { activeCommentBook, closeComments, getComments, addComment } = useComments();
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!activeCommentBook) return null;

  const comments = getComments(activeCommentBook.id);

  const handleSubmit = async () => {
    if (!commentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addComment(activeCommentBook.id, commentText);
      setCommentText('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={closeComments}
      transparent
      visible={Boolean(activeCommentBook)}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close discussion"
          onPress={closeComments}
          style={StyleSheet.absoluteFill}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
        >
          <SafeAreaView edges={['bottom']} style={styles.sheet}>
            <View style={styles.handle} />

            {/* Header with book info */}
            <View style={styles.header}>
              <View style={styles.bookInfo}>
                <View style={styles.coverThumbnail}>
                  <BookCover book={activeCommentBook} compact height={64} />
                </View>
                <View style={styles.meta}>
                  <Text style={styles.sheetLabel}>Reader Discussion</Text>
                  <Text style={styles.bookTitle} numberOfLines={1}>
                    {activeCommentBook.title}
                  </Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>
                    {activeCommentBook.author}
                  </Text>
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close comments"
                onPress={closeComments}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color={palette.textLight} />
              </Pressable>
            </View>

            {/* Comments list */}
            <ScrollView
              contentContainerStyle={styles.commentsList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {comments.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={36} color={palette.muted} />
                  <Text style={styles.emptyTitle}>Be the first to share your thoughts</Text>
                  <Text style={styles.emptyMeta}>
                    Join the conversation about {activeCommentBook.title}.
                  </Text>
                </View>
              ) : (
                comments.map((comment) => (
                  <View key={comment.id} style={styles.commentCard}>
                    <View style={styles.commentHeader}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                          {comment.authorName.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.authorMeta}>
                        <Text style={styles.authorName}>
                          {comment.authorName}
                          {comment.isCurrentUser && ' (You)'}
                        </Text>
                        <Text style={styles.timestamp}>{comment.createdAt}</Text>
                      </View>
                    </View>
                    <Text style={styles.commentBody}>{comment.text}</Text>
                  </View>
                ))
              )}
            </ScrollView>

            {/* Input bar */}
            {user ? (
              <View style={styles.inputContainer}>
                <TextInput
                  accessibilityLabel="Add a comment"
                  onChangeText={setCommentText}
                  placeholder={`Comment as ${user.displayName}…`}
                  placeholderTextColor={palette.muted}
                  style={styles.input}
                  value={commentText}
                  multiline
                  maxLength={500}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Post comment"
                  disabled={!commentText.trim() || isSubmitting}
                  onPress={() => void handleSubmit()}
                  style={[
                    styles.sendButton,
                    (!commentText.trim() || isSubmitting) && styles.sendButtonDisabled,
                  ]}
                >
                  <Ionicons name="send" size={17} color="#fff" />
                </Pressable>
              </View>
            ) : (
              <View style={styles.signInPrompt}>
                <Text style={styles.signInPromptText}>Sign in to join the reader discussion.</Text>
                <Link href="/sign-in" asChild>
                  <Pressable onPress={closeComments} style={styles.signInButton}>
                    <Text style={styles.signInButtonText}>Sign In</Text>
                  </Pressable>
                </Link>
              </View>
            )}
          </SafeAreaView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    maxHeight: '85%',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.md,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#D1DDD5',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#EAF0EC',
  },
  bookInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  coverThumbnail: {
    width: 44,
    height: 64,
    borderRadius: radii.sm,
    overflow: 'hidden',
    marginRight: spacing.sm,
  },
  meta: {
    flex: 1,
  },
  sheetLabel: {
    color: palette.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bookTitle: {
    color: palette.textLight,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 1,
  },
  bookAuthor: {
    color: palette.muted,
    fontSize: 13,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F7F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentsList: {
    paddingVertical: spacing.md,
    minHeight: 180,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    color: palette.textLight,
    fontWeight: '700',
    fontSize: 15,
    marginTop: spacing.sm,
  },
  emptyMeta: {
    color: palette.muted,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  commentCard: {
    backgroundColor: '#F8FAF8',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#E8EFEA',
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D7EBE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  avatarText: {
    color: palette.primaryDark,
    fontWeight: '700',
    fontSize: 13,
  },
  authorMeta: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  authorName: {
    color: palette.textLight,
    fontWeight: '700',
    fontSize: 13,
  },
  timestamp: {
    color: palette.muted,
    fontSize: 11,
  },
  commentBody: {
    color: palette.textLight,
    fontSize: 14,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#EAF0EC',
    paddingTop: spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#F3F7F4',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: palette.textLight,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.45,
  },
  signInPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EAF0EC',
    paddingTop: spacing.md,
  },
  signInPromptText: {
    color: palette.muted,
    fontSize: 13,
    flex: 1,
    marginRight: spacing.sm,
  },
  signInButton: {
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  signInButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
});
