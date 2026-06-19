// Shared bounds, defaults, and channel identifiers used across the app.

// Input constraints straight from the assignment.
export const BOUNDS = {
  amount: { min: 10000, max: 5000000, step: 10000 }, // ₹10,000 – ₹50,00,000
  rate: { min: 1, max: 36, step: 0.1 }, // 1% – 36% p.a.
  tenure: { min: 1, max: 84, step: 1 }, // 1 – 84 months
};

// Defaults match the worked example in the assignment (₹15,00,000 @ 11% / 48mo).
export const DEFAULT_STATE = {
  amount: 1500000,
  rate: 11,
  tenure: 48,
  mode: "single", // 'single' | 'compare' | 'prepayment'
  theme: "light", // 'light' | 'dark'
  scenarios: [
    { id: "s1", name: "Conservative", amount: 1500000, rate: 10.5, tenure: 60 },
    { id: "s2", name: "Aggressive", amount: 1500000, rate: 12, tenure: 24 },
  ],
  prepayments: [], // [{ id, month, amount }]
  lastActiveScenarioId: "s1",
};

export const MAX_SCENARIOS = 3;

// Cross-tab channel + persistence keys (used from Phase 2 onward).
export const CHANNEL_NAME = "loanlens";
export const STORAGE_KEY = "loanlens:state";

// Sensitivity grid offsets (assignment: current ±1/2/3% rate, ±6/12/24 months).
export const RATE_OFFSETS = [-3, -2, -1, 0, 1, 2, 3];
export const TENURE_OFFSETS = [-24, -12, -6, 0, 6, 12, 24];
