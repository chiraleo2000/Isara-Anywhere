/**
 * Medical Content Library - Patient Portal
 * Health Education Resources for Patients
 * Read-only view of medical content published by doctors
 * 
 * Refactored: Extracted sub-components to reduce cognitive complexity (S3776)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSettings, type Language } from '../../contexts/SettingsContext';
import { useRealtimeSync } from '../../lib/useRealtimeSync';

// In production, use relative URLs (proxied by nginx)
// In development, use relative URLs (proxied by vite) 
const API_BASE = '';

// ─── Types ───

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

type LangKey = Language;

interface ContentCardProps {
  article: MedicalContentArticle;
  isDark: boolean;
  language: string;
  onClick: () => void;
}

// ─── Constants ───

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

// i18n Labels (module-level to reduce component cognitive complexity)
const LABELS: Record<string, Record<LangKey, string>> = {
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

// ─── Icons ───

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

// ─── Module-level helpers (reduce main component CC) ───

function getCategoryBtnClass(isActive: boolean, isDark: boolean): string {
  if (isActive) return 'bg-emerald-600 text-white';
  if (isDark) return 'bg-gray-800 text-gray-300 hover:bg-gray-700';
  return 'bg-white text-gray-700 hover:bg-emerald-50';
}

function getCategoryInfo(categoryId: string) {
  return CATEGORIES.find((c) => c.id === categoryId) || { name: categoryId, nameTh: categoryId, icon: '📄' };
}

function getTypeIcon(type: string): string {
  return CONTENT_TYPES.find((t) => t.value === type)?.icon || '📄';
}

function formatDate(dateString: string | undefined, language: string): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function localizedText(text: string | undefined, textTh: string | undefined, language: string): string {
  return language === 'th' ? (textTh || text || '') : (text || '');
}

function getCategoryDisplayName(cat: { name: string; nameTh: string }, language: string): string {
  return language === 'th' ? cat.nameTh : cat.name;
}

function filterContent(
  items: MedicalContentArticle[],
  searchTerm: string,
  selectedCategory: string,
  selectedType: string,
): MedicalContentArticle[] {
  const term = searchTerm.toLowerCase();
  return items.filter((item) => {
    const matchesSearch = !searchTerm
      || item.title.toLowerCase().includes(term)
      || item.titleTh?.toLowerCase().includes(term)
      || item.summary?.toLowerCase().includes(term)
      || item.summaryTh?.toLowerCase().includes(term)
      || item.tags?.some((tag) => tag.toLowerCase().includes(term));
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesType = selectedType === 'all' || item.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });
}

// ─── Extracted Sub-Components ───

function FeaturedCard({ article, language, onClick }: Readonly<ContentCardProps>) {
  const catInfo = getCategoryInfo(article.category);
  const title = localizedText(article.title, article.titleTh, language);
  const summary = localizedText(article.summary, article.summaryTh, language);
  const lang = language;

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="content-item"
      className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-6 text-white text-left cursor-pointer hover:shadow-lg transition-shadow"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{getTypeIcon(article.type)}</span>
        <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
          {getCategoryDisplayName(catInfo, language)}
        </span>
      </div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-emerald-100 text-sm line-clamp-2">{summary}</p>
      {article.readTime && (
        <div className="mt-4 flex items-center gap-1 text-xs text-emerald-100">
          <ClockIcon className="w-4 h-4" />
          <span>{article.readTime} {LABELS.readTime[lang]}</span>
        </div>
      )}
    </button>
  );
}

function ContentCard({ article, isDark, language, onClick }: Readonly<ContentCardProps>) {
  const catInfo = getCategoryInfo(article.category);
  const title = localizedText(article.title, article.titleTh, language);
  const summary = localizedText(article.summary, article.summaryTh, language);
  const lang = language;

  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const thumbGradient = isDark ? 'bg-gradient-to-br from-gray-700 to-gray-800' : 'bg-gradient-to-br from-gray-100 to-gray-200';
  const badgeBg = isDark ? 'bg-gray-900/80 text-white' : 'bg-white/90';
  const titleCls = isDark ? 'text-white' : 'text-gray-900';
  const summaryCls = isDark ? 'text-gray-400' : 'text-gray-600';
  const tagCls = isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700';
  const metaCls = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid="content-item"
      className={`content-item card rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer text-left ${cardBg}`}
    >
      {/* Thumbnail */}
      <div className={`relative h-48 ${thumbGradient}`}>
        {article.thumbnail ? (
          <img src={article.thumbnail} alt={article.title} className="w-full h-full object-cover" />
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
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badgeBg}`}>
            {catInfo.icon} {getCategoryDisplayName(catInfo, language)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className={`font-semibold mb-2 line-clamp-2 ${titleCls}`}>{title}</h3>
        <p className={`text-sm line-clamp-2 mb-3 ${summaryCls}`}>{summary}</p>

        {/* Tags */}
        {article.tags && article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {article.tags.slice(0, 3).map((tag) => (
              <span key={`tag-${tag}`} className={`px-2 py-0.5 text-xs rounded-full ${tagCls}`}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div className={`flex items-center justify-between text-xs ${metaCls}`}>
          <div className="flex items-center gap-3">
            {article.readTime && (
              <span className="flex items-center gap-1">
                <ClockIcon className="w-4 h-4" />
                {article.readTime} {LABELS.readTime[lang]}
              </span>
            )}
            {article.viewCount !== undefined && (
              <span className="flex items-center gap-1">
                <EyeIcon className="w-4 h-4" />
                {article.viewCount.toLocaleString()}
              </span>
            )}
          </div>
          <span>{formatDate(article.createdAt, language)}</span>
        </div>
      </div>
    </button>
  );
}

// Modal i18n (lookup table to avoid ternaries)
const MODAL_LABELS = {
  th: { by: 'โดย:', published: 'เผยแพร่:', views: 'ครั้ง' },
  en: { by: 'By:', published: 'Published:', views: 'views' },
};

function ArticleModalBody({ article, isDark, language }: Readonly<{
  article: MedicalContentArticle;
  isDark: boolean;
  language: string;
}>) {
  const title = localizedText(article.title, article.titleTh, language);
  const summary = localizedText(article.summary, article.summaryTh, language);
  const mainContent = localizedText(article.content, article.contentTh, language);
  const lang = language;
  const ml = MODAL_LABELS[lang];
  const hasAltTitle = article.titleTh && article.title !== article.titleTh;
  const altTitle = language === 'en' ? article.titleTh : article.title;
  const showVideo = article.type === 'video' && article.videoUrl;
  const showThumbnail = !showVideo && article.thumbnail;

  const titleCls = isDark ? 'text-white' : 'text-gray-900';
  const subtitleCls = isDark ? 'text-gray-400' : 'text-gray-500';
  const metaCls = isDark ? 'text-gray-400' : 'text-gray-500';
  const tagCls = isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700';
  const summaryBgCls = isDark ? 'bg-emerald-900/30' : 'bg-emerald-50';
  const summaryTextCls = isDark ? 'text-gray-200' : 'text-gray-700';
  const proseCls = isDark ? 'prose-invert' : 'prose-emerald';

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {showVideo && (
        <div className="aspect-video mb-6 bg-black rounded-lg overflow-hidden">
          <iframe src={article.videoUrl} className="w-full h-full" allowFullScreen title={article.title} />
        </div>
      )}
      {showThumbnail && (
        <img src={article.thumbnail} alt={article.title} className="w-full h-64 object-cover rounded-lg mb-6" />
      )}

      <h1 className={`text-2xl font-bold mb-2 ${titleCls}`}>{title}</h1>
      {hasAltTitle && <p className={`mb-4 ${subtitleCls}`}>{altTitle}</p>}

      <div className={`flex flex-wrap items-center gap-4 text-sm mb-6 ${metaCls}`}>
        {article.authorName && <span>{ml.by} {article.authorName}</span>}
        <span>{ml.published} {formatDate(article.createdAt, language)}</span>
        {article.readTime && (
          <span className="flex items-center gap-1">
            <ClockIcon className="w-4 h-4" />
            {article.readTime} {LABELS.readTime[lang]}
          </span>
        )}
        {article.viewCount !== undefined && (
          <span className="flex items-center gap-1">
            <EyeIcon className="w-4 h-4" />
            {article.viewCount.toLocaleString()} {ml.views}
          </span>
        )}
      </div>

      {article.tags && article.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {article.tags.map((tag) => (
            <span key={`tag-${tag}`} className={`px-3 py-1 text-sm rounded-full ${tagCls}`}>#{tag}</span>
          ))}
        </div>
      )}

      {(article.summaryTh || article.summary) && (
        <div className={`p-4 rounded-lg mb-6 ${summaryBgCls}`}>
          <p className={`font-medium ${summaryTextCls}`}>{summary}</p>
        </div>
      )}

      <div className={`prose max-w-none ${proseCls}`}>
        <div dangerouslySetInnerHTML={{ __html: mainContent.replaceAll('\n', '<br />') }} />
      </div>
    </div>
  );
}

function ArticleViewModal({ article, isDark, language, onClose }: Readonly<{
  article: MedicalContentArticle;
  isDark: boolean;
  language: string;
  onClose: () => void;
}>) {
  const catInfo = getCategoryInfo(article.category);
  const lang = language;

  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderCls = isDark ? 'border-gray-700' : '';
  const catBadgeCls = isDark ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-100 text-emerald-700';
  const closeBtnCls = isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100';
  const footerBgCls = isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col ${cardBg}`}>
        <div className={`flex items-center justify-between p-4 border-b ${borderCls}`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getTypeIcon(article.type)}</span>
            <span className={`px-2 py-1 rounded-full text-sm ${catBadgeCls}`}>
              {getCategoryDisplayName(catInfo, language)}
            </span>
          </div>
          <button onClick={onClose} className={`p-2 rounded-full ${closeBtnCls}`} title="Close">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <ArticleModalBody article={article} isDark={isDark} language={language} />

        <div className={`p-4 border-t ${footerBgCls}`}>
          <button
            onClick={onClose}
            className="w-full py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            {LABELS.close[lang]}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ───

function getContentErrorMessage(err: unknown, lang: LangKey): string {
  if (err instanceof Error && err.name === 'AbortError') {
    return LABELS.timeout[lang];
  }
  return err instanceof Error ? err.message : LABELS.errorLoading[lang];
}

// ─── Main Component ───

const MedicalContentLibrary: React.FC = () => {
  const { theme, language } = useSettings();
  const isDark = theme === 'dark';
  const lang = language;
  
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_BASE}/api/content/medical`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'Cache-Control': 'no-cache' }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Failed to fetch medical content (${response.status})`);
      }

      const data = await response.json();
      setContent(data.articles || []);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(getContentErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Real-time sync: auto-refresh library when content is published
  useRealtimeSync({ onContentPublished: fetchContent });

  const filteredContent = useMemo(
    () => filterContent(content, searchTerm, selectedCategory, selectedType),
    [content, searchTerm, selectedCategory, selectedType]
  );

  const featuredContent = useMemo(() => content.filter((item) => item.isFeatured), [content]);

  const handleViewArticle = (article: MedicalContentArticle) => {
    setSelectedArticle(article);
    setShowViewModal(true);
  };

  // Pre-compute theme classes to eliminate ternaries from JSX
  const pageBg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const titleCls = isDark ? 'text-white' : 'text-gray-900';
  const subtitleCls = isDark ? 'text-gray-400' : 'text-gray-600';
  const inputCls = isDark ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'border-gray-200';
  const selectCls = isDark ? 'bg-gray-700 border-gray-600 text-white' : 'border-gray-200';
  const headerIconBg = isDark ? 'bg-emerald-900/30' : 'bg-emerald-100';
  const errorBgCls = isDark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200';
  const errorTextCls = isDark ? 'text-red-300' : 'text-red-600';
  const errorLinkCls = isDark ? 'text-red-400 hover:text-red-300' : 'text-red-700 hover:text-red-800';
  const emptyIconCls = isDark ? 'text-gray-600' : 'text-gray-300';
  const emptyCls = isDark ? 'text-gray-400' : 'text-gray-500';
  const emptyText = searchTerm ? LABELS.noContentHint[lang] : LABELS.noContentYet[lang];

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] ${pageBg}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4" />
          <p className={subtitleCls}>{LABELS.loading[lang]}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 min-h-screen ${pageBg}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-3 rounded-xl ${headerIconBg}`}>
            <BookOpenIcon className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h1 className={`text-2xl font-bold ${titleCls}`}>{LABELS.title[lang]}</h1>
            <p className={subtitleCls}>{LABELS.subtitle[lang]}</p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className={`mb-6 p-4 rounded-xl border ${errorBgCls}`}>
          <p className={errorTextCls}>{error}</p>
          <button onClick={fetchContent} className={`mt-2 text-sm underline ${errorLinkCls}`}>
            {LABELS.retry[lang]}
          </button>
        </div>
      )}

      {/* Featured Content Section */}
      {featuredContent.length > 0 && (
        <div className="mb-8">
          <h2 className={`text-lg font-semibold mb-4 ${titleCls}`}>{LABELS.featured[lang]}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredContent.slice(0, 3).map((article) => (
              <FeaturedCard key={article.id} article={article} isDark={isDark} language={language} onClick={() => handleViewArticle(article)} />
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className={`rounded-xl shadow-sm p-4 mb-6 ${cardBg}`}>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={LABELS.search[lang]}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${inputCls}`}
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${selectCls}`}
            title="Category filter"
          >
            <option value="all">{LABELS.allCategories[lang]}</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {getCategoryDisplayName(cat, language)}
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${selectCls}`}
            title="Content type filter"
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
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${getCategoryBtnClass(selectedCategory === 'all', isDark)}`}
          >
            {LABELS.all[lang]}
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${getCategoryBtnClass(selectedCategory === cat.id, isDark)}`}
            >
              {cat.icon} {getCategoryDisplayName(cat, language)}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      {filteredContent.length === 0 ? (
        <div className={`text-center py-12 rounded-xl ${cardBg}`}>
          <BookOpenIcon className={`w-16 h-16 mx-auto mb-4 ${emptyIconCls}`} />
          <h3 className={`text-lg font-medium mb-2 ${titleCls}`}>{LABELS.noContent[lang]}</h3>
          <p className={emptyCls}>{emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.map((article) => (
            <ContentCard key={article.id} article={article} isDark={isDark} language={language} onClick={() => handleViewArticle(article)} />
          ))}
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedArticle && (
        <ArticleViewModal article={selectedArticle} isDark={isDark} language={language} onClose={() => setShowViewModal(false)} />
      )}
    </div>
  );
};

export default MedicalContentLibrary;
