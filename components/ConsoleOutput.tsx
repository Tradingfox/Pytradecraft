
import React, { useRef, useEffect } from 'react';

interface ConsoleOutputProps {
  lines: string[];
  title?: string;
  height?: string;
  className?: string;
}

const ConsoleOutput: React.FC<ConsoleOutputProps> = ({ lines, title = "Console", height = "200px", className = "" }) => {
  const endOfMessagesRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines]);

  return (
    <div className={`bg-gray-900 p-4 rounded-md shadow-inner border border-gray-700 ${className}`}>
      {title && <h4 className="text-sm font-semibold text-gray-400 mb-2">{title}</h4>}
      <div className="font-mono text-xs text-gray-300 overflow-y-auto custom-scrollbar" style={{ height }}>
        {lines.map((line, index) => (
          <div key={index} className="whitespace-pre-wrap break-all">{`> ${line}`}</div>
        ))}
        <div ref={endOfMessagesRef} />
      </div>
       {lines.length === 0 && <p className="text-gray-500 text-xs italic">No output yet.</p>}
    </div>
  );
};

export default ConsoleOutput;
