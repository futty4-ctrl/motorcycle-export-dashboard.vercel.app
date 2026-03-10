"use client"

const STORAGE_KEY = "inventory-bodies"

export type InventoryBody = {
  id: string
  invNumber: string
  chassisLast4: string
  makerModelType: string
  purchasePrice: number
  conditionMemo: string
  status: string
  images: string[]
  createdAt: string
}

const STATUSES = ["未処理", "出品準備中", "ヤフオク出品中", "売約済み"] as const
export type InventoryStatus = (typeof STATUSES)[number]

export function getNextInvNumber(items: InventoryBody[]): string {
  const nums = items
    .map((i) => {
      const m = i.invNumber.match(/^INV-(\d+)$/i)
      return m ? parseInt(m[1]!, 10) : 0
    })
    .filter((n) => !isNaN(n))
  const max = nums.length > 0 ? Math.max(...nums) : 0
  return `INV-${String(max + 1).padStart(3, "0")}`
}

export function loadInventoryBodies(): InventoryBody[] {
  try {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null
    if (!raw) return []
    const parsed = JSON.parse(raw) as InventoryBody[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveInventoryBodies(items: InventoryBody[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    }
  } catch {
    // ignore
  }
}

export function getBodyByInvNumber(invNumber: string): InventoryBody | null {
  const items = loadInventoryBodies()
  return items.find((i) => i.invNumber === invNumber) ?? null
}
