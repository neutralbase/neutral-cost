import { useEffect, useMemo, useState } from "react";

type UseUserQueryParamResult = {
  selectedUser: string | null;
  setSelectedUser: (value: string | null) => void;
  selectedLabel: string;
};

const PARAM_KEY = "user";

export function useUserQueryParam(
  allowedUserIds: string[],
): UseUserQueryParamResult {
  const getInitialUser = () => {
    if (typeof window === "undefined") return null;
    const params = new URLSearchParams(window.location.search);
    const user = params.get(PARAM_KEY);
    return allowedUserIds.includes(user ?? "") ? user : null;
  };

  const [selectedUser, setSelectedUser] = useState<string | null>(() =>
    getInitialUser(),
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (selectedUser) {
      params.set(PARAM_KEY, selectedUser);
    } else {
      params.delete(PARAM_KEY);
    }
    const query = params.toString();
    const newUrl = query
      ? `${window.location.pathname}?${query}`
      : window.location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [selectedUser]);

  const selectedLabel = useMemo(() => {
    if (!selectedUser) return "none";
    return `?${PARAM_KEY}=${selectedUser}`;
  }, [selectedUser]);

  return { selectedUser, setSelectedUser, selectedLabel };
}
