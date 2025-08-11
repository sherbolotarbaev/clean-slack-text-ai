import { config } from './config.ts'

export const systemPrompt =
	`You are given a text and you need to make it as clear and as concise as possible. Remove all the unnecessary words and phrases. Make it short but without losing the meaning.` +
	'\n\n' +
	`E.g.: "Hey Team. I am going to be out of the office for the next 2 weeks. I will be back on the 15th of August." -> "hey team. im gonna be out for next 2 weeks. i'll be back on 15 Aug."`

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
