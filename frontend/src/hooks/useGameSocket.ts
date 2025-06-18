import { useEffect, useState, useCallback, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  SkullKingGameState,
  GameAction,
  ChatMessage,
} from "@/types/skull-king";
import { useToast } from "@/components/ToastProvider";

interface UseGameSocketProps {
  roomId: string;
  userId: string;
  username: string;
  forceSpectator?: boolean; // Optional flag to force joining as spectator
}

interface UseGameSocketReturn {
  socket: Socket | null;
  gameState: SkullKingGameState | null;
  connected: boolean;
  hasJoined: boolean;
  isSpectator: boolean;
  joinGame: () => void;
  leaveGame: () => void;
  deleteRoom: () => void;
  sendGameAction: (action: Omit<GameAction, "playerId">) => void;
  sendChatMessage: (message: string) => void;
  chatMessages: ChatMessage[];
}

export function useGameSocket({
  roomId,
  userId,
  username,
  forceSpectator = false,
}: UseGameSocketProps): UseGameSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<SkullKingGameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const joinAttemptRef = useRef(false);
  const currentRoomRef = useRef<string | null>(null);
  const { showError, showInfo, showWarning, showSuccess } = useToast();

  // Ensure component is mounted on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    // Only initialize socket on client side
    if (!isMounted) return;

    // Determine socket URL based on environment
    // In production, use relative URL (same origin)
    // In development, use localhost with backend port
    const socketUrl =
      typeof window !== "undefined" && window.location.hostname !== "localhost"
        ? "https://skullking-api.duckdns.org" // Backend auto-hébergé sur Raspberry Pi
        : `http://localhost:3001`; // Backend port

    console.log("Connecting to socket at:", socketUrl || "same origin");

    // Initialize socket connection
    const socketInstance = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 20000,
    });
    socketInstance.on("connect", () => {
      console.log("Connected to socket server with ID:", socketInstance.id);
      setConnected(true);
      setHasJoined(false); // Reset join status on new connection
      joinAttemptRef.current = false; // Reset join attempt flag
    });

    socketInstance.on("disconnect", (reason: string) => {
      console.log("Disconnected from socket server, reason:", reason);
      setConnected(false);
      setHasJoined(false); // Reset join status on disconnect
      joinAttemptRef.current = false; // Reset join attempt flag
    });

    socketInstance.on("game-updated", (newGameState: SkullKingGameState) => {
      console.log("Game state updated:", newGameState);
      setGameState(newGameState);
    });
    socketInstance.on(
      "player-joined",
      (data: { userId: string; username: string }) => {
        console.log("Player joined:", data);
        // Set hasJoined to true if this is our user joining
        if (data.userId === userId) {
          console.log("Confirmed: We have successfully joined the game");
          setHasJoined(true);
        }
      }
    );

    socketInstance.on(
      "player-left",
      (data: { userId: string; username: string }) => {
        console.log("Player left:", data);
      }
    );
    socketInstance.on(
      "join-success",
      (data: { gameState: SkullKingGameState; isSpectator?: boolean; spectatorId?: string }) => {
        console.log("Join success confirmed:", data);
        setHasJoined(true);
        joinAttemptRef.current = false; // Reset for potential future rejoins
        setGameState(data.gameState);
        
        // Check if user joined as spectator
        if (data.isSpectator) {
          setIsSpectator(true);
          showInfo("Vous observez cette partie en mode spectateur", "Mode spectateur");
        } else {
          setIsSpectator(false);
        }
      }
    );
    socketInstance.on(
      "join-rejected",
      (data: { reason: string; message: string }) => {
        console.log("Join rejected:", data);
        showError(data.message, "Impossible de rejoindre la partie");
        
        // S'assurer que les données utilisateur sont préservées avant la redirection
        const lastUsername = localStorage.getItem('lastUsername');
        const lastUserId = localStorage.getItem('lastUserId');
        
        // Redirect back to lobby after a delay
        setTimeout(() => {
          if (typeof window !== 'undefined') {
            // Restore user data if it exists
            if (lastUsername && lastUserId) {
              localStorage.setItem('lastUsername', lastUsername);
              localStorage.setItem('lastUserId', lastUserId);
            }
            window.location.href = "/";
          }
        }, 2000);
      }
    );

    socketInstance.on("room-deleted", (data: { message: string }) => {
      console.log("Room deleted:", data);
      showWarning(data.message, "Salle supprimée");
      
      // S'assurer que les données utilisateur sont préservées avant la redirection
      const lastUsername = localStorage.getItem('lastUsername');
      const lastUserId = localStorage.getItem('lastUserId');
      
      // Redirect back to home with shorter delay
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          // Restore user data if it exists
          if (lastUsername && lastUserId) {
            localStorage.setItem('lastUsername', lastUsername);
            localStorage.setItem('lastUserId', lastUserId);
          }
          window.location.href = "/";
        }
      }, 1000); // Reduced delay to 1 second
    });
    socketInstance.on(
      "game-error",
      (data: { type: string; message: string; action: string }) => {
        console.log("Game error received:", data);
        // Display error message to user
        showError(data.message, "Erreur de jeu");
      }
    );

    socketInstance.on(
      "player-joined",
      (data: { userId: string; username: string }) => {
        console.log("Player joined:", data);
        // Show notification when another player joins
        showInfo(`${data.username} a rejoint la partie`, "Nouveau joueur");
      }
    );
    socketInstance.on(
      "player-left",
      (data: { userId: string; username: string }) => {
        console.log("Player left:", data);
        // Show notification when a player leaves
        showWarning(`${data.username} a quitté la partie`, "Joueur parti");
      }
    );

    // Handle spectator events
    socketInstance.on(
      "spectator-joined",
      (data: { userId: string; username: string }) => {
        console.log("Spectator joined:", data);
        showInfo(`👀 ${data.username} observe maintenant la partie`, "Nouveau spectateur");
      }
    );

    socketInstance.on(
      "spectator-left",
      (data: { userId: string; username: string }) => {
        console.log("Spectator left:", data);
        showInfo(`👀 ${data.username} a arrêté d'observer la partie`, "Spectateur parti");
      }
    );

    socketInstance.on(
      "toast-notification",
      (data: {
        type: string;
        message: string;
        title?: string;
        duration?: number;
      }) => {
        console.log("Toast notification received:", data);
        // Show toast notification from server
        switch (data.type) {
          case "success":
            showSuccess(data.message, data.title, data.duration);
            break;
          case "error":
            showError(data.message, data.title, data.duration);
            break;
          case "warning":
            showWarning(data.message, data.title, data.duration);
            break;
          case "info":
          default:
            showInfo(data.message, data.title, data.duration);
            break;
        }
      }
    );

    socketInstance.on(
      "trick-completed",
      (data: {
        winner: { playerId: string; playerName: string };
        completedTrick: unknown;
      }) => {
        console.log("Trick completed:", data);
        // Emit a custom event that the GameRoom component can listen to
        window.dispatchEvent(
          new CustomEvent("trickCompleted", { detail: data })
        );
      }
    );

    socketInstance.on("chat-message", (message: ChatMessage) => {
      setChatMessages((prev) => [...prev, message]);
    });

    socketInstance.on("chat_history", (messages: ChatMessage[]) => {
      setChatMessages(messages);
    });

    socketInstance.on("error", (error: string) => {
      console.error("Socket error:", error);
    });

    setSocket(socketInstance);
    return () => {
      socketInstance.close();
    };
  }, [userId, isMounted, showError, showWarning, showInfo, showSuccess]); // Auto-join when connected and not yet joined
  
  useEffect(() => {
    // Reset join attempt when room changes
    if (currentRoomRef.current !== roomId) {
      currentRoomRef.current = roomId;
      joinAttemptRef.current = false;
      setHasJoined(false);
    }

    if (
      socket &&
      connected &&
      !hasJoined &&
      !joinAttemptRef.current &&
      roomId &&
      userId &&
      username
    ) {
      console.log(
        `Auto-joining game room: ${roomId} as ${username} (${userId})`
      );
      joinAttemptRef.current = true; // Prevent multiple join attempts

      // Add a small delay to prevent immediate rejoin after disconnect
      const joinTimer = setTimeout(() => {
        if (socket && connected && !hasJoined && joinAttemptRef.current) {
          socket.emit("join-game", { roomId, userId, username, forceSpectator });
        }
      }, 100);

      return () => clearTimeout(joinTimer);
    }
  }, [socket, connected, hasJoined, roomId, userId, username, forceSpectator]);
  const joinGame = useCallback(() => {
    if (socket && connected && !hasJoined && !joinAttemptRef.current) {
      console.log(`Manually joining game room: ${roomId} as ${username}`);
      joinAttemptRef.current = true;
      socket.emit("join-game", { roomId, userId, username, forceSpectator });
    }
  }, [socket, connected, hasJoined, roomId, userId, username, forceSpectator]);

  const leaveGame = useCallback(() => {
    if (socket && connected && hasJoined) {
      console.log(`Leaving game room: ${roomId}`);
      socket.emit("leave-game", { roomId, userId });
      setHasJoined(false);
    }
  }, [socket, connected, hasJoined, roomId, userId]);
  const sendGameAction = useCallback(
    (action: Omit<GameAction, "playerId">) => {
      if (socket && connected) {
        socket.emit("gameAction", {
          ...action,
          playerId: userId,
          roomId,
        });
      }
    },
    [socket, connected, userId, roomId]
  );

  const sendChatMessage = useCallback(
    (message: string) => {
      if (socket && connected) {
        socket.emit("chat-message", {
          roomId,
          userId,
          username,
          message,
        });
      }
    },
    [socket, connected, roomId, userId, username]
  );

  const deleteRoom = useCallback(() => {
    if (socket && connected) {
      console.log(`Deleting room: ${roomId}`);
      socket.emit("delete-room", { roomId, userId });
      setHasJoined(false);
    }
  }, [socket, connected, roomId, userId]);

  return {
    socket,
    gameState,
    connected,
    hasJoined,
    isSpectator,
    joinGame,
    leaveGame,
    deleteRoom,
    sendGameAction,
    sendChatMessage,
    chatMessages,
  };
}
