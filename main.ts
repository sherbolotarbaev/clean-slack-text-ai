import { getBody, getData, request as openaiRequest } from './openai.ts'
import { respondEphemeral, verifySlackSignature } from './slack.ts'

const clearText = async (text: string): Promise<string> => {
	const response = await openaiRequest({
		body: JSON.stringify(getBody(text)),
	})
	return getData(response, false)
}

const parseFormBody = async (req: Request): Promise<URLSearchParams> => {
	const text = await req.text()
	return new URLSearchParams(text)
}

const handler = async (req: Request): Promise<Response> => {
	const url = new URL(req.url)

	if (url.pathname === '/slack/clear' && req.method === 'POST') {
		const isValid = await verifySlackSignature(req)
		if (!isValid) return new Response('invalid signature', { status: 401 })

		const form = await parseFormBody(req.clone())

		// URL verification for Events API (just in case)
		try {
			const maybeJson = JSON.parse(await req.clone().text()) as {
				type?: string
				challenge?: string
			}
			if (maybeJson?.type === 'url_verification' && maybeJson.challenge) {
				return new Response(maybeJson.challenge, {
					headers: { 'Content-Type': 'text/plain' },
				})
			}
		} catch (_) {
			// ignore, it's a form body
		}

		const userText = form.get('text') || ''
		const responseUrl = form.get('response_url') || ''

		// Acknowledge immediately
		const ack = new Response(
			JSON.stringify({ response_type: 'ephemeral', text: 'Cleaning…' }),
			{
				headers: { 'Content-Type': 'application/json' },
			}
		)

		// Process in background
		;(async () => {
			const cleaned = userText ? await clearText(userText) : 'No text provided.'
			await respondEphemeral(responseUrl, cleaned)
		})()

		return ack
	}

	return new Response('Not Found', { status: 404 })
}

Deno.serve({ port: 8787 }, handler)
