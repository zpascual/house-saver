"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HomeWithDetails } from "@/lib/types";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

const ADDRESS_SEARCH_DEBOUNCE_MS = 450;

type EditableHome = {
  displayName: string;
  sourceUrl: string;
  status: HomeWithDetails["status"];
  normalizedAddress: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: string;
  longitude: string;
  rent: string;
  beds: string;
  baths: string;
  notes: string;
};

type AddressSuggestion = {
  id: string;
  label: string;
};

function toFormState(home: HomeWithDetails): EditableHome {
  return {
    displayName: home.displayName,
    sourceUrl: home.sourceUrl ?? "",
    status: home.status,
    normalizedAddress: home.normalizedAddress,
    streetAddress: home.streetAddress,
    city: home.city,
    state: home.state,
    zipCode: home.zipCode,
    latitude: home.latitude?.toString() ?? "",
    longitude: home.longitude?.toString() ?? "",
    rent: home.rent?.toString() ?? "",
    beds: home.beds?.toString() ?? "",
    baths: home.baths?.toString() ?? "",
    notes: home.notes,
  };
}

export function HomeForm({ home }: { home: HomeWithDetails }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [form, setForm] = useState(() => toFormState(home));
  const [addressQuery, setAddressQuery] = useState(home.normalizedAddress);
  const debouncedAddressQuery = useDebouncedValue(addressQuery, ADDRESS_SEARCH_DEBOUNCE_MS);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const suppressNextLookupRef = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadSuggestions() {
      if (suppressNextLookupRef.current === debouncedAddressQuery) {
        suppressNextLookupRef.current = null;
        setAddressSuggestions([]);
        return;
      }

      if (debouncedAddressQuery.trim().length < 5) {
        setAddressSuggestions([]);
        return;
      }

      const response = await fetch("/api/address-search", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: debouncedAddressQuery }),
      }).catch(() => null);

      if (!response?.ok) {
        return;
      }

      const payload = (await response.json()) as { suggestions: AddressSuggestion[] };
      setAddressSuggestions(payload.suggestions);
    }

    void loadSuggestions();

    return () => controller.abort();
  }, [debouncedAddressQuery]);

  async function selectSuggestion(selectedId: string, label: string) {
    const response = await fetch("/api/address-select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ selectedId, label }),
    });

    const payload = (await response.json()) as {
      suggestion?: {
        normalizedAddress: string;
        streetAddress: string;
        city: string;
        state: string;
        zipCode: string;
        latitude: number;
        longitude: number;
      };
    };

    if (!response.ok || !payload.suggestion) {
      setError("Could not resolve that address.");
      return;
    }

    setForm((current) => ({
      ...current,
      normalizedAddress: payload.suggestion!.normalizedAddress,
      streetAddress: payload.suggestion!.streetAddress,
      city: payload.suggestion!.city,
      state: payload.suggestion!.state,
      zipCode: payload.suggestion!.zipCode,
      latitude: payload.suggestion!.latitude.toString(),
      longitude: payload.suggestion!.longitude.toString(),
    }));
    suppressNextLookupRef.current = payload.suggestion.normalizedAddress;
    setAddressQuery(payload.suggestion.normalizedAddress);
    setAddressSuggestions([]);
  }

  function updateField<K extends keyof EditableHome>(key: K, value: EditableHome[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/homes/${home.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName,
          sourceUrl: form.sourceUrl || null,
          status: form.status,
          normalizedAddress: form.normalizedAddress,
          streetAddress: form.streetAddress,
          city: form.city,
          state: form.state,
          zipCode: form.zipCode,
          latitude: form.latitude ? Number(form.latitude) : null,
          longitude: form.longitude ? Number(form.longitude) : null,
          rent: form.rent ? Number(form.rent) : null,
          beds: form.beds ? Number(form.beds) : null,
          baths: form.baths ? Number(form.baths) : null,
          notes: form.notes,
        }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Could not save this home.");
        return;
      }

      setMessage("Listing saved.");
      router.push("/homes");
      router.refresh();
    });
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Remove "${home.displayName}" from your saved listings? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const response = await fetch(`/api/homes/${home.id}`, {
        method: "DELETE",
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Could not remove this listing.");
        return;
      }

      router.push("/homes");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="hs-panel grid gap-6 rounded-[2rem] p-6">
      <div className="grid gap-5 md:grid-cols-2">
        <label className="hs-label grid gap-2 text-sm font-medium">
          Listing name
          <input
            value={form.displayName}
            onChange={(event) => updateField("displayName", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
        <label className="hs-label grid gap-2 text-sm font-medium">
          Source URL
          <input
            value={form.sourceUrl}
            onChange={(event) => updateField("sourceUrl", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
        <div className="md:col-span-2">
          <label className="hs-label grid gap-2 text-sm font-medium">
            Address search
            <input
              value={addressQuery}
              onChange={(event) => setAddressQuery(event.target.value)}
              placeholder="Start typing an address in your target area"
              className="hs-input rounded-2xl px-4 py-3 outline-none"
            />
          </label>
          {addressSuggestions.length > 0 ? (
            <div className="mt-2 rounded-2xl border border-[rgba(124,144,160,0.22)] bg-[#fffffc] p-2 shadow-lg">
              {addressSuggestions.map((suggestion) => (
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
        </div>
        <label className="hs-label grid gap-2 text-sm font-medium">
          Normalized address
          <input
            value={form.normalizedAddress}
            onChange={(event) => updateField("normalizedAddress", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
        <label className="hs-label grid gap-2 text-sm font-medium">
          Street
          <input
            value={form.streetAddress}
            onChange={(event) => updateField("streetAddress", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
        <label className="hs-label grid gap-2 text-sm font-medium">
          City
          <input
            value={form.city}
            onChange={(event) => updateField("city", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
        <label className="hs-label grid gap-2 text-sm font-medium">
          ZIP
          <input
            value={form.zipCode}
            onChange={(event) => updateField("zipCode", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
        <label className="hs-label grid gap-2 text-sm font-medium">
          Rent
          <input
            value={form.rent}
            onChange={(event) => updateField("rent", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
        <label className="hs-label grid gap-2 text-sm font-medium">
          Beds
          <input
            value={form.beds}
            onChange={(event) => updateField("beds", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
        <label className="hs-label grid gap-2 text-sm font-medium">
          Baths
          <input
            value={form.baths}
            onChange={(event) => updateField("baths", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
        <label className="hs-label grid gap-2 text-sm font-medium">
          Latitude
          <input
            value={form.latitude}
            onChange={(event) => updateField("latitude", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
        <label className="hs-label grid gap-2 text-sm font-medium">
          Longitude
          <input
            value={form.longitude}
            onChange={(event) => updateField("longitude", event.target.value)}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          />
        </label>
        <label className="hs-label grid gap-2 text-sm font-medium">
          Status
          <select
            value={form.status}
            onChange={(event) => updateField("status", event.target.value as EditableHome["status"])}
            className="hs-input rounded-2xl px-4 py-3 outline-none"
          >
            <option value="draft">Draft</option>
            <option value="saved">Saved</option>
            <option value="favorite">Favorite</option>
            <option value="archived">Archived</option>
          </select>
        </label>
      </div>
      <label className="hs-label grid gap-2 text-sm font-medium">
        Notes
        <textarea
          value={form.notes}
          onChange={(event) => updateField("notes", event.target.value)}
          rows={5}
          className="hs-input rounded-[1.5rem] px-4 py-3 outline-none"
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="hs-button-primary rounded-2xl px-5 py-3 text-sm font-medium transition"
        >
          {isPending ? "Saving..." : "Save listing"}
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Remove listing
        </button>
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </form>
  );
}
