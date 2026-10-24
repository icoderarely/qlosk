// svg-to-pdfkit ships no types. Only what services/print.ts uses.
declare module "svg-to-pdfkit" {
  import type PDFDocument from "pdfkit";
  type Options = {
    width?: number;
    height?: number;
    assumePt?: boolean;
    fontCallback?: (family: string, bold: boolean, italic: boolean, fontOptions: unknown) => string;
    imageCallback?: (link: string) => string;
    warningCallback?: (warning: string) => void;
  };
  export default function SVGtoPDF(doc: InstanceType<typeof PDFDocument>, svg: string, x: number, y: number, options?: Options): void;
}
