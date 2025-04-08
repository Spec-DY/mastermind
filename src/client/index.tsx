import { createRoot } from "react-dom/client";
import { usePartySocket } from "partysocket/react";
import React, { useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
  Link,
} from "react-router";
import { nanoid } from "nanoid";

import { names, type Message, type Player, type GameState } from "../shared";

// Home screen to create or join a game
function Home() {
  const [playerName, setPlayerName] = useState(
    names[Math.floor(Math.random() * names.length)]
  );
  const [roomId, setRoomId] = useState("");
  const navigate = useNavigate();

  const createRoom = () => {
    const newRoomId = nanoid(6);
    navigate(`/room/${newRoomId}`);
  };

  const joinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomId.trim()) {
      navigate(`/room/${roomId}`);
    }
  };

  return (
    <div className="container">
      <h1>Mastermind Game</h1>
      <div className="row">
        <div className="six columns">
          <h3>Your Name</h3>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="u-full-width"
          />
        </div>
      </div>
      <div className="row">
        <div className="six columns">
          <h3>Create New Room</h3>
          <button onClick={createRoom} className="button-primary u-full-width">
            Create Room
          </button>
        </div>
        <div className="six columns">
          <h3>Join Room</h3>
          <form onSubmit={joinRoom}>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter Room ID"
              className="u-full-width"
            />
            <button type="submit" className="button u-full-width">
              Join Room
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// Main game room component
function GameRoom() {
  const { roomId = "" } = useParams<{ roomId: string }>();
  const [playerId] = useState(() => nanoid(8));
  const [playerName] = useState(
    names[Math.floor(Math.random() * names.length)]
  );
  const [gameState, setGameState] = useState<GameState>({
    status: "waiting",
    guesses: [],
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const navigate = useNavigate();

  const socket = usePartySocket({
    party: "chat",
    room: roomId,
    onOpen: () => {
      setIsConnected(true);
      // When connected, attempt to join or create the room
      socket.send(
        JSON.stringify({
          type: "join_room",
          roomId,
          playerId,
          playerName,
        } satisfies Message)
      );
    },
    onClose: () => {
      setIsConnected(false);
    },
    onMessage: (evt) => {
      const message = JSON.parse(evt.data as string) as Message;

      if (message.type === "room_joined") {
        setGameState(message.gameState);
        setPlayers(message.players);
      } else if (message.type === "game_update") {
        setGameState(message.gameState);
      } else if (message.type === "player_left") {
        setPlayers((prev) => prev.filter((p) => p.id !== message.playerId));
      }
    },
  });

  // Handle leaving room manually
  const leaveRoom = () => {
    if (isConnected) {
      socket.send(
        JSON.stringify({
          type: "leave_room",
          roomId,
          playerId,
        } satisfies Message)
      );
    }
    navigate("/");
  };

  // Handle page unload events (closing tab, refreshing, etc)
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isConnected) {
        socket.send(
          JSON.stringify({
            type: "leave_room",
            roomId,
            playerId,
          } satisfies Message)
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup function that runs when component unmounts
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      handleBeforeUnload(); // Also execute when component unmounts
    };
  }, [isConnected, roomId, playerId, socket]);

  // If not connected, show loading state
  if (!isConnected) {
    return <div className="container">Connecting to room...</div>;
  }

  return (
    <div className="container">
      <div className="row">
        <div className="twelve columns">
          <h2>Room: {roomId}</h2>
          <button onClick={() => window.navigator.clipboard.writeText(roomId)}>
            Copy Room ID
          </button>
          <button onClick={leaveRoom} className="button">
            Leave Room
          </button>
        </div>
      </div>

      <div className="row">
        <div className="twelve columns">
          <h3>Players ({players.length}/2)</h3>
          <ul>
            {players.map((player) => (
              <li key={player.id}>
                {player.name} {player.isHost ? "(Host)" : ""}
                {player.id === playerId ? " (You)" : ""}
              </li>
            ))}
          </ul>

          <h3>Game Status: {gameState.status}</h3>
          {gameState.status === "waiting" &&
            players.some((p) => p.id === playerId && p.isHost) && (
              <button className="button-primary">Start Game</button>
            )}
        </div>
      </div>
    </div>
  );
}

// Main App component
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:roomId" element={<GameRoom />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("root")!).render(<App />);
