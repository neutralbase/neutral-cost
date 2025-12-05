export type Transaction = {
  _id: string;
  userId: string;
  amount: number;
  type: "purchase" | "usage" | "refund" | "adjustment";
  description: string;
  referenceId?: string;
  threadId?: string;
  multiplier?: number;
  timestamp: string;
};

// Helper to create a timestamp relative to now
function hoursAgo(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() - hours);
  return date.toISOString();
}

function minutesAgo(minutes: number): string {
  const date = new Date();
  date.setMinutes(date.getMinutes() - minutes);
  return date.toISOString();
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  // Recent thread activity
  {
    _id: "tx_001",
    userId: "user_alice",
    amount: -0.0023,
    type: "usage",
    description: "Usage for claude-sonnet model",
    threadId: "thread_abc123",
    timestamp: minutesAgo(5),
  },
  {
    _id: "tx_002",
    userId: "user_alice",
    amount: -0.0001,
    type: "usage",
    description: "Tool usage: web_search",
    threadId: "thread_abc123",
    timestamp: minutesAgo(6),
  },
  {
    _id: "tx_003",
    userId: "user_alice",
    amount: -0.0018,
    type: "usage",
    description: "Usage for claude-sonnet model",
    threadId: "thread_abc123",
    timestamp: minutesAgo(8),
  },

  // Older thread
  {
    _id: "tx_004",
    userId: "user_alice",
    amount: -0.0045,
    type: "usage",
    description: "Usage for gpt-4o model",
    threadId: "thread_def456",
    timestamp: hoursAgo(2),
  },
  {
    _id: "tx_005",
    userId: "user_alice",
    amount: -0.0002,
    type: "usage",
    description: "Tool usage: code_interpreter",
    threadId: "thread_def456",
    timestamp: hoursAgo(2),
  },

  // Purchase
  {
    _id: "tx_006",
    userId: "user_alice",
    amount: 10.0,
    type: "purchase",
    description: "Purchased Plus tier",
    referenceId: "stripe_pi_123",
    timestamp: hoursAgo(24),
  },

  // Another thread with multiplier
  {
    _id: "tx_007",
    userId: "user_alice",
    amount: -0.0089,
    type: "usage",
    description: "Usage for claude-opus model",
    threadId: "thread_ghi789",
    multiplier: 2,
    timestamp: hoursAgo(48),
  },

  // Refund
  {
    _id: "tx_008",
    userId: "user_alice",
    amount: 5.0,
    type: "refund",
    description: "Refund for failed request",
    referenceId: "refund_456",
    timestamp: hoursAgo(72),
  },

  // Initial purchase
  {
    _id: "tx_009",
    userId: "user_alice",
    amount: 20.0,
    type: "purchase",
    description: "Purchased Pro tier",
    referenceId: "stripe_pi_789",
    timestamp: hoursAgo(168),
  },

  // Earlier thread activity
  {
    _id: "tx_010",
    userId: "user_alice",
    amount: -0.0034,
    type: "usage",
    description: "Usage for gemini-flash model",
    threadId: "thread_jkl012",
    timestamp: hoursAgo(96),
  },
  {
    _id: "tx_011",
    userId: "user_alice",
    amount: -0.0012,
    type: "usage",
    description: "Usage for gemini-flash model",
    threadId: "thread_jkl012",
    timestamp: hoursAgo(97),
  },
];

export const MOCK_BALANCE = 45.0;

export const PRICING_TIERS = [
  { id: "tier_5", name: "Starter", price: 5 },
  { id: "tier_10", name: "Plus", price: 10 },
  { id: "tier_20", name: "Pro", price: 20 },
];
