import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTableCreator,
  text,
} from "drizzle-orm/sqlite-core";

export const createTable = sqliteTableCreator((name) => `podcaster_${name}`);

export const characters = createTable(
  "character",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    name: text("name", { length: 100 }).notNull(),
    personality: text("personality").notNull(),
    speakingStyle: text("speaking_style"),
    speakingQuirks: text("speaking_quirks"),
    audioSamplesJson: text("audio_samples_json"),
    elevenLabsVoiceId: text("elevenlabs_voice_id"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date(),
    ),
  },
  (t) => [index("character_name_idx").on(t.name)],
);

export const books = createTable(
  "book",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    fileName: text("file_name").notNull(),
    filePath: text("file_path").notNull(),
    title: text("title", { length: 256 }).notNull(),
    chaptersJson: text("chapters_json").notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
  },
  (t) => [index("book_title_idx").on(t.title)],
);

export const podcasts = createTable(
  "podcast",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    title: text("title", { length: 256 }).notNull(),
    bookId: integer("book_id")
      .notNull()
      .references(() => books.id),
    chapterIndex: integer("chapter_index").notNull(),
    chapterTitle: text("chapter_title"),
    format: text("format", { length: 50 }).notNull(),
    status: text("status", { length: 30 }).notNull().default("pending"),
    progress: integer("progress").notNull().default(0),
    errorMessage: text("error_message"),
    scriptJson: text("script_json"),
    outputFilePath: text("output_file_path"),
    durationSeconds: integer("duration_seconds"),
    createdAt: integer("created_at", { mode: "timestamp" })
      .default(sql`(unixepoch())`)
      .notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp" }).$onUpdate(
      () => new Date(),
    ),
  },
  (t) => [index("podcast_status_idx").on(t.status)],
);

export const podcastCharacters = createTable(
  "podcast_character",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    podcastId: integer("podcast_id")
      .notNull()
      .references(() => podcasts.id),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id),
    role: text("role", { length: 50 }),
    modifier: text("modifier"),
  },
  (t) => [
    index("pc_podcast_idx").on(t.podcastId),
    index("pc_character_idx").on(t.characterId),
  ],
);

export const podcastSegments = createTable(
  "podcast_segment",
  {
    id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
    podcastId: integer("podcast_id")
      .notNull()
      .references(() => podcasts.id),
    characterId: integer("character_id")
      .notNull()
      .references(() => characters.id),
    orderIndex: integer("order_index").notNull(),
    text: text("text").notNull(),
    emotion: text("emotion", { length: 50 }),
    audioFilePath: text("audio_file_path"),
    durationMs: integer("duration_ms"),
    status: text("status", { length: 20 }).notNull().default("pending"),
  },
  (t) => [
    index("ps_podcast_idx").on(t.podcastId),
    index("ps_order_idx").on(t.orderIndex),
  ],
);

// Relations

export const charactersRelations = relations(characters, ({ many }) => ({
  podcastCharacters: many(podcastCharacters),
  podcastSegments: many(podcastSegments),
}));

export const booksRelations = relations(books, ({ many }) => ({
  podcasts: many(podcasts),
}));

export const podcastsRelations = relations(podcasts, ({ one, many }) => ({
  book: one(books, { fields: [podcasts.bookId], references: [books.id] }),
  podcastCharacters: many(podcastCharacters),
  podcastSegments: many(podcastSegments),
}));

export const podcastCharactersRelations = relations(
  podcastCharacters,
  ({ one }) => ({
    podcast: one(podcasts, {
      fields: [podcastCharacters.podcastId],
      references: [podcasts.id],
    }),
    character: one(characters, {
      fields: [podcastCharacters.characterId],
      references: [characters.id],
    }),
  }),
);

export const podcastSegmentsRelations = relations(
  podcastSegments,
  ({ one }) => ({
    podcast: one(podcasts, {
      fields: [podcastSegments.podcastId],
      references: [podcasts.id],
    }),
    character: one(characters, {
      fields: [podcastSegments.characterId],
      references: [characters.id],
    }),
  }),
);
