"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Trash2 } from "@/components/ui/icons";

interface TelemetryConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning";
  isLoading?: boolean;
  onConfirm: () => void;
}

export function TelemetryConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "CONFIRM ACTION",
  cancelText = "ABORT",
  variant = "danger",
  isLoading = false,
  onConfirm,
}: TelemetryConfirmDialogProps) {
  const isDanger = variant === "danger";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#090b0e] border border-white/15 text-white font-mono sm:max-w-md overflow-hidden relative shadow-[0_24px_50px_rgba(0,0,0,0.85)]">
        {/* Laser Top Accent Line */}
        <div
          className={`absolute top-0 inset-x-0 h-[2px] ${
            isDanger ? "bg-rose-500" : "bg-amber-500"
          }`}
        />

        <DialogHeader className="pt-2">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`size-2 rounded-full ${
                isDanger
                  ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"
                  : "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
              }`}
            />
            <span
              className={`text-[10px] uppercase font-bold tracking-[0.2em] ${
                isDanger ? "text-rose-400" : "text-amber-400"
              }`}
            >
              {isDanger ? "CRITICAL ACTION REQUIRED" : "CONFIRMATION PROTOCOL"}
            </span>
          </div>

          <DialogTitle className="text-lg font-bold font-sans text-white uppercase tracking-tight flex items-center gap-2">
            <AlertTriangle className={`size-4.5 ${isDanger ? "text-rose-400" : "text-amber-400"}`} />
            <span>{title}</span>
          </DialogTitle>

          <DialogDescription className="text-xs text-white/60 font-mono leading-relaxed pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="text-white/60 hover:text-white text-xs font-mono uppercase tracking-wider"
          >
            {cancelText}
          </Button>

          <button
            type="button"
            onClick={() => {
              onConfirm();
            }}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm cursor-pointer active:scale-95 disabled:opacity-50 ${
              isDanger
                ? "bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_16px_rgba(244,63,94,0.4)]"
                : "bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_16px_rgba(245,158,11,0.4)]"
            }`}
          >
            <Trash2 className="size-3.5" />
            <span>{confirmText}</span>
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

