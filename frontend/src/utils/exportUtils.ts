import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ExportColumn {
  header: string;
  key: string;
}

export interface ExportOptions {
  data: any[];
  columns: ExportColumn[];
  filename: string;
  metadata?: string[];
}

const formatDataForExport = (data: any[], columns: ExportColumn[]) => {
  return data.map((item) => {
    const formattedItem: any = {};
    columns.forEach((col) => {
      let value = item[col.key];
      if (value === undefined || value === null) value = '';
      formattedItem[col.header] = value;
    });
    return formattedItem;
  });
};

export const exportToExcel = ({ data, columns, filename, metadata = [] }: ExportOptions) => {
  const formattedData = formatDataForExport(data, columns);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(formattedData, { origin: metadata.length > 0 ? metadata.length + 1 : 0 } as any);
  
  if (metadata.length > 0) {
    const metadataRows = metadata.map(m => [m]);
    XLSX.utils.sheet_add_aoa(ws, metadataRows, { origin: 'A1' });
  }
  
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

export const exportToCSV = ({ data, columns, filename, metadata = [] }: ExportOptions) => {
  const formattedData = formatDataForExport(data, columns);
  const ws = XLSX.utils.json_to_sheet(formattedData, { origin: metadata.length > 0 ? metadata.length + 1 : 0 } as any);
  
  if (metadata.length > 0) {
    const metadataRows = metadata.map(m => [m]);
    XLSX.utils.sheet_add_aoa(ws, metadataRows, { origin: 'A1' });
  }
  
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const exportToPDF = ({ data, columns, filename, metadata = [] }: ExportOptions) => {
  const doc = new jsPDF('landscape');
  
  let startY = 15;
  if (metadata.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    metadata.forEach((m, i) => {
      doc.text(m, 14, startY + (i * 6));
    });
    startY += (metadata.length * 6) + 5;
  }
  
  doc.setFontSize(14);
  doc.setTextColor(40);
  doc.text(filename.replace(/_/g, ' ').toUpperCase(), 14, startY);
  startY += 10;
  
  const head = [columns.map(c => c.header)];
  const body = data.map(item => columns.map(c => {
      let value = item[c.key];
      if (value === undefined || value === null) return '';
      return String(value);
  }));
  
  autoTable(doc, {
    startY,
    head,
    body,
    theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [41, 128, 185] },
  });
  
  doc.save(`${filename}.pdf`);
};
