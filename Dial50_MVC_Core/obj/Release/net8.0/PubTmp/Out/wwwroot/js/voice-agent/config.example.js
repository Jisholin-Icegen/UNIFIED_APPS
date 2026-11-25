// Copy this file to config.js and fill in real values for your deployment.
// config.js is gitignored - do NOT commit real room_id/passphrase values.
window.APP_CONFIG = {
  BACKEND_HTTP: "http://203.101.40.69:8000",
  BACKEND_WS: "ws://203.101.40.69:8000",
  PROFILE_API_URL: "https://apollodevdial50api.portzo.net/Traczo/GetProfileOld",

  // Unified AI opt-ins - leave OFF until the voice backend supports them.
  // SEND_SESSION_ID:   also send session_id/device_id in /token and on the WS URL.
  //                    Backends that reject unknown params close the socket ~1s after open.
  // SEND_APP_MESSAGES: also send app_context / app_action_result JSON over the WS.
  //                    Page context and action results already flow through /api/ai-bridge.
  // SEND_SESSION_ID: false,
  // SEND_APP_MESSAGES: false,
};
