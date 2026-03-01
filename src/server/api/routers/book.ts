import { z } from "zod"
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc"
import { books } from "~/server/db/schema"
import { eq, desc } from "drizzle-orm"
import type { Chapter } from "~/server/pipeline/types"

export const bookRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.books.findMany({
      orderBy: [desc(books.createdAt)],
    })
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.books.findFirst({
        where: eq(books.id, input.id),
      })
    }),

  getChapters: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const book = await ctx.db.query.books.findFirst({
        where: eq(books.id, input.id),
      })

      if (!book) return []

      const chapters = JSON.parse(book.chaptersJson) as Chapter[]
      
      // Return only index and title for efficiency
      return chapters.map(c => ({
        index: c.index,
        title: c.title,
      }))
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(books).where(eq(books.id, input.id))
      return { success: true }
    }),
})
