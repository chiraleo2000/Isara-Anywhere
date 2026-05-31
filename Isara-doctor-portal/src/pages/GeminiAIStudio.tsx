import React, { useState, useEffect } from 'react';
import { geminiClinicalService } from '../services/geminiClinicalService';
import { ChatMessage } from '../types';

export const GeminiAIStudio: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'calculators'>('chat');
  const [isApiConfigured, setIsApiConfigured] = useState(
    () => geminiClinicalService.isApiConfigured(),
  );

  const [bmiInputs, setBmiInputs] = useState({ weight: '', height: '' });
  const [gfrInputs, setGfrInputs] = useState({ creatinine: '', age: '', gender: 'male', race: 'other' });

  // Check API configuration on mount
  useEffect(() => {
    geminiClinicalService
      .checkConfiguration()
      .then((configured) => {
        setIsApiConfigured(configured);
      })
      .catch(() => {
        const fallback = geminiClinicalService.isApiConfigured();
        setIsApiConfigured(fallback);
      });
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await geminiClinicalService.askMedicalQuestion(input);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.suggestions[0],
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      console.error('AI chat error:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `เกิดข้อผิดพลาด: ${error.message || 'ไม่สามารถติดต่อ AI ได้'}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const calculateBMI = () => {
    const weight = Number.parseFloat(bmiInputs.weight);
    const height = Number.parseFloat(bmiInputs.height);

    if (!weight || !height) {
      alert('กรุณากรอกน้ำหนักและส่วนสูง');
      return;
    }

    const result = geminiClinicalService.calculateBMI(weight, height);

    alert(`BMI: ${result.value}\nหมวด: ${result.category}\nคำอธิบาย: ${result.interpretation}`);
  };

  const calculateGFR = () => {
    const creatinine = Number.parseFloat(gfrInputs.creatinine);
    const age = Number.parseInt(gfrInputs.age, 10);

    if (!creatinine || !age) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    const result = geminiClinicalService.calculateGFR(
      creatinine,
      age,
      gfrInputs.gender as 'male' | 'female',
      gfrInputs.race as 'black' | 'other'
    );

    alert(
      `eGFR: ${result.value} mL/min/1.73m²\nระดับ: ${result.category}\nคำอธิบาย: ${result.interpretation}`
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <span className="text-3xl mr-3">🤖</span>{' '}
              Gemini AI Studio
            </h1>
            <p className="text-gray-600 mt-1">ผู้ช่วยทางการแพทย์ด้วย AI</p>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
            isApiConfigured 
              ? 'bg-green-100 text-green-700' 
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isApiConfigured ? 'bg-green-500' : 'bg-yellow-500'
            }`} />
            {isApiConfigured ? 'API Connected' : 'API Not Configured'}
          </div>
        </div>
        {!isApiConfigured && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            ⚠️ Gemini is not configured in browser or server runtime. Local dev can use{' '}
            <code className="bg-yellow-100 px-1 rounded">VITE_GEMINI_API_KEY</code>; cloud should set server{' '}
            <code className="bg-yellow-100 px-1 rounded">GEMINI_API_KEY</code>.
          </div>
        )}
      </div>

      {/* Clinical Resources Link */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-xl p-6">
        <div className="flex items-start space-x-4">
          <div className="text-4xl">📚</div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-indigo-900 mb-2">Looking for Clinical Guidelines & Research Papers?</h3>
            <p className="text-sm text-indigo-700 mb-4">
              Access comprehensive medical literature, evidence-based guidelines, and the latest research papers in our{' '}<strong>Clinical Resources</strong>{' '}section.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-indigo-600">
              <div>• Diagnosis & Differential Guidelines</div>
              <div>• Treatment Protocols</div>
              <div>• System-Based Reports</div>
              <div>• Radiological Imaging</div>
              <div>• Laboratory Interpretation</div>
              <div>• Pathology Reports</div>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              💡 Navigate to{' '}<strong>Clinical Resources</strong>{' '}in the main menu to access all medical guidelines and study materials.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-4 px-6 font-medium text-center ${
                activeTab === 'chat'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              💬 Medical Q&A
            </button>
            <button
              onClick={() => setActiveTab('calculators')}
              className={`flex-1 py-4 px-6 font-medium text-center ${
                activeTab === 'calculators'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🧮 Medical Calculators
            </button>
          </nav>
        </div>

        {/* Chat Tab */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-[calc(100vh-300px)]">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500 mb-4">ถามคำถามทางการแพทย์กับ Gemini AI</p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>ตัวอย่างคำถาม:</p>
                    <p>"แนะนำการรักษา Hypertension ในผู้ป่วยเบาหวาน"</p>
                    <p>"ข้อบ่งชี้และข้อห้ามของ Metformin"</p>
                    <p>"อาการของ Acute MI"</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-3xl rounded-lg p-4 ${
                        msg.role === 'user'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                      <p className="text-xs mt-2 opacity-70">
                        {new Date(msg.timestamp).toLocaleTimeString('th-TH')}
                      </p>
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
                      <span className="text-gray-600">Gemini กำลังคิด...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t p-4 bg-gray-50">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="พิมพ์คำถามทางการแพทย์..."
                  aria-label="พิมพ์คำถามทางการแพทย์"
                  className="flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  disabled={loading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={loading || !input.trim()}
                  className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold disabled:bg-gray-400"
                >
                  ส่ง
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Calculators Tab */}
        {activeTab === 'calculators' && (
          <div className="p-6 space-y-6">
            {/* BMI Calculator */}
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">BMI Calculator</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="bmi-weight" className="block text-sm font-medium text-gray-700 mb-1">
                    น้ำหนัก (kg)
                  </label>
                  <input
                    id="bmi-weight"
                    type="number"
                    value={bmiInputs.weight}
                    onChange={(e) => setBmiInputs({ ...bmiInputs, weight: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="70"
                  />
                </div>
                <div>
                  <label htmlFor="bmi-height" className="block text-sm font-medium text-gray-700 mb-1">
                    ส่วนสูง (cm)
                  </label>
                  <input
                    id="bmi-height"
                    type="number"
                    value={bmiInputs.height}
                    onChange={(e) => setBmiInputs({ ...bmiInputs, height: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="170"
                  />
                </div>
              </div>
              <button
                onClick={calculateBMI}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                คำนวณ BMI
              </button>
            </div>

            {/* GFR Calculator */}
            <div className="border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">eGFR Calculator (CKD-EPI)</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label htmlFor="gfr-creatinine" className="block text-sm font-medium text-gray-700 mb-1">
                    Creatinine (mg/dL)
                  </label>
                  <input
                    id="gfr-creatinine"
                    type="number"
                    step="0.01"
                    value={gfrInputs.creatinine}
                    onChange={(e) => setGfrInputs({ ...gfrInputs, creatinine: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="1.0"
                  />
                </div>
                <div>
                  <label htmlFor="gfr-age" className="block text-sm font-medium text-gray-700 mb-1">อายุ (ปี)</label>
                  <input
                    id="gfr-age"
                    type="number"
                    value={gfrInputs.age}
                    onChange={(e) => setGfrInputs({ ...gfrInputs, age: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                    placeholder="50"
                  />
                </div>
                <div>
                  <label htmlFor="gfr-gender" className="block text-sm font-medium text-gray-700 mb-1">เพศ</label>
                  <select
                    id="gfr-gender"
                    value={gfrInputs.gender}
                    onChange={(e) => setGfrInputs({ ...gfrInputs, gender: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="male">ชาย</option>
                    <option value="female">หญิง</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="gfr-race" className="block text-sm font-medium text-gray-700 mb-1">เชื้อชาติ</label>
                  <select
                    id="gfr-race"
                    value={gfrInputs.race}
                    onChange={(e) => setGfrInputs({ ...gfrInputs, race: e.target.value })}
                    className="w-full p-2 border rounded-lg"
                  >
                    <option value="other">อื่นๆ</option>
                    <option value="black">แอฟริกัน</option>
                  </select>
                </div>
              </div>
              <button
                onClick={calculateGFR}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                คำนวณ eGFR
              </button>
            </div>

            {/* More Calculators */}
            <div className="grid grid-cols-2 gap-4">
              <button className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-purple-500 hover:text-purple-600">
                <p className="font-semibold">CHADS₂-VASc Score</p>
                <p className="text-sm text-gray-600 mt-1">Stroke risk in AF</p>
              </button>
              <button className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-purple-500 hover:text-purple-600">
                <p className="font-semibold">Framingham Risk Score</p>
                <p className="text-sm text-gray-600 mt-1">CVD risk assessment</p>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GeminiAIStudio;
