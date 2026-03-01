import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { characters } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";

export const characterRouter = createTRPCRouter({
  list: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.characters.findMany({
      orderBy: [desc(characters.createdAt)],
    });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.characters.findFirst({
        where: eq(characters.id, input.id),
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        personality: z.string().min(20),
        speakingStyle: z.string().optional(),
        speakingQuirks: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [character] = await ctx.db
        .insert(characters)
        .values({
          name: input.name,
          personality: input.personality,
          speakingStyle: input.speakingStyle ?? null,
          speakingQuirks: input.speakingQuirks ?? null,
        })
        .returning();

      return character;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        personality: z.string().min(20).optional(),
        speakingStyle: z.string().optional(),
        speakingQuirks: z.string().optional(),
        audioSamplesJson: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // If audio samples changed, clear cached voice ID
      const updates: Record<string, any> = { ...data };
      if (data.audioSamplesJson !== undefined) {
        updates.elevenLabsVoiceId = null;
      }

      const [character] = await ctx.db
        .update(characters)
        .set(updates)
        .where(eq(characters.id, id))
        .returning();

      return character;
    }),

  delete: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(characters).where(eq(characters.id, input.id));
      return { success: true };
    }),
});
