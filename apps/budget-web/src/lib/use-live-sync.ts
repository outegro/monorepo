"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { io, type Socket } from "socket.io-client";

/**
 * Live cross-tab / cross-device sync. Connects socket.io to the same origin (Traefik routes
 * `/socket.io` to budget-backend, so the httpOnly og_access cookie rides the handshake and
 * authorizes the connection). On a `changed` signal from the backend, invalidate the budget
 * queries → every open tab refetches. Returns the connection status for a small live badge.
 */
export function useLiveSync(): "connecting" | "live" | "off" {
  const qc = useQueryClient();
  const [status, setStatus] = useState<"connecting" | "live" | "off">("connecting");

  useEffect(() => {
    const socket: Socket = io({
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket"],
    });

    socket.on("connect", () => setStatus("live"));
    socket.on("disconnect", () => setStatus("connecting"));
    socket.on("connect_error", () => setStatus("off"));
    socket.on("unauthorized", () => {
      setStatus("off");
      socket.disconnect();
    });
    socket.on("changed", () => {
      qc.invalidateQueries({ queryKey: ["months"] });
      qc.invalidateQueries({ queryKey: ["fx"] });
      qc.invalidateQueries({ queryKey: ["base-expenses"] });
      qc.invalidateQueries({ queryKey: ["base-incomes"] });
      qc.invalidateQueries({ queryKey: ["settings"] });
    });

    return () => {
      socket.disconnect();
    };
  }, [qc]);

  return status;
}
