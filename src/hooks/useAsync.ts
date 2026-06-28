import { useState, useEffect, useCallback, useRef } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAsync<T>(
  fn: () => Promise<T>,
  deps: React.DependencyList = [],
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null });
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const run = useCallback(() => {
    setState(s => ({ ...s, loading: true, error: null }));
    fnRef.current()
      .then(data => setState({ data, loading: false, error: null }))
      .catch(e => setState({ data: null, loading: false, error: e?.response?.data?.message ?? e?.message ?? 'Error' }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, deps);

  return { ...state, refetch: run };
}
