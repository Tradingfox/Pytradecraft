
import React from 'react';

interface SectionPanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

const SectionPanel: React.FC<SectionPanelProps> = ({ title, children, className = '', actions }) => {
  return (
    <div className={`bg-gray-850 shadow-lg rounded-lg p-6 ${className} border border-gray-700`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-white">{title}</h3>
        {actions && <div className="flex items-center space-x-2">{actions}</div>}
      </div>
      <div className="text-gray-300">
        {children}
      </div>
    </div>
  );
};

export default SectionPanel;
