import { DurableObject } from 'cloudflare:workers';
import { WebSocketHeartbeat } from './heartbeat';

const MAX_ROUNDS = 7;
const MAX_CODE_LENGTH = 4;
const Colors = ['red', 'blue', 'green', 'yellow', 'purple', 'pink'];

// Define types
type GameState = {
	secretCode: ColorPeg[];
	currentRound: number;
	maxRounds: number;
	players: Player[];
	guesses: GuessRecord[];
	gameStatus: 'waiting' | 'playing' | 'won' | 'lost';
	currentPlayerIndex: number;
};

type Player = {
	// name must be unique
	name: string;
	// id will be auto generated
	id: string;
};

type ColorPeg = (typeof Colors)[number];

type GuessRecord = {
	playerId: string;
	playerName: string;
	guess: ColorPeg[];
	feedback: GuessFeedback;
	round: number;
};

type GuessFeedback = {
	correctPostionAndColor: number; // full correct - right color, right position
	correctColors: number; // half correct - right color, wrong position
};

// Message types
// sent by server
type GameMessage =
	| { type: 'player_joined'; player: Player }
	| { type: 'player_left'; playerId: string }
	| { type: 'game_started'; firstPlayer: string }
	| { type: 'guess_submitted'; guess: GuessRecord }
	| { type: 'game_won'; winner: Player; secretCode: ColorPeg[] }
	| { type: 'game_lost'; secretCode: ColorPeg[] }
	| { type: 'player_turn'; playerName: string; playerId: string }
	| { type: 'game_state'; state: GameState }
	| { type: 'player_list'; players: Player[] };

// sent by client
type ClientMessage =
	| { type: 'join'; playerName: string }
	| { type: 'reset' }
	| { type: 'start_game' }
	| { type: 'submit_guess'; guess: ColorPeg[] };

export class MastermindGame extends DurableObject {
	private gameState: GameState;
	private wsToPlayerMap = new Map<WebSocket, string>();
	private heartbeat: WebSocketHeartbeat;

	constructor(ctx: DurableObjectState, env: any) {
		super(ctx, env);

		// Initialize with default state
		this.gameState = {
			secretCode: [],
			currentRound: 0,
			maxRounds: MAX_ROUNDS,
			players: [],
			guesses: [],
			gameStatus: 'waiting',
			currentPlayerIndex: 0,
		};
		this.heartbeat = new WebSocketHeartbeat(5000); // 5 sec
	}

	async fetch(request: Request) {
		console.log('receive new ws connection');

		// this.gamestate will be changed inside after this
		await this.loadGameState();
		console.log('game state loaded, players: ', JSON.stringify(this.gameState.players));
		// Create WebSocket pair
		let [client, server] = Object.values(new WebSocketPair());
		this.ctx.acceptWebSocket(server);

		console.log('Note: Player should first trigger join to register ID in Map');

		// heart beat start
		this.heartbeat.startHeartbeat(server);

		// Send current game state to new connection
		const initialState: GameMessage = {
			type: 'game_state',
			// state: this.hideSecretCode(this.gameState),
			// here is already changed gamestate
			state: this.gameState,
		};
		server.send(JSON.stringify(initialState));

		return new Response(null, { status: 101, webSocket: client });
	}

	async webSocketMessage(ws: WebSocket, message: string) {
		try {
			const data = JSON.parse(message) as ClientMessage;

			switch (data.type) {
				case 'join':
					await this.handlePlayerJoin(ws, data.playerName);
					break;
				case 'reset':
					await this.resetGame();
					break;
				case 'start_game':
					await this.handleGameStart();
					break;
				case 'submit_guess':
					await this.handleGuess(ws, data.guess);
					break;
			}
		} catch (error) {
			console.error('Error processing message:', error);
		}
	}

	private async resetGame() {
		this.gameState = {
			secretCode: [],
			currentRound: 0,
			maxRounds: MAX_ROUNDS,
			players: [],
			guesses: [],
			gameStatus: 'waiting',
			currentPlayerIndex: 0,
		};

		this.broadcastMessage({
			type: 'game_state',
			state: this.gameState,
		});

		await this.saveGameState();
		console.log('game reset done');
	}

	async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
		// stop heart beat for this player
		this.heartbeat.stopHeartbeat(ws);
		// Handle player disconnection
		await this.handlePlayerLeft(ws);
		ws.close(code, 'Durable Object is closing WebSocket');
	}

	// Game logic methods
	private async handlePlayerJoin(ws: WebSocket, playerName: string) {
		if (!playerName) {
			console.log('player name is missing');
			return;
		}

		if (this.gameState.gameStatus !== 'waiting') {
			console.log(`game is ${this.gameState.gameStatus} cant join yet`);
			return;
		}

		const existingNameIndex = this.gameState.players.findIndex((p) => p.name === playerName);
		// if player name already exists
		if (existingNameIndex !== -1) {
			console.log(`player with name ${playerName} already joined`);
			return;
		}

		const playerId = crypto.randomUUID();
		// send back playerId to client
		ws.send(JSON.stringify({ type: 'player_id', playerId }));

		// record relationship of playerID and ws
		this.wsToPlayerMap.set(ws, playerId);

		// TODO allow user to rejoin in the middle of the game if they have the same ID

		// Check if player is already in the game
		const existingPlayerIndex = this.gameState.players.findIndex((p) => p.id === playerId);
		if (existingPlayerIndex === -1) {
			// Add new player if we have less than 2
			if (this.gameState.players.length < 2) {
				const newPlayer: Player = { name: playerName, id: playerId };
				this.gameState.players.push(newPlayer);

				console.log(`player ${newPlayer.name} joined`);

				// Broadcast player joined
				this.broadcastMessage({
					type: 'player_joined',
					player: newPlayer,
				});

				this.broadcastMessage({
					type: 'game_state',
					state: this.gameState,
				});

				// Save game state
				await this.saveGameState();
			} else {
				console.log('cant have more than 2 players');
			}
		} else {
			console.log('player with same ID already joined');
		}
	}

	private async handlePlayerLeft(ws: WebSocket) {
		const playerId = this.wsToPlayerMap.get(ws);

		if (!playerId) {
			console.log('leaving player has no ID');
			return;
		}

		this.wsToPlayerMap.delete(ws);

		const playerIndex = this.gameState.players.findIndex((p) => p.id === playerId);

		if (playerIndex === -1) {
			console.log(`cant find leaving player ID ${playerId} in players{}, it's not in the room`);
			return;
		}
		// if player is not in room, we dont need to go through the deletion process
		// for a specific game room, which are the rest of the code

		this.gameState.players.splice(playerIndex, 1);

		if (this.gameState.gameStatus === 'playing') {
			if (this.gameState.currentPlayerIndex === playerIndex) {
				//change player index to next player
				this.gameState.currentPlayerIndex = this.gameState.currentPlayerIndex % this.gameState.players.length;
			} else if (this.gameState.currentPlayerIndex > playerIndex) {
				this.gameState.currentPlayerIndex--;
			}
		}

		this.broadcastMessage({
			type: 'player_left',
			playerId: playerId,
		});

		this.broadcastMessage({
			type: 'game_state',
			state: this.gameState,
		});

		await this.saveGameState();

		console.log(`player with ID ${playerId} left room`);
	}

	private async handleGameStart() {
		// Only start if we have 2 players and game is in waiting status
		if (this.gameState.players.length !== 2 || this.gameState.gameStatus !== 'waiting') {
			console.log('cant start game yet');
			return;
		}
		console.log('starting game...');

		// Generate secret code
		this.gameState.secretCode = this.generateSecretCode();
		this.gameState.gameStatus = 'playing';
		this.gameState.currentPlayerIndex = 0; // First player starts

		// Broadcast game started
		this.broadcastMessage({
			type: 'game_started',
			firstPlayer: this.gameState.players[0].id,
		});

		// Broadcast whose turn it is
		this.broadcastMessage({
			type: 'player_turn',
			playerName: this.gameState.players[0].name,
			playerId: this.gameState.players[0].id,
		});

		this.broadcastMessage({
			type: 'game_state',
			state: this.gameState,
		});

		// Save game state
		await this.saveGameState();
	}

	private async handleGuess(ws: WebSocket, guessColors: ColorPeg[]) {
		const playerId = this.wsToPlayerMap.get(ws);
		if (!playerId) {
			console.log('no playerID');
			return;
		}
		// Validate we're in a playing state
		if (this.gameState.gameStatus !== 'playing') {
			return;
		}

		// Get current player
		const currentPlayer = this.gameState.players[this.gameState.currentPlayerIndex];

		if (currentPlayer.id !== playerId) {
			console.log("not this player's turn");
			return;
		}

		// Validate guess format (must be MAX_CODELENGTH colors)
		if (!guessColors || guessColors.length !== MAX_CODE_LENGTH) {
			console.log(`invalid guess format, must be ${MAX_CODE_LENGTH} colors`);
			return;
		}

		// Calculate feedback for this guess
		const feedback = this.calculateFeedback(guessColors);

		// Record this guess
		const guessRecord: GuessRecord = {
			playerId: currentPlayer.id,
			playerName: currentPlayer.name,
			guess: guessColors,
			feedback,
			round: this.gameState.currentRound,
		};

		this.gameState.guesses.push(guessRecord);

		// Broadcast the guess to all players
		this.broadcastMessage({
			type: 'guess_submitted',
			guess: guessRecord,
		});

		// Check if the guess was correct (all pegs in correct position)
		if (feedback.correctPostionAndColor === MAX_CODE_LENGTH) {
			// Game won!
			this.gameState.gameStatus = 'won';
			this.broadcastMessage({
				type: 'game_won',
				winner: currentPlayer,
				secretCode: this.gameState.secretCode,
			});
			console.log(`player ${currentPlayer.name} won the game!`);
		} else {
			// Switch player turn
			this.gameState.currentPlayerIndex = (this.gameState.currentPlayerIndex + 1) % this.gameState.players.length;

			// increment round
			this.gameState.currentRound += 1;

			// Check if we've reached max rounds
			if (this.gameState.currentRound > this.gameState.maxRounds) {
				this.gameState.gameStatus = 'lost';
				this.broadcastMessage({
					type: 'game_lost',
					secretCode: this.gameState.secretCode,
				});
				console.log('game over, no more rounds left');
			} else {
				// Broadcast whose turn it is now
				this.broadcastMessage({
					type: 'player_turn',
					playerName: this.gameState.players[this.gameState.currentPlayerIndex].name,
					playerId: this.gameState.players[this.gameState.currentPlayerIndex].id,
				});
				console.log(`player ${this.gameState.players[this.gameState.currentPlayerIndex].name}'s turn now`);
			}
		}

		this.broadcastMessage({
			type: 'game_state',
			state: this.gameState,
		});

		// Save game state
		await this.saveGameState();
	}

	// Helper methods
	private generateSecretCode(): ColorPeg[] {
		if (!Array.isArray(Colors)) {
			console.log('Colors must be an array');
			return [];
		}

		// create a copy of colors array and shuffle it

		let colorsCopy = [...Colors];
		let currentIndex = colorsCopy.length;

		// Shuffle the colors array using Fisher-Yates algorithm
		while (currentIndex != 0) {
			// Pick a remaining element...
			let randomIndex = Math.floor(Math.random() * currentIndex);
			currentIndex--;

			// And swap it with the current element.
			[colorsCopy[currentIndex], colorsCopy[randomIndex]] = [colorsCopy[randomIndex], colorsCopy[currentIndex]];
		}

		console.log('shuffled colors: ', colorsCopy);

		// Generate max lenth of random colors
		return colorsCopy.slice(0, MAX_CODE_LENGTH) as ColorPeg[];
	}

	private calculateFeedback(guess: ColorPeg[]): GuessFeedback {
		console.log('calculate feedback for guess: ');
		const secretCode = [...this.gameState.secretCode];
		console.log('secret code: ', secretCode);
		const guessCopy = [...guess];
		console.log('guess: ', guessCopy);
		let correctPostionAndColor = 0;
		let correctColors = 0;

		if (guessCopy.length !== secretCode.length) {
			console.log('guess and secret code length mismatch');
			return { correctPostionAndColor: 0, correctColors: 0 };
		}

		// First pass: Count full correct (correct color and position)
		for (let i = 0; i < secretCode.length; i++) {
			if (guessCopy[i] === secretCode[i]) {
				correctPostionAndColor++;
				console.log(`full correct: ${i}, guessed:${guessCopy[i]}, correct is:${secretCode[i]}`);
			}
		}
		// Second pass: Count correct colors
		for (let i = 0; i < secretCode.length; i++) {
			if (guessCopy.includes(secretCode[i])) {
				correctColors++;
				console.log(`color correct: ${secretCode[i]}`);
			}
		}

		correctColors = correctColors - correctPostionAndColor; // Remove full correct from color count

		return { correctPostionAndColor, correctColors };
	}

	private hideSecretCode(state: GameState): GameState {
		// Don't send the secret code to clients unless game is over
		if (state.gameStatus === 'playing' || state.gameStatus === 'waiting') {
			return {
				...state,
				secretCode: [], // Hide the code
			};
		}
		return state;
	}

	private broadcastMessage(message: GameMessage) {
		const websockets = this.ctx.getWebSockets();
		const messageString = JSON.stringify(message);

		for (const socket of websockets) {
			socket.send(messageString);
		}
	}

	private async saveGameState() {
		await this.ctx.storage.put('game-state', this.gameState);
	}

	private async loadGameState() {
		const state = await this.ctx.storage.get<GameState>('game-state');
		if (state) {
			this.gameState = state;
		}
	}
}
