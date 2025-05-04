"use client";

import React from "react";
import { useUser } from "@/context/UserContext";
import { useParams } from "next/navigation";

export default function page() {
  const { username, setUsername } = useUser();

  const params = useParams();
  const RoomId = params.roomId;
  console.log("params is " + params);
  console.log("Room ID is " + RoomId);

  return (
    <div className="h-screen flex items-center justify-center">
      You logged in as {username} room id is {RoomId}
    </div>
  );
}
