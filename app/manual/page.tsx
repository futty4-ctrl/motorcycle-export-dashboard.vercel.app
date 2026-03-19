import { readFile } from "fs/promises"
import path from "path"
import ManualContent from "@/components/manual-content"

export default async function ManualPage() {
  const content = await readFile(
    path.join(process.cwd(), "docs/使い方ガイド.md"),
    "utf-8"
  )
  return <ManualContent content={content} />
}
