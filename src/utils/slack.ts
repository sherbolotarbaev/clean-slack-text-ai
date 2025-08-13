import { config } from '../config.ts'

const encoder = new TextEncoder()
let cachedSigningKey: CryptoKey | null = null

const getSigningKey = async (): Promise<CryptoKey | null> => {
	if (!config.slack.signingSecret) return null
	if (cachedSigningKey) return cachedSigningKey
	cachedSigningKey = await crypto.subtle.importKey(
		'raw',
		encoder.encode(config.slack.signingSecret),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	)
	return cachedSigningKey
}

export const verifySlackSignature = async (
	req: Request,
	bodyTextOverride?: string
): Promise<boolean> => {
	const timestamp = req.headers.get('X-Slack-Request-Timestamp') || ''
	const signature = req.headers.get('X-Slack-Signature') || ''

	const key = await getSigningKey()
	if (!key) return false

	// Protect against replay attacks (5 min window)
	const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5
	if (!timestamp || Number(timestamp) < fiveMinutesAgo) return false

	const bodyText = bodyTextOverride ?? (await req.clone().text())
	const basestring = `v0:${timestamp}:${bodyText}`

	const signatureBytes = await crypto.subtle.sign(
		'HMAC',
		key,
		encoder.encode(basestring)
	)
	const hex = Array.from(new Uint8Array(signatureBytes))
		.map(b => b.toString(16).padStart(2, '0'))
		.join('')
	const computed = `v0=${hex}`

	const a = encoder.encode(signature)
	const b = encoder.encode(computed)
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
