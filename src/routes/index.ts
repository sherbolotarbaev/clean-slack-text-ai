import type { Context } from 'jsr:@hono/hono@4.8.10'
import { Hono } from 'jsr:@hono/hono@4.8.10'
import { slackRoutes } from './slack.ts'

export const routes = new Hono()

routes.get('/healthz', (c: Context) => c.text('ok'))

routes.route('/slack', slackRoutes)
