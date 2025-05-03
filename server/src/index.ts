import { Router } from 'itty-router';
export { MastermindGame } from './mastermind';

const router = Router();

// Mastermind game route

// route to /api/mastermind?gameId=<yourgameID>
router.get('/api/mastermind', (request: Request, env: Env) => {
	const gameId = new URL(request.url).searchParams.get('gameId');

	if (!gameId) {
		return new Response('Game ID is missing', { status: 400 });
	}

	const doId = env.MASTERMIND_GAMES.idFromName(gameId);
	const game = env.MASTERMIND_GAMES.get(doId);

	if (request.headers.get('Upgrade') != 'websocket') {
		return new Response('expected websocket', { status: 400 });
	}

	return game.fetch(request.clone());
});

// Handle all other routes
router.all('*', () => new Response('Not found', { status: 404 }));

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		return router.fetch(request, env);
	},
} satisfies ExportedHandler<Env>;
