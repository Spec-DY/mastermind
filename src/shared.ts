export type Message =
  | {
      type: "create_room";
      roomId: string;
      hostId: string;
      hostName: string;
    }
  | {
      type: "join_room";
      roomId: string;
      playerId: string;
      playerName: string;
    }
  | {
      type: "room_joined";
      roomId: string;
      gameState: GameState;
      players: Player[];
    }
  | {
      type: "game_update";
      roomId: string;
      gameState: GameState;
    }
  | {
      type: "player_left";
      roomId: string;
      playerId: string;
    }
  | {
      type: "leave_room";
      roomId: string;
      playerId: string;
    };

export type Player = {
  id: string;
  name: string;
  isHost: boolean;
};

export type GameState = {
  status: "waiting" | "playing" | "finished";
  currentTurn?: string; // player ID of whose turn it is
  secretCode?: number[]; // Only available to code creator
  guesses: Array<{
    playerId: string;
    guess: number[];
    feedback: Array<"correct" | "misplaced" | "incorrect">;
  }>;
  winner?: string; // player ID of winner, if any
};

export type Room = {
  id: string;
  players: Player[];
  gameState: GameState;
};

export const names = [
  "Alice",
  "Bob",
  "Charlie",
  "David",
  "Eve",
  "Frank",
  "Grace",
  "Heidi",
  "Ivan",
  "Judy",
  "Kevin",
  "Linda",
  "Mallory",
  "Nancy",
  "Oscar",
  "Peggy",
  "Quentin",
  "Randy",
  "Steve",
  "Trent",
  "Ursula",
  "Victor",
  "Walter",
  "Xavier",
  "Yvonne",
  "Zoe",
];
