
import React from 'react';

interface CodeEditorProps {
  code: string;
  setCode: (code: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  height?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  setCode,
  placeholder = "Enter your Python code here...",
  readOnly = false,
  height = "400px"
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!readOnly) {
      setCode(event.target.value);
    }
  };

  return (
    <div className="bg-gray-900 p-1 rounded-md shadow-inner border border-gray-700 w-full">
      <textarea
        value={code}
        onChange={handleChange}
        placeholder={placeholder}
        readOnly={readOnly}
        className="w-full bg-transparent text-gray-200 font-mono text-sm p-3 focus:outline-none resize-none leading-relaxed"
        style={{ height: height, tabSize: 4, WebkitTabSize: 4 } as React.CSSProperties} // Added tabSize for better code formatting
        spellCheck="false"
      />
    </div>
  );
};

export default CodeEditor;
