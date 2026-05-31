import React from 'react';

interface PrescribingModalChromeProps {
  patientName: string;
  patientIdNumber: string;
  warnings: string[];
  onClose: () => void;
}

export const PrescribingModalChrome: React.FC<PrescribingModalChromeProps> = ({
  patientName,
  patientIdNumber,
  warnings,
  onClose,
}) => (
  <>
    <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">E-Prescribing</h2>
        <p className="text-sm text-gray-600 mt-1">
          Patient: {patientName} • ID: {patientIdNumber}
        </p>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="ปิด"
        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-white/50"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    {warnings.length > 0 && (
      <div className="p-4 bg-red-50 border-b border-red-200" data-testid="allergy-block-banner">
        <div className="flex items-start space-x-2">
          <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p className="font-medium text-red-900">Drug Warnings:</p>
            <ul className="mt-1 text-sm text-red-700">
              {warnings.map((warning) => (
                <li key={`warn-${warning.slice(0, 40)}`}>{warning}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    )}
  </>
);
