import type { Context, Next } from 'jsr:@hono/hono@4.8.10'
import { Hono } from 'jsr:@hono/hono@4.8.10'

import { cleanText } from '../utils/openai.ts'
import { respondEphemeral, verifySlackSignature } from '../utils/slack.ts'

export const slackRoutes = new Hono()

const bodyCache = new WeakMap<Request, string>()

slackRoutes.use('/*', async (c: Context, next: Next) => {
	const bodyText = await c.req.raw.clone().text()
	bodyCache.set(c.req.raw, bodyText)
	const isValid = await verifySlackSignature(c.req.raw, bodyText)
	if (!isValid) return c.text('invalid signature', 401)
	await next()
})

slackRoutes.post('/clean', async (c: Context) => {
	const cached = bodyCache.get(c.req.raw)
	const bodyText = cached ?? (await c.req.raw.clone().text())

	try {
		const firstChar = bodyText.trimStart().charAt(0)
		if (firstChar !== '{') throw new Error('not json')
		const maybeJson = JSON.parse(bodyText) as {
			type?: string
			challenge?: string
		}
		if (maybeJson?.type === 'url_verification' && maybeJson.challenge) {
			return c.text(maybeJson.challenge)
		}
	} catch (_) {
		// ignore, it's a form body
	}

	const form = new URLSearchParams(bodyText)
	const userText = form.get('text') || ''
	const responseUrl = form.get('response_url') || ''

	;(async () => {
		const cleaned = userText ? await cleanText(userText) : 'No text provided.'
		await respondEphemeral(responseUrl, cleaned)
	})()

	return c.text('', 200)
})
