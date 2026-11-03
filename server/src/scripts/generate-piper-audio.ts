/**
 * Optional Chapter Audio Generation Script using the open-source Piper Text-To-Speech engine.
 *
 * How Piper works:
 * - Piper is a fast, local neural text-to-speech engine running completely offline on your computer (CPU/GPU).
 * - Repository & Releases: https://github.com/rhasspy/piper
 * - Free voice models: https://huggingface.co/rhasspy/piper-voices
 *
 * Usage:
 *   tsx src/scripts/generate-piper-audio.ts --bookId=<BOOK_ID> [--model=<PATH_TO_ONNX>] [--dry-run]
 */

import 'dotenv/config';

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MongoClient, ObjectId } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';

import { readConfig } from '../config.js';

type GenerateAudioOptions = {
  bookId?: string;
  piperBinary?: string;
  modelPath?: string;
  outputDir?: string;
  uploadCloudinary?: boolean;
  dryRun?: boolean;
};

/**
 * Executes the local Piper binary to synthesize plain text into a WAV audio file.
 */
export async function synthesizePiperAudio(
  text: string,
  outputPath: string,
  piperBin = 'piper',
  modelPath = 'en_US-lessac-medium.onnx',
): Promise<void> {
  return new Promise((resolvePromise, rejectPromise) => {
    const proc = spawn(piperBin, ['--model', modelPath, '--output_file', outputPath], {
      stdio: ['pipe', 'inherit', 'inherit'],
    });

    proc.on('error', (err) => {
      rejectPromise(
        new Error(
          `Could not run piper binary at "${piperBin}". Make sure Piper is installed on your computer.\nDownload from: https://github.com/rhasspy/piper/releases\nError: ${err.message}`,
        ),
      );
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(new Error(`Piper exited with code ${code}`));
      }
    });

    // Feed text into Piper's standard input
    proc.stdin.write(text);
    proc.stdin.end();
  });
}

export async function runPiperAudioGeneration(options: GenerateAudioOptions = {}) {
  const config = readConfig();

  const bookIdArg = process.argv.find((arg) => arg.startsWith('--bookId='));
  const bookId = bookIdArg ? bookIdArg.slice('--bookId='.length) : options.bookId;

  if (!bookId) {
    console.error('Error: Provide a valid --bookId=<MONGO_BOOK_ID>');
    console.info('Example: npm run generate:audio --prefix server -- --bookId=70d10b7b1574e8821f4023b1');
    process.exitCode = 1;
    return;
  }

  const dryRun = options.dryRun ?? process.argv.includes('--dry-run');
  const piperBin = options.piperBinary || process.env.PIPER_BIN || 'piper';
  const modelPath = options.modelPath || process.env.PIPER_MODEL || 'en_US-lessac-medium.onnx';
  const outputDir = resolve(options.outputDir || 'audio-output');

  await mkdir(outputDir, { recursive: true });

  const client = new MongoClient(config.mongoUri, {
    appName: 'libery-piper-audio-generator',
    maxPoolSize: 5,
  });

  await client.connect();
  const db = client.db(config.mongoDb);
  const chaptersCollection = db.collection('chapters');
  const booksCollection = db.collection('books');

  try {
    const book = await booksCollection.findOne({ _id: new ObjectId(bookId) });
    if (!book) {
      throw new Error(`Book with ID "${bookId}" was not found.`);
    }

    const chapters = await chaptersCollection
      .find({ bookId })
      .sort({ chapterNumber: 1 })
      .toArray();

    console.info(`Found ${chapters.length} chapters for "${book.title}". Starting Piper audio generation...`);

    if (config.cloudinary) {
      cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret,
        secure: true,
      });
    }

    for (const chapter of chapters) {
      const fileName = `book_${bookId}_ch_${chapter.chapterNumber}.wav`;
      const localFilePath = resolve(outputDir, fileName);

      console.info(`Generating audio for Chapter ${chapter.chapterNumber}: "${chapter.title}"...`);

      if (dryRun) {
        console.info(`  [Dry run] Would synthesize ~${chapter.wordCount} words to ${localFilePath}`);
        continue;
      }

      try {
        await synthesizePiperAudio(chapter.text, localFilePath, piperBin, modelPath);
        console.info(`  ✓ Audio generated at: ${localFilePath}`);

        let publicAudioUrl = `file://${localFilePath}`;

        // If Cloudinary credentials are set up in server/.env, upload audio and obtain CDN URL
        if (config.cloudinary) {
          console.info('  Uploading to Cloudinary audio storage...');
          const uploadRes = await cloudinary.uploader.upload(localFilePath, {
            resource_type: 'video', // Cloudinary handles audio files under video resource type
            folder: `libery/audio/${bookId}`,
            public_id: `ch_${chapter.chapterNumber}`,
            overwrite: true,
          });
          publicAudioUrl = uploadRes.secure_url;
          console.info(`  ✓ Uploaded to CDN: ${publicAudioUrl}`);
        }

        // Save audioUrl to chapter in MongoDB
        await chaptersCollection.updateOne(
          { _id: chapter._id },
          { $set: { audioUrl: publicAudioUrl } },
        );
        console.info(`  ✓ Saved audioUrl to chapter #${chapter.chapterNumber} in MongoDB.`);
      } catch (err) {
        console.error(`  ✗ Failed to generate audio for Chapter #${chapter.chapterNumber}:`, err instanceof Error ? err.message : err);
      }
    }

    console.info('\nPiper audio generation finished.');
  } finally {
    await client.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runPiperAudioGeneration().catch((err: unknown) => {
    console.error('Fatal error:', err);
    process.exitCode = 1;
  });
}

