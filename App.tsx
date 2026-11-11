import React, { useState } from 'react';
import { Activity, FileText, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
import FileUploader from './components/FileUploader';
import SummaryResult from './components/SummaryResult';
import { extractTextFromFile } from './services/fileParser';
import { fetchIntermediateSummaries, generateFinalSummary } from './services/geminiService';
import { AppState } from './types';

const MAX_TEXT_LENGTH = 200000;

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    inputText: '',
    fileName: null,
    status: 'idle',
    errorMessage: null,
    bertSummary: null,
    t5Summary: null,
    finalOutput: null,
  });

  const handleFileSelect = async (file: File) => {
    setState(prev => ({ ...prev, status: 'extracting', fileName: file.name, errorMessage: null }));
    try {
      const text = await extractTextFromFile(file);
      if (text.length > MAX_TEXT_LENGTH) {
         setState(prev => ({ 
           ...prev, 
           inputText: text.slice(0, MAX_TEXT_LENGTH), 
           status: 'idle',
           errorMessage: `File content truncated. Maximum allowed is ${MAX_TEXT_LENGTH.toLocaleString()} characters.` 
         }));
      } else {
         setState(prev => ({ ...prev, inputText: text, status: 'idle' }));
      }
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        fileName: null, 
        status: 'error', 
        errorMessage: error.message || 'Failed to read file.' 
      }));
    }
  };

  const handleClearFile = () => {
    setState(prev => ({ ...prev, inputText: '', fileName: null, status: 'idle', errorMessage: null }));
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    if (newText.length > MAX_TEXT_LENGTH) {
      setState(prev => ({
        ...prev,
        inputText: newText.slice(0, MAX_TEXT_LENGTH),
        fileName: null,
        errorMessage: `Character limit reached. Maximum allowed is ${MAX_TEXT_LENGTH.toLocaleString()}.`
      }));
    } else {
      setState(prev => ({ ...prev, inputText: newText, fileName: null, errorMessage: null }));
    }
  };

  const handleProcess = async () => {
    if (!state.inputText.trim()) {
      setState(prev => ({ ...prev, errorMessage: "Please enter text or upload a document." }));
      return;
    }

    setState(prev => ({ ...prev, status: 'analyzing', errorMessage: null, finalOutput: null }));

    try {
      // Step 1: Call Backend API
      const { bert_extractive, t5_abstractive } = await fetchIntermediateSummaries(state.inputText);
      
      setState(prev => ({ 
        ...prev, 
        bertSummary: bert_extractive, 
        t5Summary: t5_abstractive,
        status: 'synthesizing' 
      }));

      // Step 2: Call Gemini API
      const finalSummary = await generateFinalSummary(state.inputText, bert_extractive, t5_abstractive);

      setState(prev => ({ 
        ...prev, 
        finalOutput: finalSummary, 
        status: 'complete' 
      }));

    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        status: 'error', 
        errorMessage: error.message || "An unexpected error occurred during processing." 
      }));
    }
  };

  const isProcessing = ['extracting', 'analyzing', 'synthesizing'].includes(state.status);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 to-violet-700">
              Hybrid Summarizer
            </h1>
          </div>
          <div className="text-sm font-medium text-gray-500">
            Powered by BERT, T5 & Gemini 2.5
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT COLUMN: INPUT */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-indigo-500" />
                Input Source
              </h2>
              
              <div className="space-y-4">
                <FileUploader 
                  onFileSelect={handleFileSelect} 
                  selectedFileName={state.fileName}
                  onClear={handleClearFile}
                  disabled={isProcessing}
                />
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-400 font-medium">OR PASTE TEXT</span>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    value={state.inputText}
                    onChange={handleTextChange}
                    disabled={!!state.fileName || isProcessing}
                    placeholder="Paste your text here..."
                    className="w-full h-64 p-4 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none text-sm leading-relaxed disabled:opacity-60"
                  ></textarea>
                  <div className={`text-xs text-right mt-1 ${state.inputText.length >= MAX_TEXT_LENGTH ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
                    {state.inputText.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()} chars
                  </div>
                </div>

                {state.errorMessage && (
                  <div className="flex items-start p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-sm animate-pulse">
                    <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{state.errorMessage}</span>
                  </div>
                )}

                <button
                  onClick={handleProcess}
                  disabled={isProcessing || (!state.inputText && !state.fileName)}
                  className={`
                    w-full py-3.5 px-4 rounded-xl font-semibold text-white shadow-lg flex items-center justify-center space-x-2 transition-all transform active:scale-[0.98]
                    ${isProcessing || (!state.inputText && !state.fileName) 
                      ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                      : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200'}
                  `}
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>
                        {state.status === 'extracting' && 'Extracting Text...'}
                        {state.status === 'analyzing' && 'Running BERT & T5...'}
                        {state.status === 'synthesizing' && 'Gemini is Writing...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <span>Summarize Document</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Step Indicator (Visual candy) */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Processing Pipeline</h3>
              <div className="space-y-4">
                <StepItem 
                  status={state.status === 'extracting' ? 'active' : state.inputText ? 'done' : 'waiting'} 
                  label="Text Extraction" 
                  desc="Extracts readable text from PDF/DOCX/TXT" 
                />
                <StepItem 
                  status={state.status === 'analyzing' ? 'active' : state.bertSummary ? 'done' : 'waiting'} 
                  label="Hybrid Analysis" 
                  desc="BERT (Extractive) + T5 (Abstractive)" 
                />
                <StepItem 
                  status={state.status === 'synthesizing' ? 'active' : state.finalOutput ? 'done' : 'waiting'} 
                  label="Gemini Synthesis" 
                  desc="Generates final polished executive summary" 
                />
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: OUTPUT */}
          <div className="lg:col-span-7">
             {state.finalOutput ? (
               <SummaryResult finalOutput={state.finalOutput} />
             ) : (
               <div className="h-full min-h-[500px] flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-gray-200 text-center p-8">
                 <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
                   <Activity className="w-8 h-8 text-indigo-300" />
                 </div>
                 <h3 className="text-xl font-semibold text-gray-800 mb-2">Ready to Summarize</h3>
                 <p className="text-gray-500 max-w-sm mx-auto">
                   Upload a document or paste text to generate a comprehensive summary using our hybrid AI pipeline.
                 </p>
               </div>
             )}
          </div>

        </div>
      </main>
    </div>
  );
};

// Helper component for pipeline steps
const StepItem: React.FC<{ status: 'waiting' | 'active' | 'done'; label: string; desc: string }> = ({ status, label, desc }) => {
  return (
    <div className="flex items-start">
      <div className={`mt-1 w-2.5 h-2.5 rounded-full mr-3 ${
        status === 'active' ? 'bg-indigo-500 animate-pulse' : 
        status === 'done' ? 'bg-green-500' : 'bg-gray-200'
      }`}></div>
      <div>
        <p className={`text-sm font-medium ${status === 'waiting' ? 'text-gray-400' : 'text-gray-800'}`}>{label}</p>
        <p className="text-xs text-gray-400">{desc}</p>
      </div>
    </div>
  );
}

export default App;