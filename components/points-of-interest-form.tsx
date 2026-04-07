"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PointOfInterest } from "@/lib/types";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

const ADDRESS_SEARCH_DEBOUNCE_MS = 450;

type PoiFormState = {
  id?: string;
  label: string;
  enabled: boolean;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: string;
  longitude: string;
  weight: string;
  radiusMiles: string;
  sortOrder: number;
};

type AddressSuggestion = { id: string; label: string };

function toFormState(pois: PointOfInterest[]) {
  return Array.from({ length: 3 }).map((_, index) => {
    const poi = pois[index];
    return {
      id: poi?.id,
      label: poi?.label ?? "",
      enabled: poi?.enabled ?? false,
      address: poi?.address ?? "",
      city: poi?.city ?? "",
      state: poi?.state ?? "CA",
      zipCode: poi?.zipCode ?? "",
      latitude: poi?.latitude?.toString() ?? "",
      longitude: poi?.longitude?.toString() ?? "",
      weight: poi?.weight?.toString() ?? String(index === 0 ? 5 : index === 1 ? 3 : 2),
      radiusMiles: poi?.radiusMiles?.toString() ?? "10",
      sortOrder: index,
    };
  });
}

function PoiCard({
  index,
  item,
  onChange,
}: {
  index: number;
  item: PoiFormState;
  onChange: (nextItem: PoiFormState) => void;
}) {
  const debouncedAddress = useDebouncedValue(item.address, ADDRESS_SEARCH_DEBOUNCE_MS);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const suppressNextLookupRef = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSuggestions() {
      if (suppressNextLookupRef.current === debouncedAddress) {
        suppressNextLookupRef.current = null;
        setSuggestions([]);
        return;
      }

      if (debouncedAddress.trim().length < 5) {
        setSuggestions([]);
        return;
      }

      const response = await fetch("/api/address-search", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: debouncedAddress }),
      }).catch(() => null);

      if (!response?.ok) {
        return;
      }

      const payload = (await response.json()) as { suggestions: AddressSuggestion[] };
      setSuggestions(payload.suggestions);
    }

    void loadSuggestions();

    return () => controller.abort();
  }, [debouncedAddress]);

  async function selectSuggestion(selectedId: string, label: string) {
    const response = await fetch("/api/address-select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedId, label }),
    });

    const payload = (await response.json()) as {
      suggestion?: {
        normalizedAddress: string;
        city: string;
        state: string;
        zipCode: string;
        latitude: number;
        longitude: number;
      };
    };

    if (!response.ok || !payload.suggestion) {
      return;
    }

    onChange({
      ...item,
      address: payload.suggestion.normalizedAddress,
      city: payload.suggestion.city,
      state: payload.suggestion.state,
      zipCode: payload.suggestion.zipCode,
      latitude: payload.suggestion.latitude.toString(),
      longitude: payload.suggestion.longitude.toString(),
    });
    suppressNextLookupRef.current = payload.suggestion.normalizedAddress;
    setSuggestions([]);
  }

  function update<K extends keyof PoiFormState>(key: K, value: PoiFormState[K]) {
    onChange({ ...item, [key]: value });
  }

  return (
    <section className="hs-panel rounded-[2rem] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-[family-name:var(--font-space-grotesk)] text-lg font-semibold text-[#17324f]">
          Point of interest {index + 1}
        </h2>
        <div className="flex items-center gap-3">
          <span
            className={
              item.enabled
                ? "hs-chip-blue rounded-full px-3 py-1 text-xs font-medium"
                : "rounded-full bg-[rgba(124,144,160,0.14)] px-3 py-1 text-xs font-medium text-[#6f8498]"
            }
          >
            {item.enabled ? "Included in ranking" : "Disabled"}
          </span>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="hs-label grid gap-2 text-sm font-medium">
          Label
          <input
            value={item.label}
            onChange={(event) => update("label", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
        <label className="hs-label grid gap-2 text-sm font-medium">
          Address
          <input
            value={item.address}
            onChange={(event) => update("address", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
        <label className="hs-label flex items-center gap-3 rounded-2xl border border-[rgba(124,144,160,0.22)] bg-[rgba(124,144,160,0.08)] px-4 py-3 text-sm font-medium md:justify-self-start">
          <input
            type="checkbox"
            checked={item.enabled}
            onChange={(event) => update("enabled", event.target.checked)}
            className="size-4 accent-[#034078]"
          />
          Enable this POI
        </label>
        {suggestions.length > 0 ? (
          <div className="md:col-span-2 rounded-2xl border border-[rgba(124,144,160,0.22)] bg-[#fffffc] p-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                onClick={() => selectSuggestion(suggestion.id, suggestion.label)}
                className="block w-full rounded-xl px-3 py-2 text-left text-sm text-[#4d6277] hover:bg-[rgba(124,144,160,0.08)]"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
        ) : null}
        <label className="hs-label grid gap-2 text-sm font-medium">
          Weight
          <input
            value={item.weight}
            onChange={(event) => update("weight", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
        <label className="hs-label grid gap-2 text-sm font-medium">
          Radius miles
          <input
            value={item.radiusMiles}
            onChange={(event) => update("radiusMiles", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
      </div>
    </section>
  );
}

export function PointsOfInterestForm({ pois }: { pois: PointOfInterest[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState<PoiFormState[]>(() => toFormState(pois));
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setForm(toFormState(pois));
  }, [pois]);

  function updateItem(index: number, nextItem: PoiFormState) {
    setForm((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? nextItem : item)),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const payload = form
        .filter((item) => item.label.trim() && item.address.trim())
        .map((item) => ({
          id: item.id,
          label: item.label,
          enabled: item.enabled,
          address: item.address,
          city: item.city,
          state: item.state,
          zipCode: item.zipCode,
          latitude: item.latitude ? Number(item.latitude) : null,
          longitude: item.longitude ? Number(item.longitude) : null,
          weight: Number(item.weight),
          radiusMiles: Number(item.radiusMiles),
          sortOrder: item.sortOrder,
        }));

      const saveResponse = await fetch("/api/pois", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pois: payload }),
      });

      if (!saveResponse.ok) {
        setStatus("Could not save points of interest.");
        return;
      }

      await fetch("/api/recompute-scores", {
        method: "POST",
      });

      setStatus("POIs saved and rankings refreshed.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      {form.map((item, index) => (
        <PoiCard key={index} index={index} item={item} onChange={(next) => updateItem(index, next)} />
      ))}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="hs-button-primary rounded-2xl px-5 py-3 text-sm font-medium transition"
        >
          {isPending ? "Saving..." : "Save POIs and refresh ranking"}
        </button>
        {status ? <p className="hs-muted text-sm">{status}</p> : null}
      </div>
    </form>
  );
}
