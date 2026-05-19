import { z } from 'zod'

const Env = z.object({
  VITE_SUPABASE_URL: z.string().url(),
  VITE_SUPABASE_ANON_KEY: z.string().min(20),
})

const parsed = Env.safeParse(import.meta.env)

if (!parsed.success) {
  console.error('Invalid env:', parsed.error.flatten().fieldErrors)
  throw new Error('Missing or invalid environment variables — see console')
}

export const env = parsed.data
