/**
 * Medical Content Component (Patient Portal)
 * Read-only view of published health education articles
 * Fetches content from Patient Portal API (port 3004)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, Video, FileText, Heart, Brain, Pill, ChevronRight, Clock, 
  User, Star, Eye, Search, RefreshCw, ChevronLeft, Tag, Calendar
} from 'lucide-react';

// Types
interface MedicalArticle {
  id: string;
  title: string;
  titleTh?: string;
  titleThai?: string;
  summary?: string;
  summaryTh?: string;
  content: string;
  contentTh?: string;
  contentThai?: string;
  category: string;
  tags?: string[];
  type: 'article' | 'video' | 'guide' | 'infographic';
  thumbnail?: string;
  imageUrl?: string;
  videoUrl?: string;
  isFeatured?: boolean;
  readTimeMinutes?: number;
  readTime?: number;
  views?: number;
  likes?: number;
  author?: string;
  createdByName?: string;
  publishedAt?: string;
  publishDate?: string;
  createdAt?: string;
  status?: string;
}

interface ContentTag {
  id: string;
  name: string;
  nameTh?: string;
}

// Constants
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3004';

const CATEGORIES = [
  { id: 'all', name: 'ทั้งหมด', icon: BookOpen, color: 'emerald' },
  { id: 'featured', name: 'แนะนำ', icon: Star, color: 'yellow' },
  { id: 'general-health', name: 'สุขภาพทั่วไป', icon: Heart, color: 'red' },
  { id: 'general_health', name: 'สุขภาพทั่วไป', icon: Heart, color: 'red' },
  { id: 'chronic-disease', name: 'โรคเรื้อรัง', icon: Pill, color: 'purple' },
  { id: 'mental-health', name: 'สุขภาพจิต', icon: Brain, color: 'blue' },
  { id: 'mental_health', name: 'สุขภาพจิต', icon: Brain, color: 'blue' },
  { id: 'nutrition', name: 'โภชนาการ', icon: FileText, color: 'green' },
  { id: 'exercise', name: 'การออกกำลังกาย', icon: Heart, color: 'orange' },
  { id: 'preventive-care', name: 'การดูแลเชิงป้องกัน', icon: Heart, color: 'teal' },
  { id: 'cardiovascular', name: 'หัวใจและหลอดเลือด', icon: Heart, color: 'red' },
  { id: 'diabetes', name: 'เบาหวาน', icon: Pill, color: 'purple' },
  { id: 'infectious_disease', name: 'โรคติดเชื้อ', icon: Pill, color: 'orange' },
  { id: 'elderly-care', name: 'ผู้สูงอายุ', icon: Heart, color: 'amber' },
  { id: 'elderly_care', name: 'ผู้สูงอายุ', icon: Heart, color: 'amber' },
  { id: 'first-aid', name: 'การปฐมพยาบาล', icon: Heart, color: 'red' },
  { id: 'medications', name: 'ยาและการใช้ยา', icon: Pill, color: 'violet' },
  { id: 'video', name: 'วิดีโอ', icon: Video, color: 'orange' },
];

// Props
interface MedicalContentProps {
  className?: string;
}

export const MedicalContent: React.FC<MedicalContentProps> = ({ className = '' }) => {
  // State
  const [articles, setArticles] = useState<MedicalArticle[]>([]);
  const [tags, setTags] = useState<ContentTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // UI state
  const [selectedArticle, setSelectedArticle] = useState<MedicalArticle | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the patient portal content API
      const response = await fetch(`${API_BASE}/api/content/medical`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch articles');
      }
      
      const data = await response.json();
      
      // API already filters to published articles
      setArticles(data.articles || []);
    } catch (err) {
      console.error('Error fetching articles:', err);
      setError('ไม่สามารถโหลดเนื้อหาได้ กรุณาลองใหม่อีกครั้ง');
      // Fallback to sample data for demo
      setArticles(getSampleArticles());
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/content/tags/medical`);
      if (response.ok) {
        const data = await response.json();
        setTags(data.tags || data || []);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  }, []);

  // Track article views
  const trackView = async (articleId: string) => {
    try {
      await fetch(`${API_BASE}/api/content/medical/${articleId}/view`, {
        method: 'POST',
      });
    } catch (err) {
      // Silent fail for analytics
      console.log('View tracking failed');
    }
  };

  useEffect(() => {
    fetchArticles();
    fetchTags();
  }, [fetchArticles, fetchTags]);

  const filteredArticles = articles.filter(article => {
    // Category filter
    if (activeCategory === 'featured') {
      if (!article.isFeatured) return false;
    } else if (activeCategory === 'video') {
      if (article.type !== 'video') return false;
    } else if (activeCategory !== 'all') {
      if (article.category !== activeCategory) return false;
    }
    
    // Tag filter
    if (selectedTag && article.tags && !article.tags.includes(selectedTag)) {
      return false;
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const title = article.title?.toLowerCase() || '';
      const titleTh = article.titleTh?.toLowerCase() || article.titleThai?.toLowerCase() || '';
      const summary = article.summary?.toLowerCase() || '';
      const summaryTh = article.summaryTh?.toLowerCase() || '';
      return (
        title.includes(query) ||
        titleTh.includes(query) ||
        summary.includes(query) ||
        summaryTh.includes(query)
      );
    }
    
    return true;
  });

  const getCategoryIcon = (categoryId: string) => {
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat?.icon || BookOpen;
  };

  const getCategoryColor = (categoryId: string) => {
    const colors: Record<string, string> = {
      'general-health': 'bg-red-50 text-red-600 border-red-200',
      'chronic-disease': 'bg-purple-50 text-purple-600 border-purple-200',
      'mental-health': 'bg-blue-50 text-blue-600 border-blue-200',
      'nutrition': 'bg-green-50 text-green-600 border-green-200',
      'exercise': 'bg-orange-50 text-orange-600 border-orange-200',
      'preventive-care': 'bg-teal-50 text-teal-600 border-teal-200',
      'womens-health': 'bg-pink-50 text-pink-600 border-pink-200',
      'mens-health': 'bg-indigo-50 text-indigo-600 border-indigo-200',
      'pediatrics': 'bg-cyan-50 text-cyan-600 border-cyan-200',
      'elderly-care': 'bg-amber-50 text-amber-600 border-amber-200',
      'first-aid': 'bg-red-50 text-red-600 border-red-200',
      'medications': 'bg-violet-50 text-violet-600 border-violet-200',
      'video': 'bg-orange-50 text-orange-600 border-orange-200',
      'featured': 'bg-yellow-50 text-yellow-600 border-yellow-200',
    };
    return colors[categoryId] || 'bg-gray-50 text-gray-600 border-gray-200';
  };

  const getCategoryName = (categoryId: string) => {
    const cat = CATEGORIES.find(c => c.id === categoryId);
    return cat?.name || categoryId;
  };

  const getTagName = (tagId: string) => {
    const tag = tags.find(t => t.id === tagId);
    return tag?.nameTh || tag?.name || tagId;
  };

  const formatViews = (views: number) => {
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}k`;
    }
    return views.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Sample data fallback
  const getSampleArticles = (): MedicalArticle[] => [
    {
      id: 'sample-1',
      title: 'วิธีดูแลสุขภาพหัวใจให้แข็งแรง',
      titleTh: 'วิธีดูแลสุขภาพหัวใจให้แข็งแรง',
      summary: 'เคล็ดลับง่ายๆ ที่ช่วยให้หัวใจของคุณแข็งแรงและทำงานได้ดีตลอดชีวิต รวมถึงการออกกำลังกายและอาหารที่เหมาะสม',
      summaryTh: 'เคล็ดลับง่ายๆ ที่ช่วยให้หัวใจของคุณแข็งแรง',
      content: '# วิธีดูแลสุขภาพหัวใจให้แข็งแรง\n\nหัวใจเป็นอวัยวะสำคัญที่ต้องดูแลเป็นพิเศษ...',
      category: 'general-health',
      tags: [],
      type: 'article',
      isFeatured: true,
      readTimeMinutes: 5,
      views: 1250,
      likes: 45,
      createdByName: 'นพ.สมชาย ใจดี',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-2',
      title: 'เข้าใจโรคเบาหวานและวิธีป้องกัน',
      titleTh: 'เข้าใจโรคเบาหวานและวิธีป้องกัน',
      summary: 'ทุกสิ่งที่คุณต้องรู้เกี่ยวกับโรคเบาหวาน สาเหตุ อาการ และวิธีป้องกัน',
      summaryTh: 'ทุกสิ่งที่คุณต้องรู้เกี่ยวกับโรคเบาหวาน',
      content: '# เข้าใจโรคเบาหวาน\n\nโรคเบาหวานเป็นโรคเรื้อรังที่ต้องดูแลอย่างต่อเนื่อง...',
      category: 'chronic-disease',
      tags: [],
      type: 'article',
      isFeatured: true,
      readTimeMinutes: 8,
      views: 980,
      likes: 32,
      createdByName: 'พญ.วิภา สุขใจ',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-3',
      title: 'จัดการความเครียดอย่างไรให้ได้ผล',
      titleTh: 'จัดการความเครียดอย่างไรให้ได้ผล',
      summary: 'เทคนิคการจัดการความเครียดที่ได้รับการพิสูจน์แล้วว่าได้ผลจริง',
      summaryTh: 'เทคนิคการจัดการความเครียด',
      content: '# จัดการความเครียด\n\nความเครียดเป็นส่วนหนึ่งของชีวิตประจำวัน...',
      category: 'mental-health',
      tags: [],
      type: 'article',
      isFeatured: true,
      readTimeMinutes: 6,
      views: 2100,
      likes: 78,
      createdByName: 'นพ.ธนพล จิตสงบ',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-4',
      title: 'อาหารที่ช่วยเสริมภูมิคุ้มกัน',
      titleTh: 'อาหารที่ช่วยเสริมภูมิคุ้มกัน',
      summary: 'รายการอาหารที่ช่วยเสริมสร้างระบบภูมิคุ้มกันให้แข็งแรง',
      summaryTh: 'อาหารเสริมภูมิคุ้มกัน',
      content: '# อาหารเสริมภูมิคุ้มกัน\n\nระบบภูมิคุ้มกันเป็นกำแพงป้องกันร่างกาย...',
      category: 'nutrition',
      tags: [],
      type: 'article',
      isFeatured: false,
      readTimeMinutes: 4,
      views: 1800,
      likes: 56,
      createdByName: 'ดร.นิตยา อาหารดี',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'sample-5',
      title: 'วิดีโอ: ท่าบริหาร 10 นาที',
      titleTh: 'วิดีโอ: ท่าบริหาร 10 นาที',
      summary: 'ท่าบริหารร่างกายง่ายๆ ที่ทำได้ทุกวัน ใช้เวลาเพียง 10 นาที',
      summaryTh: 'ท่าบริหาร 10 นาที',
      content: '# ท่าบริหาร 10 นาที\n\nการออกกำลังกายไม่จำเป็นต้องใช้เวลามาก...',
      category: 'exercise',
      tags: [],
      type: 'video',
      videoUrl: 'https://www.youtube.com/watch?v=example',
      isFeatured: true,
      readTimeMinutes: 10,
      views: 5600,
      likes: 234,
      createdByName: 'Coach สมศักดิ์',
      createdAt: new Date().toISOString(),
    },
  ];

  const handleOpenArticle = (article: MedicalArticle) => {
    setSelectedArticle(article);
    setViewMode('detail');
    trackView(article.id);
  };

  const handleBackToList = () => {
    setSelectedArticle(null);
    setViewMode('list');
  };

  if (viewMode === 'detail' && selectedArticle) {
    const CategoryIcon = getCategoryIcon(selectedArticle.category);
    
    return (
      <div className={`${className}`}>
        {/* Back Button */}
        <button
          onClick={handleBackToList}
          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 mb-4 font-medium"
        >
          <ChevronLeft className="w-5 h-5" />
          กลับไปรายการ
        </button>

        {/* Article Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-white/20`}>
              <CategoryIcon className="w-3.5 h-3.5" />
              {getCategoryName(selectedArticle.category)}
            </span>
            {selectedArticle.isFeatured && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-medium rounded-full">
                <Star className="w-3 h-3 fill-current" />
                แนะนำ
              </span>
            )}
            {selectedArticle.type === 'video' && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-400 text-white text-xs font-medium rounded-full">
                <Video className="w-3 h-3" />
                วิดีโอ
              </span>
            )}
          </div>
          
          <h1 className="text-2xl font-bold mb-2">
            {selectedArticle.titleTh || selectedArticle.title}
          </h1>
          
          <p className="text-emerald-100 mb-4">
            {selectedArticle.summaryTh || selectedArticle.summary}
          </p>
          
          <div className="flex flex-wrap items-center gap-4 text-sm text-emerald-100">
            <span className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              {selectedArticle.createdByName || selectedArticle.author || 'Izara Team'}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              อ่าน {selectedArticle.readTimeMinutes || selectedArticle.readTime || 5} นาที
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              {formatViews(selectedArticle.views || 0)} views
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {formatDate(selectedArticle.publishedAt || selectedArticle.publishDate || selectedArticle.createdAt || new Date().toISOString())}
            </span>
          </div>
        </div>

        {/* Video Player (if video) */}
        {selectedArticle.type === 'video' && selectedArticle.videoUrl && (
          <div className="mb-6 aspect-video rounded-xl overflow-hidden bg-black">
            {selectedArticle.videoUrl.includes('youtube') ? (
              <iframe
                src={selectedArticle.videoUrl.replace('watch?v=', 'embed/')}
                className="w-full h-full"
                allowFullScreen
              />
            ) : (
              <video
                src={selectedArticle.videoUrl}
                controls
                className="w-full h-full"
              />
            )}
          </div>
        )}

        {/* Thumbnail */}
        {selectedArticle.thumbnail && selectedArticle.type !== 'video' && (
          <img
            src={selectedArticle.thumbnail}
            alt={selectedArticle.title}
            className="w-full rounded-xl mb-6 max-h-64 object-cover"
          />
        )}

        {/* Article Content */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="prose prose-emerald max-w-none">
            {/* Parse and render markdown-like content */}
            {(selectedArticle.contentTh || selectedArticle.content).split('\n').map((paragraph, idx) => {
              if (paragraph.startsWith('# ')) {
                return <h1 key={idx} className="text-2xl font-bold text-gray-800 mb-4">{paragraph.slice(2)}</h1>;
              } else if (paragraph.startsWith('## ')) {
                return <h2 key={idx} className="text-xl font-bold text-gray-800 mb-3 mt-6">{paragraph.slice(3)}</h2>;
              } else if (paragraph.startsWith('### ')) {
                return <h3 key={idx} className="text-lg font-bold text-gray-800 mb-2 mt-4">{paragraph.slice(4)}</h3>;
              } else if (paragraph.startsWith('- ')) {
                return <li key={idx} className="text-gray-700 ml-4">{paragraph.slice(2)}</li>;
              } else if (paragraph.trim()) {
                return <p key={idx} className="text-gray-700 leading-relaxed mb-4">{paragraph}</p>;
              }
              return null;
            })}
          </div>
        </div>

        {/* Tags */}
        {selectedArticle.tags && selectedArticle.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Tag className="w-4 h-4 text-gray-400" />
            {selectedArticle.tags.map(tagId => (
              <span
                key={tagId}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full"
              >
                {getTagName(tagId)}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="ค้นหาบทความ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {CATEGORIES.slice(0, 8).map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => {
                setActiveCategory(category.id);
                setSelectedTag(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                activeCategory === category.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {category.name}
            </button>
          );
        })}
      </div>

      {/* Tags Filter */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.slice(0, 6).map((tag) => (
            <button
              key={tag.id}
              onClick={() => setSelectedTag(selectedTag === tag.id ? null : tag.id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
                selectedTag === tag.id
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Tag className="w-3 h-3" />
              {tag.nameTh || tag.name}
            </button>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center justify-between">
          <span className="text-red-700 text-sm">{error}</span>
          <button
            onClick={fetchArticles}
            className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" />
            ลองใหม่
          </button>
        </div>
      )}

      {/* Articles List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-gray-100 h-24 rounded-xl" />
          ))}
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>ไม่พบเนื้อหาที่ค้นหา</p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-2 text-emerald-600 text-sm hover:underline"
            >
              ล้างการค้นหา
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
          {filteredArticles.map((article) => {
            const CategoryIcon = getCategoryIcon(article.category);
            return (
              <div
                key={article.id}
                onClick={() => handleOpenArticle(article)}
                className={`rounded-xl p-4 transition-all cursor-pointer border ${
                  article.isFeatured
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200 hover:border-yellow-300'
                    : 'bg-gray-50 border-gray-100 hover:bg-emerald-50 hover:border-emerald-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {article.thumbnail ? (
                    <img
                      src={article.thumbnail}
                      alt={article.title}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 border ${getCategoryColor(article.category)}`}>
                      {article.type === 'video' ? (
                        <Video className="w-6 h-6" />
                      ) : (
                        <CategoryIcon className="w-6 h-6" />
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {article.isFeatured && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                          <Star className="w-3 h-3" />
                          แนะนำ
                        </span>
                      )}
                      {article.type === 'video' && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                          <Video className="w-3 h-3" />
                          วิดีโอ
                        </span>
                      )}
                      <h4 className="font-medium text-gray-800 line-clamp-1">
                        {article.titleTh || article.title}
                      </h4>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                      {article.summaryTh || article.summary || ''}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {article.createdByName || article.author || 'Izara Team'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {article.readTimeMinutes || article.readTime || 5} นาที
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {formatViews(article.views || 0)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MedicalContent;
