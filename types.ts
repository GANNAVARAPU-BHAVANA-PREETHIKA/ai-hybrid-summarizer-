export interface SummaryResponse {
  bert_extractive: string;
  t5_abstractive: string;
}

export interface FinalSummary {
  paragraph: string;
  bulletPoints: string[];
}

export type ProcessingStatus = 'idle' | 'extracting' | 'analyzing' | 'synthesizing' | 'complete' | 'error';

export interface AppState {
  inputText: string;
  fileName: string | null;
  status: ProcessingStatus;
  errorMessage: string | null;
  bertSummary: string | null;
  t5Summary: string | null;
  finalOutput: string | null;
}
