import 'jsr:@std/dotenv/load'

export const config = {
	slack: {
		token: Deno.env.get('SLACK_BOT_TOKEN'),
		channel: Deno.env.get('SLACK_CHANNEL_ID'),
		signingSecret: Deno.env.get('SLACK_SIGNING_SECRET'),
		apiUrl: 'https://slack.com/api',
	},
	openai: {
		apiKey: Deno.env.get('OPENAI_API_KEY'),
		apiUrl: 'https://api.openai.com/v1',
		model: 'gpt-4o',
	},
}
