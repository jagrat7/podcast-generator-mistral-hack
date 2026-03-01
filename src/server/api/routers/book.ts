import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { books } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import type { Chapter } from "~/server/pipeline/types";
import { parseEpub } from "~/server/pipeline/epub-parser";

export const bookRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.books.findMany({
      orderBy: [desc(books.createdAt)],
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.books.findFirst({
        where: eq(books.id, input.id),
      });
    }),

  getChapters: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const book = await ctx.db.query.books.findFirst({
        where: eq(books.id, input.id),
      });

      if (!book) return [];

      const chapters = JSON.parse(book.chaptersJson) as Chapter[];

      // Return only index and title for efficiency
      return chapters.map((c) => ({
        index: c.index,
        title: c.title,
      }));
    }),

  reparse: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const book = await ctx.db.query.books.findFirst({
        where: eq(books.id, input.id),
      });

      if (!book) {
        throw new Error("Book not found");
      }

      console.log(`[book.reparse] Re-parsing book ${input.id}: ${book.filePath}`)
      
      const { bookTitle, chapters } = await parseEpub(book.filePath);

      await ctx.db
        .update(books)
        .set({
          title: bookTitle,
          chaptersJson: JSON.stringify(chapters),
        })
        .where(eq(books.id, input.id));

      return {
        bookId: input.id,
        bookTitle,
        chapterCount: chapters.length,
        totalChars: chapters.reduce((sum, c) => sum + c.text.length, 0),
      };
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(books).where(eq(books.id, input.id));
      return { success: true };
    }),
});
