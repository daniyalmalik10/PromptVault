import { useCallback, useEffect, useReducer, useState } from "react";
import { promptsApi, type PaginatedResponse, type Prompt } from "../api/prompts";

interface State {
  data: PaginatedResponse<Prompt> | null;
  isLoading: boolean;
  error: string | null;
}

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; data: PaginatedResponse<Prompt> }
  | { type: "FETCH_ERROR" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, isLoading: true, error: null };
    case "FETCH_SUCCESS":
      return { data: action.data, isLoading: false, error: null };
    case "FETCH_ERROR":
      return { ...state, isLoading: false, error: "Failed to load prompts." };
  }
}

interface UsePromptsResult extends State {
  page: number;
  setPage: (p: number) => void;
  search: string;
  setSearch: (s: string) => void;
  refetch: () => void;
}

export function usePrompts(): UsePromptsResult {
  const [{ data, isLoading, error }, dispatch] = useReducer(reducer, {
    data: null,
    isLoading: true,
    error: null,
  });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [refetchTick, setRefetchTick] = useState(0);

  useEffect(() => {
    dispatch({ type: "FETCH_START" });
    promptsApi
      .list({ search: search || undefined, page })
      .then((res) => dispatch({ type: "FETCH_SUCCESS", data: res.data }))
      .catch(() => dispatch({ type: "FETCH_ERROR" }));
  }, [page, search, refetchTick]);

  const refetch = useCallback(() => setRefetchTick((t) => t + 1), []);

  return { data, isLoading, error, page, setPage, search, setSearch, refetch };
}
