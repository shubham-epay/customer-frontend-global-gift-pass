import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../api/client';

/** Runs `fn` whenever `deps` change; ignores stale responses. Returns { data, meta, loading, error, reload, setData }. */
export default function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const seq = useRef(0);

  const run = useCallback(() => {
    const id = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    return Promise.resolve(fn())
      .then((r) => { if (id === seq.current) setState({ data: r?.data ?? null, meta: r?.meta ?? null, loading: false, error: null }); })
      .catch((err) => { if (id === seq.current) setState((s) => ({ ...s, loading: false, error: errorMessage(err), status: err?.response?.status })); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { run(); }, [run]);

  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), []);
  return { ...state, reload: run, setData };
}
