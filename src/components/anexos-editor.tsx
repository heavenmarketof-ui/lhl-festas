import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Paperclip, Plus, Upload, Loader2 } from "lucide-react";

export type Anexo = { nome: string; url: string };

const EXT_OK = ["pdf", "png", "jpg", "jpeg", "webp", "svg"];
const MIME_OK = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
];
const MAX_BYTES = 10 * 1024 * 1024;

/** Anexos da etapa de Produção: upload real de arquivo + link opcional. */
export function AnexosEditor({
  anexos,
  pasta,
  onChange,
}: {
  anexos: Anexo[];
  pasta: string;
  onChange: (a: Anexo[]) => void;
}) {
  const [nome, setNome] = useState("");
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  async function handleFile(f: File) {
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    const mime = (f.type || "").toLowerCase();
    if (!EXT_OK.includes(ext) && !MIME_OK.includes(mime)) {
      toast.error("Formato inválido. Envie PDF, PNG, JPG, JPEG, WEBP ou SVG.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error(`Arquivo muito grande (${(f.size / 1024 / 1024).toFixed(1)} MB). Limite: 10 MB.`);
      return;
    }
    setUploading(true);
    const toastId = toast.loading("Enviando arquivo...");
    try {
      const safe = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `producao/${pasta}/${Date.now()}-${safe}`;
      const { error } = await supabase.storage
        .from("contract-photos")
        .upload(path, f, { upsert: true, contentType: mime || undefined, cacheControl: "3600" });
      if (error) throw error;
      const { data, error: e2 } = await supabase.storage
        .from("contract-photos")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (e2 || !data?.signedUrl) throw e2 ?? new Error("Falha ao gerar o link do arquivo.");
      onChange([...anexos, { nome: f.name, url: data.signedUrl }]);
      toast.success("Arquivo anexado.", { id: toastId });
    } catch (err: any) {
      toast.error(`Falha ao anexar: ${err?.message || "erro desconhecido"}`, { id: toastId });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2 text-xs">
        {anexos.map((a, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2 py-0.5">
            <Paperclip className="h-3 w-3" />
            <a href={a.url} target="_blank" rel="noreferrer" className="text-primary underline">{a.nome}</a>
            <button
              type="button"
              className="text-red-500 print:hidden"
              onClick={() => onChange(anexos.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <label className="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-primary/40 text-primary text-xs cursor-pointer hover:bg-primary/5">
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? "Enviando..." : "Anexar arquivo"}
          <input
            type="file"
            className="hidden"
            disabled={uploading}
            accept=".pdf,.png,.jpg,.jpeg,.webp,.svg,application/pdf,image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) handleFile(f);
            }}
          />
        </label>

        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome (link externo)" className="h-8 text-xs w-40" />
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Link opcional" className="h-8 text-xs w-48" />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            if (!url.trim()) return;
            onChange([...anexos, { nome: nome.trim() || url.trim(), url: url.trim() }]);
            setNome("");
            setUrl("");
          }}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">Formatos aceitos: PDF, PNG, JPG, JPEG, WEBP, SVG (até 10 MB).</p>
    </div>
  );
}
