/**
 * Medical Content Library - Patient Portal
 * Health Education Resources for Patients
 * Read-only view of medical content published by doctors
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../../contexts/SettingsContext';

// In production, use relative URLs (proxied by nginx)
// In development, use relative URLs (proxied by vite) 
const API_BASE = '';

// Types
interface MedicalContentArticle {
  id: string;
  title: string;
  titleTh?: string;
  summary?: string;
  summaryTh?: string;
  content: string;
  contentTh?: string;
  category: string;
  type: 'article' | 'video' | 'guide' | 'infographic';
  thumbnail?: string;
  videoUrl?: string;
  tags?: string[];
  isFeatured?: boolean;
  status: 'draft' | 'published' | 'archived';
  viewCount?: number;
  readTime?: number;
  createdBy?: string;
  authorName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface ContentCategory {
  id: string;
  name: string;
  nameTh: string;
  icon: string;
  description?: string;
}

// Constants
const CATEGORIES: ContentCategory[] = [
  { id: 'general-health', name: 'General Health', nameTh: 'สุขภาพทั่วไป', icon: '🏥' },
  { id: 'nutrition', name: 'Nutrition', nameTh: 'โภชนาการ', icon: '🥗' },
  { id: 'exercise', name: 'Exercise', nameTh: 'การออกกำลังกาย', icon: '🏃' },
  { id: 'mental-health', name: 'Mental Health', nameTh: 'สุขภาพจิต', icon: '🧠' },
  { id: 'chronic-disease', name: 'Chronic Disease', nameTh: 'โรคเรื้อรัง', icon: '💊' },
  { id: 'preventive-care', name: 'Preventive Care', nameTh: 'การดูแลป้องกัน', icon: '🛡️' },
  { id: 'medications', name: 'Medications', nameTh: 'ยาและการใช้ยา', icon: '💉' },
  { id: 'first-aid', name: 'First Aid', nameTh: 'ปฐมพยาบาล', icon: '🩹' },
];

const CONTENT_TYPES = [
  { value: 'all', label: 'ทุกประเภท', icon: '📁' },
  { value: 'article', label: 'บทความ', icon: '📄' },
  { value: 'video', label: 'วิดีโอ', icon: '🎥' },
  { value: 'guide', label: 'คู่มือ', icon: '📚' },
  { value: 'infographic', label: 'อินโฟกราฟิก', icon: '📊' },
];

// Icons
const SearchIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const BookOpenIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const ClockIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const XMarkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Main Component
const MedicalContentLibrary: React.FC = () => {
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  
  const labels = {
    title: { en: 'Health Knowledge Library', th: 'คลังความรู้สุขภาพ' },
    subtitle: { en: 'Medical Content Library - Your trusted health resource', th: 'Medical Content Library - แหล่งความรู้เพื่อสุขภาพที่ดีของคุณ' },
    loading: { en: 'Loading medical content...', th: 'กำลังโหลดเนื้อหาทางการแพทย์...' },
    retry: { en: 'Try again', th: 'ลองใหม่อีกครั้ง' },
    featured: { en: '✨ Featured Content', th: '✨ เนื้อหาแนะนำ' },
    readTime: { en: 'min read', th: 'นาที' },
    search: { en: 'Search content...', th: 'ค้นหาเนื้อหา...' },
    allCategories: { en: 'All Categories', th: 'ทุกหมวดหมู่' },
    all: { en: 'All', th: 'ทั้งหมด' },
    noContent: { en: 'No content found', th: 'ไม่พบเนื้อหา' },
    noContentHint: { en: 'Try searching with different keywords or change category', th: 'ลองค้นหาด้วยคำอื่น หรือเปลี่ยนหมวดหมู่' },
    noContentYet: { en: 'No content available yet', th: 'ยังไม่มีเนื้อหาในระบบ' },
    close: { en: 'Close', th: 'ปิด' },
    timeout: { en: 'Connection timeout. Please try again.', th: 'การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง' },
    errorLoading: { en: 'Error loading content', th: 'เกิดข้อผิดพลาดในการโหลดเนื้อหา' },
  };
  
  const [content, setContent] = useState<MedicalContentArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  // Modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<MedicalContentArticle | null>(null);

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch from patient portal API with timeout and retry
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

      const response = await fetch(`${API_BASE}/api/content/medical`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch medical content (${response.status})`);
      }

      const data = await response.json();
      // API already filters to published content
      setContent(data.articles || []);
    } catch (err) {
      console.error('Error fetching content:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        setError('การเชื่อมต่อหมดเวลา กรุณาลองใหม่อีกครั้ง');
      } else {
        setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการโหลดเนื้อหา');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const filteredContent = content.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.titleTh?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summaryTh?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesType = selectedType === 'all' || item.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const featuredContent = content.filter((item) => item.isFeatured);

  const handleViewArticle = (article: MedicalContentArticle) => {
    setSelectedArticle(article);
    setShowViewModal(true);
  };

  const getCategoryInfo = (categoryId: string) => {
    return CATEGORIES.find((c) => c.id === categoryId) || { name: categoryId, nameTh: categoryId, icon: '📄' };
  };

  const getTypeIcon = (type: string) => {
    const typeInfo = CONTENT_TYPES.find((t) => t.value === type);
    return typeInfo?.icon || '📄';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${isDark ? 'bg-gray-900' : ''}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{labels.loading[language]}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-3 rounded-xl ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-100'}`}>
            <BookOpenIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{labels.title[language]}</h1>
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>{labels.subtitle[language]}</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`mb-6 p-4 rounded-xl border ${isDark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'}`}>
          <p className={isDark ? 'text-red-300' : 'text-red-600'}>{error}</p>
          <button
            onClick={fetchContent}
            className={`mt-2 text-sm underline ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-700 hover:text-red-800'}`}
          >
            {labels.retry[language]}
          </button>
        </div>
      )}

      {/* Featured Content Section */}
      {featuredContent.length > 0 && (
        <div className="mb-8">
          <h2 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>{labels.featured[language]}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredContent.slice(0, 3).map((article) => (
              <div
                key={article.id}
                role="button"
                tabIndex={0}
                onClick={() => handleViewArticle(article)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleViewArticle(article); } }}
                className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white cursor-pointer hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-2xl">{getTypeIcon(article.type)}</span>
                  <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    {language === 'th' ? getCategoryInfo(article.category).nameTh : getCategoryInfo(article.category).name}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{language === 'th' ? (article.titleTh || article.title) : article.title}</h3>
                <p className="text-emerald-100 text-sm line-clamp-2">
                  {language === 'th' ? (article.summaryTh || article.summary) : article.summary}
                </p>
                {article.readTime && (
                  <div className="mt-4 flex items-center gap-1 text-xs text-emerald-100">
                    <ClockIcon className="w-4 h-4" />
                    <span>{article.readTime} {labels.readTime[language]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`rounded-xl shadow-sm p-4 mb-6 ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={labels.search[language]}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-200'}`}
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'}`}
          >
            <option value="all">{labels.allCategories[language]}</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {language === 'th' ? cat.nameTh : cat.name}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200'}`}
          >
            {CONTENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.icon} {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Category Quick Links */}
      <div className="mb-6 overflow-x-auto">
        <div className="flex gap-2 pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${selectedCategory === 'all'
                ? 'bg-emerald-600 text-white'
                : isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-emerald-50'
              }`}
          >
            {labels.all[language]}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${selectedCategory === cat.id
                  ? 'bg-emerald-600 text-white'
                  : isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-white text-gray-700 hover:bg-emerald-50'
                }`}
            >
              {cat.icon} {language === 'th' ? cat.nameTh : cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {filteredContent.length === 0 ? (
        <div className={`text-center py-12 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
          <BookOpenIcon className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
          <h3 className={`text-lg font-medium mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{labels.noContent[language]}</h3>
          <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
            {searchTerm ? labels.noContentHint[language] : labels.noContentYet[language]}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.map((article) => (
            <div
              key={article.id}
              role="button"
              tabIndex={0}
              onClick={() => handleViewArticle(article)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleViewArticle(article); } }}
              className={`rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${isDark ? 'bg-gray-800' : 'bg-white'}`}
            >
              {/* Thumbnail */}
              <div className={`relative h-48 ${isDark ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-gray-100 to-gray-200'}`}>
                {article.thumbnail ? (
                  <img
                    src={article.thumbnail}
                    alt={article.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-6xl">{getTypeIcon(article.type)}</span>
                  </div>
                )}
                {article.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <PlayIcon className="w-16 h-16 text-white" />
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${isDark ? 'bg-gray-900/80 text-white' : 'bg-white/90'}`}>
                    {getCategoryInfo(article.category).icon} {language === 'th' ? getCategoryInfo(article.category).nameTh : getCategoryInfo(article.category).name}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className={`font-semibold mb-2 line-clamp-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {language === 'th' ? (article.titleTh || article.title) : article.title}
                </h3>
                <p className={`text-sm line-clamp-2 mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                  {language === 'th' ? (article.summaryTh || article.summary) : article.summary}
                </p>

                {/* Tags */}
                {article.tags && article.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {article.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className={`px-2 py-0.5 text-xs rounded-full ${isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Meta */}
                <div className={`flex items-center justify-between text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <div className="flex items-center gap-3">
                    {article.readTime && (
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-4 h-4" />
                        {article.readTime} {labels.readTime[language]}
                      </span>
                    )}
                    {article.viewCount !== undefined && (
                      <span className="flex items-center gap-1">
                        <EyeIcon className="w-4 h-4" />
                        {article.viewCount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  <span>{formatDate(article.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedArticle && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
            {/* Modal Header */}
            <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{getTypeIcon(selectedArticle.type)}</span>
                <span className={`px-2 py-1 rounded-full text-sm ${isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700'}`}>
                  {language === 'th' ? getCategoryInfo(selectedArticle.category).nameTh : getCategoryInfo(selectedArticle.category).name}
                </span>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className={`p-2 rounded-full ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100'}`}
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Thumbnail/Video */}
              {selectedArticle.type === 'video' && selectedArticle.videoUrl ? (
                <div className="aspect-video mb-6 bg-black rounded-lg overflow-hidden">
                  <iframe
                    src={selectedArticle.videoUrl}
                    className="w-full h-full"
                    allowFullScreen
                    title={selectedArticle.title}
                  />
                </div>
              ) : selectedArticle.thumbnail ? (
                <img
                  src={selectedArticle.thumbnail}
                  alt={selectedArticle.title}
                  className="w-full h-64 object-cover rounded-lg mb-6"
                />
              ) : null}

              {/* Title */}
              <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {language === 'th' ? (selectedArticle.titleTh || selectedArticle.title) : selectedArticle.title}
              </h1>
              {selectedArticle.titleTh && selectedArticle.title !== selectedArticle.titleTh && (
                <p className={`mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{language === 'en' ? selectedArticle.titleTh : selectedArticle.title}</p>
              )}

              {/* Meta Info */}
              <div className={`flex flex-wrap items-center gap-4 text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {selectedArticle.authorName && (
                  <span>{language === 'th' ? 'โดย:' : 'By:'} {selectedArticle.authorName}</span>
                )}
                <span>{language === 'th' ? 'เผยแพร่:' : 'Published:'} {formatDate(selectedArticle.createdAt)}</span>
                {selectedArticle.readTime && (
                  <span className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    {selectedArticle.readTime} {labels.readTime[language]}
                  </span>
                )}
                {selectedArticle.viewCount !== undefined && (
                  <span className="flex items-center gap-1">
                    <EyeIcon className="w-4 h-4" />
                    {selectedArticle.viewCount.toLocaleString()} {language === 'th' ? 'ครั้ง' : 'views'}
                  </span>
                )}
              </div>

              {/* Tags */}
              {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {selectedArticle.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className={`px-3 py-1 text-sm rounded-full ${isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700'}`}
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Summary */}
              {(selectedArticle.summaryTh || selectedArticle.summary) && (
                <div className={`p-4 rounded-lg mb-6 ${isDark ? 'bg-emerald-900/30' : 'bg-emerald-50'}`}>
                  <p className={`font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                    {language === 'th' ? (selectedArticle.summaryTh || selectedArticle.summary) : selectedArticle.summary}
                  </p>
                </div>
              )}

              {/* Main Content */}
              <div className={`prose max-w-none ${isDark ? 'prose-invert' : 'prose-emerald'}`}>
                <div
                  dangerouslySetInnerHTML={{
                    __html: (language === 'th' ? (selectedArticle.contentTh || selectedArticle.content || '') : (selectedArticle.content || ''))
                      .replaceAll('\n', '<br />')
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50'}`}>
              <button
                onClick={() => setShowViewModal(false)}
                className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                {labels.close[language]}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalContentLibrary;
