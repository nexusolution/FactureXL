interface InvoiceItem {
  product: string;
  description?: string;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
  unite?: string;
}

interface Company {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  codePostal?: string;
  bank?: string;
  account?: string;
  iban?: string;
  photo?: string;
}

interface Client {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  zipCode?: string;
  code?: string;
}

interface Invoice {
  ref: string;
  type: "invoice" | "avoir" | "devis";
  createdAt: string;
  paymentDate?: string;
  paid: boolean;
  total: number;
  totalHT: number;
  commentary?: string;
  wording?: string;
  items: InvoiceItem[];
  client: Client;
  employee?: { name: string };
  company?: Company;
}

export function generateInvoicePDF(invoice: Invoice, company?: Company) {
  const {
    ref,
    type,
    createdAt,
    paymentDate,
    paid,
    total,
    totalHT,
    commentary,
    wording,
    items,
    client,
    employee,
  } = invoice;

  // Calculate tax total
  const totalTax = total - totalHT;

  // Document title
  const docTitle =
    type === "invoice"
      ? "FACTURE"
      : type === "avoir"
      ? "AVOIR"
      : "DEVIS";

  // Define document
  const docDefinition: any = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    info: {
      title: `${docTitle} ${ref}`,
      author: company?.name || "FactureXL",
      subject: `${docTitle} ${ref}`,
    },
    content: [
      // Header with company info
      {
        columns: [
          {
            width: "*",
            stack: [
              {
                text: company?.name || "FactureXL",
                style: "companyName",
              },
              company?.address && {
                text: company.address,
                style: "companyInfo",
              },
              company?.city && company?.codePostal && {
                text: `${company.codePostal} ${company.city}`,
                style: "companyInfo",
              },
              company?.email && {
                text: company.email,
                style: "companyInfo",
              },
              company?.phone && {
                text: company.phone,
                style: "companyInfo",
              },
            ].filter(Boolean),
          },
          {
            width: "auto",
            stack: [
              {
                text: docTitle,
                style: "docTitle",
                alignment: "right",
              },
              {
                text: `N° ${ref}`,
                style: "docRef",
                alignment: "right",
              },
              {
                text: `Date: ${new Date(createdAt).toLocaleDateString("fr-FR")}`,
                style: "docDate",
                alignment: "right",
              },
            ],
          },
        ],
        margin: [0, 0, 0, 30],
      },

      // Client info
      {
        text: "Facturé à:",
        style: "sectionHeader",
        margin: [0, 0, 0, 5],
      },
      {
        stack: [
          { text: client.name, style: "clientName" },
          client.code && { text: `Code: ${client.code}`, style: "clientInfo" },
          client.address && { text: client.address, style: "clientInfo" },
          client.city && client.zipCode && {
            text: `${client.zipCode} ${client.city}`,
            style: "clientInfo",
          },
          client.email && { text: client.email, style: "clientInfo" },
          client.phone && { text: client.phone, style: "clientInfo" },
        ].filter(Boolean),
        margin: [0, 0, 0, 30],
      },

      // Wording if exists
      wording && {
        text: wording,
        style: "wording",
        margin: [0, 0, 0, 20],
      },

      // Items table
      {
        table: {
          headerRows: 1,
          widths: ["*", 50, 50, 60, 40, 60, 70],
          body: [
            // Header
            [
              { text: "Désignation", style: "tableHeader" },
              { text: "Qté", style: "tableHeader", alignment: "center" },
              { text: "Unité", style: "tableHeader", alignment: "center" },
              { text: "P.U. HT", style: "tableHeader", alignment: "right" },
              { text: "Rem. %", style: "tableHeader", alignment: "right" },
              { text: "TVA %", style: "tableHeader", alignment: "right" },
              { text: "Total TTC", style: "tableHeader", alignment: "right" },
            ],
            // Items
            ...items.map((item) => {
              const subtotal = item.quantity * item.price;
              const discountAmount = subtotal * (item.discount / 100);
              const afterDiscount = subtotal - discountAmount;
              const taxAmount = afterDiscount * (item.tax / 100);
              const itemTotal = afterDiscount + taxAmount;

              return [
                {
                  stack: [
                    { text: item.product, style: "itemProduct" },
                    item.description && {
                      text: item.description,
                      style: "itemDescription",
                    },
                  ].filter(Boolean),
                },
                {
                  text: item.quantity.toString(),
                  style: "tableCell",
                  alignment: "center",
                },
                {
                  text: item.unite || "-",
                  style: "tableCell",
                  alignment: "center",
                },
                {
                  text: `${item.price.toFixed(2)} XPF`,
                  style: "tableCell",
                  alignment: "right",
                },
                {
                  text: item.discount > 0 ? `${item.discount}%` : "-",
                  style: "tableCell",
                  alignment: "right",
                },
                {
                  text: item.tax > 0 ? `${item.tax}%` : "-",
                  style: "tableCell",
                  alignment: "right",
                },
                {
                  text: `${itemTotal.toFixed(2)} XPF`,
                  style: "tableCell",
                  alignment: "right",
                  bold: true,
                },
              ];
            }),
          ],
        },
        layout: {
          hLineWidth: () => 0.5,
          vLineWidth: () => 0.5,
          hLineColor: () => "#CCCCCC",
          vLineColor: () => "#CCCCCC",
          paddingLeft: () => 8,
          paddingRight: () => 8,
          paddingTop: () => 6,
          paddingBottom: () => 6,
        },
        margin: [0, 0, 0, 20],
      },

      // Totals
      {
        columns: [
          { width: "*", text: "" },
          {
            width: 200,
            stack: [
              {
                columns: [
                  { text: "Total HT:", style: "totalLabel" },
                  {
                    text: `${totalHT.toFixed(2)} XPF`,
                    style: "totalValue",
                    alignment: "right",
                  },
                ],
                margin: [0, 0, 0, 5],
              },
              {
                columns: [
                  { text: "Total TVA:", style: "totalLabel" },
                  {
                    text: `${totalTax.toFixed(2)} XPF`,
                    style: "totalValue",
                    alignment: "right",
                  },
                ],
                margin: [0, 0, 0, 5],
              },
              {
                columns: [
                  { text: "Total TTC:", style: "totalLabelBold" },
                  {
                    text: `${total.toFixed(2)} XPF`,
                    style: "totalValueBold",
                    alignment: "right",
                  },
                ],
                margin: [0, 0, 0, 10],
              },
              paid && paymentDate && {
                text: `Payé le ${new Date(paymentDate).toLocaleDateString("fr-FR")}`,
                style: "paidStatus",
                alignment: "right",
                color: "#32bbed",
              },
            ].filter(Boolean),
          },
        ],
        margin: [0, 0, 0, 30],
      },

      // Commentary
      commentary && {
        stack: [
          { text: "Commentaires:", style: "sectionHeader" },
          { text: commentary, style: "commentary" },
        ],
        margin: [0, 0, 0, 20],
      },

      // Employee info if exists
      employee && {
        text: `Émis par: ${employee.name}`,
        style: "employeeInfo",
        margin: [0, 20, 0, 0],
      },

      // Footer - Bank info
      company?.bank &&
        company?.account && {
          stack: [
            { text: "Coordonnées bancaires:", style: "sectionHeader" },
            {
              columns: [
                {
                  width: "*",
                  stack: [
                    { text: `Banque: ${company.bank}`, style: "bankInfo" },
                    company.account && {
                      text: `Compte: ${company.account}`,
                      style: "bankInfo",
                    },
                    company.iban && { text: `IBAN: ${company.iban}`, style: "bankInfo" },
                  ].filter(Boolean),
                },
              ],
            },
          ],
          margin: [0, 30, 0, 0],
        },
    ].filter(Boolean),

    styles: {
      companyName: {
        fontSize: 18,
        bold: true,
        color: "#199ef7",
        margin: [0, 0, 0, 5],
      },
      companyInfo: {
        fontSize: 9,
        color: "#666666",
        margin: [0, 2, 0, 0],
      },
      docTitle: {
        fontSize: 24,
        bold: true,
        color: "#199ef7",
      },
      docRef: {
        fontSize: 12,
        bold: true,
        color: "#333333",
        margin: [0, 5, 0, 0],
      },
      docDate: {
        fontSize: 10,
        color: "#666666",
        margin: [0, 5, 0, 0],
      },
      sectionHeader: {
        fontSize: 12,
        bold: true,
        color: "#199ef7",
        margin: [0, 0, 0, 5],
      },
      clientName: {
        fontSize: 14,
        bold: true,
        margin: [0, 0, 0, 3],
      },
      clientInfo: {
        fontSize: 10,
        color: "#666666",
        margin: [0, 2, 0, 0],
      },
      wording: {
        fontSize: 11,
        italics: true,
        color: "#555555",
      },
      tableHeader: {
        fontSize: 10,
        bold: true,
        color: "#ffffff",
        fillColor: "#199ef7",
      },
      tableCell: {
        fontSize: 9,
      },
      itemProduct: {
        fontSize: 10,
        bold: true,
      },
      itemDescription: {
        fontSize: 8,
        color: "#666666",
        italics: true,
        margin: [0, 2, 0, 0],
      },
      totalLabel: {
        fontSize: 11,
        bold: false,
      },
      totalValue: {
        fontSize: 11,
      },
      totalLabelBold: {
        fontSize: 13,
        bold: true,
        color: "#199ef7",
      },
      totalValueBold: {
        fontSize: 13,
        bold: true,
        color: "#199ef7",
      },
      paidStatus: {
        fontSize: 10,
        bold: true,
        italics: true,
      },
      commentary: {
        fontSize: 9,
        color: "#555555",
        margin: [0, 5, 0, 0],
      },
      employeeInfo: {
        fontSize: 9,
        color: "#666666",
        italics: true,
      },
      bankInfo: {
        fontSize: 9,
        color: "#555555",
        margin: [0, 2, 0, 0],
      },
    },

    defaultStyle: {
      font: "Roboto",
    },
  };

  return docDefinition;
}

async function getPdfMake() {
  const pdfMakeModule = await import("pdfmake/build/pdfmake");
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");

  const pdfMake = pdfMakeModule.default || pdfMakeModule;
  const vfs = (pdfFontsModule as any).default || pdfFontsModule;

  (pdfMake as any).vfs = vfs.pdfMake?.vfs || vfs;

  return pdfMake as any;
}

export async function downloadInvoicePDF(invoice: Invoice, company?: Company) {
  const pdfMake = await getPdfMake();
  const docDefinition = generateInvoicePDF(invoice, company);
  const docTitle =
    invoice.type === "invoice"
      ? "Facture"
      : invoice.type === "avoir"
      ? "Avoir"
      : "Devis";

  pdfMake.createPdf(docDefinition).download(`${docTitle}_${invoice.ref}.pdf`);
}

export async function openInvoicePDF(invoice: Invoice, company?: Company) {
  const pdfMake = await getPdfMake();
  const docDefinition = generateInvoicePDF(invoice, company);
  pdfMake.createPdf(docDefinition).open();
}

export async function getInvoicePDFBlob(
  invoice: Invoice,
  company?: Company
): Promise<Blob> {
  const pdfMake = await getPdfMake();
  const docDefinition = generateInvoicePDF(invoice, company);

  return new Promise((resolve, reject) => {
    pdfMake.createPdf(docDefinition).getBlob((blob: Blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Failed to generate PDF blob"));
      }
    });
  });
}
