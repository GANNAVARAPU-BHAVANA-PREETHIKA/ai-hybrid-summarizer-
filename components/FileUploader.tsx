import React, { useRef, useState } from 'react';
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  selectedFileName: string | null;
  onClear: () => void;
  disabled?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, selectedFileName, onClear, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndPass(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPass(e.target.files[0]);
    }
  };

  const validateAndPass = (file: File) => {
    // 50MB limit
    const MAX_SIZE = 50 * 1024 * 1024; 
    
    if (file.size > MAX_SIZE) {
      alert("File is too large. Please upload a file smaller than 50MB.");
      return;
    }

    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    // Simple check on extension as fallback
    const validExts = ['.pdf', '.docx', '.txt'];
    const isNameValid = validExts.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (validTypes.includes(file.type) || isNameValid) {
      onFileSelect(file);
    } else {
      alert("Invalid file type. Please upload PDF, DOCX, or TXT.");
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".pdf,.docx,.txt"
        disabled={disabled}
      />
      
      {!selectedFileName ? (
        <div
          onClick={() => !disabled && fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all duration-300 cursor-pointer
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
            ${disabled ? 'opacity-50 cursor-not-allowed hover:border-gray-300 hover:bg-transparent' : ''}
          `}
        >
          <div className="bg-blue-100 p-3 rounded-full mb-3">
            <Upload className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-gray-700">Click to upload or drag & drop</p>
          <p className="text-xs text-gray-500 mt-1">PDF, DOCX, or TXT (Max 50MB)</p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium text-gray-900 truncate">{selectedFileName}</span>
              <span className="text-xs text-green-600 flex items-center mt-0.5">
                <CheckCircle className="w-3 h-3 mr-1" /> Ready to process
              </span>
            </div>
          </div>
          <button
            onClick={onClear}
            disabled={disabled}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors disabled:opacity-50"
            title="Remove file"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default FileUploader;