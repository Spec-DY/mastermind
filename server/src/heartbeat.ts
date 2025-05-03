/**
 * if no such heartbeat mechanism, the state will likely be cleaned every 5 seconds
 */

export class WebSocketHeartbeat {
	private heartbeatIntervals = new Map<WebSocket, number>();
	private readonly heartbeatInterval: number;

	/**
	 * create a WebSocketHeartbeat instance
	 * @param intervalMs interval in milliseconds, default is 5 seconds
	 */
	constructor(intervalMs: number = 5000) {
		this.heartbeatInterval = intervalMs;
	}

	/**
	 * @param ws
	 */
	public startHeartbeat(ws: WebSocket): void {
		// stop any existing heartbeat for this WebSocket connection
		this.stopHeartbeat(ws);

		// send a heartbeat message every intervalMs milliseconds
		const intervalId = setInterval(() => {
			if (ws.readyState === WebSocket.READY_STATE_OPEN) {
				// send a empty message
				ws.send(new Uint8Array(0));
			} else {
				this.stopHeartbeat(ws);
			}
		}, this.heartbeatInterval);

		this.heartbeatIntervals.set(ws, intervalId);
	}

	/**
	 *
	 * @param ws
	 */
	public stopHeartbeat(ws: WebSocket): void {
		const intervalId = this.heartbeatIntervals.get(ws);
		if (intervalId) {
			clearInterval(intervalId);
			this.heartbeatIntervals.delete(ws);
		}
	}

	/**
	 * stop all heartbeats for all WebSocket connections
	 * NOT IN USE
	 */
	public stopAllHeartbeats(): void {
		for (const [ws, intervalId] of this.heartbeatIntervals.entries()) {
			clearInterval(intervalId);
			this.heartbeatIntervals.delete(ws);
		}
	}
}
