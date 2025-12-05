import { useState, useCallback } from "react";
import { ThemeProvider } from "./components/theme-provider";
import { ChatPanel } from "./components/chat-panel";
import { UserCard } from "./components/user-card";
import { TransactionList } from "./components/sidebar/transaction-list";
import { DEMO_USERS } from "./data/demo-users";
import { useUserQueryParam } from "./hooks/use-user-query-param";

function App() {
  const { selectedUser, setSelectedUser } = useUserQueryParam(
    DEMO_USERS.map((item) => item.id),
  );
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);

  const activeUser = DEMO_USERS.find((user) => user.id === selectedUser);

  const handleGoToThread = useCallback((threadId: string) => {
    setCurrentThreadId(threadId);
  }, []);

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="dark min-h-screen bg-background text-foreground">
        <div className="mx-auto flex flex-col p-4">
          <div className="flex flex-col gap-10">
            {!activeUser ? (
              <div className="flex flex-col gap-8 rounded-xl border border-border bg-card p-6 shadow-sm sm:p-10">
                <header className="flex flex-col gap-3">
                  <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
                    Demo switcher
                  </p>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                      Choose a user to explore Neutral Cost
                    </h1>
                    <p className="text-base text-muted-foreground">
                      Pick one of the preset identities to load the example UI
                      with that user attached as a query string.
                    </p>
                  </div>
                </header>

                <section className="grid gap-4 md:grid-cols-2">
                  {DEMO_USERS.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      isActive={selectedUser === user.id}
                      onSelect={setSelectedUser}
                    />
                  ))}
                </section>
              </div>
            ) : (
              <div className="grid h-[calc(100vh-2rem)] w-full grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
                <div className="flex min-h-0 flex-col rounded-xl border border-border bg-card shadow-sm">
                  <ChatPanel
                    user={activeUser}
                    threadId={currentThreadId}
                    onThreadChange={setCurrentThreadId}
                  />
                </div>

                <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
                  <TransactionList
                    userId={activeUser.id}
                    currentThreadId={currentThreadId}
                    onGoToThread={handleGoToThread}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default App;
