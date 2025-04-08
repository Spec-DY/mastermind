import {
  type Connection,
  Server,
  type WSMessage,
  routePartykitRequest,
} from "partyserver";

import type { Message, Room, Player, GameState } from "../shared";

export class Chat extends Server<Env> {
  static options = { hibernate: true };

  rooms = new Map<string, Room>();

  broadcastMessage(message: Message, exclude?: string[]) {
    this.broadcast(JSON.stringify(message), exclude);
  }

  broadcastToRoom(roomId: string, message: Message, exclude?: string[]) {
    // Get all connections in the room
    const connections = this.getConnectionsInRoom(roomId);
    const data = JSON.stringify(message);

    connections.forEach((conn) => {
      if (!exclude?.includes(conn.id)) {
        conn.send(data);
      }
    });
  }

  getConnectionsInRoom(roomId: string): Connection[] {
    return Array.from(this.getConnections()).filter(
      (conn) => (conn as any).roomId === roomId
    );
  }

  onStart() {
    // Create the rooms table if it doesn't exist - but rooms will not be persistent
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, data TEXT)`
    );
  }

  onConnect(connection: Connection) {
    // For now, no action needed on initial connect
  }

  saveRoom(room: Room) {
    this.rooms.set(room.id, room);
  }

  createRoom(roomId: string, hostId: string, hostName: string): Room {
    const initialGameState: GameState = {
      status: "waiting",
      guesses: [],
    };

    const host: Player = {
      id: hostId,
      name: hostName,
      isHost: true,
    };

    const room: Room = {
      id: roomId,
      players: [host],
      gameState: initialGameState,
    };

    this.saveRoom(room);
    return room;
  }

  joinRoom(
    connection: Connection,
    roomId: string,
    playerId: string,
    playerName: string
  ) {
    // Set the roomId on the connection for future reference
    (connection as any).roomId = roomId;
    (connection as any).playerId = playerId;

    // Check if room exists
    let room = this.rooms.get(roomId);

    if (!room) {
      // Room doesn't exist, create it and make this player the host
      room = this.createRoom(roomId, playerId, playerName);

      // Send room info to the player
      connection.send(
        JSON.stringify({
          type: "room_joined",
          roomId,
          gameState: room.gameState,
          players: room.players,
        } satisfies Message)
      );

      return;
    }

    // Check if player is already in the room
    const existingPlayer = room.players.find((p) => p.id === playerId);

    if (existingPlayer) {
      // Player reconnecting, update name if needed
      existingPlayer.name = playerName;
    } else {
      // New player joining
      const newPlayer: Player = {
        id: playerId,
        name: playerName,
        isHost: false,
      };

      room.players.push(newPlayer);
    }

    this.saveRoom(room);

    // Notify all players in the room about the new player
    this.broadcastToRoom(roomId, {
      type: "room_joined",
      roomId,
      gameState: room.gameState,
      players: room.players,
    });
  }

  leaveRoom(connection: Connection, roomId?: string, playerId?: string) {
    // Use provided values or get from connection
    const actualRoomId = roomId || (connection as any).roomId;
    const actualPlayerId = playerId || (connection as any).playerId;

    if (!actualRoomId || !actualPlayerId) return;

    const room = this.rooms.get(actualRoomId);
    if (!room) return;

    // Remove player from room
    room.players = room.players.filter((p) => p.id !== actualPlayerId);

    if (room.players.length === 0) {
      // If no players left, delete the room completely
      this.rooms.delete(actualRoomId);

      // Remove from storage
      this.ctx.storage.sql.exec(
        `DELETE FROM rooms WHERE id = '${actualRoomId}'`
      );
    } else {
      // If host left, assign a new host
      const hostLeft = !room.players.some((p) => p.isHost);
      if (hostLeft && room.players.length > 0) {
        room.players[0].isHost = true;
      }

      this.saveRoom(room);

      // Notify remaining players
      this.broadcastToRoom(actualRoomId, {
        type: "player_left",
        roomId: actualRoomId,
        playerId: actualPlayerId,
      });
    }

    // Clear the room association from the connection
    if ((connection as any).roomId === actualRoomId) {
      (connection as any).roomId = undefined;
      (connection as any).playerId = undefined;
    }
  }

  onMessage(connection: Connection, message: WSMessage) {
    try {
      const parsed = JSON.parse(message as string) as Message;

      if (parsed.type === "create_room") {
        // Create a new room
        this.joinRoom(
          connection,
          parsed.roomId,
          parsed.hostId,
          parsed.hostName
        );
      } else if (parsed.type === "join_room") {
        // Join an existing room
        this.joinRoom(
          connection,
          parsed.roomId,
          parsed.playerId,
          parsed.playerName
        );
      } else if (parsed.type === "game_update") {
        // Update game state
        const room = this.rooms.get(parsed.roomId);
        if (room) {
          room.gameState = parsed.gameState;
          this.saveRoom(room);

          // Broadcast to all players in the room
          this.broadcastToRoom(parsed.roomId, parsed, [connection.id]);
        }
      } else if (parsed.type === "leave_room") {
        // Handle player leaving room
        this.leaveRoom(connection, parsed.roomId, parsed.playerId);
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  }

  onClose(connection: Connection) {
    // Handle player disconnection
    this.leaveRoom(connection);
  }
}

export default {
  async fetch(request, env) {
    return (
      (await routePartykitRequest(request, { ...env })) ||
      env.ASSETS.fetch(request)
    );
  },
} satisfies ExportedHandler<Env>;
