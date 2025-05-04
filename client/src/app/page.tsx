"use client";
import React, { useState } from "react";

export default function Home() {
  const NAMES = [
    "Alice",
    "Bob",
    "Charlie",
    "David",
    "bob",
    "Frank",
    "Grace",
    "bOb",
    "boB",
    "Judy",
  ];
  const [roomId, setRoomId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [joinErrorMsg, setJoinErrorMsg] = useState<string | null>(null);

  const getRandomName = () => {
    let randomIndex = Math.floor(Math.random() * NAMES.length);
    return NAMES[randomIndex];
  };

  const handleJoin = () => {
    if (!username) {
      setUsername(getRandomName());
    }
    if (!roomId) {
      setJoinErrorMsg("Please Enter RoomID or Create Room");
    }

    navigator;
  };

  const handleCreate = () => {
    if (!username) {
      setUsername(getRandomName());
    }
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
                className="flex-1 bg-gray-700 border border-gray-600 rounded-md py-3 px-4 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={joinErrorMsg ? joinErrorMsg : "Enter room ID"}
              />
              <button
                onClick={handleJoin}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join
              </button>
            </div>
          </div>

          {/* Create Room button */}
          <div className="pt-2">
            <button
              onClick={handleCreate}
              className="w-full bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white font-bold py-3 px-4 rounded-md transition-all focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Room
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
