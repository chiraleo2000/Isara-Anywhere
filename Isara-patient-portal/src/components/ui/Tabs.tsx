import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (tabId: string) => void;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'default',
  size = 'md',
  fullWidth = false,
}) => {
  const baseClasses = 'flex items-center gap-1 transition-all font-medium';
  
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
  };

  const variantClasses = {
    default: {
      container: 'bg-gray-100 p-1 rounded-xl',
      active: 'bg-white text-emerald-600 shadow-sm rounded-lg',
      inactive: 'text-gray-600 hover:text-gray-800 rounded-lg',
    },
    pills: {
      container: 'gap-2',
      active: 'bg-emerald-600 text-white rounded-full',
      inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-full',
    },
    underline: {
      container: 'border-b border-gray-200 gap-0',
      active: 'text-emerald-600 border-b-2 border-emerald-600 -mb-px',
      inactive: 'text-gray-600 hover:text-gray-800 border-b-2 border-transparent',
    },
  };

  return (
    <div className={`flex ${variantClasses[variant].container} ${fullWidth ? 'w-full' : ''}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`
            ${baseClasses}
            ${sizeClasses[size]}
            ${activeTab === tab.id ? variantClasses[variant].active : variantClasses[variant].inactive}
            ${fullWidth ? 'flex-1 justify-center' : ''}
          `}
        >
          {tab.icon}
          <span>{tab.label}</span>
          {tab.badge !== undefined && (
            <span className={`
              ml-1.5 px-1.5 py-0.5 text-xs rounded-full
              ${activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}
            `}>
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
};

interface TabPanelProps {
  children: React.ReactNode;
  className?: string;
}

export const TabPanel: React.FC<TabPanelProps> = ({ children, className = '' }) => (
  <div className={className}>{children}</div>
);
