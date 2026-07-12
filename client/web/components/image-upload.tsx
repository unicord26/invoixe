"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "../lib/supabase";
import { cn } from "@/lib/utils";

const DEFAULT_ACCEPT = ["image/png", "image/jpeg", "image/webp"];

export function ImageUpload({
  value,
  onChange,
  pathPrefix,
  bucket = "business-assets",
  accept = DEFAULT_ACCEPT,
  maxSizeMB = 2,
  shape = "square",
  disabled,
  className,
  customTrigger,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  pathPrefix: string;
  bucket?: string;
  accept?: string[];
  maxSizeMB?: number;
  shape?: "square" | "wide";
  disabled?: boolean;
  className?: string;
  customTrigger?: React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = () => !disabled && !uploading && inputRef.current?.click();

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!accept.includes(file.type)) {
      toast.error(`Unsupported file type. Use ${accept.map((t) => t.split("/")[1]).join(", ")}.`);
      return;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Image too large. Max ${maxSizeMB} MB.`);
      return;
    }

    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "");
      const key = `${pathPrefix.replace(/^\/+|\/+$/g, "")}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(key, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(key);
      onChange(data.publicUrl);
      toast.success("Image uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const box = shape === "wide" ? "h-24 w-full max-w-xs" : "h-24 w-24";

  return (
    <div className={cn("inline-flex flex-col gap-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(",")}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
        disabled={disabled}
      />
      
      {customTrigger ? (
        <div onClick={pick} className="cursor-pointer">
          {value ? (
            <div className="relative group inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="Uploaded" className="h-10 w-10 object-cover rounded border" />
              <button
                type="button"
                className="absolute -top-1 -right-1 rounded-full bg-red-500 p-0.5 text-white opacity-0 group-hover:opacity-100 transition"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              >
                <X className="h-2 w-2" />
              </button>
            </div>
          ) : (
            customTrigger
          )}
        </div>
      ) : (
        <div
          className={cn(
            "group relative flex items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-50 transition",
            !disabled && "cursor-pointer hover:border-green-500",
            box
          )}
          onClick={pick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && pick()}
          aria-label="Upload image"
        >
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="Uploaded" className="h-full w-full object-contain" />
          ) : (
            <div className="flex flex-col items-center gap-1 text-gray-400">
              <ImagePlus className="h-6 w-6" />
              <span className="text-[10px]">Upload</span>
            </div>
          )}

          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/70">
              <Loader2 className="h-5 w-5 animate-spin text-green-600" />
            </div>
          )}

          {value && !uploading && !disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange(null);
              }}
              className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-gray-500 opacity-0 shadow transition hover:text-red-600 group-hover:opacity-100"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
