"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Edit, Plus, Power, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { AdminPageHeader } from "./admin-page-header";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import type { CatalogRow, Database } from "@/lib/database.types";
import { getSafeErrorMessage } from "@/lib/security";
import { createClient } from "@/lib/supabase/client";
import { serviceTemplateSchema } from "@/lib/validation";
import { serviceTypes } from "@/lib/constants";
import { normalizeServiceType } from "@/lib/service-workflow";
import { money } from "@/lib/utils";

type Template = Database["public"]["Tables"]["service_templates"]["Row"];
type TemplateItem = Database["public"]["Tables"]["service_template_items"]["Row"];
type InputValues = z.input<typeof serviceTemplateSchema>;
type Values = z.output<typeof serviceTemplateSchema>;

export function ServiceTemplatesManager() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [labor, setLabor] = useState<CatalogRow[]>([]);
  const [parts, setParts] = useState<CatalogRow[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [editing, setEditing] = useState<Template | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<InputValues, unknown, Values>({ resolver: zodResolver(serviceTemplateSchema) });

  async function load() {
    const supabase = createClient();
    const [templateResult, itemResult, laborResult, partsResult] = await Promise.all([
      supabase.from("service_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("service_template_items").select("*").order("sort_order"),
      supabase.from("labor_items").select("*").eq("is_active", true).order("name"),
      supabase.from("parts_items").select("*").eq("is_active", true).order("name")
    ]);

    if (templateResult.error) setError(getSafeErrorMessage("load service templates"));
    setTemplates(templateResult.data ?? []);
    setItems((itemResult.data ?? []) as TemplateItem[]);
    setLabor((laborResult.data ?? []) as CatalogRow[]);
    setParts((partsResult.data ?? []) as CatalogRow[]);
    setSelected((current) => current ?? templateResult.data?.[0] ?? null);
  }

  useEffect(() => {
    load();
  }, []);

  const selectedItems = useMemo(() => items.filter((item) => item.service_template_id === selected?.id).sort((a, b) => a.sort_order - b.sort_order), [items, selected]);
  const selectedTotal = useMemo(() => selectedItems.reduce((sum, item) => sum + Number(item.default_quantity) * Number(item.default_unit_price), 0), [selectedItems]);

  function startCreate() {
    setEditing(null);
    reset({ name: "", service_type_key: "", display_name: "", description: "", is_active: true });
    setOpen(true);
  }

  function startEdit(template: Template) {
    setEditing(template);
    reset({
      name: template.name,
      service_type_key: template.service_type_key ?? "",
      display_name: template.display_name ?? "",
      description: template.description ?? "",
      is_active: template.is_active
    });
    setOpen(true);
  }

  async function onSubmit(values: Values) {
    const supabase = createClient();
    const payload = {
      name: values.name,
      service_type_key: values.service_type_key || normalizeServiceType(values.display_name || values.name),
      display_name: values.display_name || values.name,
      description: values.description || null,
      is_active: values.is_active
    };
    const result = editing
      ? await (supabase as any).from("service_templates").update(payload).eq("id", editing.id)
      : await (supabase as any).from("service_templates").insert(payload);
    if (result.error) {
      setError(getSafeErrorMessage("save the service template"));
      return;
    }
    setOpen(false);
    setEditing(null);
    await load();
  }

  async function toggle(template: Template) {
    const supabase = createClient();
    const { error: updateError } = await (supabase as any).from("service_templates").update({ is_active: !template.is_active }).eq("id", template.id);
    if (updateError) setError(getSafeErrorMessage("update the service template"));
    await load();
  }

  async function addTemplateItem(type: "labor" | "part", id: string) {
    if (!selected || !id) return;
    const source = type === "labor" ? labor.find((item) => item.id === id) : parts.find((item) => item.id === id);
    if (!source) return;
    const supabase = createClient();
    const { error: insertError } = await (supabase as any).from("service_template_items").insert({
      service_template_id: selected.id,
      item_type: type,
      labor_item_id: type === "labor" ? source.id : null,
      part_item_id: type === "part" ? source.id : null,
      name_snapshot: source.name,
      description_snapshot: source.description,
      default_quantity: 1,
      default_unit_price: source.default_price,
      sort_order: selectedItems.length + 1
    });
    if (insertError) setError(getSafeErrorMessage("add the template item"));
    await load();
  }

  async function removeTemplateItem(item: TemplateItem) {
    const supabase = createClient();
    const { error: deleteError } = await (supabase as any).from("service_template_items").delete().eq("id", item.id);
    if (deleteError) setError(getSafeErrorMessage("remove the template item"));
    await load();
  }

  async function updateQuantity(item: TemplateItem, quantity: number) {
    const supabase = createClient();
    await (supabase as any).from("service_template_items").update({ default_quantity: quantity }).eq("id", item.id);
    await load();
  }

  async function moveTemplateItem(item: TemplateItem, direction: -1 | 1) {
    const currentIndex = selectedItems.findIndex((row) => row.id === item.id);
    const target = selectedItems[currentIndex + direction];
    if (!target) return;
    const supabase = createClient();
    await Promise.all([
      (supabase as any).from("service_template_items").update({ sort_order: target.sort_order }).eq("id", item.id),
      (supabase as any).from("service_template_items").update({ sort_order: item.sort_order }).eq("id", target.id)
    ]);
    await load();
  }

  return (
    <section>
      <AdminPageHeader
        title="Service Templates"
        description="Define default labor and parts loaded into future quotations. Existing quotations remain unchanged."
        action={<Button onClick={startCreate}><Plus className="h-4 w-4" /> New template</Button>}
      />
      {error ? <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-danger">{error}</div> : null}
      <div className="grid min-w-0 gap-5 xl:grid-cols-[22rem_1fr]">
        <div className="grid gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              className={`rounded-lg border p-4 text-left shadow-panel ${selected?.id === template.id ? "border-primary-300 bg-primary-50" : "border-line bg-white"}`}
              onClick={() => setSelected(template)}
            >
              <div className="flex justify-between gap-3">
                <h2 className="font-bold text-ink">{template.name}</h2>
                <StatusBadge value={template.is_active ? "active" : "inactive"} />
              </div>
              <p className="mt-2 text-sm text-muted">{template.description || "No description"}</p>
            </button>
          ))}
        </div>
        <div className="admin-panel min-w-0 p-5">
          {selected ? (
            <>
              <div className="flex flex-col gap-3 border-b border-line pb-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-ink">{selected.name}</h2>
                  <p className="break-words text-sm text-muted">{selected.display_name || selected.description || "Template default load"}</p>
                  {selected.service_type_key ? <p className="mt-1 break-words text-xs font-bold text-primary-700">Service match: {selected.service_type_key}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => startEdit(selected)}><Edit className="h-4 w-4" /> Edit</Button>
                  <Button variant="outline" size="sm" onClick={() => toggle(selected)}>
                    <Power className="h-4 w-4" />
                    {selected.is_active ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                Template changes affect future quotations only. Existing quotations keep their saved item snapshots.
              </div>
              <div className="mt-4 grid gap-3 rounded-lg border border-line bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <div><span className="font-bold text-ink">Mapped service type</span><p className="mt-1 text-muted">{selected.display_name || selected.name}</p></div>
                <div><span className="font-bold text-ink">Estimated default total</span><p className="mt-1 text-primary-800">{money(selectedTotal)}</p></div>
              </div>
              <div className="mt-5 grid min-w-0 gap-3 md:grid-cols-2">
                <Select label="Add labor item" defaultValue="" onChange={(event) => addTemplateItem("labor", event.target.value)}>
                  <option value="">Select labor</option>
                  {labor.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
                <Select label="Add parts item" defaultValue="" onChange={(event) => addTemplateItem("part", event.target.value)}>
                  <option value="">Select part</option>
                  {parts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
              </div>
              <div className="mt-6 grid gap-3">
                {selectedItems.map((item, index) => (
                  <div key={item.id} className="grid min-w-0 gap-3 rounded-lg border border-line bg-slate-50 p-3 md:grid-cols-[minmax(0,1fr)_8rem_8rem_auto] md:items-center">
                    <div className="min-w-0">
                      <p className="break-words font-bold text-ink">{index + 1}. {item.name_snapshot}</p>
                      <p className="text-sm text-muted">{item.item_type} - {money(item.default_unit_price)}</p>
                    </div>
                    <Input label="Qty" type="number" step="0.01" defaultValue={item.default_quantity} onBlur={(event) => updateQuantity(item, Number(event.target.value))} />
                    <div className="text-sm font-bold text-ink md:text-right">{money(Number(item.default_quantity) * Number(item.default_unit_price))}</div>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" disabled={index === 0} onClick={() => moveTemplateItem(item, -1)}><ArrowUp className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" disabled={index === selectedItems.length - 1} onClick={() => moveTemplateItem(item, 1)}><ArrowDown className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => removeTemplateItem(item)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}
                {!selectedItems.length ? <p className="rounded-lg border border-dashed border-line p-6 text-center text-sm text-muted">Add default labor or parts items to this template.</p> : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted">Create a template to begin.</p>
          )}
        </div>
      </div>
      <Modal title={editing ? "Edit service template" : "Create service template"} open={open} onClose={() => { setOpen(false); setEditing(null); }}>
        <form className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Template name" {...register("name")} error={errors.name?.message} />
          <Select label="Service type match" {...register("display_name")} error={errors.display_name?.message}>
            <option value="">Select service type</option>
            {serviceTypes.map((type) => <option key={type}>{type}</option>)}
          </Select>
          <Input label="Service type key optional" placeholder="aircon_cleaning" {...register("service_type_key")} error={errors.service_type_key?.message} />
          <Textarea label="Description" {...register("description")} error={errors.description?.message} />
          <label className="flex items-center gap-2 text-sm font-bold text-ink">
            <input type="checkbox" {...register("is_active")} />
            Active
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>Save template</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
