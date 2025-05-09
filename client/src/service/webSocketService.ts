type RouterLike = {
  push: (url: string) => Promise<boolean> | void;
};

class WebSocketService {
  private socket: WebSocket | null = null;
  private isConnected: boolean = false;
  private messageCallbacks: ((data: any) => void)[] = [];
  // Add cache for latest game state
  private latestGameState: any = null;

  // Connect to WebSocket server and return a Promise
  public connect(
    roomId: string,
    username: string,
    router: RouterLike,
    setIsConnecting: (state: boolean) => void
  ): Promise<WebSocketService> {
    setIsConnecting(true);

    if (this.socket) {
      this.socket.close();
    }

    return new Promise<WebSocketService>((resolve, reject) => {
      try {
        const newSocket = new WebSocket(
          process.env.NODE_ENV === "production" &&
          process.env.NEXT_PUBLIC_WORKER_WS_URL
            ? `${process.env.NEXT_PUBLIC_WORKER_WS_URL}?gameId=${roomId}`
            : `ws://localhost:8787/api/mastermind?gameId=${roomId}`
        );

        newSocket.onopen = () => {
          console.log("WS connected");
          this.socket = newSocket;
          this.isConnected = true;
          router.push(`/room/${roomId}/`);
          setIsConnecting(false);
          resolve(this);
        };

        newSocket.onmessage = (event: MessageEvent): void => {
          if (event.data instanceof Blob && event.data.size === 0) {
            //if only NODE_ENV is development

            console.log("Heartbeat received");

            return;
          }
          if (process.env.NODE_ENV === "development") {
            console.log("Message received:", event.data);
          }
          try {
            const data = JSON.parse(event.data);

            // Cache game state when received
            if (data && data.type === "game_state") {
              this.latestGameState = data;
            }

            this.messageCallbacks.forEach((callback) => callback(data));
          } catch (error) {
            console.error("Failed to parse message:", error);
            // Pass non-JSON messages as well
            this.messageCallbacks.forEach((callback) => callback(event.data));
          }
        };

        newSocket.onclose = () => {
          console.log("Disconnecting WS");
          this.isConnected = false;
          this.socket = null;
          setIsConnecting(false);
          if (!this.isConnected) {
            reject(new Error("Connection closed before it was established"));
          }
        };

        newSocket.onerror = (error) => {
          console.error("WebSocket error:", error);
          this.isConnected = false;
          setIsConnecting(false);
          reject(error);
        };
      } catch (error) {
        alert("Failed connect to server");
        setIsConnecting(false);
        reject(error);
      }
    });
  }

  // Send message
  public sendMessage(message: string | object): boolean {
    if (this.isConnected && this.socket) {
      this.socket.send(
        typeof message === "string" ? message : JSON.stringify(message)
      );
      return true;
    } else {
      console.error("Cannot send message, WebSocket is not connected");
      return false;
    }
  }

  // Register message callback
  public onMessage(callback: (data: any) => void): WebSocketService {
    if (typeof callback === "function") {
      this.messageCallbacks.push(callback);

      // Send cached game state to new subscribers
      if (this.latestGameState) {
        setTimeout(() => {
          callback(this.latestGameState);
        }, 0);
      }
    }
    return this;
  }

  // Get latest game state
  public getLatestGameState(): any {
    return this.latestGameState;
  }

  // Disconnect
  public disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // Get connection state
  public getConnectionState(): boolean {
    return this.isConnected;
  }
}

// Create singleton instance
const websocketService = new WebSocketService();
export default websocketService;
