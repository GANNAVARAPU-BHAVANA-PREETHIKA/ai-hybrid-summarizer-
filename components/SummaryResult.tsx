import React, { useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, Copy, Check, Download, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface SummaryResultProps {
  finalOutput: string;
}

const SummaryResult: React.FC<SummaryResultProps> = ({ finalOutput }) => {
  const [copied, setCopied] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(finalOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = useCallback(async () => {
    if (!contentRef.current || downloading) return;

    setDownloading(true);
    try {
      // Capture the content with html2canvas
      const canvas = await html2canvas(contentRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 10;

      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('AI Summary Analysis - Gemini Hybrid Summarizer', 20, 15);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(new Date().toLocaleString(), 20, 25);
      position = 35;

      // Add first page image
      pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Add more pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save PDF
      pdf.save(`gemini-hybrid-summary-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [finalOutput, downloading]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center text-white space-x-2">
          <Sparkles className="w-5 h-5" />
          <h2 className="text-lg font-semibold tracking-wide">AI Summary Analysis</h2>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors flex items-center space-x-1"
            title="Copy to clipboard"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span className="text-xs font-medium uppercase tracking-wider">{copied ? 'Copied' : 'Copy'}</span>
          </button>
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-lg transition-colors flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download as PDF"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="text-xs font-medium uppercase tracking-wider">PDF</span>
          </button>
        </div>
      </div>
      
      <div ref={contentRef} className="p-8 prose prose-slate max-w-none print:break-inside-avoid">
        {/* We use ReactMarkdown to render the output nicely since Gemini returns markdown-like text */}
        <ReactMarkdown
           components={{
             h1: ({node, ...props}) => <h3 className="text-xl font-bold text-gray-900 mb-4 mt-6 first:mt-0 print:font-bold" {...props} />,
             p: ({node, ...props}) => <p className="text-gray-600 leading-relaxed mb-4 text-base" {...props} />,
             ul: ({node, ...props}) => <ul className="space-y-2 mb-6 list-disc ml-6" {...props} />,
             li: ({node, ...props}) => (
               <li className="flex items-start text-gray-700">
                 <span className="mr-3 text-indigo-500 font-bold flex-shrink-0">•</span>
                 <span>{props.children}</span>
               </li>
             ),
             strong: ({node, ...props}) => <span className="font-semibold text-gray-900" {...props} />
           }}
        >
          {finalOutput}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default SummaryResult;
