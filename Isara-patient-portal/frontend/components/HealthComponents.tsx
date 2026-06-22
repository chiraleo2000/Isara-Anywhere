import React, { useState, useRef } from 'react';
import { VitalSigns, Medication, MedicalDocument } from '../types';
import {
  Heart,
  Activity,
  Thermometer,
  Wind,
  Droplets,
  TrendingUp,
  Pill,
  FileText,
  Download,
  Trash2,
  Upload,
  Edit2,
} from 'lucide-react';
import { Card, Badge } from './CoreComponents';

interface VitalSignsDisplayProps {
  vitalSigns: VitalSigns;
  showTrends?: boolean;
}

export const VitalSignsDisplay: React.FC<VitalSignsDisplayProps> = ({ vitalSigns, showTrends = false }) => {
  const vitals = [
    {
      icon: Heart,
      label: 'ความดันโลหิต',
      value: vitalSigns.bloodPressure
        ? `${vitalSigns.bloodPressure.systolic}/${vitalSigns.bloodPressure.diastolic}`
        : 'N/A',
      unit: vitalSigns.bloodPressure?.unit || 'mmHg',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      icon: Activity,
      label: 'อัตราการเต้นหัวใจ',
      value: vitalSigns.heartRate?.value || 'N/A',
      unit: vitalSigns.heartRate?.unit || 'bpm',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      icon: Thermometer,
      label: 'อุณหภูมิร่างกาย',
      value: vitalSigns.temperature?.value || 'N/A',
      unit: vitalSigns.temperature?.unit === 'celsius' ? '°C' : '°F',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      icon: Wind,
      label: 'อัตราการหายใจ',
      value: vitalSigns.respiratoryRate?.value || 'N/A',
      unit: vitalSigns.respiratoryRate?.unit || 'breaths/min',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Droplets,
      label: 'ออกซิเจนในเลือด',
      value: vitalSigns.oxygenSaturation?.value || 'N/A',
      unit: vitalSigns.oxygenSaturation?.unit || '%',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {vitals.map((vital) => {
        const Icon = vital.icon;
        return (
          <div key={vital.label} className={`${vital.bgColor} rounded-xl p-4 border border-gray-200`}>
            <div className="flex items-start justify-between mb-2">
              <Icon className={`w-6 h-6 ${vital.color}`} />
              {showTrends && <TrendingUp className="w-4 h-4 text-green-600" />}
            </div>
            <p className="text-sm text-gray-600 mb-1">{vital.label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-gray-800">{vital.value}</span>
              <span className="text-sm text-gray-600">{vital.unit}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface VitalSignsFormProps {
  onSubmit: (vitalSigns: VitalSigns) => void;
  loading?: boolean;
}

export const VitalSignsForm: React.FC<VitalSignsFormProps> = ({ onSubmit, loading }) => {
  const [formData, setFormData] = useState<VitalSigns>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ ...formData, measuredAt: new Date() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="bp-systolic" className="block text-sm font-medium text-gray-700 mb-2">
            ความดันโลหิต (Systolic/Diastolic)
          </label>
          <div className="flex gap-2">
            <input
              id="bp-systolic"
              type="number"
              placeholder="120"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  bloodPressure: {
                    systolic: Number.parseInt(e.target.value, 10) || 0,
                    diastolic: formData.bloodPressure?.diastolic || 0,
                    unit: 'mmHg',
                  },
                })
              }
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
            <span className="self-center">/</span>
            <input
              id="bp-diastolic"
              aria-label="Diastolic blood pressure"
              type="number"
              placeholder="80"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  bloodPressure: {
                    systolic: formData.bloodPressure?.systolic || 0,
                    diastolic: Number.parseInt(e.target.value, 10) || 0,
                    unit: 'mmHg',
                  },
                })
              }
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="heart-rate" className="block text-sm font-medium text-gray-700 mb-2">
            อัตราการเต้นหัวใจ (bpm)
          </label>
          <input
            id="heart-rate"
            type="number"
            placeholder="72"
            onChange={(e) =>
              setFormData({
                ...formData,
                heartRate: { value: Number.parseInt(e.target.value, 10) || 0, unit: 'bpm' },
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label htmlFor="temperature" className="block text-sm font-medium text-gray-700 mb-2">
            อุณหภูมิร่างกาย (°C)
          </label>
          <input
            id="temperature"
            type="number"
            step="0.1"
            placeholder="36.5"
            onChange={(e) =>
              setFormData({
                ...formData,
                temperature: { value: Number.parseFloat(e.target.value) || 0, unit: 'celsius' },
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label htmlFor="oxygen-sat" className="block text-sm font-medium text-gray-700 mb-2">
            ออกซิเจนในเลือด (%)
          </label>
          <input
            id="oxygen-sat"
            type="number"
            placeholder="98"
            onChange={(e) =>
              setFormData({
                ...formData,
                oxygenSaturation: { value: Number.parseInt(e.target.value, 10) || 0, unit: '%' },
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-2">น้ำหนัก (kg)</label>
          <input
            id="weight"
            type="number"
            step="0.1"
            placeholder="70"
            onChange={(e) =>
              setFormData({
                ...formData,
                weight: { value: Number.parseFloat(e.target.value) || 0, unit: 'kg' },
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div>
          <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-2">ส่วนสูง (cm)</label>
          <input
            id="height"
            type="number"
            placeholder="170"
            onChange={(e) =>
              setFormData({
                ...formData,
                height: { value: Number.parseFloat(e.target.value) || 0, unit: 'cm' },
              })
            }
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
      >
        {loading ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
      </button>
    </form>
  );
};

interface MedicationListProps {
  medications: Medication[];
  onEdit?: (medication: Medication) => void;
  onDelete?: (medicationId: string) => void;
  showActions?: boolean;
}

export const MedicationList: React.FC<MedicationListProps> = ({
  medications,
  onEdit,
  onDelete,
  showActions = true,
}) => {
  if (medications.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Pill className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>ไม่มีข้อมูลยา</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {medications.map((medication) => (
        <div key={medication.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Pill className="w-5 h-5 text-emerald-600" />
                <h4 className="font-semibold text-gray-800">{medication.name}</h4>
                <Badge variant={medication.status === 'active' ? 'success' : 'default'}>
                  {medication.status === 'active' ? 'กำลังใช้' : 'หยุดแล้ว'}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600 ml-8">
                <div>
                  <span className="font-medium">ขนาด:</span> {medication.dosage}
                </div>
                <div>
                  <span className="font-medium">ความถี่:</span> {medication.frequency}
                </div>
                <div>
                  <span className="font-medium">เริ่มใช้:</span>{' '}
                  {new Date(medication.startDate).toLocaleDateString('th-TH')}
                </div>
                {medication.endDate && (
                  <div>
                    <span className="font-medium">สิ้นสุด:</span>{' '}
                    {new Date(medication.endDate).toLocaleDateString('th-TH')}
                  </div>
                )}
              </div>

              {medication.purpose && (
                <p className="text-sm text-gray-600 mt-2 ml-8">
                  <span className="font-medium">วัตถุประสงค์:</span> {medication.purpose}
                </p>
              )}
            </div>

            {showActions && (
              <div className="flex gap-2">
                {onEdit && (
                  <button
                    onClick={() => onEdit(medication)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    aria-label="แก้ไขยา" title="แก้ไขยา"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => onDelete(medication.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    aria-label="ลบยา" title="ลบยา"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

interface DocumentListProps {
  documents: MedicalDocument[];
  onDownload?: (document: MedicalDocument) => void;
  onDelete?: (documentId: string) => void;
  showActions?: boolean;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  onDownload,
  onDelete,
  showActions = true,
}) => {
  if (documents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p>ไม่มีเอกสาร</p>
      </div>
    );
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('video')) return '🎥';
    return '📎';
  };

  const typeLabels = {
    lab_result: 'ผลแลป',
    imaging: 'ภาพถ่าย',
    prescription: 'ใบสั่งยา',
    report: 'รายงาน',
    other: 'อื่นๆ',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {documents.map((document) => (
        <div key={document.id} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{getFileIcon(document.mimeType)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-800 truncate">{document.title}</h4>
                  <Badge size="sm" variant="info">
                    {typeLabels[document.type]}
                  </Badge>
                </div>
              </div>

              {document.description && (
                <p className="text-sm text-gray-600 mb-2">{document.description}</p>
              )}

              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>
                  {new Date(document.uploadDate).toLocaleDateString('th-TH', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <span>{(document.fileSize / 1024 / 1024).toFixed(2)} MB</span>
              </div>

              {document.tags && document.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {document.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {showActions && (
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
              {onDownload && (
                <button
                  onClick={() => onDownload(document)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100"
                >
                  <Download className="w-4 h-4" />
                  ดาวน์โหลด
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(document.id)}
                  className="px-3 py-2 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100"
                  aria-label="ลบเอกสาร" title="ลบเอกสาร"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface FileUploadProps {
  onUpload: (file: File) => void;
  accept?: string;
  maxSize?: number;
  loading?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  accept = '*',
  maxSize = 10 * 1024 * 1024,
  loading = false,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files?.[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    if (file.size > maxSize) {
      alert(`ไฟล์ใหญ่เกิน ${maxSize / 1024 / 1024} MB`);
      return;
    }
    onUpload(file);
  };

  return (
    <section
      aria-label="File upload area"
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragActive ? 'border-emerald-500 bg-emerald-50' : 'border-gray-300 bg-gray-50'
        }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
        disabled={loading}
        aria-label="อัปโหลดไฟล์"
      />

      <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />

      <p className="text-gray-700 mb-2">
        {dragActive ? 'วางไฟล์ที่นี่' : 'ลากไฟล์มาวางที่นี่'}
      </p>

      <p className="text-sm text-gray-500 mb-4">หรือ</p>

      <button
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className="bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50"
      >
        {loading ? 'กำลังอัปโหลด...' : 'เลือกไฟล์'}
      </button>

      <p className="text-xs text-gray-500 mt-4">
        ขนาดไฟล์สูงสุด {maxSize / 1024 / 1024} MB
      </p>
    </section>
  );
};

interface BMICalculatorProps {
  weight?: number;
  height?: number;
  onCalculate?: (bmi: number, category: string) => void;
}

export const BMICalculator: React.FC<BMICalculatorProps> = ({ weight, height, onCalculate }) => {
  const [weightInput, setWeightInput] = useState(weight?.toString() || '');
  const [heightInput, setHeightInput] = useState(height?.toString() || '');
  const [bmi, setBMI] = useState<number | null>(null);
  const [category, setCategory] = useState<string>('');

  const calculateBMI = () => {
    const w = Number.parseFloat(weightInput);
    const h = Number.parseFloat(heightInput) / 100;

    if (w > 0 && h > 0) {
      const calculated = w / (h * h);
      setBMI(Number.parseFloat(calculated.toFixed(1)));

      let cat = '';
      if (calculated < 18.5) cat = 'น้ำหนักน้อย';
      else if (calculated < 25) cat = 'ปกติ';
      else if (calculated < 30) cat = 'น้ำหนักเกิน';
      else cat = 'อ้วน';

      setCategory(cat);
      onCalculate?.(calculated, cat);
    }
  };

  const getCategoryColor = () => {
    if (!category) return 'text-gray-600';
    if (category === 'ปกติ') return 'text-green-600';
    if (category === 'น้ำหนักน้อย' || category === 'น้ำหนักเกิน') return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card title="คำนวณ BMI">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="bmi-weight" className="block text-sm font-medium text-gray-700 mb-2">น้ำหนัก (kg)</label>
            <input
              id="bmi-weight"
              type="number"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="70"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label htmlFor="bmi-height" className="block text-sm font-medium text-gray-700 mb-2">ส่วนสูง (cm)</label>
            <input
              id="bmi-height"
              type="number"
              value={heightInput}
              onChange={(e) => setHeightInput(e.target.value)}
              placeholder="170"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <button
          onClick={calculateBMI}
          className="w-full bg-emerald-600 text-white py-3 rounded-lg font-medium hover:bg-emerald-700"
        >
          คำนวณ
        </button>

        {bmi !== null && (
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-600 mb-1">ค่า BMI ของคุณ</p>
            <p className="text-4xl font-bold text-gray-800 mb-2">{bmi}</p>
            <p className={`text-lg font-semibold ${getCategoryColor()}`}>{category}</p>
          </div>
        )}
      </div>
    </Card>
  );
};
