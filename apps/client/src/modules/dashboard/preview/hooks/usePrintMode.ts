"use client";

import { useEffect, useState } from "react";

export function usePrintMode() {
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const startPrinting = () => setIsPrinting(true);
    const finishPrinting = () => setIsPrinting(false);

    window.addEventListener("beforeprint", startPrinting);
    window.addEventListener("afterprint", finishPrinting);

    return () => {
      window.removeEventListener("beforeprint", startPrinting);
      window.removeEventListener("afterprint", finishPrinting);
    };
  }, []);

  return isPrinting;
}
