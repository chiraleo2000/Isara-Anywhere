
import { useState, RefObject } from 'react';
import {
  Info, AlertCircle, MessageSquare, Mic, MicOff, Camera, Upload,
  X, Play, Pause, Trash2, Clock, Activity, Thermometer, Pill,
  Stethoscope, CheckCircle2, FileText, Image as ImageIcon, Sparkles,
  Lightbulb
} from 'lucide-react';

// Input tab types
type InputTab = 'text' | 'voice' | 'image';

type SymptomInputStepProps = Readonly<{
  form: any;
  setForm: (fn: (prev: any) => any) => void;
  commonSymptoms: string[];
  isRecording: boolean;
  recordingTime: number;
  isPlaying: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  deleteRecording: () => void;
  togglePlayback: () => void;
  formatTime: (seconds: number) => string;
  audioRef: RefObject<HTMLAudioElement>;
  fileInputRef: RefObject<HTMLInputElement>;
  cameraInputRef: RefObject<HTMLInputElement>;
  handleImageUpload: (files: FileList | null) => void;
  removeImage: (index: number) => void;
  canProceedStep2: boolean;
  aiAnalyzing: boolean;
  aiAnalysis: any;
  showAiAnalysis: boolean;
  analyzeSymptoms: () => void;
  aiSuggesting: boolean;
  aiSuggestions: { suggestions: string[]; improvedDescription?: string; followUpQuestions?: string[] } | null;
  suggestSymptoms: () => void;
  setStep: (step: number) => void;
}>;

type AiSuggestions = {
  suggestions: string[];
  improvedDescription?: string;
  followUpQuestions?: string[];
};

type InputTabConfig = {
  id: InputTab;
  label: string;
  icon: typeof FileText;
  color: keyof typeof tabStyles;
  hasInput: boolean;
};

const tabStyles = {
  blue: {
    active: 'bg-blue-50 text-blue-700 border-b-2 border-blue-600',
    icon: 'text-blue-600'
  },
  indigo: {
    active: 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600',
    icon: 'text-indigo-600'
  },
  purple: {
    active: 'bg-purple-50 text-purple-700 border-b-2 border-purple-600',
    icon: 'text-purple-600'
  }
} as const;

const triageMeta = {
  Emergency: {
    container: 'bg-red-100 border border-red-300',
    text: 'text-red-700',
    short: '🚨 ฉุกเฉิน',
    long: '🚨 ฉุกเฉิน - ควรพบแพทย์ทันที'
  },
  Urgent: {
    container: 'bg-orange-100 border border-orange-300',
    text: 'text-orange-700',
    short: '⚠️ เร่งด่วน',
    long: '⚠️ เร่งด่วน - ควรพบแพทย์เร็วๆ นี้'
  },
  Routine: {
    container: 'bg-yellow-100 border border-yellow-300',
    text: 'text-yellow-700',
    short: '📋 ปกติ',
    long: '📋 ปกติ - นัดพบแพทย์ตามสะดวก'
  },
  SelfCare: {
    container: 'bg-green-100 border border-green-300',
    text: 'text-green-700',
    short: '✅ ดูแลตัวเองได้',
    long: '✅ ดูแลตัวเองได้ - อาจไม่จำเป็นต้องพบแพทย์'
  }
} as const;

const getTriageMeta = (level?: string) => {
  if (!level) return triageMeta.SelfCare;
  return triageMeta[level as keyof typeof triageMeta] ?? triageMeta.SelfCare;
};

const getSeverityClass = (level: number, selected: number) => {
  if (selected !== level) {
    return 'bg-white border-2 border-gray-200 text-gray-600 hover:border-gray-300';
  }
  if (level <= 2) return 'bg-green-500 text-white';
  if (level <= 3) return 'bg-yellow-500 text-white';
  return 'bg-red-500 text-white';
};

const createVttDataUri = (text: string) => {
  const encoded = encodeURIComponent(text || '');
  return `data:text/vtt,WEBVTT%0A%0A00:00.000%20-->%2099:59.999%0A${encoded}`;
};

const appendSymptom = (currentDesc: string, symptom: string) => {
  const trimmed = currentDesc.trim();
  if (!trimmed) return symptom;
  return trimmed.includes(symptom) ? trimmed : `${trimmed}, ${symptom}`;
};

type TextInputTabProps = Readonly<{
  form: any;
  setForm: (fn: (prev: any) => any) => void;
  commonSymptoms: string[];
  aiSuggestions: AiSuggestions | null;
  aiSuggesting: boolean;
  suggestSymptoms: () => void;
  hasTextInput: boolean;
  aiAnalysis: any;
  showAiAnalysis: boolean;
}>;

function TextInputTab({
  form,
  setForm,
  commonSymptoms,
  aiSuggestions,
  aiSuggesting: _aiSuggesting,
  suggestSymptoms: _suggestSymptoms,
  hasTextInput,
  aiAnalysis,
  showAiAnalysis
}: TextInputTabProps) {
  const triage = getTriageMeta(aiAnalysis?.triageLevel);

  const handleSelectSymptom = (symptom: string) => {
    const newDesc = appendSymptom(form.symptomDescription, symptom);
    setForm((prev: any) => ({
      ...prev,
      mainSymptom: prev.mainSymptom || symptom,
      symptomDescription: newDesc
    }));
  };

  const handleSuggestionClick = (suggestion: string) => {
    const currentDesc = form.symptomDescription.trim();
    const newLine = `\n• ${suggestion}`;
    setForm((prev: any) => ({
      ...prev,
      symptomDescription: currentDesc ? currentDesc + newLine : `• ${suggestion}`
    }));
  };

  return (
    <div className="space-y-6">
      {/* Combined Main Symptom & Description */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" />
          อาการหลัก *
        </h3>

        {/* Quick Symptom Selection */}
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
          <p className="block text-sm font-medium text-gray-700 mb-3">เลือกอาการที่พบบ่อย:</p>
          <div className="flex flex-wrap gap-2">
            {commonSymptoms.map((symptom) => (
              <button
                key={symptom}
                type="button"
                onClick={() => handleSelectSymptom(symptom)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${form.symptomDescription.includes(symptom) || form.mainSymptom === symptom
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white text-gray-600 hover:bg-blue-100 hover:text-blue-700 border border-gray-200'
                  }`}
              >
                {symptom}
              </button>
            ))}
          </div>
        </div>

        {/* Detailed Description */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              อธิบายอาการโดยละเอียด
            </h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  alert(`💡 เคล็ดลับการอธิบายอาการ:\n\n1. บอกอาการหลักก่อน เช่น ปวดหัว ไข้ ไอ\n2. ระบุว่าเป็นมานานแค่ไหน\n3. บอกความรุนแรง (เบา ปานกลาง รุนแรง)\n4. บอกตำแหน่งที่เป็น เช่น ปวดหัวด้านขวา\n5. มีอะไรทำให้ดีขึ้นหรือแย่ลงไหม\n6. มียาที่ใช้อยู่หรือไม่\n\nหากต้องการความช่วยเหลือเพิ่มเติม กรุณาโทร 1323`);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 text-sm font-medium shadow-md transition-all"
              >
                <Info className="w-4 h-4" />
                ความช่วยเหลือ
              </button>
            </div>
          </div>
          <textarea
            value={form.symptomDescription}
            onChange={(e) => setForm((prev: any) => ({ ...prev, symptomDescription: e.target.value }))}
            placeholder="อธิบายอาการที่เป็นอย่างละเอียด เช่น:&#10;- อาการเริ่มต้นอย่างไร เมื่อไหร่&#10;- เป็นมากแค่ไหน ตรงไหนของร่างกาย&#10;- มีอะไรทำให้ดีขึ้นหรือแย่ลง&#10;- อาการร่วมอื่นๆ ที่มี"
            className="w-full p-4 border border-gray-200 rounded-xl h-40 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700"
          />

          {/* AI Suggestions Display */}
          {aiSuggestions && aiSuggestions.suggestions.length > 0 && (
            <div className="mt-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="w-5 h-5 text-amber-600" />
                <h4 className="font-medium text-amber-800">💡 AI แนะนำให้เพิ่มข้อมูล:</h4>
              </div>
              <ul className="space-y-2">
                {aiSuggestions.suggestions.map((suggestion) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="flex items-start gap-2 text-sm text-amber-700 hover:text-amber-900"
                    >
                      <span className="text-amber-500">•</span>
                      <span className="hover:underline">{suggestion}</span>
                      <span className="text-xs text-amber-400">(คลิกเพื่อเพิ่ม)</span>
                    </button>
                  </li>
                ))}
              </ul>
              {aiSuggestions.followUpQuestions && aiSuggestions.followUpQuestions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-amber-200">
                  <p className="text-xs text-amber-600 mb-1">คำถามที่ควรตอบเพิ่ม:</p>
                  {aiSuggestions.followUpQuestions.map((q) => (
                    <p key={q} className="text-sm text-amber-700">❓ {q}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {hasTextInput && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-700">บันทึกข้อมูลข้อความแล้ว</span>
        </div>
      )}

      {/* AI Analysis Results in Text Tab */}
      {showAiAnalysis && aiAnalysis && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h4 className="font-semibold text-purple-800">ผลการวิเคราะห์จาก AI</h4>
          </div>

          {/* Triage Level */}
          <div className={`p-3 rounded-lg ${triage.container}`}>
            <p className={`font-semibold ${triage.text}`}>{triage.short}</p>
          </div>

          {aiAnalysis.reasoning && (
            <p className="text-sm text-gray-700">{aiAnalysis.reasoning}</p>
          )}

          <p className="text-xs text-gray-500 italic">* เป็นการประเมินเบื้องต้นจาก AI ไม่ใช่การวินิจฉัยทางการแพทย์</p>
        </div>
      )}
    </div>
  );
}

type VoiceInputTabProps = Readonly<{
  form: any;
  isRecording: boolean;
  recordingTime: number;
  isPlaying: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  deleteRecording: () => void;
  togglePlayback: () => void;
  formatTime: (seconds: number) => string;
  audioRef: RefObject<HTMLAudioElement>;
}>;

function VoiceInputTab({
  form,
  isRecording,
  recordingTime,
  isPlaying,
  startRecording,
  stopRecording,
  deleteRecording,
  togglePlayback,
  formatTime,
  audioRef
}: VoiceInputTabProps) {
  const hasAudio = Boolean(form.audioUrl);
  const captionsSrc = createVttDataUri(form.audioTranscript ?? '');

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="font-semibold text-gray-800 mb-2">อัดเสียงบอกอาการ</h3>
        <p className="text-sm text-indigo-600 mb-6">
          พูดบอกอาการของคุณ AI จะช่วยแปลงเป็นข้อความและวิเคราะห์
        </p>

        {hasAudio ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-indigo-50 rounded-xl max-w-sm mx-auto">
              <button
                onClick={togglePlayback}
                aria-label={isPlaying ? 'หยุดเล่น' : 'เล่นเสียง'}
                className="w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center text-white hover:bg-indigo-700"
              >
                {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}
              </button>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-gray-800">เสียงบันทึก</p>
                <p className="text-xs text-gray-500">ระยะเวลา {formatTime(recordingTime)}</p>
                <audio
                  ref={audioRef}
                  src={form.audioUrl}
                  className="hidden"
                >
                  <track kind="captions" srcLang="th" label="Thai captions" src={captionsSrc} />
                </audio>
              </div>
              <button
                onClick={deleteRecording}
                aria-label="ลบเสียงบันทึก"
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            {form.audioTranscript && (
              <div className="p-3 bg-green-50 rounded-lg border border-green-200 max-w-md mx-auto">
                <p className="text-xs text-green-600 mb-1">AI แปลงเสียงเป็นข้อความ:</p>
                <p className="text-sm text-gray-700">{form.audioTranscript}</p>
              </div>
            )}
            <div className="p-3 bg-green-50 rounded-lg border border-green-200 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700">บันทึกเสียงแล้ว</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-lg ${isRecording
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
            >
              {isRecording ? (
                <MicOff className="w-12 h-12 text-white" />
              ) : (
                <Mic className="w-12 h-12 text-white" />
              )}
            </button>
            <div className="text-center">
              {isRecording ? (
                <>
                  <p className="text-red-600 font-medium">กำลังบันทึก...</p>
                  <p className="text-3xl font-bold text-gray-800">{formatTime(recordingTime)}</p>
                  <p className="text-xs text-gray-500">กดปุ่มเพื่อหยุดบันทึก</p>
                </>
              ) : (
                <p className="text-sm text-gray-600">กดปุ่มเพื่อเริ่มบันทึกเสียง</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type ImageInputTabProps = Readonly<{
  form: any;
  fileInputRef: RefObject<HTMLInputElement>;
  cameraInputRef: RefObject<HTMLInputElement>;
  handleImageUpload: (files: FileList | null) => void;
  removeImage: (index: number) => void;
  hasImageInput: boolean;
}>;

function ImageInputTab({
  form,
  fileInputRef,
  cameraInputRef,
  handleImageUpload,
  removeImage,
  hasImageInput
}: ImageInputTabProps) {
  const imageCount = form.images.length;
  const canAddImage = imageCount < 5;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="font-semibold text-gray-800 mb-2">แนบรูปภาพอาการ</h3>
        <p className="text-sm text-purple-600 mb-4">
          แนบรูปภาพบริเวณที่มีอาการเพื่อช่วยให้แพทย์วินิจฉัยได้แม่นยำขึ้น (สูงสุด 5 รูป)
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleImageUpload(e.target.files)}
        aria-label="เลือกรูปภาพ"
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleImageUpload(e.target.files)}
        aria-label="ถ่ายรูป"
        className="hidden"
      />

      {/* Image Preview Grid */}
      {imageCount > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-4">
          {form.images.map((img: any, index: number) => {
            const imageKey = img.id ?? img.preview ?? img.url ?? img.name ?? img.file?.name ?? String(img);
            return (
              <div key={imageKey} className="relative group">
                <img
                  src={img.preview}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-24 object-cover rounded-xl border-2 border-purple-200"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  aria-label="ลบรูปภาพ"
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Buttons */}
      {canAddImage && (
        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 hover:bg-purple-50 transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span>เลือกรูป</span>
          </button>
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center justify-center gap-2 px-6 py-4 border-2 border-dashed border-purple-300 rounded-xl text-purple-600 hover:bg-purple-50 transition-colors"
          >
            <Camera className="w-5 h-5" />
            <span>ถ่ายรูป</span>
          </button>
        </div>
      )}

      {hasImageInput && (
        <div className="p-3 bg-green-50 rounded-lg border border-green-200 flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-700">อัปโหลดรูปภาพ {imageCount} รูปแล้ว</span>
        </div>
      )}
    </div>
  );
}

type InputSummaryProps = Readonly<{
  hasTextInput: boolean;
  hasVoiceInput: boolean;
  hasImageInput: boolean;
  imageCount: number;
}>;

function InputSummary({ hasTextInput, hasVoiceInput, hasImageInput, imageCount }: InputSummaryProps) {
  const summaryItems = [
    { key: 'text', label: 'ข้อความ', hasInput: hasTextInput, icon: FileText },
    { key: 'voice', label: 'เสียง', hasInput: hasVoiceInput, icon: Mic },
    { key: 'image', label: `รูปภาพ (${imageCount})`, hasInput: hasImageInput, icon: ImageIcon }
  ];

  return (
    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-purple-600" />
        <h3 className="font-semibold text-purple-800">ข้อมูลสำหรับ AI วิเคราะห์</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {summaryItems.map((item) => (
          <span
            key={item.key}
            className={`px-3 py-1.5 rounded-full text-sm flex items-center gap-1.5 ${item.hasInput ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
              }`}
          >
            <item.icon className="w-4 h-4" />
            {item.label} {item.hasInput && '✓'}
          </span>
        ))}
      </div>
    </div>
  );
}

type MedicalInfoSectionProps = Readonly<{
  form: any;
  setForm: (fn: (prev: any) => any) => void;
}>;

function MedicalInfoSection({ form, setForm }: MedicalInfoSectionProps) {
  const severityLevels = [1, 2, 3, 4, 5];

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-emerald-50 to-teal-50">
        <h3 className="font-semibold text-gray-800 flex items-center gap-2">
          <Pill className="w-5 h-5 text-emerald-600" />
          ข้อมูลทางการแพทย์
        </h3>
        <p className="text-xs text-gray-500 mt-1">กรอกข้อมูลเพิ่มเติมเพื่อช่วยให้แพทย์วินิจฉัยได้แม่นยำ</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Duration & Severity Row */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Duration */}
          <div className="p-4 bg-orange-50 rounded-xl border border-orange-200">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-500" />
              ระยะเวลาที่เป็น *
            </h4>
            <div className="flex gap-2">
              <input
                type="number"
                value={form.symptomDuration}
                onChange={(e) => setForm((prev: any) => ({ ...prev, symptomDuration: e.target.value }))}
                placeholder="จำนวน"
                min="1"
                className="w-24 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
              />
              <select
                value={form.symptomDurationUnit}
                onChange={(e) => setForm((prev: any) => ({ ...prev, symptomDurationUnit: e.target.value }))}
                aria-label="หน่วยเวลา"
                className="flex-1 p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500"
              >
                <option value="hours">ชั่วโมง</option>
                <option value="days">วัน</option>
                <option value="weeks">สัปดาห์</option>
                <option value="months">เดือน</option>
              </select>
            </div>
          </div>

          {/* Severity */}
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              ความรุนแรง (1-5)
            </h4>
            <div className="flex items-center gap-2">
              {severityLevels.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setForm((prev: any) => ({ ...prev, symptomSeverity: level }))}
                  className={`w-12 h-12 rounded-xl font-semibold transition-all ${getSeverityClass(level, form.symptomSeverity)}`}
                >
                  {level}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">1 = เบามาก, 5 = รุนแรงมาก</p>
          </div>
        </div>

        {/* Fever checkbox */}
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Thermometer className="w-5 h-5 text-red-500" />
            มีไข้หรือไม่
          </h4>
          <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-gray-200">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.fever}
                onChange={(e) => setForm((prev: any) => ({ ...prev, fever: e.target.checked }))}
                className="w-5 h-5 rounded text-red-500"
              />
              <span>มีไข้</span>
            </label>
            {form.fever && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="36.0"
                  max="42.0"
                  value={form.feverTemp}
                  onChange={(e) => {
                    const value = e.target.value;
                    setForm((prev: any) => ({ ...prev, feverTemp: value }));
                  }}
                  placeholder="อุณหภูมิ (°C)"
                  className="w-28 p-2 border border-gray-200 rounded-lg text-sm"
                />
                <span className="text-sm text-gray-500">°C</span>
              </div>
            )}
          </div>
        </div>

        {/* Current Medications */}
        <div className="p-4 bg-green-50 rounded-xl border border-green-200">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Pill className="w-5 h-5 text-green-600" />
            ยาที่กำลังใช้อยู่
          </h4>
          <textarea
            value={form.currentMedications}
            onChange={(e) => setForm((prev: any) => ({ ...prev, currentMedications: e.target.value }))}
            placeholder="ระบุยาที่กำลังใช้อยู่ (ถ้ามี) เช่น พาราเซตามอล 500 มก. วันละ 3 ครั้ง"
            className="w-full p-3 border border-gray-200 rounded-xl h-20 resize-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Allergies */}
        <div className="p-4 bg-red-50 rounded-xl border border-red-200">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            ประวัติแพ้ยา/อาหาร
          </h4>
          <input
            type="text"
            value={form.allergies}
            onChange={(e) => setForm((prev: any) => ({ ...prev, allergies: e.target.value }))}
            placeholder="ระบุประวัติการแพ้ (ถ้ามี) เช่น แพ้ยาเพนิซิลิน, แพ้อาหารทะเล"
            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
          />
        </div>

        {/* Previous Treatment */}
        <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-yellow-600" />
            การรักษาที่เคยได้รับ
          </h4>
          <textarea
            value={form.previousTreatment}
            onChange={(e) => setForm((prev: any) => ({ ...prev, previousTreatment: e.target.value }))}
            placeholder="เคยรักษาอาการนี้มาก่อนหรือไม่ อย่างไร เช่น เคยไปพบแพทย์เมื่อ 1 สัปดาห์ก่อน ได้รับยาแก้ปวด"
            className="w-full p-3 border border-gray-200 rounded-xl h-20 resize-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
      </div>
    </div>
  );
}

type AiAnalysisSectionProps = Readonly<{
  canProceedStep2: boolean;
  aiAnalyzing: boolean;
  analyzeSymptoms: () => void;
  showAiAnalysis: boolean;
  aiAnalysis: any;
  hasTextInput: boolean;
  hasVoiceInput: boolean;
  hasImageInput: boolean;
}>;

function AiAnalysisSection({
  canProceedStep2,
  aiAnalyzing,
  analyzeSymptoms,
  showAiAnalysis,
  aiAnalysis,
  hasTextInput,
  hasVoiceInput,
  hasImageInput
}: AiAnalysisSectionProps) {
  if (!canProceedStep2) return null;

  const triage = getTriageMeta(aiAnalysis?.triageLevel);
  const sourceParts = [
    { label: 'ข้อความ', has: hasTextInput },
    { label: 'เสียง', has: hasVoiceInput },
    { label: 'รูปภาพ', has: hasImageInput }
  ].map((source) => `${source.label}${source.has ? '✓' : ''}`);

  return (
    <div className="bg-gradient-to-r from-purple-100 to-indigo-100 rounded-xl p-6 border border-purple-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-purple-900">AI วิเคราะห์อาการ</h3>
            <p className="text-xs text-purple-700">วิเคราะห์จาก: {sourceParts.join(' | ')}</p>
          </div>
        </div>
        <button
          onClick={analyzeSymptoms}
          disabled={aiAnalyzing}
          className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-md font-medium"
        >
          {aiAnalyzing ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              กำลังวิเคราะห์...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              วิเคราะห์อาการ
            </>
          )}
        </button>
      </div>

      {/* AI Analysis Results */}
      {showAiAnalysis && aiAnalysis && (
        <div className="mt-4 pt-4 border-t border-purple-300 space-y-4">
          {/* Triage Level */}
          <div className={`p-4 rounded-xl ${triage.container}`}>
            <p className="text-sm font-medium mb-1">ระดับความเร่งด่วน:</p>
            <p className={`font-bold text-lg ${triage.text}`}>{triage.long}</p>
          </div>

          {/* Reasoning */}
          <div className="bg-white/80 p-4 rounded-xl">
            <p className="text-sm font-medium text-purple-800 mb-2">การวิเคราะห์:</p>
            <p className="text-sm text-gray-700">{aiAnalysis.reasoning}</p>
          </div>

          {/* Self Care Recommendations */}
          {aiAnalysis.selfCareRecommendations && aiAnalysis.selfCareRecommendations.length > 0 && (
            <div className="bg-white/80 p-4 rounded-xl">
              <p className="text-sm font-medium text-purple-800 mb-2">คำแนะนำเบื้องต้น:</p>
              <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                {aiAnalysis.selfCareRecommendations.map((rec: string) => (
                  <li key={rec}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warning Signs */}
          {aiAnalysis.warningSigns && aiAnalysis.warningSigns.length > 0 && (
            <div className="bg-red-50 p-4 rounded-xl border border-red-200">
              <p className="text-sm font-medium text-red-800 mb-2">⚠️ อาการที่ต้องระวัง:</p>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {aiAnalysis.warningSigns.map((sign: string) => (
                  <li key={sign}>{sign}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-xs text-gray-500 italic">
            * การวิเคราะห์นี้เป็นเพียงการประเมินเบื้องต้นจาก AI ไม่ใช่การวินิจฉัยทางการแพทย์
          </p>
        </div>
      )}
    </div>
  );
}

export default function SymptomInputStep({
  form,
  setForm,
  commonSymptoms,
  isRecording,
  recordingTime,
  isPlaying,
  startRecording,
  stopRecording,
  deleteRecording,
  togglePlayback,
  formatTime,
  audioRef,
  fileInputRef,
  cameraInputRef,
  handleImageUpload,
  removeImage,
  canProceedStep2,
  aiAnalyzing,
  aiAnalysis,
  showAiAnalysis,
  analyzeSymptoms,
  aiSuggesting,
  aiSuggestions,
  suggestSymptoms,
  setStep,
}: SymptomInputStepProps) {
  const [activeInputTab, setActiveInputTab] = useState<InputTab>('text');

  // Summary of what has been inputted for AI
  const hasTextInput = form.mainSymptom.trim() !== '' || form.symptomDescription.trim() !== '';
  const hasVoiceInput = form.audioBlob !== null;
  const hasImageInput = form.images.length > 0;

  const inputTabs: InputTabConfig[] = [
    { id: 'text', label: 'พิมพ์ข้อความ', icon: FileText, color: 'blue', hasInput: hasTextInput },
    { id: 'voice', label: 'อัดเสียง', icon: Mic, color: 'indigo', hasInput: hasVoiceInput },
    { id: 'image', label: 'แนบรูปภาพ', icon: ImageIcon, color: 'purple', hasInput: hasImageInput }
  ];

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-emerald-600 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-emerald-800">กรุณาอธิบายอาการอย่างละเอียด</p>
          <p className="text-xs text-emerald-600 mt-1">เลือกวิธีที่สะดวก: พิมพ์ข้อความ, อัดเสียง หรือแนบรูปภาพ - AI จะวิเคราะห์ข้อมูลทั้งหมดรวมกัน</p>
        </div>
      </div>

      {/* Input Method Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {inputTabs.map((tab) => {
            const isActive = activeInputTab === tab.id;
            const style = tabStyles[tab.color];
            const buttonClassName = [
              'flex-1 flex items-center justify-center gap-2 py-4 px-3 font-medium text-sm transition-all relative',
              isActive ? style.active : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            ].join(' ');
            const iconClassName = `w-5 h-5 ${isActive ? style.icon : ''}`;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveInputTab(tab.id)}
                className={buttonClassName}
              >
                <tab.icon className={iconClassName} />
                <span className="hidden sm:inline">{tab.label}</span>
                {tab.hasInput && (
                  <CheckCircle2 className="w-4 h-4 text-green-500 absolute top-2 right-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* TEXT INPUT TAB */}
          {activeInputTab === 'text' && (
            <TextInputTab
              form={form}
              setForm={setForm}
              commonSymptoms={commonSymptoms}
              aiSuggestions={aiSuggestions}
              aiSuggesting={aiSuggesting}
              suggestSymptoms={suggestSymptoms}
              hasTextInput={hasTextInput}
              aiAnalysis={aiAnalysis}
              showAiAnalysis={showAiAnalysis}
            />
          )}

          {/* VOICE INPUT TAB */}
          {activeInputTab === 'voice' && (
            <VoiceInputTab
              form={form}
              isRecording={isRecording}
              recordingTime={recordingTime}
              isPlaying={isPlaying}
              startRecording={startRecording}
              stopRecording={stopRecording}
              deleteRecording={deleteRecording}
              togglePlayback={togglePlayback}
              formatTime={formatTime}
              audioRef={audioRef}
            />
          )}

          {/* IMAGE INPUT TAB */}
          {activeInputTab === 'image' && (
            <ImageInputTab
              form={form}
              fileInputRef={fileInputRef}
              cameraInputRef={cameraInputRef}
              handleImageUpload={handleImageUpload}
              removeImage={removeImage}
              hasImageInput={hasImageInput}
            />
          )}
        </div>
      </div>

      {/* Input Summary - What AI will analyze */}
      <InputSummary
        hasTextInput={hasTextInput}
        hasVoiceInput={hasVoiceInput}
        hasImageInput={hasImageInput}
        imageCount={form.images.length}
      />

      {/* Structured Medical Information Boxes */}
      <MedicalInfoSection form={form} setForm={setForm} />

      {/* AI Analysis Section */}
      <AiAnalysisSection
        canProceedStep2={canProceedStep2}
        aiAnalyzing={aiAnalyzing}
        analyzeSymptoms={analyzeSymptoms}
        showAiAnalysis={showAiAnalysis}
        aiAnalysis={aiAnalysis}
        hasTextInput={hasTextInput}
        hasVoiceInput={hasVoiceInput}
        hasImageInput={hasImageInput}
      />

      {/* Next Button */}
      <button
        onClick={() => {
          globalThis.scrollTo({ top: 0, behavior: 'smooth' });
          setStep(2);
        }}
        disabled={!canProceedStep2}
        className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg flex items-center justify-center gap-2"
      >
        ถัดไป - เลือกเวลาและแพทย์
        <CheckCircle2 className="w-5 h-5" />
      </button>
    </div>
  );
}
