import React, { useState, useEffect } from "react";
import websocketService from "@/service/webSocketService";
import { useUser } from "@/context/UserContext";

// Define color constants
const COLORS = ["red", "blue", "green", "yellow", "purple", "pink"];

// Define types
interface Player {
  name: string;
  id: string;
}

interface Feedback {
  correctPostionAndColor: number;
  correctColors: number;
}

interface Guess {
  playerId: string;
  playerName: string;
  guess: string[];
  feedback: Feedback;
  round: number;
}

interface GameState {
  secretCode: string[];
  currentRound: number;
  maxRounds: number;
  players: Player[];
  guesses: Guess[];
  gameStatus: string;
  currentPlayerIndex: number;
}

interface PlayerTurn {
  playerName: string;
  playerId: string;
}

export default function GameBoard() {
  const { username } = useUser();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentTurn, setCurrentTurn] = useState<PlayerTurn | null>(null);
  const [currentGuess, setCurrentGuess] = useState<string[]>(["", "", "", ""]);
  const [selectedPegIndex, setSelectedPegIndex] = useState<number | null>(null);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<string | null>(null);

  // Initialize the component
  useEffect(() => {
    // Subscribe to WebSocket messages
    websocketService.onMessage((data) => {
      handleWebSocketMessage(data);
    });

    // Get initial game state
    const cachedGameState = websocketService.getLatestGameState();
    if (cachedGameState && cachedGameState.state) {
      setGameState(cachedGameState.state);
      checkGameOver(cachedGameState.state);
    }

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = (data: any) => {
    if (data && data.type === "game_state") {
      setGameState(data.state);
      checkGameOver(data.state);
    } else if (data && data.type === "player_turn") {
      setCurrentTurn({
        playerName: data.playerName,
        playerId: data.playerId,
      });
    }
  };

  // Check if game is over
  const checkGameOver = (state: GameState) => {
    if (state.gameStatus === "finished") {
      setGameOver(true);

      // Find winner (player who guessed correctly)
      const winningGuess = state.guesses.find(
        (guess) => guess.feedback.correctPostionAndColor === 4
      );

      if (winningGuess) {
        setWinner(winningGuess.playerName);
      }
    } else {
      setGameOver(false);
      setWinner(null);
    }
  };

  // Handle color selection
  const handleColorSelect = (color: string) => {
    if (selectedPegIndex !== null) {
      const newGuess = [...currentGuess];
      newGuess[selectedPegIndex] = color;
      setCurrentGuess(newGuess);
      // Auto-advance to next peg
      if (selectedPegIndex < 3) {
        setSelectedPegIndex(selectedPegIndex + 1);
      }
    }
  };

  // Handle peg selection
  const handlePegSelect = (index: number) => {
    setSelectedPegIndex(index);
  };

  // Submit guess
  const handleSubmitGuess = () => {
    // Validate that all pegs have colors
    if (currentGuess.some((color) => color === "")) {
      alert("Please select a color for all positions");
      return;
    }

    websocketService.sendMessage({
      type: "submit_guess",
      guess: currentGuess,
    });

    // Reset current guess
    setCurrentGuess(["", "", "", ""]);
    setSelectedPegIndex(null);
  };

  // Reset game
  const handleResetGame = () => {
    websocketService.sendMessage({
      type: "reset",
    });
    setCurrentGuess(["", "", "", ""]);
    setSelectedPegIndex(null);
    setGameOver(false);
    setWinner(null);
  };

  // Check if it's the current user's turn
  const isMyTurn = () => {
    if (!gameState || !gameState.players) return false;

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    return currentPlayer && currentPlayer.name === username;
  };

  // Render feedback pegs
  const renderFeedback = (feedback: Feedback) => {
    const { correctPostionAndColor, correctColors } = feedback;
    const feedbackPegs = [];

    // Add correct position and color pegs (black)
    for (let i = 0; i < correctPostionAndColor; i++) {
      feedbackPegs.push(
        <div
          key={`black-${i}`}
          className="w-3 h-3 rounded-full bg-black m-1"
        ></div>
      );
    }

    // Add correct color only pegs (white)
    for (let i = 0; i < correctColors; i++) {
      feedbackPegs.push(
        <div
          key={`white-${i}`}
          className="w-3 h-3 rounded-full bg-white border border-gray-400 m-1"
        ></div>
      );
    }

    // Add empty spots
    const emptySpots = 4 - (correctPostionAndColor + correctColors);
    for (let i = 0; i < emptySpots; i++) {
      feedbackPegs.push(
        <div
          key={`empty-${i}`}
          className="w-3 h-3 rounded-full bg-gray-600 m-1"
        ></div>
      );
    }

    return (
      <div className="flex flex-wrap w-8 justify-center">{feedbackPegs}</div>
    );
  };

  // Generate color style based on color name
  const getColorStyle = (color: string) => {
    switch (color) {
      case "red":
        return "bg-red-500";
      case "blue":
        return "bg-blue-500";
      case "green":
        return "bg-green-500";
      case "yellow":
        return "bg-yellow-500";
      case "purple":
        return "bg-purple-500";
      case "pink":
        return "bg-pink-500";
      default:
        return "bg-gray-700";
    }
  };

  // If no game state yet, show loading
  if (!gameState) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-700 rounded-lg">
        <p className="text-gray-400">Loading game board...</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Mastermind Board</h2>
        <div className="text-gray-300">
          Round:{" "}
          <span className="font-bold text-white">
            {gameState.currentRound + 1}
          </span>{" "}
          / {gameState.maxRounds}
        </div>
      </div>

      {/* Game status message */}
      {gameState.gameStatus === "waiting" && (
        <div className="bg-yellow-700 text-yellow-100 p-3 rounded-lg mb-6 text-center">
          Waiting for game to start...
        </div>
      )}
      {gameState.gameStatus === "playing" && !isMyTurn() && (
        <div className="bg-blue-700 text-blue-100 p-3 rounded-lg mb-6 text-center">
          Waiting for {gameState.players[gameState.currentPlayerIndex]?.name}'s
          move...
        </div>
      )}
      {gameState.gameStatus === "playing" && isMyTurn() && (
        <div className="bg-green-700 text-green-100 p-3 rounded-lg mb-6 text-center">
          Your turn! Select colors and make your guess.
        </div>
      )}
      {gameOver && (
        <div className="bg-purple-700 text-purple-100 p-3 rounded-lg mb-6 text-center">
          {winner
            ? `Game over! ${winner} won!`
            : "Game over! No one guessed the correct combination."}
          {gameState.gameStatus === "finished" && (
            <div className="mt-2">
              The secret code was:
              <div className="flex justify-center mt-2 space-x-2">
                {gameState.secretCode.map((color, index) => (
                  <div
                    key={index}
                    className={`w-8 h-8 rounded-full ${getColorStyle(
                      color
                    )} border-2 border-gray-300`}
                  ></div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Previous guesses */}
      <div className="mb-8">
        <h3 className="text-xl font-bold text-white mb-3">Previous Guesses</h3>
        <div className="space-y-2">
          {gameState.guesses && gameState.guesses.length > 0 ? (
            gameState.guesses.map((guess, guessIndex) => (
              <div
                key={guessIndex}
                className="flex items-center bg-gray-700 p-3 rounded-lg"
              >
                <div className="w-24 font-medium text-gray-300 mr-4">
                  {guess.playerName}:
                </div>
                <div className="flex space-x-2 mr-4">
                  {guess.guess.map((color, colorIndex) => (
                    <div
                      key={colorIndex}
                      className={`w-8 h-8 rounded-full ${getColorStyle(
                        color
                      )} border border-gray-600`}
                    ></div>
                  ))}
                </div>
                <div className="flex items-center">
                  <div className="text-gray-300 mr-2">Feedback:</div>
                  {renderFeedback(guess.feedback)}
                </div>
              </div>
            ))
          ) : (
            <div className="text-gray-400 text-center py-4 bg-gray-700 rounded-lg">
              No guesses yet
            </div>
          )}
        </div>
      </div>

      {/* Current player's input */}
      {gameState.gameStatus === "playing" && isMyTurn() && (
        <div className="bg-gray-700 p-4 rounded-lg mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Make Your Guess</h3>

          {/* Current pegs selection */}
          <div className="flex items-center justify-center space-x-4 mb-6">
            {currentGuess.map((color, index) => (
              <div
                key={index}
                onClick={() => handlePegSelect(index)}
                className={`w-12 h-12 rounded-full cursor-pointer ${
                  color ? getColorStyle(color) : "bg-gray-600"
                } ${
                  selectedPegIndex === index
                    ? "ring-4 ring-white"
                    : "border border-gray-500"
                }`}
              ></div>
            ))}
          </div>

          {/* Color palette */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {COLORS.map((color) => (
              <button
                key={color}
                onClick={() => handleColorSelect(color)}
                className={`w-10 h-10 rounded-full ${getColorStyle(
                  color
                )} hover:ring-2 hover:ring-white transition-all`}
                disabled={selectedPegIndex === null}
                title={color}
              ></button>
            ))}
          </div>

          {/* Submit button */}
          <div className="flex justify-center">
            <button
              onClick={handleSubmitGuess}
              disabled={currentGuess.some((color) => color === "")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-8 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Guess
            </button>
          </div>
        </div>
      )}

      {/* Game controls */}
      <div className="flex justify-center">
        {gameOver && (
          <button
            onClick={handleResetGame}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-8 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            Play Again
          </button>
        )}
      </div>
    </div>
  );
}
