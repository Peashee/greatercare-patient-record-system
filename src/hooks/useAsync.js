import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Runs an async loader, tracking loading/error state and exposing `reload`.
 * Stale responses (from a previous dependency set) are ignored.
 */
export function useAsync(loader, deps = []) {
  const [state, setState] = useState({ data: undefined, loading: true, error: null });
  const requestId = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(loader, deps);

  const reload = useCallback(async () => {
    const id = ++requestId.current;
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const data = await run();
      if (id === requestId.current) setState({ data, loading: false, error: null });
      return data;
    } catch (error) {
      console.error(error);
      if (id === requestId.current) setState((current) => ({ ...current, loading: false, error }));
      return undefined;
    }
  }, [run]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { ...state, reload, setData: (data) => setState((current) => ({ ...current, data })) };
}
