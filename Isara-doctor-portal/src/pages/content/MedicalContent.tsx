/**
 * Medical Content Page - Health Knowledge Library
 * Medical journey content for health education and knowledge sharing
 * Full CRUD operations for doctors with version history and comments
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpenIcon,
  SearchIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from '../../assets/NewSvgIcons';
import { useAuth } from '../../components/common/AuthProvider';
import { useSettings } from '../../hooks/useSettings';
import {
  type MedicalContentArticle,
  type ContentTag,
  type ContentVersion,
  type ContentStatus,
  type MedicalContentCategoryId,
  MEDICAL_CONTENT_CATEGORIES,
} from '../../types/contentTypes';

// ============================================================================
// API BASE URL - Empty string for relative paths in production (Cloud Run)
// ============================================================================
const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================================================
// CUSTOM ICONS (Icons not in NewSvgIcons)
// ============================================================================

const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const EyeIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const PlayCircleIconCustom: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const HistoryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// ============================================================================
// CONTENT TYPE OPTIONS
// ============================================================================

const contentTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'article', label: '📄 Articles' },
  { value: 'video', label: '🎥 Videos' },
  { value: 'guide', label: '📚 Guides' },
  { value: 'infographic', label: '📊 Infographics' },
];

const statusOptions: { value: ContentStatus; label: string; color: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'pending', label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'published', label: 'Published', color: 'bg-green-100 text-green-700' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-700' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-200 text-gray-600' },
];

// ============================================================================
// HELPER FUNCTIONS (module scope - S2004)
// ============================================================================

// Escape HTML special characters to prevent XSS
const escapeHtml = (str: string): string => {
  if (!str) return '';
  return str.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#x27;');
};

// Validate URL - only allow http/https protocols
const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
  } catch { /* invalid URL */ }
  return '#';
};

// Render content with inline images support
// Format: [image:URL:description] will be rendered as <img>
const renderContentWithImages = (content: string) => {
  if (!content) return '';

  // Replace [image:URL:description] with actual img tags (sanitized)
  const imagePattern = /\[image:([^\]:]+):([^\]]*)\]/g;
  let processedContent = content.replaceAll(imagePattern, (_match, url, description) => {
    const safeUrl = sanitizeUrl(url);
    const safeDesc = escapeHtml(description);
    return `<figure class="my-6"><img src="${safeUrl}" alt="${safeDesc}" class="w-full max-w-2xl mx-auto rounded-lg shadow-md" loading="lazy" /><figcaption class="text-center text-sm text-gray-500 mt-2">${safeDesc}</figcaption></figure>`;
  });

  // Escape remaining HTML in text content (preserve our figure tags)
  // Split by our generated figure tags, escape text parts, rejoin
  const figurePattern = /(<figure[^>]*>.*?<\/figure>)/gs;
  const parts = processedContent.split(figurePattern);
  processedContent = parts.map(part =>
    figurePattern.test(part) ? part : escapeHtml(part).replaceAll('\n', '<br/>')
  ).join('');

  return processedContent;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

// i18n labels for Medical Content page
const labels = {
  pageTitle: { en: 'Medical Content', th: 'เนื้อหาทางการแพทย์' },
  healthLibrary: { en: 'Health Knowledge Library', th: 'ห้องสมุดความรู้สุขภาพ' },
  searchContent: { en: 'Search articles, videos, guides...', th: 'ค้นหาบทความ วิดีโอ คู่มือ...' },
  createNew: { en: 'Create New', th: 'สร้างใหม่' },
  allTypes: { en: 'All Types', th: 'ทุกประเภท' },
  articles: { en: 'Articles', th: 'บทความ' },
  videos: { en: 'Videos', th: 'วิดีโอ' },
  guides: { en: 'Guides', th: 'คู่มือ' },
  infographics: { en: 'Infographics', th: 'อินโฟกราฟิก' },
  pendingApproval: { en: 'Pending Approval', th: 'รอการอนุมัติ' },
  myContentOnly: { en: 'My Content Only', th: 'เนื้อหาของฉันเท่านั้น' },
};

const MedicalContent: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useSettings();
  const isDark = theme === 'dark';
  const themeClasses = isDark ? {
    titleText: 'text-white',
    subtitleText: 'text-gray-400',
    cardBg: 'bg-gray-800',
    searchInput: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400',
    selectInput: 'bg-gray-700 border-gray-600 text-white',
    checkboxBg: 'bg-gray-700',
    checkboxText: 'text-gray-300',
  } : {
    titleText: 'text-gray-900',
    subtitleText: 'text-gray-600',
    cardBg: 'bg-white',
    searchInput: 'border-gray-300',
    selectInput: 'border-gray-300',
    checkboxBg: 'bg-gray-50',
    checkboxText: 'text-gray-700',
  };
  const isAdmin = user?.email?.includes('admin') || user?.role === 'admin';

  const [content, setContent] = useState<MedicalContentArticle[]>([]);
  const [tags, setTags] = useState<ContentTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<ContentStatus | 'all'>('all');
  const [showMyContentOnly, setShowMyContentOnly] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showPendingList, setShowPendingList] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<MedicalContentArticle | null>(null);

  // Approval workflow states
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [pendingArticles, setPendingArticles] = useState<MedicalContentArticle[]>([]);

  // Form states
  const [formData, setFormData] = useState<{
    title: string;
    titleTh: string;
    summary: string;
    summaryTh: string;
    content: string;
    contentTh: string;
    category: MedicalContentCategoryId;
    type: 'article' | 'video' | 'guide' | 'infographic';
    thumbnail: string;
    videoUrl: string;
    tags: string[];
    isFeatured: boolean;
    status: ContentStatus;
  }>({
    title: '',
    titleTh: '',
    summary: '',
    summaryTh: '',
    content: '',
    contentTh: '',
    category: 'general-health',
    type: 'article',
    thumbnail: '',
    videoUrl: '',
    tags: [],
    isFeatured: false,
    status: 'draft',
  });
  const [changeNote, setChangeNote] = useState('');
  const [newTag, setNewTag] = useState('');

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/content/medical`);
      if (!response.ok) throw new Error('Failed to fetch content');
      const data = await response.json();
      setContent(data.articles || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching content:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/content/tags/medical`);
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  }, []);

  useEffect(() => {
    fetchContent();
    fetchTags();
  }, [fetchContent, fetchTags]);

  // Fetch pending approvals for admin users
  useEffect(() => {
    if (isAdmin) {
      // Count pending articles from content
      const pending = content.filter(a => a.status === 'pending');
      setPendingCount(pending.length);
      setPendingArticles(pending);
    }
  }, [isAdmin, content]);

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filteredContent = content.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesType = selectedType === 'all' || item.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    const matchesMyContent = !showMyContentOnly || item.createdBy === user?.id;
    return matchesSearch && matchesCategory && matchesType && matchesStatus && matchesMyContent;
  });

  const featuredContent = content.filter((item) => item.isFeatured && item.status === 'published');

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  const handleCreate = async () => {
    try {
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const response = await fetch(`${API_BASE}/api/content/medical`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          userId: user?.id || 'unknown',
          userName: user?.name || user?.email || 'Unknown',
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to create article (${response.status})`);
      }
      const result = await response.json();
      // Backend returns { success: true, article: {...} }
      const article = result.article || result;
      setContent((prev) => [...prev, article]);
      setShowCreateModal(false);
      resetForm();
    } catch (err) {
      console.error('Error creating article:', err);
      setError(err instanceof Error ? err.message : 'Failed to create article');
    }
  };

  const handleUpdate = async () => {
    if (!selectedArticle) return;
    try {
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const response = await fetch(`${API_BASE}/api/content/medical/${selectedArticle.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          ...formData,
          userId: user?.id || 'unknown',
          userName: user?.name || user?.email || 'Unknown',
          changeNote: changeNote || 'Updated',
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to update article (${response.status})`);
      }
      const result = await response.json();
      // Backend returns { success: true, article: {...} }
      const article = result.article || result;
      setContent((prev) => prev.map((a) => (a.id === article.id ? article : a)));
      setShowEditModal(false);
      resetForm();
    } catch (err) {
      console.error('Error updating article:', err);
      setError(err instanceof Error ? err.message : 'Failed to update article');
    }
  };

  const handleDelete = async () => {
    if (!selectedArticle) return;
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/content/medical/${selectedArticle.id}`, {
        method: 'DELETE',
        headers,
      });
      if (!response.ok) throw new Error('Failed to delete article');
      setContent((prev) => prev.filter((a) => a.id !== selectedArticle.id));
      setShowDeleteConfirm(false);
      setSelectedArticle(null);
    } catch (err) {
      console.error('Error deleting article:', err);
      alert('Failed to delete article');
    }
  };

  // ============================================================================
  // APPROVAL WORKFLOW FUNCTIONS
  // ============================================================================

  const fetchPendingApprovals = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const headers = getAuthHeaders();
      const response = await fetch(`${API_BASE}/api/content/medical/pending`, { headers });
      if (!response.ok) throw new Error('Failed to fetch pending');
      const data = await response.json();
      setPendingArticles(data.articles || []);
      setPendingCount(data.count || 0);
    } catch (err) {
      console.error('Error fetching pending:', err);
    }
  }, [isAdmin]);

  const handleSubmitForApproval = async (article: MedicalContentArticle) => {
    try {
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const response = await fetch(`${API_BASE}/api/content/medical/${article.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          status: 'pending',
          userId: user?.id || 'unknown',
          userName: user?.name || user?.email || 'Unknown',
          changeNote: 'Submitted for approval',
        }),
      });
      if (!response.ok) throw new Error('Failed to submit for approval');
      const result = await response.json();
      const updatedArt = result.article || result;
      setContent((prev) => prev.map((a) => (a.id === updatedArt.id ? updatedArt : a)));
      if (selectedArticle?.id === article.id) {
        setSelectedArticle(updatedArt);
      }
      alert('Article submitted for approval successfully!');
    } catch (err) {
      console.error('Error submitting for approval:', err);
      alert('Failed to submit for approval');
    }
  };

  const handleApprovalAction = async (action: 'approve' | 'reject') => {
    if (!selectedArticle) return;
    try {
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const response = await fetch(`${API_BASE}/api/content/medical/${selectedArticle.id}/review`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action,
          userId: user?.id,
          userName: user?.name || user?.email || 'Admin',
          comment: approvalComment,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
        }),
      });
      if (!response.ok) throw new Error(`Failed to ${action} article`);
      const result = await response.json();
      setContent((prev) => prev.map((a) => (a.id === result.article.id ? result.article : a)));
      setSelectedArticle(result.article);
      setShowApprovalModal(false);
      setApprovalComment('');
      setRejectionReason('');
      fetchPendingApprovals();
      alert(`Article ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
    } catch (err) {
      console.error(`Error ${action}ing article:`, err);
      alert(`Failed to ${action} article`);
    }
  };

  const openApprovalModal = (article: MedicalContentArticle) => {
    setSelectedArticle(article);
    setShowApprovalModal(true);
  };

  const handleCreateTag = async () => {
    if (!newTag.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/api/content/tags/medical`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTag, userId: user?.id }),
      });
      if (!response.ok) throw new Error('Failed to create tag');
      const tag = await response.json();
      setTags((prev) => [...prev, tag]);
      setFormData((prev) => ({ ...prev, tags: [...prev.tags, tag.name] }));
      setNewTag('');
    } catch (err) {
      console.error('Error creating tag:', err);
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      titleTh: '',
      summary: '',
      summaryTh: '',
      content: '',
      contentTh: '',
      category: 'general-health',
      type: 'article',
      thumbnail: '',
      videoUrl: '',
      tags: [],
      isFeatured: false,
      status: 'draft',
    });
    setChangeNote('');
    setSelectedArticle(null);
  };

  const openEditModal = (article: MedicalContentArticle) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title,
      titleTh: article.titleTh || '',
      summary: article.summary || '',
      summaryTh: article.summaryTh || '',
      content: article.content,
      contentTh: article.contentTh || '',
      category: article.category,
      type: article.type,
      thumbnail: article.thumbnail || '',
      videoUrl: article.videoUrl || '',
      tags: article.tags || [],
      isFeatured: article.isFeatured || false,
      status: article.status,
    });
    setShowEditModal(true);
  };

  const openViewModal = (article: MedicalContentArticle) => {
    setSelectedArticle(article);
    setShowViewModal(true);
  };

  const openHistoryModal = (article: MedicalContentArticle) => {
    setSelectedArticle(article);
    setShowHistoryModal(true);
  };

  const openDeleteConfirm = (article: MedicalContentArticle) => {
    setSelectedArticle(article);
    setShowDeleteConfirm(true);
  };

  const typeIconMap: Record<string, string> = { video: '🎥', guide: '📚', infographic: '📊' };
  const getTypeIcon = (type: string) => typeIconMap[type] || '📄';

  const typeBadgeColorMap: Record<string, string> = { video: 'bg-red-100 text-red-700', guide: 'bg-blue-100 text-blue-700', infographic: 'bg-purple-100 text-purple-700' };
  const getTypeBadgeColor = (type: string) => typeBadgeColorMap[type] || 'bg-gray-100 text-gray-700';

  const getStatusBadge = (status: ContentStatus) => {
    const config = statusOptions.find((s) => s.value === status);
    return config || { label: status, color: 'bg-gray-100 text-gray-700' };
  };

  const getCategoryName = (categoryId: string) => {
    const cat = MEDICAL_CONTENT_CATEGORIES.find((c) => c.id === categoryId);
    return cat?.name || categoryId;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className={`text-2xl font-bold flex items-center gap-2 ${themeClasses.titleText}`}>
            <BookOpenIcon className="w-8 h-8 text-emerald-600" />
            Medical Content Library
          </h1>
          <p className={`mt-1 ${themeClasses.subtitleText}`}>
            Health education resources for patient medical journeys
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Admin: Pending Approvals Button */}
          {isAdmin && pendingCount > 0 && (
            <button
              onClick={() => setShowPendingList(true)}
              className="relative flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Pending Approvals
              <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {pendingCount}
              </span>
            </button>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Create Content
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={fetchContent} className="ml-4 underline">
            Retry
          </button>
        </div>
      )}

      {/* Featured Section */}
      {featuredContent.length > 0 && (
        <div className="mb-8">
          <h2 className={`text-lg font-semibold mb-4 ${themeClasses.titleText}`}>✨ Featured Content</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {featuredContent.slice(0, 3).map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => openViewModal(item)}
                onKeyDown={(e) => e.key === 'Enter' && openViewModal(item)}
                className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer text-left w-full"
              >
                <div className="relative">
                  <img
                    src={item.thumbnail || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400'}
                    alt={item.title}
                    className="w-full h-40 object-cover opacity-80"
                  />
                  {item.type === 'video' && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <PlayCircleIconCustom className="w-16 h-16 text-white opacity-90" />
                    </div>
                  )}
                </div>
                <div className="p-4 text-white">
                  <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                    {getCategoryName(item.category)}
                  </span>
                  <h3 className="font-semibold mt-2 line-clamp-2">{item.title}</h3>
                  <div className="flex items-center justify-between mt-3 text-sm opacity-80">
                    <span>{item.readTimeMinutes} min read</span>
                    <span>{(item.views || 0).toLocaleString()} views</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Search and Filter */}
      <div className={`rounded-xl shadow-lg p-4 mb-6 ${themeClasses.cardBg}`}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <SearchIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search articles, guides, videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${themeClasses.searchInput}`}
            />
          </div>
          <select
            aria-label="Filter by category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 ${themeClasses.selectInput}`}
          >
            <option value="all">All Categories</option>
            {MEDICAL_CONTENT_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by content type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 ${themeClasses.selectInput}`}
          >
            {contentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ContentStatus | 'all')}
            className={`px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 ${themeClasses.selectInput}`}
          >
            <option value="all">All Status</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
          <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer ${themeClasses.checkboxBg}`}>
            <input
              type="checkbox"
              checked={showMyContentOnly}
              onChange={(e) => setShowMyContentOnly(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className={`text-sm ${themeClasses.checkboxText}`}>My Content</span>
          </label>
        </div>
      </div>

      {/* Content Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-emerald-600">{content.length}</div>
          <div className="text-sm text-gray-600">Total</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {content.filter((c) => c.status === 'published').length}
          </div>
          <div className="text-sm text-gray-600">Published</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-600">
            {content.filter((c) => c.status === 'draft').length}
          </div>
          <div className="text-sm text-gray-600">Drafts</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {content.filter((c) => c.type === 'article').length}
          </div>
          <div className="text-sm text-gray-600">Articles</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-red-600">
            {content.filter((c) => c.type === 'video').length}
          </div>
          <div className="text-sm text-gray-600">Videos</div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContent.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group"
          >
            <div className="relative">
              <img
                src={item.thumbnail || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=400'}
                alt={item.titleTh || item.title}
                className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {item.type === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                  <PlayCircleIconCustom className="w-14 h-14 text-white" />
                </div>
              )}
              <span className={`absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium ${getTypeBadgeColor(item.type)}`}>
                {getTypeIcon(item.type)} {item.type}
              </span>
              <span className={`absolute top-3 right-3 px-2 py-1 rounded text-xs font-medium ${getStatusBadge(item.status).color}`}>
                {getStatusBadge(item.status).label}
              </span>
            </div>
            <div className="p-4">
              <span className="text-xs text-emerald-600 font-medium">{getCategoryName(item.category)}</span>
              {/* Thai Title as Primary */}
              <h3 className="font-semibold text-gray-900 mt-1 line-clamp-2">{item.titleTh || item.title}</h3>
              {item.title && item.titleTh && (
                <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.title}</p>
              )}
              <p className="text-sm text-gray-600 mt-2 line-clamp-2">{item.summaryTh || item.summary}</p>

              {item.tags && item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                  {item.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  <span>v{item.version || 1}</span>
                  <span className="mx-1">•</span>
                  <span>{new Date(item.updatedAt || item.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openViewModal(item)}
                    className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                    title="View"
                  >
                    <EyeIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openHistoryModal(item)}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="History"
                  >
                    <HistoryIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded"
                    title="Edit"
                  >
                    <EditIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => openDeleteConfirm(item)}
                    className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredContent.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <BookOpenIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No content found</h3>
          <p className="text-gray-600 mb-4">Try adjusting your search or filter criteria</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            <PlusIcon className="w-5 h-5" />
            Create First Content
          </button>
        </div>
      )}

      {/* Categories Quick Links */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse by Category</h2>
        <div className="flex flex-wrap gap-2">
          {MEDICAL_CONTENT_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === category.id
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 shadow'
                }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* ============================================================================ */}
      {/* CREATE/EDIT MODAL */}
      {/* ============================================================================ */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {showCreateModal ? 'Create New Content' : 'Edit Content'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close modal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info - Thai as Primary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="form-titleTh" className="block text-sm font-medium text-gray-700 mb-1">
                    ชื่อเรื่อง (ภาษาไทย) *
                  </label>
                  <input
                    id="form-titleTh"
                    type="text"
                    value={formData.titleTh}
                    onChange={(e) => setFormData((prev) => ({ ...prev, titleTh: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="ระบุชื่อเรื่องเป็นภาษาไทย"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="form-title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title (English)
                  </label>
                  <input
                    id="form-title"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Optional English title"
                  />
                </div>
              </div>

              {/* Summary - Thai as Primary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="form-summaryTh" className="block text-sm font-medium text-gray-700 mb-1">
                    บทคัดย่อ (ภาษาไทย) *
                  </label>
                  <textarea
                    id="form-summaryTh"
                    value={formData.summaryTh}
                    onChange={(e) => setFormData((prev) => ({ ...prev, summaryTh: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="สรุปเนื้อหาโดยย่อ"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="form-summary" className="block text-sm font-medium text-gray-700 mb-1">
                    Summary (English)
                  </label>
                  <textarea
                    id="form-summary"
                    value={formData.summary}
                    onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Optional English summary"
                  />
                </div>
              </div>

              {/* Content - Thai as Primary with Image Support */}
              <div>
                <label htmlFor="form-contentTh" className="block text-sm font-medium text-gray-700 mb-1">
                  เนื้อหา (ภาษาไทย) *
                </label>
                <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <p className="font-medium mb-1">💡 รองรับการแทรกรูปภาพ:</p>
                  <p>ใช้รูปแบบ: <code className="bg-blue-100 px-1 rounded">[image:URL:description]</code></p>
                  <p>ตัวอย่าง: <code className="bg-blue-100 px-1 rounded">[image:https://example.com/heart.jpg:ภาพหัวใจมนุษย์]</code></p>
                </div>
                <textarea
                  id="form-contentTh"
                  value={formData.contentTh}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contentTh: e.target.value }))}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="เขียนเนื้อหาเป็นภาษาไทย สามารถแทรกรูปภาพได้โดยใช้รูปแบบ [image:URL:คำอธิบาย]"
                  required
                />
              </div>
              <div>
                <label htmlFor="form-content" className="block text-sm font-medium text-gray-700 mb-1">
                  Content (English)
                </label>
                <div className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                  <p className="font-medium mb-1">💡 Image Support:</p>
                  <p>Use format: <code className="bg-gray-100 px-1 rounded">[image:URL:description]</code></p>
                  <p>Example: <code className="bg-gray-100 px-1 rounded">[image:https://example.com/heart.jpg:Human heart diagram]</code></p>
                </div>
                <textarea
                  id="form-content"
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="Optional English content. Use [image:URL:description] to insert images."
                />
              </div>

              {/* Category, Type, Status */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="form-category" className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    id="form-category"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value as MedicalContentCategoryId }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    {MEDICAL_CONTENT_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="form-type" className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    id="form-type"
                    value={formData.type}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        type: e.target.value as 'article' | 'video' | 'guide' | 'infographic',
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="article">📄 Article</option>
                    <option value="video">🎥 Video</option>
                    <option value="guide">📚 Guide</option>
                    <option value="infographic">📊 Infographic</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="form-status" className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    id="form-status"
                    value={formData.status}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, status: e.target.value as ContentStatus }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* URLs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="form-thumbnail" className="block text-sm font-medium text-gray-700 mb-1">
                    Thumbnail URL
                  </label>
                  <input
                    id="form-thumbnail"
                    type="url"
                    value={formData.thumbnail}
                    onChange={(e) => setFormData((prev) => ({ ...prev, thumbnail: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="https://..."
                  />
                </div>
                {formData.type === 'video' && (
                  <div>
                    <label htmlFor="form-videoUrl" className="block text-sm font-medium text-gray-700 mb-1">
                      Video URL
                    </label>
                    <input
                      id="form-videoUrl"
                      type="url"
                      value={formData.videoUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, videoUrl: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      placeholder="https://youtube.com/..."
                    />
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label htmlFor="form-tags" className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm flex items-center gap-1"
                    >
                      #{tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-600"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    id="form-tags"
                    onChange={(e) => {
                      if (e.target.value && !formData.tags.includes(e.target.value)) {
                        setFormData((prev) => ({ ...prev, tags: [...prev.tags, e.target.value] }));
                      }
                      e.target.value = '';
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select existing tag...</option>
                    {tags
                      .filter((t) => !formData.tags.includes(t.name))
                      .map((tag) => (
                        <option key={tag.id} value={tag.name}>
                          {tag.name}
                        </option>
                      ))}
                  </select>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Or create new tag..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTag.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Featured & Change Note */}
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">⭐ Featured Content</span>
                </label>
              </div>

              {showEditModal && (
                <div>
                  <label htmlFor="form-changeNote" className="block text-sm font-medium text-gray-700 mb-1">
                    Change Note (for version history)
                  </label>
                  <input
                    id="form-changeNote"
                    type="text"
                    value={changeNote}
                    onChange={(e) => setChangeNote(e.target.value)}
                    placeholder="Describe what changed..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                ยกเลิก
              </button>
              <button
                onClick={showCreateModal ? handleCreate : handleUpdate}
                disabled={!formData.titleTh || !formData.contentTh}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                <CheckIcon className="w-5 h-5" />
                {showCreateModal ? 'สร้างเนื้อหา' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* VIEW MODAL */}
      {/* ============================================================================ */}
      {showViewModal && selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(selectedArticle.status).color}`}>
                  {getStatusBadge(selectedArticle.status).label}
                </span>
                <span className="text-sm text-gray-500">v{selectedArticle.version || 1}</span>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedArticle(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close article view"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {selectedArticle.thumbnail && (
                <img
                  src={selectedArticle.thumbnail}
                  alt={selectedArticle.titleTh || selectedArticle.title}
                  className="w-full h-64 object-cover rounded-xl mb-6"
                />
              )}
              <span className="text-sm text-emerald-600 font-medium">
                {getCategoryName(selectedArticle.category)}
              </span>
              {/* Thai Title as Primary */}
              <h2 className="text-2xl font-bold text-gray-900 mt-2">{selectedArticle.titleTh || selectedArticle.title}</h2>
              {selectedArticle.title && selectedArticle.titleTh && (
                <h3 className="text-lg text-gray-500 mt-1">{selectedArticle.title}</h3>
              )}

              <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                <span>โดย {selectedArticle.createdByName || 'Unknown'}</span>
                <span>•</span>
                <span>{selectedArticle.readTimeMinutes || 5} นาที</span>
                <span>•</span>
                <span>{(selectedArticle.views || 0).toLocaleString()} ครั้ง</span>
              </div>

              {selectedArticle.tags && selectedArticle.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {selectedArticle.tags.map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Thai Content as Primary */}
              <div className="mt-6 prose prose-emerald max-w-none">
                <div dangerouslySetInnerHTML={{ __html: renderContentWithImages(selectedArticle.contentTh || selectedArticle.content) }} />
              </div>

              {/* English Version as Secondary */}
              {selectedArticle.content && selectedArticle.contentTh && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium text-gray-700 mb-2">🇬🇧 English Version</h4>
                  <div dangerouslySetInnerHTML={{ __html: renderContentWithImages(selectedArticle.content) }} />
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-between">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  openHistoryModal(selectedArticle);
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
                <HistoryIcon className="w-5 h-5" />
                View History
              </button>
              <div className="flex gap-3">
                {/* Submit for Approval - Only for drafts/rejected articles by non-admins */}
                {(selectedArticle.status === 'draft' || selectedArticle.status === 'rejected') && (
                  <button
                    onClick={() => handleSubmitForApproval(selectedArticle)}
                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Submit for Approval
                  </button>
                )}
                {/* Review Button - Only for admins viewing pending content */}
                {isAdmin && selectedArticle.status === 'pending' && (
                  <button
                    onClick={() => {
                      setShowViewModal(false);
                      setShowApprovalModal(true);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Review
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowViewModal(false);
                    openEditModal(selectedArticle);
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                >
                  <EditIcon className="w-5 h-5" />
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* HISTORY MODAL */}
      {/* ============================================================================ */}
      {showHistoryModal && selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Version History</h2>
              <button
                onClick={() => {
                  setShowHistoryModal(false);
                  setSelectedArticle(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
                aria-label="Close history"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4 p-4 bg-emerald-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-emerald-700">
                    Current Version: v{selectedArticle.version || 1}
                  </span>
                  <span className="text-sm text-emerald-600">
                    {new Date(selectedArticle.updatedAt || selectedArticle.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Last modified by {selectedArticle.updatedByName || 'Unknown'}
                </p>
              </div>

              {selectedArticle.history && selectedArticle.history.length > 0 ? (
                <div className="space-y-4">
                  {[...selectedArticle.history].reverse().map((version: ContentVersion) => (
                    <div key={`v-${version.version}-${version.modifiedAt}`} className="border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">Version {version.version}</span>
                        <span className="text-sm text-gray-500">
                          {new Date(version.modifiedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Modified by {version.modifiedByName || 'Unknown'}
                      </p>
                      {version.changeNote && (
                        <p className="text-sm text-gray-500 mt-1 italic">
                          "{version.changeNote}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <HistoryIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No previous versions</p>
                  <p className="text-sm">Changes will be tracked when you edit this content</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* DELETE CONFIRMATION */}
      {/* ============================================================================ */}
      {showDeleteConfirm && selectedArticle && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Content?</h2>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete "{selectedArticle.title}"? This action cannot be
                undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setSelectedArticle(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* APPROVAL MODAL (Admin Only) */}
      {/* ============================================================================ */}
      {showApprovalModal && selectedArticle && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Review Content</h2>
                  <p className="text-sm text-gray-600 mt-1">Approve or reject this submission</p>
                </div>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalComment('');
                    setRejectionReason('');
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  aria-label="Close approval modal"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Article Preview */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-gray-900 mb-2">{selectedArticle.title}</h3>
                {selectedArticle.titleTh && (
                  <p className="text-sm text-gray-600 mb-2">{selectedArticle.titleTh}</p>
                )}
                <p className="text-sm text-gray-600 mb-3">{selectedArticle.summary}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded">
                    {selectedArticle.category}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    {selectedArticle.type}
                  </span>
                  <span className="px-2 py-1 bg-gray-200 text-gray-700 rounded">
                    By: {selectedArticle.createdByName}
                  </span>
                </div>
              </div>

              {/* Approval Comment */}
              <div className="mb-4">
                <label htmlFor="approval-comment" className="block text-sm font-medium text-gray-700 mb-2">
                  Review Comment (Optional)
                </label>
                <textarea
                  id="approval-comment"
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  rows={3}
                  placeholder="Add feedback or notes for the author..."
                />
              </div>

              {/* Rejection Reason (shown when rejecting) */}
              <div className="mb-6">
                <label htmlFor="rejection-reason" className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason (Required for rejection)
                </label>
                <textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows={2}
                  placeholder="Explain why this content needs revision..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalComment('');
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleApprovalAction('reject')}
                  disabled={!rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <XMarkIcon className="w-4 h-4" />
                  Reject
                </button>
                <button
                  onClick={() => handleApprovalAction('approve')}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
                >
                  <CheckIcon className="w-4 h-4" />
                  Approve & Publish
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* PENDING APPROVALS LIST (Admin Only) */}
      {/* ============================================================================ */}
      {showPendingList && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Pending Approvals</h2>
                  <p className="text-sm text-gray-600 mt-1">{pendingCount} articles awaiting review</p>
                </div>
                <button
                  onClick={() => setShowPendingList(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  aria-label="Close pending list"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {pendingArticles.length > 0 ? (
                <div className="space-y-4">
                  {pendingArticles.map((article) => (
                    <div
                      key={article.id}
                      className="bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{article.title}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{article.summary}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                            <span>By: {article.createdByName}</span>
                            <span>•</span>
                            <span>{article.category}</span>
                            <span>•</span>
                            <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setShowPendingList(false);
                            openApprovalModal(article);
                          }}
                          className="ml-4 px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <CheckIcon className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-medium">All caught up!</p>
                  <p className="text-sm">No pending content to review</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalContent;
