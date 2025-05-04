import React, { useEffect, useState } from "react";
import websocketService from "@/service/webSocketService";

// Define game state types
interface Player {
  name: string;
  id: string;
}

interface GameState {
  secretCode: any[];
  currentRound: number;
  maxRounds: number;
  players: Player[];
  guesses: any[];
  gameStatus: string;
  currentPlayerIndex: number;
}

interface GameStateMessage {
  type: string;
  state: GameState;
}

export default function GameStateCard() {
  // Set up state
  const [gameState, setGameState] = useState<GameState>({
    secretCode: [],
    currentRound: 0,
    maxRounds: 0,
    players: [],
    guesses: [],
    gameStatus: "waiting",
    currentPlayerIndex: 0,
  });

  // Debug state to track WebSocket connection
  const [connectionStatus, setConnectionStatus] =
    useState<string>("initializing");

  useEffect(() => {
    console.log("GameStateCard mounted, setting up WebSocket listener");

    // Check WebSocket connection
    const isConnected = websocketService.getConnectionState();
    setConnectionStatus(isConnected ? "connected" : "disconnected");
    console.log(
      "WebSocket connection status:",
      isConnected ? "connected" : "disconnected"
    );

    // Check for cached game state
    const cachedGameState = websocketService.getLatestGameState();
    if (cachedGameState && cachedGameState.state) {
      console.log("Using cached game state:", cachedGameState);
      setGameState(cachedGameState.state);
    }

    // Subscribe to WebSocket messages
    websocketService.onMessage((data) => {
      // Handle received messages
      handleWebSocketMessage(data);
    });

    // Request game state update if needed

    // Cleanup work when component unmounts
    return () => {
      console.log("GameStateCard unmounting");
    };
  }, []);

  const handleWebSocketMessage = (data: any) => {
    console.log("Received WebSocket message:", data);

    // Handle different message types
    if (data && data.type === "game_state") {
      const newGameState = data.state as GameState;
      console.log("Game state updated:", newGameState);
      console.log("Players in game state:", newGameState.players);

      setGameState(newGameState);
    }
    // Handle player_joined messages directly
    else if (data && data.type === "player_joined" && data.player) {
      console.log("Player joined:", data.player);

      // Update the players array directly
      setGameState((prevState) => {
        // Check if this player is already in the array
        const playerExists =
          prevState.players &&
          prevState.players.some((p) => p.id === data.player.id);

        if (!playerExists) {
          const updatedPlayers = [...(prevState.players || []), data.player];
          console.log("Updated players array:", updatedPlayers);

          return {
            ...prevState,
            players: updatedPlayers,
          };
        }

        return prevState;
      });
    }
  };

  // Get current player
  const getCurrentPlayer = () => {
    return gameState.players && gameState.players.length > 0
      ? gameState.players[gameState.currentPlayerIndex]
      : null;
  };

  // Get game status text
  const getGameStatusText = () => {
    switch (gameState.gameStatus) {
      case "waiting":
        return "Waiting";
      case "playing":
        return "Playing";
      case "finished":
        return "Finished";
      default:
        return gameState.gameStatus;
    }
  };

  // Get status badge color
  const getStatusBadgeColor = () => {
    switch (gameState.gameStatus) {
      case "waiting":
        return "bg-yellow-500";
      case "playing":
        return "bg-green-500";
      case "finished":
        return "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  // Force refresh function
  const forceRefresh = () => {
    console.log("Force refreshing game state...");
    websocketService.sendMessage({ type: "request_game_state" });
  };

  const handleStartGame = () => {
    websocketService.sendMessage({ type: "start_game" });
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Game Status</h2>
        <div className="flex items-center">
          <div
            className={`w-3 h-3 rounded-full ${
              connectionStatus === "connected" ? "bg-green-500" : "bg-red-500"
            } mr-2`}
          ></div>
          <span className="text-gray-300 text-sm mr-2">
            {connectionStatus === "connected" ? "Live" : "Connecting..."}
          </span>
          <button
            onClick={forceRefresh}
            className="text-blue-400 hover:text-blue-300 text-sm"
            title="Refresh game state"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Game info card */}
      <div className="bg-gray-700 rounded-lg p-4 mb-4">
        <div className="flex justify-between items-center mb-3">
          <div className="text-gray-300 font-medium">Status</div>
          <div
            className={`px-3 py-1 rounded-full ${getStatusBadgeColor()} text-white text-sm font-medium`}
          >
            {getGameStatusText()}
          </div>
        </div>
        <div className="flex justify-between items-center mb-3">
          <div className="text-gray-300 font-medium">Round</div>
          <div className="text-white font-bold">
            {gameState.currentRound} / {gameState.maxRounds}
          </div>
        </div>

        {/* Game status message */}
        {gameState.gameStatus === "waiting" && (
          <div className="mt-3 text-sm text-center">
            {!gameState.players || gameState.players.length < 2 ? (
              <div className="text-yellow-400">
                Waiting for another player to join...
              </div>
            ) : (
              <div>
                <div className="text-green-400 mb-2">
                  All players joined! Ready to start the game.
                </div>
                <button
                  onClick={handleStartGame}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Start Game
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Current player info */}
      {getCurrentPlayer() && (
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <div className="text-gray-300 font-medium mb-2">Current Player</div>
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold mr-3">
              {getCurrentPlayer()?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-white font-medium">
                {getCurrentPlayer()?.name}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Players list */}
      <div className="bg-gray-700 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <div className="text-gray-300 font-medium">Players</div>
          <div className="px-3 py-1 rounded-full bg-blue-500 text-white text-sm font-medium">
            {gameState.players ? gameState.players.length : 0}/2
          </div>
        </div>

        <div className="space-y-3">
          {gameState.players && gameState.players.length > 0 ? (
            gameState.players.map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center p-2 rounded-lg ${
                  index === gameState.currentPlayerIndex ? "bg-gray-600" : ""
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full ${
                    index === gameState.currentPlayerIndex
                      ? "bg-green-500"
                      : "bg-gray-500"
                  } flex items-center justify-center text-white font-medium mr-2`}
                >
                  {player.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-white text-sm font-medium">
                    {player.name}
                  </div>
                </div>
                {index === gameState.currentPlayerIndex && (
                  <div className="text-xs text-green-400 font-medium">
                    Active
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-center py-4">
              Loading players...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
