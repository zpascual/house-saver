import { act, renderHook } from "@testing-library/react";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits until typing pauses before updating the value", () => {
    const { result, rerender } = renderHook(
      ({ value, delayMs }) => useDebouncedValue(value, delayMs),
      {
        initialProps: {
          value: "766 Fi",
          delayMs: 450,
        },
      },
    );

    expect(result.current).toBe("766 Fi");

    rerender({ value: "766 First", delayMs: 450 });
    expect(result.current).toBe("766 Fi");

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current).toBe("766 Fi");

    rerender({ value: "766 First St", delayMs: 450 });
    expect(result.current).toBe("766 Fi");

    act(() => {
      vi.advanceTimersByTime(449);
    });
    expect(result.current).toBe("766 Fi");

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe("766 First St");
  });
});
