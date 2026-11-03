import { describe, expect, it } from 'vitest';
import {
  stripGutenbergBoilerplate,
  splitIntoChapters,
  splitIntoWordSections,
  POPULAR_GUTENBERG_IDS,
} from '../ingest-chapters.js';

describe('Project Gutenberg Ingestion Pipeline', () => {
  it('strips start and end legal boilerplate from plain text', () => {
    const sampleRaw = `
The Project Gutenberg eBook of Sample Story
This eBook is for the use of anyone anywhere.

*** START OF THE PROJECT GUTENBERG EBOOK SAMPLE STORY ***

CHAPTER 1

Once upon a time in a faraway kingdom, there was a quiet library filled with ancient scrolls.
The readers spent hours learning and exploring.

CHAPTER 2

The journey continued across the blue sea. The morning wind carried the scent of pine.

*** END OF THE PROJECT GUTENBERG EBOOK SAMPLE STORY ***

A few more legal notices from Gutenberg.
`;

    const cleaned = stripGutenbergBoilerplate(sampleRaw);
    expect(cleaned).not.toContain('*** START OF');
    expect(cleaned).not.toContain('*** END OF');
    expect(cleaned).not.toContain('This eBook is for the use of anyone anywhere.');
    expect(cleaned).toContain('CHAPTER 1');
    expect(cleaned).toContain('CHAPTER 2');
    expect(cleaned).toContain('Once upon a time in a faraway kingdom');
  });

  it('splits text into chapters based on standard heading patterns', () => {
    const bookText = `
Preface

This is the author's preface explaining the inspiration behind the work. It provides important background context.

CHAPTER I: THE BEGINNING

Long ago in a small village surrounded by misty mountains, young David set out on his grand voyage.
He had only a walking stick and a loaf of brown bread.

CHAPTER II: THE FOREST OF WHISPERS

Entering the forest, the sunlight filtered through emerald leaves. Shadows danced softly upon the moss.
Every path seemed to beckon toward secrets long forgotten.

CHAPTER III: THE HAVEN

At sunset, David reached a secluded cottage where a warm fire glowed in the hearth.
`;

    const chapters = splitIntoChapters(bookText);
    expect(chapters.length).toBeGreaterThanOrEqual(3);

    expect(chapters[0].title).toContain('CHAPTER I');
    expect(chapters[0].chapterNumber).toBe(1);
    expect(chapters[0].text).toContain('Long ago in a small village');
    expect(chapters[0].wordCount).toBeGreaterThan(10);

    expect(chapters[1].title).toContain('CHAPTER II');
    expect(chapters[1].chapterNumber).toBe(2);

    expect(chapters[2].title).toContain('CHAPTER III');
    expect(chapters[2].chapterNumber).toBe(3);
  });

  it('falls back to paragraph-boundary word sections when no chapter headings exist', () => {
    // Generate a long continuous text without chapter headings
    const paragraph1 = 'Word '.repeat(1600).trim();
    const paragraph2 = 'Text '.repeat(1600).trim();
    const longContinuousText = `${paragraph1}\n\n${paragraph2}`;

    const sections = splitIntoWordSections(longContinuousText, 1500);
    expect(sections.length).toBe(2);
    expect(sections[0].chapterNumber).toBe(1);
    expect(sections[0].title).toBe('Section 1');
    expect(sections[0].wordCount).toBeGreaterThan(1000);
    expect(sections[1].chapterNumber).toBe(2);
    expect(sections[1].title).toBe('Section 2');
  });

  it('provides a curated list of at least 50 public domain classics', () => {
    expect(POPULAR_GUTENBERG_IDS.length).toBeGreaterThanOrEqual(50);
    expect(POPULAR_GUTENBERG_IDS).toContain('1342'); // Pride and Prejudice
    expect(POPULAR_GUTENBERG_IDS).toContain('84');   // Frankenstein
    expect(POPULAR_GUTENBERG_IDS).toContain('2701'); // Moby Dick
  });
});

