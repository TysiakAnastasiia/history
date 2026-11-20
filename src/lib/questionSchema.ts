import { z } from 'zod'

// Чорновий варіант схеми питань. Детальну схему (факти, ігри, пояснення) робимо на етапі 1.
const base = z.object({
  id: z.string(),
  topic: z.number().int().min(1).max(32),
  prompt: z.string().min(1),
})

export const questionSchema = z.discriminatedUnion('type', [
  base.extend({
    type: z.literal('single'),
    options: z.array(z.string()).length(4),
    answer: z.number().int().min(0).max(3),
  }),
  base.extend({
    type: z.literal('matching'),
    left: z.array(z.string()).length(4),
    right: z.array(z.string()).length(5),
    answer: z.array(z.number().int()).length(4),
  }),
  base.extend({
    type: z.literal('sequence'),
    items: z.array(z.string()).length(4),
    answer: z.array(z.number().int()).length(4),
  }),
  base.extend({
    type: z.literal('multi3of7'),
    options: z.array(z.string()).length(7),
    answer: z.array(z.number().int()).length(3),
  }),
])

export type Question = z.infer<typeof questionSchema>
