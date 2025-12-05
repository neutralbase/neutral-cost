export type DemoUser = {
  id: string;
  name: string;
  role: string;
  summary: string;
};

export const DEMO_USERS: DemoUser[] = [
  {
    id: "user1",
    name: "User One",
    role: "Ops lead",
    summary: "Keeps budgets steady and reviews team usage daily.",
  },
  {
    id: "user2",
    name: "User Two",
    role: "Finance",
    summary: "Focuses on monthly rollups and long-term spend patterns.",
  },
];
