// ==============================================
// 帳票テンプレートジェネレーター (TypeScript版)
// 見積書・請求書・領収書を角印付きで生成
// ==============================================

import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, ImageRun,
  AlignmentType, BorderStyle, WidthType, ShadingType,
} from "docx";
import type {
  IssuerPreset, EstimateData, InvoiceData, ReceiptData, EstimateItem,
} from "@/types/document";
import type { ITableCellBorders, IParagraphOptions, IRunOptions } from "docx";

// ===== SHARED CONSTANTS =====
const NB = { style: BorderStyle.NONE, size: 0 } as const;
const NBS: ITableCellBorders = { top: NB, bottom: NB, left: NB, right: NB };
const TB = { style: BorderStyle.SINGLE, size: 1, color: "444444" } as const;
const BS: ITableCellBorders = { top: TB, bottom: TB, left: TB, right: TB };
const CM = { top: 50, bottom: 50, left: 80, right: 80 } as const;
const PW = 11906;
const ML = 1200;
const MR = 1200;
const CW = PW - ML - MR; // 9506
const STAMP_SIZE = 65; // px for docx

// ===== HELPERS =====
interface TOptions extends Partial<IRunOptions> {
  size?: number;
  bold?: boolean;
  color?: string;
}

function t(text: string, o: TOptions = {}): TextRun {
  return new TextRun({
    text,
    font: "Yu Gothic",
    size: o.size || 18,
    bold: o.bold || false,
    color: o.color || "333333",
    ...o,
  });
}

interface POptions {
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
  spacing?: IParagraphOptions["spacing"];
  size?: number;
  bold?: boolean;
  border?: IParagraphOptions["border"];
}

function p(runs: string | TextRun[], o: POptions = {}): Paragraph {
  const ch = typeof runs === "string" ? [t(runs, { size: o.size, bold: o.bold })] : runs;
  return new Paragraph({
    alignment: o.alignment || AlignmentType.LEFT,
    spacing: o.spacing || { after: 0 },
    border: o.border,
    children: ch,
  });
}

interface CellOptions {
  align?: (typeof AlignmentType)[keyof typeof AlignmentType];
  size?: number;
  bold?: boolean;
  noBorders?: boolean;
  bg?: string;
  span?: number;
  rowSpan?: number;
}

function cell(
  content: string | Paragraph[],
  width: number,
  o: CellOptions = {}
): TableCell {
  const ch = Array.isArray(content)
    ? content
    : [p(content, { alignment: o.align, size: o.size, bold: o.bold })];
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: o.noBorders ? NBS : BS,
    margins: CM,
    shading: o.bg ? { fill: o.bg, type: ShadingType.CLEAR } : undefined,
    verticalAlign: "center",
    columnSpan: o.span || 1,
    rowSpan: o.rowSpan || 1,
    children: ch,
  });
}

function fmt(n: number | string): string {
  return Number(n).toLocaleString();
}

function taxCalc(total: number): { sub: number; tax: number; total: number } {
  const sub = Math.floor(total / 1.1);
  return { sub, tax: total - sub, total };
}

// Stamp image
function stampImage(stampBuffer: Buffer | null): Paragraph[] {
  if (!stampBuffer) return [];
  return [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 0 },
      children: [
        new ImageRun({
          data: stampBuffer,
          transformation: { width: STAMP_SIZE, height: STAMP_SIZE },
          type: "png",
        }),
      ],
    }),
  ];
}

// Company block — uses IssuerPreset instead of hardcoded values
function companyBlock(
  issuer: IssuerPreset | null,
  stampBuffer: Buffer | null
): Paragraph[] {
  const displayName = issuer?.display_name || issuer?.name || "　";
  const addr = issuer?.address || "";
  const person = issuer?.person || "";
  const tel = issuer?.tel || "";

  const items: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 20 },
      children: [t(displayName, { size: 36, bold: true, characterSpacing: 160 })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 10 },
      children: [t(addr, { size: 14 })],
    }),
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 10 },
      children: [t(person, { size: 14 })],
    }),
  ];
  if (tel) {
    items.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 10 },
        children: [t(`TEL: ${tel}`, { size: 14 })],
      })
    );
  }
  items.push(...stampImage(stampBuffer));
  return items;
}

// ===== 見積書 =====
function generateEstimate(
  data: EstimateData,
  issuer: IssuerPreset | null,
  stampBuffer: Buffer | null
): (Paragraph | Table)[] {
  const { client, items, date, validUntil, note, schedule } = data;
  const children: (Paragraph | Table)[] = [
    p(date || "令和　年　月　日", {
      alignment: AlignmentType.RIGHT,
      spacing: { after: 150 },
      size: 18,
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 250 },
      border: {
        bottom: { style: BorderStyle.DOUBLE, size: 3, color: "333333" },
      },
      children: [t("お 見 積 書", { size: 36, bold: true })],
    }),
    p("", { spacing: { after: 100 } }),
    // Client + Company
    new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: [5500, CW - 5500],
      rows: [
        new TableRow({
          children: [
            cell(
              [
                new Paragraph({
                  spacing: { after: 60 },
                  border: {
                    bottom: {
                      style: BorderStyle.SINGLE,
                      size: 2,
                      color: "333333",
                    },
                  },
                  children: [
                    t(`${client || "〇〇〇〇"}　様`, {
                      size: 24,
                      bold: true,
                    }),
                  ],
                }),
                p("下記の通りお見積り申し上げます。", {
                  size: 16,
                  spacing: { after: 20 },
                }),
                p([
                  t(
                    `見積有効期限：${validUntil || "　　"}　　作業日程：${schedule || "　　"}`,
                    { size: 14 }
                  ),
                ]),
              ],
              5500,
              { noBorders: true }
            ),
            cell(companyBlock(issuer, stampBuffer), CW - 5500, {
              noBorders: true,
            }),
          ],
        }),
      ],
    }),
  ];

  // Items
  if (items && items.length > 0) {
    for (const item of items) {
      const tc = taxCalc(item.total);
      children.push(
        new Paragraph({
          spacing: { after: 80 },
          border: {
            bottom: {
              style: BorderStyle.SINGLE,
              size: 4,
              color: "2B4C7E",
            },
          },
          children: [],
        }),
        // Property + amount
        new Table({
          width: { size: CW, type: WidthType.DXA },
          columnWidths: [5800, 1200, 2506],
          rows: [
            new TableRow({
              children: [
                cell(
                  [
                    p([t(item.name, { size: 18, bold: true })]),
                    p([t(item.detail || "", { size: 14 })]),
                  ],
                  5800,
                  { noBorders: true }
                ),
                cell(
                  [
                    p("お見積金額", {
                      alignment: AlignmentType.CENTER,
                      size: 14,
                      bold: true,
                    }),
                  ],
                  1200,
                  { bg: "2B4C7E" }
                ),
                cell(
                  [
                    p(
                      [
                        t(`¥${fmt(item.total)}（税込）`, {
                          size: 20,
                          bold: true,
                          color: "2B4C7E",
                        }),
                      ],
                      { alignment: AlignmentType.CENTER }
                    ),
                  ],
                  2506
                ),
              ],
            }),
          ],
        }),
        p("", { spacing: { after: 20 } }),
        // Detail table
        new Table({
          width: { size: CW, type: WidthType.DXA },
          columnWidths: [3800, 700, 600, 1300, 1300, 1806],
          rows: [
            new TableRow({
              children: [
                cell(
                  [
                    p("品　名", {
                      alignment: AlignmentType.CENTER,
                      size: 14,
                      bold: true,
                    }),
                  ],
                  3800,
                  { bg: "E8EDF3" }
                ),
                cell(
                  [
                    p("数量", {
                      alignment: AlignmentType.CENTER,
                      size: 14,
                      bold: true,
                    }),
                  ],
                  700,
                  { bg: "E8EDF3" }
                ),
                cell(
                  [
                    p("単位", {
                      alignment: AlignmentType.CENTER,
                      size: 14,
                      bold: true,
                    }),
                  ],
                  600,
                  { bg: "E8EDF3" }
                ),
                cell(
                  [
                    p("単価", {
                      alignment: AlignmentType.CENTER,
                      size: 14,
                      bold: true,
                    }),
                  ],
                  1300,
                  { bg: "E8EDF3" }
                ),
                cell(
                  [
                    p("金額", {
                      alignment: AlignmentType.CENTER,
                      size: 14,
                      bold: true,
                    }),
                  ],
                  1300,
                  { bg: "E8EDF3" }
                ),
                cell(
                  [
                    p("備考", {
                      alignment: AlignmentType.CENTER,
                      size: 14,
                      bold: true,
                    }),
                  ],
                  1806,
                  { bg: "E8EDF3" }
                ),
              ],
            }),
            new TableRow({
              children: [
                cell([p(item.name, { size: 14 })], 3800),
                cell(
                  [
                    p(item.qty || "1", {
                      alignment: AlignmentType.CENTER,
                      size: 14,
                    }),
                  ],
                  700
                ),
                cell(
                  [
                    p(item.unit || "式", {
                      alignment: AlignmentType.CENTER,
                      size: 14,
                    }),
                  ],
                  600
                ),
                cell(
                  [
                    p(fmt(tc.sub), {
                      alignment: AlignmentType.RIGHT,
                      size: 14,
                    }),
                  ],
                  1300
                ),
                cell(
                  [
                    p(fmt(tc.sub), {
                      alignment: AlignmentType.RIGHT,
                      size: 14,
                    }),
                  ],
                  1300
                ),
                cell([p("", { size: 14 })], 1806),
              ],
            }),
            // Tax rows
            new TableRow({
              children: [
                cell([p("")], 5100, { noBorders: true, span: 3 }),
                cell(
                  [
                    p("税抜", {
                      alignment: AlignmentType.CENTER,
                      size: 13,
                      bold: true,
                    }),
                  ],
                  1300,
                  { bg: "E8EDF3" }
                ),
                cell(
                  [
                    p(fmt(tc.sub), {
                      alignment: AlignmentType.RIGHT,
                      size: 13,
                    }),
                  ],
                  1300
                ),
                cell([p("")], 1806, { noBorders: true }),
              ],
            }),
            new TableRow({
              children: [
                cell([p("")], 5100, { noBorders: true, span: 3 }),
                cell(
                  [
                    p("消費税(10%)", {
                      alignment: AlignmentType.CENTER,
                      size: 13,
                      bold: true,
                    }),
                  ],
                  1300,
                  { bg: "E8EDF3" }
                ),
                cell(
                  [
                    p(fmt(tc.tax), {
                      alignment: AlignmentType.RIGHT,
                      size: 13,
                    }),
                  ],
                  1300
                ),
                cell([p("")], 1806, { noBorders: true }),
              ],
            }),
            new TableRow({
              children: [
                cell([p("")], 5100, { noBorders: true, span: 3 }),
                cell(
                  [
                    p("総額（税込）", {
                      alignment: AlignmentType.CENTER,
                      size: 13,
                      bold: true,
                    }),
                  ],
                  1300,
                  { bg: "2B4C7E" }
                ),
                cell(
                  [
                    p(
                      [t(fmt(item.total), { size: 14, bold: true })],
                      { alignment: AlignmentType.RIGHT }
                    ),
                  ],
                  1300
                ),
                cell([p("")], 1806, { noBorders: true }),
              ],
            }),
          ],
        })
      );
    }
  }
  if (note) {
    children.push(
      p("", { spacing: { after: 60 } }),
      p([t(`備考　${note}`, { size: 14 })])
    );
  }
  return children;
}

// ===== 請求書 =====
function generateInvoice(
  data: InvoiceData,
  issuer: IssuerPreset | null,
  stampBuffer: Buffer | null
): (Paragraph | Table)[] {
  const { client, clientAddress, date, dueDate, items, bank } = data;
  const totalAmount = items
    ? items.reduce((s, i) => s + (i.amount || 0), 0)
    : 0;

  const colW = [3800, 700, 600, 1300, 1300, 1806];
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
      children: [t("請 求 書", { size: 40, bold: true, color: "2B4C7E" })],
    }),
    // Header
    new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: [5500, CW - 5500],
      rows: [
        new TableRow({
          children: [
            cell(
              [
                new Paragraph({
                  spacing: { after: 80 },
                  border: {
                    bottom: {
                      style: BorderStyle.DOUBLE,
                      size: 3,
                      color: "2B4C7E",
                    },
                  },
                  children: [
                    t(`${client || "〇〇〇〇"} 御中`, {
                      size: 24,
                      bold: true,
                    }),
                  ],
                }),
                ...(clientAddress
                  ? [
                      p([t(clientAddress, { size: 16 })], {
                        spacing: { after: 40 },
                      }),
                    ]
                  : []),
                p("下記の通りご請求申し上げます。", {
                  size: 18,
                  spacing: { after: 20 },
                }),
                p([
                  t(
                    `請求日：${date || "　"}　支払期限：${dueDate || "　"}`,
                    { size: 14 }
                  ),
                ]),
              ],
              5500,
              { noBorders: true }
            ),
            cell(companyBlock(issuer, stampBuffer), CW - 5500, {
              noBorders: true,
            }),
          ],
        }),
      ],
    }),
    p("", { spacing: { after: 100 } }),
    // Amount
    new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: [2000, CW - 2000],
      rows: [
        new TableRow({
          children: [
            cell(
              [
                p("ご請求金額", {
                  alignment: AlignmentType.CENTER,
                  size: 20,
                  bold: true,
                }),
              ],
              2000,
              { bg: "2B4C7E" }
            ),
            cell(
              [
                p(
                  [
                    t(`¥ ${fmt(totalAmount)}`, {
                      size: 28,
                      bold: true,
                      color: "2B4C7E",
                    }),
                  ],
                  { alignment: AlignmentType.RIGHT }
                ),
              ],
              CW - 2000
            ),
          ],
        }),
      ],
    }),
    p("", { spacing: { after: 100 } }),
  ];

  // Items table
  if (items && items.length > 0) {
    const headerLabels = ["品名", "数量", "単位", "単価", "金額", "備考"];
    const rows = [
      new TableRow({
        children: colW.map((w, i) =>
          cell(
            [
              p(headerLabels[i], {
                alignment: AlignmentType.CENTER,
                size: 14,
                bold: true,
              }),
            ],
            w,
            { bg: "E8EDF3" }
          )
        ),
      }),
    ];
    for (const item of items) {
      rows.push(
        new TableRow({
          children: [
            cell([p(item.name || "", { size: 14 })], colW[0]),
            cell(
              [
                p(item.qty || "", {
                  alignment: AlignmentType.CENTER,
                  size: 14,
                }),
              ],
              colW[1]
            ),
            cell(
              [
                p(item.unit || "", {
                  alignment: AlignmentType.CENTER,
                  size: 14,
                }),
              ],
              colW[2]
            ),
            cell(
              [
                p(item.price ? fmt(item.price) : "", {
                  alignment: AlignmentType.RIGHT,
                  size: 14,
                }),
              ],
              colW[3]
            ),
            cell(
              [
                p(item.amount ? fmt(item.amount) : "", {
                  alignment: AlignmentType.RIGHT,
                  size: 14,
                }),
              ],
              colW[4]
            ),
            cell([p(item.note || "", { size: 14 })], colW[5]),
          ],
        })
      );
    }
    children.push(
      new Table({
        width: { size: CW, type: WidthType.DXA },
        columnWidths: colW,
        rows,
      })
    );
  }

  // Bank info — use issuer preset if data.bank is not provided
  const bankInfo = bank || (issuer
    ? {
        name: issuer.bank_name || "",
        type: issuer.bank_type || "普通",
        number: issuer.bank_number || "",
        holder: issuer.bank_holder || "",
      }
    : null);

  if (bankInfo) {
    children.push(p("", { spacing: { after: 100 } }));
    const bRows: [string, string][] = [
      ["金融機関", bankInfo.name || ""],
      ["口座種別", bankInfo.type || "普通"],
      ["口座番号", bankInfo.number || ""],
      ["口座名義", bankInfo.holder || ""],
    ];
    children.push(
      new Table({
        width: { size: 4000, type: WidthType.DXA },
        columnWidths: [1200, 2800],
        rows: [
          new TableRow({
            children: [
              cell(
                [
                  p("振込先", {
                    alignment: AlignmentType.CENTER,
                    size: 14,
                    bold: true,
                  }),
                ],
                4000,
                { bg: "2B4C7E", span: 2 }
              ),
            ],
          }),
          ...bRows.map(
            ([l, v]) =>
              new TableRow({
                children: [
                  cell(
                    [
                      p(l, {
                        alignment: AlignmentType.CENTER,
                        size: 14,
                        bold: true,
                      }),
                    ],
                    1200,
                    { bg: "E8EDF3" }
                  ),
                  cell([p(v, { size: 14 })], 2800),
                ],
              })
          ),
        ],
      })
    );
  }
  return children;
}

// ===== 領収書 =====
function generateReceipt(
  data: ReceiptData,
  issuer: IssuerPreset | null,
  stampBuffer: Buffer | null
): Table[] {
  const { client, amount, description, date, breakdown } = data;
  const thickB = {
    style: BorderStyle.SINGLE,
    size: 3,
    color: "333333",
  } as const;
  const tc = breakdown ? null : taxCalc(amount);

  return [
    new Table({
      width: { size: CW, type: WidthType.DXA },
      columnWidths: [CW],
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: CW, type: WidthType.DXA },
              borders: {
                top: thickB,
                bottom: thickB,
                left: thickB,
                right: thickB,
              },
              margins: { top: 400, bottom: 400, left: 500, right: 500 },
              children: [
                p(date || "令和　年　月　日", {
                  alignment: AlignmentType.RIGHT,
                  spacing: { after: 300 },
                  size: 20,
                }),
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  spacing: { after: 500 },
                  children: [t("領　収　書", { size: 52, bold: true })],
                }),
                // 宛名
                new Table({
                  width: { size: 8000, type: WidthType.DXA },
                  columnWidths: [8000],
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          width: { size: 8000, type: WidthType.DXA },
                          borders: {
                            top: NB,
                            bottom: {
                              style: BorderStyle.SINGLE,
                              size: 3,
                              color: "333333",
                            },
                            left: NB,
                            right: NB,
                          },
                          margins: {
                            top: 0,
                            bottom: 0,
                            left: 0,
                            right: 0,
                          },
                          children: [
                            p(
                              [
                                t(`　${client || "〇〇〇〇"}`, {
                                  size: 32,
                                  bold: true,
                                }),
                                t("　様", { size: 28 }),
                              ],
                              { spacing: { after: 80 } }
                            ),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                p("", { spacing: { after: 400 } }),
                // 金額
                new Table({
                  width: { size: 8000, type: WidthType.DXA },
                  columnWidths: [8000],
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          width: { size: 8000, type: WidthType.DXA },
                          borders: {
                            top: {
                              style: BorderStyle.SINGLE,
                              size: 3,
                              color: "333333",
                            },
                            bottom: {
                              style: BorderStyle.DOUBLE,
                              size: 3,
                              color: "333333",
                            },
                            left: {
                              style: BorderStyle.SINGLE,
                              size: 3,
                              color: "333333",
                            },
                            right: {
                              style: BorderStyle.SINGLE,
                              size: 3,
                              color: "333333",
                            },
                          },
                          margins: {
                            top: 150,
                            bottom: 150,
                            left: 200,
                            right: 200,
                          },
                          children: [
                            p(
                              [
                                t("金　", { size: 32, bold: true }),
                                t(`¥ ${fmt(amount || 0)} -`, {
                                  size: 36,
                                  bold: true,
                                }),
                              ],
                              { alignment: AlignmentType.CENTER }
                            ),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                p("", { spacing: { after: 300 } }),
                // 但し書き
                new Table({
                  width: { size: 8000, type: WidthType.DXA },
                  columnWidths: [8000],
                  rows: [
                    new TableRow({
                      children: [
                        new TableCell({
                          width: { size: 8000, type: WidthType.DXA },
                          borders: {
                            top: NB,
                            bottom: {
                              style: BorderStyle.DOTTED,
                              size: 1,
                              color: "666666",
                            },
                            left: NB,
                            right: NB,
                          },
                          margins: {
                            top: 0,
                            bottom: 0,
                            left: 0,
                            right: 0,
                          },
                          children: [
                            p(
                              [
                                t("但　", { size: 20, bold: true }),
                                t(description || "", { size: 22 }),
                              ],
                              { spacing: { after: 80 } }
                            ),
                          ],
                        }),
                      ],
                    }),
                  ],
                }),
                p("", { spacing: { after: 200 } }),
                p("上記正に領収いたしました。", {
                  alignment: AlignmentType.CENTER,
                  size: 22,
                  spacing: { after: 400 },
                }),
                p("", { spacing: { after: 100 } }),
                // 内訳 + 発行元
                new Table({
                  width: { size: 8000, type: WidthType.DXA },
                  columnWidths: [3800, 4200],
                  rows: [
                    new TableRow({
                      children: [
                        // 内訳
                        cell(
                          [
                            new Table({
                              width: { size: 3600, type: WidthType.DXA },
                              columnWidths: [1800, 1800],
                              rows: [
                                new TableRow({
                                  children: [
                                    cell(
                                      [
                                        p("内訳", {
                                          alignment: AlignmentType.CENTER,
                                          size: 16,
                                          bold: true,
                                        }),
                                      ],
                                      3600,
                                      { bg: "F0F0F0", span: 2 }
                                    ),
                                  ],
                                }),
                                new TableRow({
                                  children: [
                                    cell(
                                      [
                                        p("税抜金額", {
                                          alignment: AlignmentType.CENTER,
                                          size: 14,
                                          bold: true,
                                        }),
                                      ],
                                      1800,
                                      { bg: "F5F5F5" }
                                    ),
                                    cell(
                                      [
                                        p(
                                          `¥ ${fmt(
                                            tc
                                              ? tc.sub
                                              : breakdown?.subtotal || 0
                                          )}`,
                                          {
                                            alignment: AlignmentType.RIGHT,
                                            size: 16,
                                          }
                                        ),
                                      ],
                                      1800
                                    ),
                                  ],
                                }),
                                new TableRow({
                                  children: [
                                    cell(
                                      [
                                        p("消費税(10%)", {
                                          alignment: AlignmentType.CENTER,
                                          size: 14,
                                          bold: true,
                                        }),
                                      ],
                                      1800,
                                      { bg: "F5F5F5" }
                                    ),
                                    cell(
                                      [
                                        p(
                                          `¥ ${fmt(
                                            tc
                                              ? tc.tax
                                              : breakdown?.tax || 0
                                          )}`,
                                          {
                                            alignment: AlignmentType.RIGHT,
                                            size: 16,
                                          }
                                        ),
                                      ],
                                      1800
                                    ),
                                  ],
                                }),
                              ],
                            }),
                          ],
                          3800,
                          { noBorders: true }
                        ),
                        // 発行元
                        cell(
                          [...companyBlock(issuer, stampBuffer)],
                          4200,
                          { noBorders: true }
                        ),
                      ],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ];
}

// ===== MAIN EXPORT =====
export async function generateDocument(
  docType: "見積書" | "請求書" | "領収書",
  data: EstimateData | InvoiceData | ReceiptData,
  issuer: IssuerPreset | null,
  stampBuffer: Buffer | null
): Promise<Buffer> {
  let children: (Paragraph | Table)[];

  switch (docType) {
    case "見積書":
      children = generateEstimate(
        data as EstimateData,
        issuer,
        stampBuffer
      );
      break;
    case "請求書":
      children = generateInvoice(
        data as InvoiceData,
        issuer,
        stampBuffer
      );
      break;
    case "領収書":
      children = generateReceipt(
        data as ReceiptData,
        issuer,
        stampBuffer
      );
      break;
    default:
      throw new Error(`Unknown document type: ${docType}`);
  }

  const isReceipt = docType === "領収書";
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: "Yu Gothic", size: 18, color: "333333" },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: {
              top: isReceipt ? 1800 : 800,
              right: 1200,
              bottom: isReceipt ? 1800 : 600,
              left: 1200,
            },
          },
        },
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return Buffer.from(buffer);
}
