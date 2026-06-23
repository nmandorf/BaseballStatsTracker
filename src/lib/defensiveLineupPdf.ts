import type { FullGameDefensiveLineupPlan } from "@/lib/defensiveLineupPlanner";

const pageWidth = 792;
const pageHeight = 612;
const margin = 28;
const headerHeight = 34;

type PdfObject = {
  id: number;
  body: string;
};

export function createDefensiveLineupPdf(plan: FullGameDefensiveLineupPlan) {
  const stream = buildPageStream(plan);
  const objects: PdfObject[] = [
    { id: 1, body: "<< /Type /Catalog /Pages 2 0 R >>" },
    { id: 2, body: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
    {
      id: 3,
      body: [
        "<< /Type /Page /Parent 2 0 R",
        `/MediaBox [0 0 ${pageWidth} ${pageHeight}]`,
        "/Resources << /Font << /F1 4 0 R /F2 5 0 R >> >>",
        "/Contents 6 0 R >>",
      ].join(" "),
    },
    { id: 4, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>" },
    { id: 5, body: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>" },
    { id: 6, body: `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream` },
  ];

  return new Blob([buildPdfDocument(objects)], { type: "application/pdf" });
}

function buildPageStream(plan: FullGameDefensiveLineupPlan) {
  const tableWidth = pageWidth - (margin * 2);
  const tableHeight = pageHeight - (margin * 2);
  const rowHeight = (tableHeight - headerHeight) / plan.rows.length;
  const nameFontSize = Math.max(5, Math.min(9, rowHeight * 0.38));
  const cellFontSize = Math.max(5.5, Math.min(10, rowHeight * 0.42));
  const nameColumnWidth = 190;
  const inningColumnWidth = (tableWidth - nameColumnWidth) / plan.innings.length;
  const tableTop = pageHeight - margin;
  const tableLeft = margin;
  const tableBottom = tableTop - headerHeight - (rowHeight * plan.rows.length);
  const commands: string[] = [];

  drawRect(commands, tableLeft, tableTop - headerHeight, tableWidth, headerHeight, "172033");
  drawText(commands, "Batting Order", tableLeft + 10, tableTop - 22, 11, "F2", "FFFFFF");

  plan.innings.forEach((inning, inningIndex) => {
    const x = tableLeft + nameColumnWidth + (inningColumnWidth * inningIndex);
    drawCenteredText(commands, `Inn ${inning}`, x, tableTop - headerHeight, inningColumnWidth, headerHeight, 11, "F2", "FFFFFF");
  });

  plan.rows.forEach((row, rowIndex) => {
    const y = tableTop - headerHeight - (rowHeight * (rowIndex + 1));

    drawRect(commands, tableLeft, y, nameColumnWidth, rowHeight, "F5F7FA");
    drawText(commands, `${row.battingOrderPosition}. ${row.playerName}`, tableLeft + 8, y + (rowHeight / 2) - (nameFontSize / 2), nameFontSize, "F2", "172033");

    row.cells.forEach((cell, inningIndex) => {
      const x = tableLeft + nameColumnWidth + (inningColumnWidth * inningIndex);
      const fill = cell.isBench ? "F2C66D" : rowIndex % 2 === 0 ? "FFFFFF" : "F8FAFC";
      const textColor = cell.isBench ? "5B3A00" : "172033";

      drawRect(commands, x, y, inningColumnWidth, rowHeight, fill);
      drawCenteredText(commands, cell.value, x, y, inningColumnWidth, rowHeight, cellFontSize, "F2", textColor);
    });
  });

  drawGrid(commands, tableLeft, tableBottom, tableWidth, headerHeight + (rowHeight * plan.rows.length), nameColumnWidth, inningColumnWidth, plan.innings.length, plan.rows.length);

  return commands.join("\n");
}

function drawGrid(
  commands: string[],
  left: number,
  bottom: number,
  width: number,
  height: number,
  nameColumnWidth: number,
  inningColumnWidth: number,
  inningCount: number,
  rowCount: number,
) {
  setStroke(commands, "AAB3C2");
  commands.push("0.6 w");
  commands.push(`${format(left)} ${format(bottom)} ${format(width)} ${format(height)} re S`);
  commands.push(`${format(left + nameColumnWidth)} ${format(bottom)} m ${format(left + nameColumnWidth)} ${format(bottom + height)} l S`);

  for (let index = 1; index < inningCount; index += 1) {
    const x = left + nameColumnWidth + (inningColumnWidth * index);
    commands.push(`${format(x)} ${format(bottom)} m ${format(x)} ${format(bottom + height)} l S`);
  }

  const rowHeight = (height - headerHeight) / rowCount;
  commands.push(`${format(left)} ${format(bottom + height - headerHeight)} m ${format(left + width)} ${format(bottom + height - headerHeight)} l S`);

  for (let index = 1; index < rowCount; index += 1) {
    const y = bottom + (rowHeight * index);
    commands.push(`${format(left)} ${format(y)} m ${format(left + width)} ${format(y)} l S`);
  }

  setStroke(commands, "172033");
  commands.push("1.2 w");
  commands.push(`${format(left)} ${format(bottom)} ${format(width)} ${format(height)} re S`);
}

function drawRect(commands: string[], x: number, y: number, width: number, height: number, color: string) {
  setFill(commands, color);
  commands.push(`${format(x)} ${format(y)} ${format(width)} ${format(height)} re f`);
}

function drawText(
  commands: string[],
  text: string,
  x: number,
  y: number,
  size: number,
  font: "F1" | "F2",
  color: string,
) {
  setFill(commands, color);
  commands.push("BT");
  commands.push(`/${font} ${size} Tf`);
  commands.push(`${format(x)} ${format(y)} Td`);
  commands.push(`(${escapePdfText(text)}) Tj`);
  commands.push("ET");
}

function drawCenteredText(
  commands: string[],
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  size: number,
  font: "F1" | "F2",
  color: string,
) {
  const textWidth = text.length * size * 0.56;
  drawText(commands, text, x + ((width - textWidth) / 2), y + ((height - size) / 2) - 1, size, font, color);
}

function setFill(commands: string[], color: string) {
  const { red, green, blue } = hexToRgb(color);
  commands.push(`${red} ${green} ${blue} rg`);
}

function setStroke(commands: string[], color: string) {
  const { red, green, blue } = hexToRgb(color);
  commands.push(`${red} ${green} ${blue} RG`);
}

function hexToRgb(color: string) {
  const red = Number.parseInt(color.slice(0, 2), 16) / 255;
  const green = Number.parseInt(color.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(color.slice(4, 6), 16) / 255;

  return {
    red: format(red),
    green: format(green),
    blue: format(blue),
  };
}

function buildPdfDocument(objects: PdfObject[]) {
  const chunks = ["%PDF-1.4\n"];
  const offsets: number[] = [0];

  objects.forEach((object) => {
    offsets[object.id] = chunks.join("").length;
    chunks.push(`${object.id} 0 obj\n${object.body}\nendobj\n`);
  });

  const xrefOffset = chunks.join("").length;
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");

  for (let id = 1; id <= objects.length; id += 1) {
    chunks.push(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }

  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return chunks.join("");
}

function escapePdfText(text: string) {
  return text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function format(value: number | string) {
  if (typeof value === "string") {
    return value;
  }

  return Number(value.toFixed(3)).toString();
}
