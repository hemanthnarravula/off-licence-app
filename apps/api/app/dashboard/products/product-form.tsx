"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { productCategorySchema } from "@offlicence/shared";

type SourcePlace = { id: string; name: string };

type ProductFormValues = {
  barcode: string;
  name: string;
  brand: string;
  category: string;
  sourcePlaceId: string;
  size: string;
  abv: string;
};

const emptyValues: ProductFormValues = {
  barcode: "",
  name: "",
  brand: "",
  category: "other",
  sourcePlaceId: "",
  size: "",
  abv: "",
};

export function ProductForm({
  productId,
  initial,
  initialImageUrl,
}: {
  productId?: string;
  initial?: Partial<ProductFormValues>;
  initialImageUrl?: string | null;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProductFormValues>({
    ...emptyValues,
    ...initial,
  });
  const [sourcePlaces, setSourcePlaces] = useState<SourcePlace[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(
    initialImageUrl ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    void fetch("/api/source-places")
      .then((res) => res.json())
      .then((data) => setSourcePlaces(data.sourcePlaces ?? []));
  }, []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const payload = {
      barcode: values.barcode,
      name: values.name,
      brand: values.brand || null,
      category: values.category,
      sourcePlaceId: values.sourcePlaceId || null,
      size: values.size || null,
      abv: values.abv || null,
    };

    const res = await fetch(
      productId ? `/api/products/${productId}` : "/api/products",
      {
        method: productId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();
    setPending(false);

    if (!res.ok) {
      setError(data.error ?? "Save failed");
      return;
    }

    router.push(`/dashboard/products/${data.product.id}`);
    router.refresh();
  }

  async function onUpload(file: File) {
    if (!productId) {
      setError("Save the product first, then upload an image.");
      return;
    }
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.set("file", file);
    const res = await fetch(`/api/products/${productId}/image`, {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    setImageUrl(data.imageUrl);
  }

  async function onRemoveImage() {
    if (!productId) return;
    setUploading(true);
    const res = await fetch(`/api/products/${productId}/image`, {
      method: "DELETE",
    });
    const data = await res.json();
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Remove failed");
      return;
    }
    setImageUrl(null);
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <Field label="Barcode">
        <input
          required
          value={values.barcode}
          onChange={(e) => setValues((v) => ({ ...v, barcode: e.target.value }))}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Name">
        <input
          required
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Brand">
        <input
          value={values.brand}
          onChange={(e) => setValues((v) => ({ ...v, brand: e.target.value }))}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Category">
        <select
          value={values.category}
          onChange={(e) =>
            setValues((v) => ({ ...v, category: e.target.value }))
          }
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          {productCategorySchema.options.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Source place">
        <select
          value={values.sourcePlaceId}
          onChange={(e) =>
            setValues((v) => ({ ...v, sourcePlaceId: e.target.value }))
          }
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
        >
          <option value="">None</option>
          {sourcePlaces.map((place) => (
            <option key={place.id} value={place.id}>
              {place.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Size">
          <input
            value={values.size}
            onChange={(e) => setValues((v) => ({ ...v, size: e.target.value }))}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </Field>
        <Field label="ABV">
          <input
            value={values.abv}
            onChange={(e) => setValues((v) => ({ ...v, abv: e.target.value }))}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
          />
        </Field>
      </div>

      <div className="rounded-md border border-zinc-200 bg-white p-4">
        <p className="text-sm font-medium text-zinc-800">Image</p>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            className="mt-3 h-28 w-28 rounded object-cover"
          />
        ) : (
          <p className="mt-2 text-sm text-zinc-500">No image yet.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="cursor-pointer rounded-md border border-zinc-300 px-3 py-1.5 text-sm">
            {uploading ? "Uploading…" : "Upload"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading || !productId}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
              }}
            />
          </label>
          {imageUrl ? (
            <button
              type="button"
              disabled={uploading}
              onClick={() => void onRemoveImage()}
              className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm"
            >
              Remove
            </button>
          ) : null}
        </div>
        {!productId ? (
          <p className="mt-2 text-xs text-zinc-500">
            Save the product first to enable Blob image upload.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Saving…" : productId ? "Save changes" : "Create product"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      {children}
    </label>
  );
}
