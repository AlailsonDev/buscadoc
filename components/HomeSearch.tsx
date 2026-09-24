"use client";

import { useRouter } from "next/navigation";
import { SearchBar } from "./SearchBar";

export function HomeSearch() {
  const router = useRouter();
  return <SearchBar autoFocus onSearch={(q) => router.push(`/documentos?q=${encodeURIComponent(q)}`)} />;
}
