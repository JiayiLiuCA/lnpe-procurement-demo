"use client";

// 首屏 = 种子数据（SSR 与首次客户端渲染一致），挂载后才回放 localStorage，天然无 hydration mismatch
import { useEffect } from "react";
import { useAppStore } from "./useAppStore";

export function StoreHydrator() {
  useEffect(() => {
    useAppStore.persist.rehydrate();
  }, []);
  return null;
}
