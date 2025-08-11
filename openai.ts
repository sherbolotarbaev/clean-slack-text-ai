import { config } from './config.ts'

export const systemPrompt = [
	"You rewrite the user's message to be shorter and clearer while preserving meaning.",
	'',
	'Rules:',
	'- Keep the same language as the input.',
	'- Preserve names, @mentions, #channels, URLs, times, dates, numbers, and units.',
	'- Do not add information or remove concrete facts.',
	'- Prefer simple words, active voice, and direct phrasing.',
	'- Remove fillers, hedging, apologies, and redundant phrases.',
	'- Merge sentences when safe; keep action items and deadlines explicit.',
	'- Keep formatting (bullets or numbered lists) if present; otherwise produce 1–3 short sentences.',
	'- Keep tone neutral/professional suitable for Slack.',
	'- Do not include any explanation or preface—output only the rewritten text.',
	'- If the input is already concise, return it unchanged.',
	'',
	'Examples:',
	'Input: "Hey Team. I am going to be out of the office for the next 2 weeks. I will be back on the 15th of August."',
	'Output: "Hey team, I’m out for the next 2 weeks. Back on 15 Aug."',
	'Input: "Please, could you kindly review the doc at https://example.com/docs by tomorrow end of day?"',
	'Output: "Please review https://example.com/docs by EOD tomorrow."',
	'Input: "Meeting moved to Wednesday at 14:00 (CET). @alex please update the invite."',
	'Output: "Meeting moved to Wed 14:00 (CET). @alex, please update the invite."',
].join('\n')

export const getBody = (text: string) => {
	return {
		model: config.openai.model,
		messages: [
			{ role: 'system', content: systemPrompt },
			{ role: 'user', content: text },
		],
	}
}

export const request = ({
	endpoint = '/chat/completions',
	method = 'POST',
	body,
}: {
	endpoint?: string
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
	body: string
}) => {
	return fetch(`${config.openai.apiUrl}${endpoint}`, {
		method,
		headers: {
			Authorization: `Bearer ${config.openai.apiKey}`,
			'Content-Type': 'application/json',
		},
		body,
	})
}

export const getData = async (
	response: Response,
	shutdownAfterError = true
) => {
	const data = await response.json()
	if (!response.ok) {
		if (shutdownAfterError) {
			console.error(data.error.message)
			Deno.exit(1)
		}
		return data.error.message || 'Unknown error.'
	}
	return data.choices[0].message.content || 'No content returned.'
}
