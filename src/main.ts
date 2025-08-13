import { Hono } from 'jsr:@hono/hono@4.8.10'

import { routes } from './routes/index.ts'

const app = new Hono()

app.route('/', routes)

Deno.serve({ port: 8787 }, app.fetch)
