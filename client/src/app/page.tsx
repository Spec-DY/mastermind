"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import webSocketService from "@/service/webSocketService";

export default function Home() {
  const NAMES = [
    "MilkBanana",
    "CoconutCakie",
    "Beaverrage",
    "AngryFugu",
    "SmartTurtle",
    "OhPotato",
    "PlusProUltra",
  ];

  const characters = "abcdefghijklmnopqrstuvwxyz0123456789";

  const router = useRouter();
  const { username, setUsername } = useUser();

  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinErrorMsg, setJoinErrorMsg] = useState<string | null>(null);

  const [isConnecting, setIsConnecting] = useState(false);

  // console log NODE_ENV
  useEffect(() => {
    console.log("NODE_ENV:", process.env.NODE_ENV);
    console.log("WORKER_WS_URL:", process.env.NEXT_PUBLIC_WORKER_WS_URL);
  }, []);

  const getRandomName = () => {
    const randomIndex = Math.floor(Math.random() * NAMES.length);
    return NAMES[randomIndex];
  };

  const generateShortId = (length = 4) => {
    let result = "";
    for (let i = 0; i < length; i++) {
      result += characters.charAt(
        Math.floor(Math.random() * characters.length)
      );
    }
    return result;
  };

  const connectToRoom = async (
    roomIdToUse: string | null,
    isJoinRoom: boolean = false
  ) => {
    // must have username no matter what
    const finalUsername = username || getRandomName();
    if (!username) {
      setUsername(finalUsername);
    }

    let finalRoomId;

    // join room must have room id
    if (isJoinRoom) {
      if (!roomIdToUse) {
        setJoinErrorMsg("Please Enter Room ID");
        return;
      } else {
        finalRoomId = roomIdToUse;
      }
    } else {
      finalRoomId = generateShortId();
      setRoomId(finalRoomId);
    }

    try {
      await webSocketService.connect(
        finalRoomId,
        finalUsername,
        router,
        setIsConnecting
      );

      // send join
      webSocketService.sendMessage({
        type: "join",
        playerName: finalUsername,
      });
    } catch (error) {
      console.error("Connection failed:", error);
      setJoinErrorMsg("Failed to join room. Please check Room ID.");
    }
  };

  const handleJoin = () => {
    connectToRoom(roomId, true);
  };

  const handleCreate = () => {
    connectToRoom(null, false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-md p-8 border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Mastermind</h1>
          <p className="text-gray-400">Enter Info to Join or Create a Room</p>
        </div>

        <div className="space-y-6">
          {/* username*/}
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Name
            </label>
            <input
              type="text"
              id="username"
              value={username || ""}
              required
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md py-3 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Eneter your name"
            />
          </div>

          {/* Room ID*/}
          <div>
            <label
              htmlFor="roomId"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Room ID
            </label>
            <div className="flex space-x-3">
              <input
                type="text"
                id="roomId"
                onChange={(e) => setRoomId(e.target.value)}
                className="flex-1 w-32 bg-gray-700 border border-gray-600 rounded-md py-3 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={joinErrorMsg ? joinErrorMsg : "Enter room ID"}
              />
              <button
                onClick={handleJoin}
                disabled={isConnecting}
                className=" bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <svg className="animate-spin h-6" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  </>
                ) : (
                  "Join"
                )}
              </button>
            </div>
          </div>

          {/* Create Room button */}
          <div className="pt-2">
            <button
              onClick={handleCreate}
              disabled={isConnecting}
              className="flex items-center justify-center w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold py-3 px-4 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin h-6" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </>
              ) : (
                "Create Room"
              )}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-400">
          Room ID will be generated when you create a room. Share it with your
          friends to play together!
        </div>
      </div>
    </div>
  );
}
