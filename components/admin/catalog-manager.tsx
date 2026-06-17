"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Edit, Plus, Power, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { AdminPageHeader } from "./admin-page-header";
import { Button } from "@/components/ui/button";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Input, Textarea } from "@/components/ui/field";
import { MobileCard } from "@/components/ui/mobile-card";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CatalogRow, Database } from "@/lib/database.types";
import { getSafeErrorMessage } from "@/lib/security";
import { createClient } from "@/lib/supabase/client";
import { catalogItemSchema } from "@/lib/validation";
import { money } from "@/lib/utils";
import { catalogUsageForItem } from "@/lib/service-workflow";

type InputValues = z.input<typeof catalogItemSchema>;
type Values = z.output<typeof catalogItemSchema>;
type TemplateItem = Database["public"]["Tables"]["service_template_items"]["Row"];
type QuotationItem = Database["public"]["Tables"]["quotation_items"]["Row"];

export function CatalogManager({
  table,
  title,
  description
}: {
  table: "labor_items" | "parts_items";
  title: string;
  description: string;
}) {
  const [items, setItems] = useState<CatalogRow[]>([]);
  const [templateItems, setTemplateItems] = useState<TemplateItem[]>([]);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<CatalogRow | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<InputValues, unknown, Values>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: { name: "", description: "", default_price: 0, is_active: true }
  });

  async function load() {
    setLoading(true);
    const supabase = createClient();
    const [catalogResult, templateResult, quoteItemResult] = await Promise.all([
      (supabase as any).from(table).select("*").order("created_at", { ascending: false }),
      supabase.from("service_template_items").select("*"),
      supabase.from("quotation_items").select("*")
    ]);
    if (catalogResult.error) setError(getSafeErrorMessage("load catalog items"));
    setItems((catalogResult.data ?? []) as CatalogRow[]);
    setTemplateItems((templateResult.data ?? []) as TemplateItem[]);
    setQuotationItems((quoteItemResult.data ?? []) as QuotationItem[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return items.filter((item) => `${item.name} ${item.description ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  }, [items, query]);

  function startCreate() {
    setEditing(null);
    reset({ name: "", description: "", default_price: 0, is_active: true });
    setOpen(true);
  }

  function startEdit(item: CatalogRow) {
    setEditing(item);
    reset({
      name: item.name,
      description: item.description ?? "",
      default_price: Number(item.default_price),
      is_active: item.is_active
    });
    setOpen(true);
  }

  async function onSubmit(values: Values) {
    setError(null);
    const supabase = createClient();
    const payload = {
      name: values.name,
      description: values.description || null,
      default_price: values.default_price,
      is_active: values.is_active
    };

    const result = editing
      ? await (supabase as any).from(table).update(payload).eq("id", editing.id)
      : await (supabase as any).from(table).insert(payload);

    if (result.error) {
      setError(getSafeErrorMessage("save the catalog item"));
      return;
    }
    setOpen(false);
    await load();
  }

  async function toggle(item: CatalogRow) {
    const supabase = createClient();
    const { error: toggleError } = await (supabase as any).from(table).update({ is_active: !item.is_active }).eq("id", item.id);
    if (toggleError) setError(getSafeErrorMessage("update the catalog item"));
    await load();
  }

  async function remove(item: CatalogRow) {
    const usage = catalogUsageForItem(table === "labor_items" ? "labor" : "part", item.id, templateItems, quotationItems);
    if (usage.isUsed) {
      setError(`This item is used in ${usage.templateCount} template item(s) and ${usage.quotationCount} quotation item(s). Disable it instead so existing records stay intact.`);
      return;
    }
    const supabase = createClient();
    const { error: deleteError } = await (supabase as any).from(table).delete().eq("id", item.id);
    if (deleteError) {
      setError("Item can only be deleted if it is unused. Disable it instead when it already appears in templates or quotations.");
      return;
    }
    await load();
  }

  const columns: Column<CatalogRow>[] = [
    { key: "name", header: "Name", cell: (row) => <span className="font-bold text-ink">{row.name}</span> },
    { key: "description", header: "Description", cell: (row) => <span className="text-muted">{row.description || "No description"}</span> },
    { key: "price", header: "Default Price", cell: (row) => money(row.default_price) },
    { key: "status", header: "Status", cell: (row) => <StatusBadge value={row.is_active ? "active" : "inactive"} /> },
    {
      key: "actions",
      header: "Actions",
      className: "px-4 py-3 text-right",
      cell: (row) => {
        const usage = catalogUsageForItem(table === "labor_items" ? "labor" : "part", row.id, templateItems, quotationItems);
        return (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => startEdit(row)}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" onClick={() => toggle(row)}><Power className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" disabled={usage.isUsed} title={usage.isUsed ? "Disable used items instead of deleting them." : "Delete unused item"} onClick={() => remove(row)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        );
      }
    }
  ];

  return (
    <section>
      <AdminPageHeader
        title={title}
        description={description}
        action={<Button onClick={startCreate}><Plus className="h-4 w-4" /> Add item</Button>}
      />
      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">{error}</div> : null}
      <div className="mb-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={`Search ${title.toLowerCase()}`}
          className="focus-ring min-h-11 w-full rounded-md border-line bg-white text-sm md:max-w-sm"
        />
      </div>
      {loading ? <p className="text-sm text-muted">Loading...</p> : <DataTable rows={filtered} columns={columns} emptyTitle={`No ${title.toLowerCase()}`} />}
      <div className="grid gap-3 lg:hidden">
        {filtered.map((item) => {
          const usage = catalogUsageForItem(table === "labor_items" ? "labor" : "part", item.id, templateItems, quotationItems);
          return (
            <MobileCard
              key={item.id}
              title={item.name}
              subtitle={`${money(item.default_price)} - ${item.description || "No description"}`}
              status={item.is_active ? "active" : "inactive"}
              action={<div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => startEdit(item)}>Edit</Button><Button size="sm" variant="outline" onClick={() => toggle(item)}>{item.is_active ? "Disable" : "Enable"}</Button><Button size="sm" variant="ghost" disabled={usage.isUsed} onClick={() => remove(item)}>Delete</Button></div>}
            />
          );
        })}
      </div>
      <Modal title={editing ? `Edit ${title}` : `Add ${title}`} open={open} onClose={() => setOpen(false)}>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Name" {...register("name")} error={errors.name?.message} />
          <Textarea label="Description" {...register("description")} error={errors.description?.message} />
          <Input label="Default price" type="number" step="0.01" {...register("default_price")} error={errors.default_price?.message} />
          <label className="flex items-center gap-2 text-sm font-bold text-ink">
            <input type="checkbox" {...register("is_active")} />
            Active
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving..." : "Save"}</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
