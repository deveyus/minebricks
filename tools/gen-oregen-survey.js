// Minebricks oregen survey — main assembler (3-section architecture per docx skill)
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType, SectionType, TableOfContents,
  LevelFormat,
} = require("docx");
const fs = require("fs");
const { buildCoverR1, allNoBorders } = require("./survey-cover.js");
const { buildA } = require("./survey-content-a.js");
const { buildB } = require("./survey-content-b.js");

const OUT = "/home/z/my-project/download/Minebricks_Oregen_Control_Survey.docx";

// DM-1 Deep Cyan palette (tech report) — table colors use darkened accent per design-system
const PAL = {
  bg: "162235",
  accent: "37DCF2",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "1B6B7A", headerText: "FFFFFF", accentLine: "1B6B7A", innerLine: "C8DDE2", surface: "EDF3F5" },
  headingColor: "1B6B7A",
};

const BODY_FONT = { ascii: "Times New Roman", eastAsia: "SimSun" };
const HEAD_FONT = { ascii: "Times New Roman", eastAsia: "SimHei" };
const MONO_FONT = { ascii: "Consolas", eastAsia: "SimSun" };

// ---------- helpers ----------
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1, keepNext: true,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, color: PAL.headingColor, font: HEAD_FONT })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2, keepNext: true,
    spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, color: PAL.headingColor, font: HEAD_FONT })],
  });
}
function p(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text, size: 24, color: "000000", font: BODY_FONT })],
  });
}
function bullets(items) {
  return items.map((t) => new Paragraph({
    bullet: { level: 0 },
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 80 },
    children: [new TextRun({ text: t, size: 24, color: "000000", font: BODY_FONT })],
  }));
}
function numItem(idx, text) {
  return new Paragraph({
    numbering: { reference: "impl-steps", level: 0 },
    alignment: AlignmentType.LEFT,
    spacing: { line: 312, after: 100 },
    children: [new TextRun({ text, size: 24, color: "000000", font: BODY_FONT })],
  });
}
function code(lines) {
  const paras = lines.map((ln) => new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 264, lineRule: "atLeast" },
    children: [new TextRun({ text: ln, size: 18, color: "18323A", font: MONO_FONT })],
  }));
  const t = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      right: { style: BorderStyle.NONE },
      left: { style: BorderStyle.SINGLE, size: 6, color: PAL.table.accentLine },
      insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
    },
    rows: [new TableRow({
      cantSplit: true,
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: PAL.table.surface },
        margins: { top: 120, bottom: 120, left: 220, right: 160 },
        width: { size: 100, type: WidthType.PERCENTAGE },
        children: paras,
      })],
    })],
  });
  return [t, new Paragraph({ spacing: { after: 60 }, children: [] })];
}
function tblTitle(text) {
  return new Paragraph({
    keepNext: true, alignment: AlignmentType.LEFT,
    spacing: { before: 200, after: 80, line: 312 },
    children: [new TextRun({ text, bold: true, size: 21, color: PAL.headingColor, font: BODY_FONT })],
  });
}
function cellP(text, opts) {
  const o = opts || {};
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    spacing: { line: 276 },
    children: [new TextRun({
      text, size: 21, bold: !!o.bold,
      color: o.color || "000000", font: BODY_FONT,
    })],
  });
}
function tbl(headers, rows, widths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: PAL.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: PAL.table.accentLine },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: PAL.table.innerLine },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        tableHeader: true, cantSplit: true,
        children: headers.map((htext, i) => new TableCell({
          shading: { type: ShadingType.CLEAR, fill: PAL.table.headerBg },
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          width: { size: widths[i], type: WidthType.PERCENTAGE },
          children: [cellP(htext, { bold: true, color: PAL.table.headerText })],
        })),
      }),
      ...rows.map((r) => new TableRow({
        cantSplit: true,
        children: r.map((c, i) => new TableCell({
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          width: { size: widths[i], type: WidthType.PERCENTAGE },
          children: [cellP(c)],
        })),
      })),
    ],
  });
}

const ctx = { h1, h2, p, code, tbl, tblTitle, bullets, numItem, PAL };

// ---------- cover ----------
const coverChildren = buildCoverR1({
  title: "Ore Generation Control Survey",
  subtitle: "Overhauling vanilla ore generation on NeoForge 1.21.1, live-verified",
  englishLabel: "MINEBRICKS",
  metaLines: [
    "Pack: Minebricks v0.4.0 — 42 mods via packwiz",
    "Platform: Minecraft 1.21.1 · NeoForge 21.1.265",
    "Prepared for: the pack lead",
    "Verified live: 2026-10-25 · Modrinth · NeoForge · KubeJS · mcmeta",
  ],
  footerLeft: "Minebricks friend-pack project",
  footerRight: "Compiled 2026-10-25",
  palette: PAL,
});

// ---------- footers ----------
function pageFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: BODY_FONT })],
    })],
  });
}

const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

const doc = new Document({
  numbering: {
    config: [{
      reference: "impl-steps",
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      }],
    }],
  },
  styles: {
    default: {
      document: {
        run: { font: BODY_FONT, size: 24, color: "000000" },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: HEAD_FONT, size: 32, bold: true, color: PAL.headingColor },
        paragraph: { spacing: { before: 360, after: 160, line: 312 } },
      },
      heading2: {
        run: { font: HEAD_FONT, size: 28, bold: true, color: PAL.headingColor },
        paragraph: { spacing: { before: 240, after: 120, line: 312 } },
      },
    },
  },
  sections: [
    { // Section 1: cover — margin 0, no page numbers, no footer
      properties: { page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: coverChildren,
    },
    { // Section 2: front matter (TOC) — Roman numerals
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: pageFooter() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, font: HEAD_FONT, color: "000000" })],
        }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: "Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select \"Update Field.\"",
            italics: true, size: 18, color: "888888", font: BODY_FONT,
          })],
        }),
      ],
    },
    { // Section 3: body — Arabic numerals restarting at 1
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "Minebricks — Ore Generation Control Survey", size: 18, color: "808080", font: BODY_FONT })],
          })],
        }),
      },
      footers: { default: pageFooter() },
      children: [...buildA(ctx), ...buildB(ctx)],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("WROTE", OUT, buf.length, "bytes");
});
