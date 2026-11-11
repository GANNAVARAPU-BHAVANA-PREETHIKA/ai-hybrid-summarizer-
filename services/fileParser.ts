import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';

// Configure PDF.js worker
// Ensure we use the exact same version and ESM build from the same CDN as the main library
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@5.4.624/build/pdf.worker.mjs`;

export const extractTextFromFile = async (file: File): Promise<string> => {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  try {
    if (fileName.endsWith('.txt') || fileType === 'text/plain') {
      return await parseTxt(file);
    } else if (fileName.endsWith('.pdf') || fileType === 'application/pdf') {
      return await parsePdf(file);
    } else if (fileName.endsWith('.docx') || fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return await parseDocx(file);
    } else {
      throw new Error('Unsupported file type. Please upload PDF, DOCX, or TXT.');
    }
  } catch (error: any) {
    console.error("Extraction error:", error);
    throw new Error(`Failed to extract text: ${error.message}`);
  }
};

const parseTxt = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve((event.target?.result as string) || '');
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

const parsePdf = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  
  // Use CMaps from esm.sh as well
  const loadingTask = pdfjsLib.getDocument({ 
    data: arrayBuffer,
    cMapUrl: `https://esm.sh/pdfjs-dist@5.4.624/cmaps/`,
    cMapPacked: true,
  });
  
  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
};

const parseDocx = async (file: File): Promise<string> => {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
};