import {
  CURATED_SYSTEM_HOOKS,
  synthesizeSystemHook,
} from '../data/systemHooks.js';
import type { AppStore, CommunityPost, PublicBook } from '../types.js';

export type DaytimeSlot = {
  slotIndex: number;
  timeLabel: string;
  hour: number;
  minute: number;
  theme: string;
  defaultBadge: string;
};

/**
 * Exactly 10 daily posting slots spread throughout the daytime and evening hours
 * in Canada / American Time (Eastern Time: Toronto / Montreal / New York).
 *
 * Window: 08:00 AM to 10:00 PM (14 hours of waking, active reading time).
 * 0 spam during overnight hours.
 */
export const DAILY_DAYTIME_SLOTS: DaytimeSlot[] = [
  { slotIndex: 0, timeLabel: '08:00 AM', hour: 8, minute: 0, theme: 'Morning Awakening Hook', defaultBadge: '🧠 Moral Dilemma' },
  { slotIndex: 1, timeLabel: '09:30 AM', hour: 9, minute: 30, theme: 'Morning Coffee Reflection', defaultBadge: '🪞 The Question' },
  { slotIndex: 2, timeLabel: '11:00 AM', hour: 11, minute: 0, theme: 'Mid-Morning Curiosity Gap', defaultBadge: '⚡ The Cliffhanger' },
  { slotIndex: 3, timeLabel: '12:30 PM', hour: 12, minute: 30, theme: 'Lunchtime Hot Take', defaultBadge: '🔥 Hot Take' },
  { slotIndex: 4, timeLabel: '02:00 PM', hour: 14, minute: 0, theme: 'Afternoon Dilemma', defaultBadge: '🧠 Moral Dilemma' },
  { slotIndex: 5, timeLabel: '03:30 PM', hour: 15, minute: 30, theme: 'Tea-Time Wit & Irony', defaultBadge: '✨ Sharp Satire' },
  { slotIndex: 6, timeLabel: '05:00 PM', hour: 17, minute: 0, theme: 'Commute Cliffhanger', defaultBadge: '⚡ The Cliffhanger' },
  { slotIndex: 7, timeLabel: '06:30 PM', hour: 18, minute: 30, theme: 'Dinner Debate & Modern Parallel', defaultBadge: '💌 Modern Parallel' },
  { slotIndex: 8, timeLabel: '08:15 PM', hour: 20, minute: 15, theme: 'Prime Evening Reading Reflection', defaultBadge: '🪞 The Question' },
  { slotIndex: 9, timeLabel: '09:45 PM', hour: 21, minute: 45, theme: 'Nightcap Contemplation', defaultBadge: '✨ Sharp Satire' },
];

/**
 * Resolves current date & time specifically in Canada / American Eastern Time
 * (America/Toronto / America/New_York).
 */
export function getCanadaAmericaCurrentTime(): {
  dateString: string;
  hour: number;
  minute: number;
  totalMinutes: number;
  targetDate: Date;
} {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  for (const p of parts) partMap[p.type] = p.value;

  const year = partMap.year || '2026';
  const month = partMap.month || '01';
  const day = partMap.day || '01';
  const hour = parseInt(partMap.hour || '0', 10);
  const minute = parseInt(partMap.minute || '0', 10);
  const dateString = `${year}-${month}-${day}`;

  return {
    dateString,
    hour,
    minute,
    totalMinutes: hour * 60 + minute,
    targetDate: now,
  };
}

export class SystemPosterService {
  private timer: NodeJS.Timeout | null = null;
  private isChecking = false;

  constructor(private readonly store: AppStore) {}

  /**
   * Catches up and verifies all scheduled daytime slots for today up to the current hour.
   * If any slot's time has already arrived and hasn't been posted yet, it creates it.
   */
  async catchUpTodaySlots(): Promise<CommunityPost[]> {
    if (this.isChecking) return [];
    this.isChecking = true;

    try {
      const { dateString, totalMinutes } = getCanadaAmericaCurrentTime();
      const eligibleSlots = DAILY_DAYTIME_SLOTS.filter((slot) => {
        const slotMinutes = slot.hour * 60 + slot.minute;
        return slotMinutes <= totalMinutes;
      });

      const readableBooks = await this.getReadableBooks();
      if (readableBooks.length === 0) {
        return [];
      }

      const createdPosts: CommunityPost[] = [];
      console.info(`[SystemPoster] Eligible slots count: ${eligibleSlots.length}`);

      for (const slot of eligibleSlots) {
        const slotKey = `system:slot:${dateString}:${slot.slotIndex}`;
        console.info(`[SystemPoster] Evaluating slot #${slot.slotIndex} (${slot.timeLabel}) key: ${slotKey}`);

        // Verify if this slot is already posted
        if (this.store.findCommunityPostBySlotKey) {
          const existing = await this.store.findCommunityPostBySlotKey(slotKey);
          if (existing) {
            console.info(`[SystemPoster] Slot #${slot.slotIndex} already exists (id: ${existing.id}), skipping.`);
            continue;
          }
        }

        // Pick a readable book for this slot
        const bookIndex = slot.slotIndex % readableBooks.length;
        const book = readableBooks[bookIndex];

        // Match curated hook or synthesize
        const titleLower = book.title.toLowerCase();
        const authorLower = (book.authors?.[0] || '').toLowerCase();

        const curated = CURATED_SYSTEM_HOOKS.find((h) =>
          h.bookKeywords.some((kw) => titleLower.includes(kw) || authorLower.includes(kw)),
        );

        const hook = curated ?? synthesizeSystemHook(book, slot.slotIndex);
        const formattedContent = `${hook.badge}\n\n“${hook.questionOrQuote}”\n\n${hook.curiosityHook}`;

        // Calculate deterministic realistic engagement counts
        const baseLikes = 90 + ((slot.slotIndex * 37 + 13) % 180);
        const baseComments = 8 + ((slot.slotIndex * 19 + 7) % 35);

        // Calculate slot timestamp for today in Canada/American time
        const slotDate = new Date();
        const diffMinutes = totalMinutes - (slot.hour * 60 + slot.minute);
        slotDate.setTime(Date.now() - Math.max(0, diffMinutes * 60 * 1000));

        try {
          const post = await this.store.createCommunityPost({
            userId: 'system:curator',
            slotKey,
            author: {
              username: hook.persona.username,
              displayName: hook.persona.displayName,
              avatarUrl: hook.persona.avatarUrl,
            },
            content: formattedContent,
            bookId: book.id,
            likesCount: baseLikes,
            commentsCount: baseComments,
            createdAt: slotDate,
          });

          createdPosts.push(post);
          console.info(
            `[SystemPoster] Published daytime slot #${slot.slotIndex} (${slot.timeLabel} ET) for "${book.title}" [post=${post.id}]`,
          );
        } catch (postErr: any) {
          // If already created concurrently due to unique index, ignore duplicate key error
          if (postErr?.code === 11000) {
            continue;
          }
          console.warn(`[SystemPoster] Slot #${slot.slotIndex} insert error:`, postErr?.message || postErr);
        }
      }

      return createdPosts;
    } catch (err) {
      console.error('[SystemPoster] Catch-up error:', err instanceof Error ? err.message : err);
      return [];
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Retrieves books that have plain text and chapters inserted,
   * prioritizing world-renowned literary classics and filtering out administrative filings.
   */
  private async getReadableBooks(): Promise<PublicBook[]> {
    let rawBooks: PublicBook[] = [];
    if (this.store.listReadableBooks) {
      rawBooks = await this.store.listReadableBooks();
    } else if (typeof (this.store as any).listBooks === 'function') {
      const all = await (this.store as any).listBooks({ limit: 100 });
      rawBooks = all.filter(
        (b: any) => b.availability === 'in_app_text' || (b.totalChapters && b.totalChapters > 0),
      );
    }

    if (rawBooks.length === 0) return [];

    // Filter out legal/census/administrative catalog listings
    const isAdministrative = (title: string) => {
      const t = title.toLowerCase();
      return (
        t.includes('copyright renewal') ||
        t.includes('census') ||
        t.includes('catalog of') ||
        t.includes('indexes of') ||
        t.includes('emergency a citizen') ||
        t.includes('pamphlets')
      );
    };

    const literaryCandidates = rawBooks.filter((b) => !isAdministrative(b.title));
    const pool = literaryCandidates.length > 0 ? literaryCandidates : rawBooks;

    // Prioritize books with curated hooks first, then high-rated/popular classics
    return pool.sort((a, b) => {
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();

      const aHasCurated = CURATED_SYSTEM_HOOKS.some((h) =>
        h.bookKeywords.some((kw) => aTitle.includes(kw)),
      );
      const bHasCurated = CURATED_SYSTEM_HOOKS.some((h) =>
        h.bookKeywords.some((kw) => bTitle.includes(kw)),
      );

      if (aHasCurated && !bHasCurated) return -1;
      if (!aHasCurated && bHasCurated) return 1;

      // Secondary preference for fiction, literature, philosophy
      const aCat = (a.categories?.[0] || '').toLowerCase();
      const bCat = (b.categories?.[0] || '').toLowerCase();
      const isFavCat = (c: string) => c.includes('fiction') || c.includes('literature') || c.includes('philosophy');

      if (isFavCat(aCat) && !isFavCat(bCat)) return -1;
      if (!isFavCat(aCat) && isFavCat(bCat)) return 1;

      return 0;
    });
  }

  /**
   * Starts a background interval worker that periodically checks for newly matured slots.
   */
  startPeriodicWorker(intervalMs = 5 * 60 * 1000) {
    this.stop();
    // Immediate catch-up
    void this.catchUpTodaySlots();
    // Recurring interval
    this.timer = setInterval(() => {
      void this.catchUpTodaySlots();
    }, intervalMs);
    console.info(`[SystemPoster] 10/day daytime posting service started (interval: ${intervalMs / 1000}s).`);
  }

  /**
   * Stops the background worker.
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}

