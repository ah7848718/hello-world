import { useCallback, useState } from "react";
import { Upload, Loader2, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface Props {
  accept?: string;
  maxSize?: number; // MB
  onFile: (file: File) => Promise<void> | void;
  current?: string | null;
  onClear?: () => void;
  label?: string;
  className?: string;
  uploading?: boolean;
  preview?: "image" | "file";
}

export function FileDropzone({
  accept,
  maxSize = 10,
  onFile,
  current,
  onClear,
  label = "اسحب الملف هنا أو اضغط للاختيار",
  className,
  uploading,
  preview = "image",
}: Props) {
  const [drag, setDrag] = useState(false);

  const handle = useCallback(
    async (file: File) => {
      if (file.size > maxSize * 1024 * 1024) {
        alert(`الحجم الأقصى ${maxSize} ميجا`);
        return;
      }
      await onFile(file);
    },
    [maxSize, onFile],
  );

  return (
    <div className={cn("space-y-2", className)}>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) handle(f);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors text-center",
          drag ? "border-primary bg-primary/5" : "border-border/60 hover:bg-muted/40",
          uploading && "opacity-50 pointer-events-none",
        )}
      >
        {uploading ? (
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        ) : (
          <Upload className="h-7 w-7 text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xs text-muted-foreground/70">حد أقصى {maxSize} MB</p>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handle(f);
          }}
        />
      </label>

      {current && (
        <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/40">
          {preview === "image" ? (
            <img src={current} alt="preview" className="h-12 w-12 rounded object-cover" />
          ) : (
            <FileText className="h-6 w-6 text-primary" />
          )}
          <span className="flex-1 text-xs text-muted-foreground truncate">{current.split("/").pop()}</span>
          {onClear && (
            <Button type="button" size="icon" variant="ghost" onClick={onClear}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
