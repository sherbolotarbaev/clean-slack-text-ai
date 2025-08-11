import { config } from './config.ts'

export const verifySlackSignature = async (
	request: Request
): Promise<boolean> => {
	const timestamp = request.headers.get('X-Slack-Request-Timestamp') || ''
	const signature = request.headers.get('X-Slack-Signature') || ''

	if (!config.slack.signingSecret) return false

	// Protect against replay attacks (5 min window)
	const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5
	if (!timestamp || Number(timestamp) < fiveMinutesAgo) return false

	const bodyText = await request.clone().text()
	const basestring = `v0:${timestamp}:${bodyText}`

	const encoder = new TextEncoder()
	const key = await crypto.subtle.importKey(
		'raw',
		encoder.encode(config.slack.signingSecret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	)
	const signatureBytes = await crypto.subtle.sign(
		'HMAC',
		key,
		encoder.encode(basestring)
	)
	const hex = Array.from(new Uint8Array(signatureBytes))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('')
	const computed = `v0=${hex}`

	// Use constant-time compare
	const enc = new TextEncoder()
	const a = enc.encode(signature)
	const b = enc.encode(computed)
	if (a.length !== b.length) return false
	let diff = 0
	for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
	return diff === 0
}

export const request = ({
	endpoint,
	method,
	body,
}: {
	endpoint: string
	method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
	body: string
}) => {
	return fetch(`${config.slack.apiUrl}${endpoint}`, {
		method,
		headers: {
			Authorization: `Bearer ${config.slack.token}`,
			'Content-Type': 'application/json',
		},
		body,
	})
}

export const sendMessage = async (text: string) => {
	const response = await request({
		endpoint: '/chat.postMessage',
		method: 'POST',
		body: JSON.stringify({ channel: config.slack.channel, text }),
	})
	return response.ok
}

export const respondEphemeral = async (
	responseUrl: string,
	text: string
): Promise<boolean> => {
	const response = await fetch(responseUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ response_type: 'ephemeral', text }),
	})
	return response.ok
}

export const replaceOriginalEphemeral = async (
	responseUrl: string,
	text: string
): Promise<boolean> => {
	const response = await fetch(responseUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			response_type: 'ephemeral',
			replace_original: true,
			text,
		}),
	})
	return response.ok
}

export const deleteOriginalResponse = async (
	responseUrl: string
): Promise<boolean> => {
	const response = await fetch(responseUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ delete_original: true }),
	})
	return response.ok
}
