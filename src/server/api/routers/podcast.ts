import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import {
  podcasts,
  podcastCharacters,
  podcastSegments,
} from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { PODCAST_FORMATS } from "~/lib/constants";
import { podcastWorkflow } from "~/server/pipeline/podcast-workflow";

export const podcastRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.podcasts.findMany({
      orderBy: [desc(podcasts.createdAt)],
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const podcast = await ctx.db.query.podcasts.findFirst({
        where: eq(podcasts.id, input.id),
      });

      if (!podcast) return null;

      const characters = await ctx.db.query.podcastCharacters.findMany({
        where: eq(podcastCharacters.podcastId, input.id),
        with: {
          character: true,
        },
      });

      const segments = await ctx.db.query.podcastSegments.findMany({
        where: eq(podcastSegments.podcastId, input.id),
        orderBy: [podcastSegments.orderIndex],
        with: {
          character: true,
        },
      });

      return {
        ...podcast,
        characters,
        segments,
      };
    }),

  getStatus: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const podcast = await ctx.db.query.podcasts.findFirst({
        where: eq(podcasts.id, input.id),
      });

      if (!podcast) return null;

      return {
        status: podcast.status,
        progress: podcast.progress,
        errorMessage: podcast.errorMessage,
        outputFilePath: podcast.outputFilePath,
      };
    }),

  create: publicProcedure
    .input(
      z.object({
        title: z.string().min(1),
        bookId: z.number(),
        chapterIndex: z.number(),
        chapterTitle: z.string(),
        format: z.enum(PODCAST_FORMATS),
        characterIds: z.array(z.number()).min(2).max(6),
        characterRoles: z.record(z.string(), z.string()).optional(),
        characterModifiers: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create podcast record
      const [podcast] = await ctx.db
        .insert(podcasts)
        .values({
          title: input.title,
          bookId: input.bookId,
          chapterIndex: input.chapterIndex,
          chapterTitle: input.chapterTitle,
          format: input.format,
          status: "pending",
          progress: 0,
        })
        .returning();

      // Create podcast-character associations
      for (const characterId of input.characterIds) {
        await ctx.db.insert(podcastCharacters).values({
          podcastId: podcast!.id,
          characterId,
          role: input.characterRoles?.[characterId.toString()] ?? null,
          modifier: input.characterModifiers?.[characterId.toString()] ?? null,
        });
      }

      // Start workflow (fire and forget)
      void podcastWorkflow(podcast!.id);

      return podcast;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Delete segments first
      await ctx.db
        .delete(podcastSegments)
        .where(eq(podcastSegments.podcastId, input.id));

      // Delete character associations
      await ctx.db
        .delete(podcastCharacters)
        .where(eq(podcastCharacters.podcastId, input.id));

      // Delete podcast
      await ctx.db.delete(podcasts).where(eq(podcasts.id, input.id));

      return { success: true };
    }),
});
