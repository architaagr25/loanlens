// app-wide constants: input bounds, defaults, channel names.

// input limits
export const BOUNDS = {
  amount: { min: 10000, max: 5000000, step: 10000 }, // ₹10,000 – ₹50,00,000
  rate: { min: 1, max: 36, step: 0.1 }, // 1% – 36% p.a.
  tenure: { min: 1, max: 84, step: 1 }, // 1 – 84 months
};

// what a fresh tab starts with. using the worked example from the doc as defaults.
export const DEFAULT_STATE = {
  amount: 1500000,
  rate: 11,
  tenure: 48,
  mode: "single", // single | compare | prepayment
  theme: "light", // light | dark
  scenarios: [
    { id: "s1", name: "Conservative", amount: 1500000, rate: 10.5, tenure: 60 },
    { id: "s2", name: "Aggressive", amount: 1500000, rate: 12, tenure: 24 },
  ],
  prepayments: [], // { id, month, amount }
  lastActiveScenarioId: "s1",
};

export const MAX_SCENARIOS = 3;

// channel + localStorage key for the shared state
export const CHANNEL_NAME = "loanlens";
export const STORAGE_KEY = "loanlens:state";

// presence runs on its own channel so the heartbeat spam doesn't mix with state
export const PRESENCE_CHANNEL = "loanlens:presence";
export const HEARTBEAT_INTERVAL = 2000; // ping every 2s
export const PRUNE_INTERVAL = 1000; // check for dead tabs every 1s
export const STALE_MS = 5000; // silent for 5s = gone

// offsets for the sensitivity grid (rate ±1/2/3%, tenure ±6/12/24mo)
export const RATE_OFFSETS = [-3, -2, -1, 0, 1, 2, 3];
export const TENURE_OFFSETS = [-24, -12, -6, 0, 6, 12, 24];
