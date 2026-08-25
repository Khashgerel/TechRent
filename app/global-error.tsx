"use client";

import { useEffect } from "react";

/**
 * Last resort: an error thrown by the root layout itself, before any locale or
 * translation context exists. It replaces the whole document, so it ships its
 * own markup and says its piece in both languages rather than guessing one.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="mn">
      <body
        style={{
          minHeight: "100dvh",
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily: "system-ui, sans-serif",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <p style={{ fontSize: "15px", fontWeight: 800, margin: 0 }}>
            Алдаа гарлаа
          </p>
          <p style={{ fontSize: "14px", color: "#475569", marginTop: "8px" }}>
            Хуудсыг ачаалахад алдаа гарлаа. Дахин оролдоно уу.
          </p>
          <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "16px" }}>
            Something went wrong while loading this page.
          </p>

          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "20px",
              height: "40px",
              padding: "0 20px",
              borderRadius: "10px",
              border: "none",
              background: "#1a56db",
              color: "white",
              fontSize: "14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Дахин оролдох · Try again
          </button>
        </div>
      </body>
    </html>
  );
}
