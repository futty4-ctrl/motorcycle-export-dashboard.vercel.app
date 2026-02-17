export type VehicleStatus = "仕入中" | "落札" | "在庫あり" | "出品中" | "売却済" | "発送中"

export interface Vehicle {
  id: string
  name: string
  year: number
  image: string
  status: VehicleStatus
  profitScore: number // 0-100, higher is better
  expectedProfitJPY: number
  expectedProfitUSD: number
  mileage: string
  auctionGrade: string
}

// 画像: public/bikes/ に 1.jpg 〜 6.jpg を置くとそのまま表示されます（無い場合はプレースホルダー）
export const vehicles: Vehicle[] = [
  {
    id: "1",
    name: "Kawasaki Z900RS",
    year: 2022,
    image: "/bikes/1.jpg",
    status: "出品中",
    profitScore: 82,
    expectedProfitJPY: 185000,
    expectedProfitUSD: 1234,
    mileage: "12,400 km",
    auctionGrade: "4.5",
  },
  {
    id: "2",
    name: "Honda CB650R",
    year: 2023,
    image: "/bikes/2.jpg",
    status: "在庫あり",
    profitScore: 65,
    expectedProfitJPY: 120000,
    expectedProfitUSD: 800,
    mileage: "8,200 km",
    auctionGrade: "4.0",
  },
  {
    id: "3",
    name: "Yamaha MT-07",
    year: 2021,
    image: "/bikes/3.jpg",
    status: "仕入中",
    profitScore: 91,
    expectedProfitJPY: 210000,
    expectedProfitUSD: 1400,
    mileage: "5,100 km",
    auctionGrade: "5.0",
  },
  {
    id: "4",
    name: "Suzuki SV650",
    year: 2020,
    image: "/bikes/4.jpg",
    status: "発送中",
    profitScore: 45,
    expectedProfitJPY: 68000,
    expectedProfitUSD: 453,
    mileage: "22,800 km",
    auctionGrade: "3.5",
  },
  {
    id: "5",
    name: "Kawasaki Ninja 400",
    year: 2023,
    image: "/bikes/5.jpg",
    status: "出品中",
    profitScore: 72,
    expectedProfitJPY: 145000,
    expectedProfitUSD: 967,
    mileage: "3,600 km",
    auctionGrade: "4.5",
  },
  {
    id: "6",
    name: "Honda CRF250L",
    year: 2022,
    image: "/bikes/6.jpg",
    status: "売却済",
    profitScore: 28,
    expectedProfitJPY: 42000,
    expectedProfitUSD: 280,
    mileage: "15,300 km",
    auctionGrade: "3.0",
  },
]

export const summaryData = {
  activeBids: 12,
  inventoryCount: 47,
  monthlyProfit: 2840000,
  monthlyProfitUSD: 18933,
}
