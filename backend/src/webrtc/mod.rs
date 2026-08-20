// WebRTC signaling is handled via the WebSocket module (ws/mod.rs)
// The server acts as a signaling relay, forwarding SDP offers/answers and ICE candidates
// between peers. Peer connections are established P2P using STUN servers.
