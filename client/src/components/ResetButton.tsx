import React from "react";
import websocketService from "@/service/webSocketService";

export default function ResetButton() {
  const startGame = () => {
    websocketService.sendMessage({
      type: "reset",
    });
  };
  return (
    <button
      className="bg-red-500 cursor-pointer border-2 border-red-500 rounded-xl shadow-md p-2 text-white hover:bg-red-700"
      onClick={startGame}
    >
      RESET GAME
    </button>
  );
}
