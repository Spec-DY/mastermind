"use client";

import React from "react";
import { useUser } from "@/context/UserContext";
import { useParams } from "next/navigation";
import GameStateCard from "@/components/GameStateCard";

export default function RoomPage() {
  const { username } = useUser();
  const params = useParams();
  const roomId = params.roomId;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 bg-gray-800 p-4 rounded-lg shadow-md border border-gray-700">
          <div>
            <h1 className="text-2xl font-bold text-white">Mastermind</h1>
            <p className="text-gray-400">Room ID: {roomId}</p>
          </div>
          <div className="bg-blue-600 px-4 py-2 rounded-lg">
            <span className="text-white font-medium">
              Playing as: {username}
            </span>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex flex-col md:flex-row gap-6">
          {/* Game state card */}
          <div className="md:w-1/3">
            <GameStateCard />
          </div>

          {/* Game board area - can be implemented later */}
          <div className="md:w-2/3 bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6">Game Board</h2>
            <div className="flex items-center justify-center h-64 bg-gray-700 rounded-lg">
              <p className="text-gray-400">Game board will be displayed here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
