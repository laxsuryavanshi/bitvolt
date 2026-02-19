import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { useNetworkStatus } from './useNetworkStatus';

describe('useNetworkStatus', () => {
  let onLineSpy: ReturnType<typeof vi.spyOn>;
  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    onLineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    addSpy = vi.spyOn(window, 'addEventListener');
    removeSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function goOffline() {
    onLineSpy.mockReturnValue(false);
    window.dispatchEvent(new Event('offline'));
  }

  function goOnline() {
    onLineSpy.mockReturnValue(true);
    window.dispatchEvent(new Event('online'));
  }

  it('returns isOnline=true when the browser is online', () => {
    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(true);
    expect(result.current.lastChangedAt).toBeLessThanOrEqual(Date.now());
  });

  it('returns isOnline=false when the browser is offline', () => {
    onLineSpy.mockReturnValue(false);

    const { result } = renderHook(() => useNetworkStatus());

    expect(result.current.isOnline).toBe(false);
  });

  it('transitions from online to offline when an "offline" event fires', () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(true);

    act(() => {
      goOffline();
    });

    expect(result.current.isOnline).toBe(false);
  });

  it('transitions from offline to online when an "online" event fires', () => {
    onLineSpy.mockReturnValue(false);
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.isOnline).toBe(false);

    act(() => {
      goOnline();
    });

    expect(result.current.isOnline).toBe(true);
  });

  it('updates lastChangedAt on each status transition', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNetworkStatus());
    const initialTimestamp = result.current.lastChangedAt;

    vi.advanceTimersByTime(1000);

    act(() => {
      goOffline();
    });

    const afterOffline = result.current.lastChangedAt;
    expect(afterOffline).toBeGreaterThan(initialTimestamp);

    vi.advanceTimersByTime(1000);

    act(() => {
      goOnline();
    });

    expect(result.current.lastChangedAt).toBeGreaterThan(afterOffline);

    vi.useRealTimers();
  });

  it('does NOT update lastChangedAt when the same event fires without a real change', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useNetworkStatus());
    const initialTimestamp = result.current.lastChangedAt;

    vi.advanceTimersByTime(500);

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.lastChangedAt).toBe(initialTimestamp);

    vi.useRealTimers();
  });

  it('subscribes to "online" and "offline" window events on mount', () => {
    renderHook(() => useNetworkStatus());

    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('unsubscribes from window events on unmount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('re-subscribes correctly after unmount and remount', () => {
    const { unmount } = renderHook(() => useNetworkStatus());
    unmount();

    expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    addSpy.mockClear();

    const { result } = renderHook(() => useNetworkStatus());
    expect(addSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    act(() => {
      goOffline();
    });
    expect(result.current.isOnline).toBe(false);
  });

  it('handles rapid online↔offline toggling correctly', () => {
    const { result } = renderHook(() => useNetworkStatus());

    act(() => {
      goOffline();
    });
    expect(result.current.isOnline).toBe(false);

    act(() => {
      goOnline();
    });
    expect(result.current.isOnline).toBe(true);

    act(() => {
      goOffline();
    });
    expect(result.current.isOnline).toBe(false);
  });
});
