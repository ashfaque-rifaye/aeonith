// Local-only: run the app on the simulated PayPal rail (port 3100, separate data file), e.g. to try features
// that need sandbox permissions you have not enabled yet. The real sandbox app keeps running on :3000.
process.env.PAYPAL_CLIENT_SECRET = "";
process.env.PAYPAL_WEBHOOK_ID = "";
process.env.PORT = "3100";
process.env.APP_BASE_URL = "http://localhost:3100";
process.env.DATA_FILE = "data/sim-state.json";
await import("../src/server.js");
