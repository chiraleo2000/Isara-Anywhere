/**
 * Clinical Resources Component
 * Medical Guidelines, Research Papers, and Study Materials
 * Full CRUD for doctors, Admin approval workflow, Version history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/common/AuthProvider';
import { useSettings } from '../../hooks/useSettings';
import { useRealtimeSync } from '../../services/useRealtimeSync';
import { getAuthHeaders } from '../../services/authServices';
import {
  type ClinicalResourceItem,
  type ContentTag,
  type ContentVersion,
  type ContentStatus,
  type ClinicalResourcesCategoryId,
  CLINICAL_RESOURCES_CATEGORIES,
} from '../../types/contentTypes';

// ============================================================================
// API BASE URL - Empty string for relative paths in production (Cloud Run)
// ============================================================================
const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================================================
// STATUS CONFIG
// ============================================================================
const statusConfig: Record<ContentStatus, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  pending: { label: 'Pending Approval', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  published: { label: 'Published', color: 'text-green-700', bgColor: 'bg-green-100' },
  rejected: { label: 'Rejected', color: 'text-red-700', bgColor: 'bg-red-100' },
  archived: { label: 'Archived', color: 'text-gray-700', bgColor: 'bg-gray-200' },
};

// ============================================================================
// CUSTOM ICONS
// ============================================================================
const PlusIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const EditIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XMarkIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const HistoryIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);

// ============================================================================
// HELPER FUNCTIONS (module scope - S2004)
// ============================================================================
const getCategoryIcon = (categoryId: string) => {
  switch (categoryId) {
    case 'diagnosis': return '🔍';
    case 'treatment': return '💊';
    case 'pharmacology': return '💊';
    case 'surgery': return '🔪';
    case 'emergency': return '🚨';
    case 'pediatrics': return '👶';
    case 'radiology': return '🩻';
    case 'laboratory': return '🧪';
    case 'pathology': return '🔬';
    default: return '📄';
  }
};

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

// i18n labels for Clinical Resources page
const _labels = {
  pageTitle: { en: 'Clinical Resources', th: 'ทรัพยากรทางคลินิก' },
  subtitle: { en: 'Medical Guidelines, Research Papers & Study Materials', th: 'แนวทางการแพทย์ งานวิจัย และเอกสารการศึกษา' },
  searchResources: { en: 'Search resources...', th: 'ค้นหาทรัพยากร...' },
  createNew: { en: 'Create New', th: 'สร้างใหม่' },
  allCategories: { en: 'All Categories', th: 'ทุกหมวดหมู่' },
  guidelines: { en: 'Guidelines', th: 'แนวทาง' },
  research: { en: 'Research Papers', th: 'งานวิจัย' },
  protocols: { en: 'Protocols', th: 'โปรโตคอล' },
  pendingApproval: { en: 'Pending Approval', th: 'รอการอนุมัติ' },
  myContentOnly: { en: 'My Content Only', th: 'เนื้อหาของฉันเท่านั้น' },
};

export const ClinicalResources: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useSettings();
  const isDark = theme === 'dark';
  const themeClasses = isDark ? {
    container: 'bg-gray-900',
    panelBg: 'bg-gray-800 border-gray-700',
    titleText: 'text-white',
    subtitleText: 'text-gray-400',
    searchInput: 'bg-gray-700 border-gray-600 text-white placeholder-gray-400',
    selectInput: 'bg-gray-700 border-gray-600 text-white',
    checkboxBg: 'bg-gray-700',
    checkboxText: 'text-gray-300',
    inactiveCategory: 'bg-gray-700 text-gray-300 hover:bg-gray-600',
    divider: 'border-gray-700',
  } : {
    container: 'bg-gray-50',
    panelBg: 'bg-white border-gray-200',
    titleText: 'text-gray-900',
    subtitleText: 'text-gray-600',
    searchInput: 'border-gray-300',
    selectInput: 'border-gray-300',
    checkboxBg: 'bg-gray-50',
    checkboxText: 'text-gray-700',
    inactiveCategory: 'bg-gray-100 text-gray-600 hover:bg-gray-200',
    divider: 'border-gray-200',
  };
  const isAdmin = user?.email?.includes('admin') || user?.role === 'admin';

  // Data states
  const [resources, setResources] = useState<ClinicalResourceItem[]>([]);
  const [tags, setTags] = useState<ContentTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Filter states  
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedResource, setSelectedResource] = useState<ClinicalResourceItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContentStatus | 'all'>('all');
  const [showMyContentOnly, setShowMyContentOnly] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showPendingList, setShowPendingList] = useState(false);
  const [pendingResources, setPendingResources] = useState<ClinicalResourceItem[]>([]);

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    titleTh: string;
    description: string;
    descriptionTh: string;
    content: string;
    contentTh: string;
    category: ClinicalResourcesCategoryId;
    resourceType: 'guideline' | 'protocol' | 'research' | 'template' | 'reference';
    tags: string[];
    source: string;
    references: string[];
    status: ContentStatus;
  }>({
    title: '',
    titleTh: '',
    description: '',
    descriptionTh: '',
    content: '',
    contentTh: '',
    category: 'diagnosis',
    resourceType: 'guideline',
    tags: [],
    source: '',
    references: [],
    status: 'draft',
  });
  const [changeNote, setChangeNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newReference, setNewReference] = useState('');
  const [approvalComment, setApprovalComment] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // ============================================================================
  // DATA FETCHING
  // ============================================================================
  const fetchResources = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/api/content/clinical`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch resources');
      const data = await response.json();
      setResources(data.resources || []);
      setPendingCount(data.pendingCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching resources:', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, isAdmin]);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/content/tags/clinical`);
      if (!response.ok) throw new Error('Failed to fetch tags');
      const data = await response.json();
      setTags(data.tags || []);
    } catch (err) {
      console.error('Error fetching tags:', err);
    }
  }, []);

  const fetchPendingApprovals = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const response = await fetch(`${API_BASE}/api/content/clinical/pending`, {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch pending');
      const data = await response.json();
      setPendingResources(data.resources || []);
      setPendingCount(data.count || 0);
    } catch (err) {
      console.error('Error fetching pending:', err);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchResources();
    fetchTags();
    if (isAdmin) {
      fetchPendingApprovals();
    }
  }, [fetchResources, fetchTags, fetchPendingApprovals, isAdmin]);

  // Real-time sync: refetch resources (and pending approvals for admin) on any content change
  useRealtimeSync({
    doctorId: user?.id,
    onContentChange: () => {
      fetchResources();
      if (isAdmin) fetchPendingApprovals();
    },
  });

  // ============================================================================
  // FILTERING
  // ============================================================================
  const filteredResources = resources.filter((resource) => {
    const matchesCategory = selectedCategory === 'all' || resource.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      resource.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.titleTh?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      resource.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || resource.status === statusFilter;
    const matchesMyContent = !showMyContentOnly || resource.createdBy === user?.id;
    return matchesCategory && matchesSearch && matchesStatus && matchesMyContent;
  });

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================
  const handleCreate = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE}/api/content/clinical`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          status: 'draft',
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create resource');
      }
      const newResource = await response.json();
      setResources((prev) => [...prev, newResource]);
      setShowCreateModal(false);
      resetForm();
      if (formData.status === 'pending' && isAdmin) {
        fetchPendingApprovals();
      }
    } catch (err) {
      console.error('Error creating resource:', err);
      setError(err instanceof Error ? err.message : 'Failed to create resource');
    }
  };

  const handleUpdate = async () => {
    if (!selectedResource) return;
    try {
      const response = await fetch(`${API_BASE}/api/content/clinical/${selectedResource.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          userId: user?.id || 'unknown',
          userName: user?.name || user?.email || 'Unknown',
          changeNote: changeNote || 'Updated',
        }),
      });
      if (!response.ok) throw new Error('Failed to update resource');
      const updatedResource = await response.json();
      setResources((prev) => prev.map((r) => (r.id === updatedResource.id ? updatedResource : r)));
      setSelectedResource(updatedResource);
      setShowEditModal(false);
      resetForm();
    } catch (err) {
      console.error('Error updating resource:', err);
      alert('Failed to update resource');
    }
  };

  const handleDelete = async () => {
    if (!selectedResource) return;
    try {
      const response = await fetch(
        `${API_BASE}/api/content/clinical/${selectedResource.id}`,
        { method: 'DELETE', headers: getAuthHeaders(), credentials: 'include' }
      );
      if (!response.ok) throw new Error('Failed to delete resource');
      setResources((prev) => prev.filter((r) => r.id !== selectedResource.id));
      setSelectedResource(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('Error deleting resource:', err);
      alert('Failed to delete resource');
    }
  };

  const handleApprovalAction = async (action: 'approve' | 'reject') => {
    if (!selectedResource) return;
    try {
      const response = await fetch(`${API_BASE}/api/content/clinical/${selectedResource.id}/review`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action,
          userId: user?.id,
          userName: user?.name || user?.email || 'Admin',
          comment: approvalComment,
          rejectionReason: action === 'reject' ? rejectionReason : undefined,
        }),
      });
      if (!response.ok) throw new Error(`Failed to ${action} resource`);
      const result = await response.json();
      setResources((prev) => prev.map((r) => (r.id === result.resource.id ? result.resource : r)));
      setSelectedResource(result.resource);
      setShowApprovalModal(false);
      setApprovalComment('');
      setRejectionReason('');
      fetchPendingApprovals();
    } catch (err) {
      console.error(`Error ${action}ing resource:`, err);
      alert(`Failed to ${action} resource`);
    }
  };

  const handleCreateTag = async () => {
    if (!newTag.trim()) return;
    try {
      const response = await fetch(`${API_BASE}/api/content/tags/clinical`, {
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

  const handleSubmitForApproval = async (resource: ClinicalResourceItem) => {
    try {
      const response = await fetch(`${API_BASE}/api/content/clinical/${resource.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'pending',
          userId: user?.id || 'unknown',
          userName: user?.name || user?.email || 'Unknown',
          changeNote: 'Submitted for approval',
        }),
      });
      if (!response.ok) throw new Error('Failed to submit for approval');
      const updatedResource = await response.json();
      setResources((prev) => prev.map((r) => (r.id === updatedResource.id ? updatedResource : r)));
      setSelectedResource(updatedResource);
    } catch (err) {
      console.error('Error submitting for approval:', err);
      alert('Failed to submit for approval');
    }
  };

  // ============================================================================
  // HELPERS
  // ============================================================================
  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, tags: prev.tags.filter((t) => t !== tag) }));
  };

  const handleRemoveReference = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      references: prev.references.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    setFormData({
      title: '',
      titleTh: '',
      description: '',
      descriptionTh: '',
      content: '',
      contentTh: '',
      category: CLINICAL_RESOURCES_CATEGORIES[0].id,
      resourceType: 'guideline',
      tags: [],
      source: '',
      references: [],
      status: 'draft',
    });
    setChangeNote('');
  };

  const openEditModal = (resource: ClinicalResourceItem) => {
    setFormData({
      title: resource.title,
      titleTh: resource.titleTh || '',
      description: resource.description || '',
      descriptionTh: resource.descriptionTh || '',
      content: resource.content,
      contentTh: resource.contentTh || '',
      category: resource.category,
      resourceType: resource.resourceType || 'guideline',
      tags: resource.tags || [],
      source: resource.source || '',
      references: resource.references || [],
      status: resource.status,
    });
    setShowEditModal(true);
  };

  const getCategoryInfo = (categoryId: string) => {
    const cat = CLINICAL_RESOURCES_CATEGORIES.find(c => c.id === categoryId);
    return cat || { id: categoryId, name: categoryId, nameTh: categoryId };
  };

  // ============================================================================
  // RENDER - LOADING
  // ============================================================================
  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="text-6xl mb-4">📚</div>
          <p className="text-gray-500">Loading clinical resources...</p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER - MAIN
  // ============================================================================

  const renderResourceDetail = (resource: ClinicalResourceItem) => (
    <div className="max-w-4xl mx-auto">
      {/* Resource Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className={`text-sm px-3 py-1 rounded-full ${statusConfig[resource.status]?.bgColor} ${statusConfig[resource.status]?.color}`}>
            {statusConfig[resource.status]?.label}
          </span>
          <span className="text-sm px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
            {getCategoryInfo(resource.category).name}
          </span>
          <span className="text-sm text-gray-500">v{resource.version || 1}</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {resource.titleTh || resource.title}
        </h1>
        {resource.title && resource.titleTh && (
          <h2 className="text-xl text-gray-500 mb-3">{resource.title}</h2>
        )}
        <p className="text-gray-700">{resource.descriptionTh || resource.description}</p>

        {/* Tags */}
        {resource.tags && resource.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {resource.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta Info */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
          <span>By {resource.createdByName || resource.source || 'ทีมแพทย์ Isara'}</span>
          <span>Updated: {new Date(resource.updatedAt || resource.createdAt).toLocaleDateString()}</span>
          {resource.source && <span>Source: {resource.source}</span>}
        </div>

        {/* Rejection Reason */}
        {resource.status === 'rejected' && resource.rejectionReason && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 font-medium">Rejection Reason:</p>
            <p className="text-red-600">{resource.rejectionReason}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          {/* Owner actions */}
          {resource.createdBy === user?.id && (
            <>
              <button
                onClick={() => openEditModal(resource)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <EditIcon className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
              >
                <TrashIcon className="w-4 h-4" />
                Delete
              </button>
              {resource.status === 'draft' && (
                <button
                  onClick={() => handleSubmitForApproval(resource)}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  Submit for Approval
                </button>
              )}
            </>
          )}
          {/* Admin actions */}
          {isAdmin && resource.status === 'pending' && (
            <button
              onClick={() => setShowApprovalModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Review & Approve
            </button>
          )}
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <HistoryIcon className="w-4 h-4" />
            History
          </button>
        </div>
      </div>

      {/* Resource Content - Thai as Primary */}
      <div className="prose prose-lg max-w-none">
        <div
          className="text-gray-800 leading-relaxed font-sans"
          dangerouslySetInnerHTML={{ __html: renderContentWithImages(resource.contentTh || resource.content) }}
        />
      </div>

      {/* English Content as Secondary */}
      {resource.content && resource.contentTh && (
        <div className="mt-8 pt-6 border-t">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">🇬🇧 English Version</h3>
          <div
            className="text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderContentWithImages(resource.content) }}
          />
        </div>
      )}

      {/* References */}
      {resource.references && resource.references.length > 0 && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-3">References</h3>
          <ul className="space-y-2">
            {resource.references.map((ref) => (
              <li key={`ref-${ref}`} className="text-sm text-gray-700">• {ref}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Comments */}
      {resource.comments && resource.comments.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-3">Admin Feedback</h3>
          <div className="space-y-3">
            {resource.comments.filter(c => c.isAdminFeedback).map((comment) => (
              <div key={comment.id} className="p-4 bg-blue-50 rounded-lg">
                <p className="text-gray-700">{comment.content}</p>
                <p className="text-xs text-gray-500 mt-2">
                  — {comment.authorName}, {new Date(comment.createdAt).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`h-full flex flex-col ${themeClasses.container}`}>
      {/* Header */}
      <div className={`border-b px-6 py-4 ${themeClasses.panelBg}`}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className={`text-2xl font-bold mb-1 ${themeClasses.titleText}`}>
              📚 Clinical Resources & Medical Library
            </h1>
            <p className={`text-sm ${themeClasses.subtitleText}`}>
              Access medical guidelines, research papers, and evidence-based study materials
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Admin: Pending Approvals Button */}
            {isAdmin && pendingCount > 0 && (
              <button
                onClick={() => {
                  fetchPendingApprovals();
                  setShowPendingList(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg hover:bg-yellow-200 transition-colors"
              >
                <BellIcon className="w-5 h-5" />
                {pendingCount} Pending
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Create Resource
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className={`border-b px-6 py-3 ${themeClasses.panelBg}`}>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px] relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search guidelines, topics, or keywords..."
              aria-label="ค้นหาแนวทางเวชปฏิบัติ"
              className={`w-full px-4 py-2 pl-10 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${themeClasses.searchInput}`}
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ContentStatus | 'all')}
            className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 ${themeClasses.selectInput}`}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </select>
          <label className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer ${themeClasses.checkboxBg}`}>
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

      {/* Category Tabs */}
      <div className={`border-b px-6 py-3 overflow-x-auto ${themeClasses.panelBg}`}>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${selectedCategory === 'all'
              ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
              : themeClasses.inactiveCategory
              }`}
          >
            📚 All Resources
          </button>
          {CLINICAL_RESOURCES_CATEGORIES.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${selectedCategory === category.id
                ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-500'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {getCategoryIcon(category.id)} {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
          <button onClick={fetchResources} className="ml-4 underline">Retry</button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Resource List */}
        <div className={`w-96 border-r flex flex-col ${themeClasses.panelBg}`}>
          <div className={`p-4 border-b ${themeClasses.divider}`}>
            <p className={`text-sm ${themeClasses.subtitleText}`}>
              {filteredResources.length} resource{filteredResources.length === 1 ? '' : 's'} found
            </p>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredResources.map((resource) => (
              <button
                key={resource.id}
                onClick={() => setSelectedResource(resource)}
                data-testid="content-item"
                className={`content-item card w-full text-left p-4 border-b border-gray-200 hover:bg-gray-50 transition-colors ${selectedResource?.id === resource.id ? 'bg-emerald-50 border-l-4 border-emerald-600' : ''
                  }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 pr-2 line-clamp-1">
                    {resource.titleTh || resource.title}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusConfig[resource.status]?.bgColor} ${statusConfig[resource.status]?.color} whitespace-nowrap`}>
                    {statusConfig[resource.status]?.label}
                  </span>
                </div>
                {resource.title && resource.titleTh && (
                  <p className="text-sm text-gray-400 mb-1 line-clamp-1">{resource.title}</p>
                )}
                <p className="text-xs text-gray-500 line-clamp-2">{resource.descriptionTh || resource.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-emerald-600">{getCategoryInfo(resource.category).name}</span>
                  <span className="text-xs text-gray-400">v{resource.version || 1}</span>
                </div>
              </button>
            ))}
            {filteredResources.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📭</div>
                <div className="text-lg font-medium">No resources found</div>
                <div className="text-sm">Try adjusting your search or category filter</div>
              </div>
            )}
          </div>
        </div>

        {/* Resource Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          {selectedResource ? renderResourceDetail(selectedResource) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-8xl mb-6">📚</div>
                <h2 className="text-2xl font-bold text-gray-700 mb-2">Clinical Resources & Medical Library</h2>
                <p className="text-gray-600 mb-6">
                  Select a resource from the list to view comprehensive medical guidelines
                </p>
              </div>
            </div>
          )}
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
                {showCreateModal ? 'Create New Resource' : 'Edit Resource'}
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
              {/* Title - Thai as Primary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="resource-title-th" className="block text-sm font-medium text-gray-700 mb-1">ชื่อเรื่อง (ภาษาไทย) *</label>
                  <input
                    id="resource-title-th"
                    type="text"
                    value={formData.titleTh}
                    onChange={(e) => setFormData((prev) => ({ ...prev, titleTh: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="ระบุชื่อเรื่องเป็นภาษาไทย"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="resource-title-en" className="block text-sm font-medium text-gray-700 mb-1">Title (English)</label>
                  <input
                    id="resource-title-en"
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Optional English title"
                  />
                </div>
              </div>

              {/* Description - Thai as Primary */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="resource-desc-th" className="block text-sm font-medium text-gray-700 mb-1">คำอธิบาย (ภาษาไทย) *</label>
                  <textarea
                    id="resource-desc-th"
                    value={formData.descriptionTh}
                    onChange={(e) => setFormData((prev) => ({ ...prev, descriptionTh: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="อธิบายเนื้อหาโดยย่อ"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="resource-desc-en" className="block text-sm font-medium text-gray-700 mb-1">Description (English)</label>
                  <textarea
                    id="resource-desc-en"
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                    placeholder="Optional English description"
                  />
                </div>
              </div>

              {/* Content - Thai as Primary with Image Support */}
              <div>
                <label htmlFor="resource-content-th" className="block text-sm font-medium text-gray-700 mb-1">เนื้อหา (ภาษาไทย) *</label>
                <div className="mb-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  <p className="font-medium mb-1">💡 รองรับการแทรกรูปภาพ:</p>
                  <p>ใช้รูปแบบ: <code className="bg-blue-100 px-1 rounded">[image:URL:description]</code></p>
                  <p>ตัวอย่าง: <code className="bg-blue-100 px-1 rounded">[image:https://example.com/diagram.jpg:แผนภาพการรักษา]</code></p>
                </div>
                <textarea
                  id="resource-content-th"
                  value={formData.contentTh}
                  onChange={(e) => setFormData((prev) => ({ ...prev, contentTh: e.target.value }))}
                  rows={10}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                  placeholder="เขียนเนื้อหาเป็นภาษาไทย สามารถใช้ Markdown และแทรกรูปภาพได้"
                  required
                />
              </div>
              <div>
                <label htmlFor="resource-content-en" className="block text-sm font-medium text-gray-700 mb-1">Content (English)</label>
                <div className="mb-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
                  <p className="font-medium mb-1">💡 Image Support:</p>
                  <p>Use format: <code className="bg-gray-100 px-1 rounded">[image:URL:description]</code></p>
                </div>
                <textarea
                  id="resource-content-en"
                  value={formData.content}
                  onChange={(e) => setFormData((prev) => ({ ...prev, content: e.target.value }))}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 font-mono text-sm"
                  placeholder="Optional English content. You can use Markdown and [image:URL:description] format."
                />
              </div>

              {/* Category, Type, Status */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label htmlFor="resource-category" className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    id="resource-category"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value as typeof prev.category }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    {CLINICAL_RESOURCES_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="resource-type" className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
                  <select
                    id="resource-type"
                    value={formData.resourceType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, resourceType: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="guideline">📋 Guideline</option>
                    <option value="protocol">📑 Protocol</option>
                    <option value="research">📊 Research</option>
                    <option value="template">📝 Template</option>
                    <option value="reference">📚 Reference</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="resource-status" className="block text-sm font-medium text-gray-700 mb-1">Initial Status</label>
                  <select
                    id="resource-status"
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as ContentStatus }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="draft">Draft (Save for later)</option>
                    <option value="pending">Submit for Approval</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Clinical resources require admin approval before publishing
                  </p>
                </div>
              </div>

              {/* Source */}
              <div>
                <label htmlFor="resource-source" className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <input
                  id="resource-source"
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData((prev) => ({ ...prev, source: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., WHO Guidelines, Journal Name..."
                />
              </div>

              {/* Tags */}
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-1">Tags</span>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm flex items-center gap-1">
                      #{tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="hover:text-red-600"
                      >×</button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    aria-label="Select tag"
                    onChange={(e) => {
                      if (e.target.value && !formData.tags.includes(e.target.value)) {
                        setFormData((prev) => ({ ...prev, tags: [...prev.tags, e.target.value] }));
                      }
                      e.target.value = '';
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Select existing tag...</option>
                    {tags.filter((t) => !formData.tags.includes(t.name)).map((tag) => (
                      <option key={tag.id} value={tag.name}>{tag.name}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Or create new..."
                    aria-label="Create new tag"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={handleCreateTag}
                    disabled={!newTag.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >Add</button>
                </div>
              </div>

              {/* References */}
              <div>
                <span className="block text-sm font-medium text-gray-700 mb-1">References</span>
                <div className="space-y-2 mb-2">
                  {formData.references.map((ref, idx) => (
                    <div key={`formref-${idx}-${ref}`} className="flex items-center gap-2">
                      <span className="flex-1 px-3 py-2 bg-gray-50 rounded-lg text-sm">{ref}</span>
                      <button
                        onClick={() => handleRemoveReference(idx)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >×</button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newReference}
                    onChange={(e) => setNewReference(e.target.value)}
                    placeholder="Add a reference..."
                    aria-label="Add a reference"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => {
                      if (newReference.trim()) {
                        setFormData((prev) => ({
                          ...prev,
                          references: [...prev.references, newReference.trim()],
                        }));
                        setNewReference('');
                      }
                    }}
                    disabled={!newReference.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                  >Add</button>
                </div>
              </div>

              {/* Change Note (Edit only) */}
              {showEditModal && (
                <div>
                  <label htmlFor="resource-change-note" className="block text-sm font-medium text-gray-700 mb-1">Change Note</label>
                  <input
                    id="resource-change-note"
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
              >ยกเลิก</button>
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
      {/* ADMIN APPROVAL MODAL */}
      {/* ============================================================================ */}
      {showApprovalModal && selectedResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full">
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-gray-900">Review Resource</h2>
              <p className="text-sm text-gray-600 mt-1">{selectedResource.title}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="approval-comment" className="block text-sm font-medium text-gray-700 mb-1">Comment (optional)</label>
                <textarea
                  id="approval-comment"
                  value={approvalComment}
                  onChange={(e) => setApprovalComment(e.target.value)}
                  rows={3}
                  placeholder="Add feedback for the author..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label htmlFor="approval-rejection-reason" className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason (if rejecting)</label>
                <input
                  id="approval-rejection-reason"
                  type="text"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Why is this being rejected?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >Cancel</button>
              <button
                onClick={() => {
                  if (!rejectionReason.trim()) {
                    setRejectionReason('Content does not meet requirements');
                  }
                  handleApprovalAction('reject');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >Reject</button>
              <button
                onClick={() => handleApprovalAction('approve')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >Approve</button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* PENDING APPROVALS LIST (Admin) */}
      {/* ============================================================================ */}
      {showPendingList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Pending Approvals ({pendingCount})</h2>
              <button onClick={() => setShowPendingList(false)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close pending list">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {pendingResources.length > 0 ? (
                <div className="space-y-4">
                  {pendingResources.map((resource) => (
                    <div key={resource.id} className="border rounded-xl p-4 hover:bg-gray-50">
                      <h3 className="font-semibold text-gray-900">{resource.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500">
                          By {resource.createdByName} • Submitted {new Date(resource.submittedAt || resource.updatedAt).toLocaleDateString()}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedResource(resource);
                            setShowPendingList(false);
                          }}
                          className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                        >Review →</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">✅</div>
                  <p>No pending approvals</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* HISTORY MODAL */}
      {/* ============================================================================ */}
      {showHistoryModal && selectedResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Version History</h2>
              <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-gray-100 rounded-lg" aria-label="Close history">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 bg-emerald-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-emerald-700">Current: v{selectedResource.version || 1}</span>
                  <span className="text-sm text-emerald-600">
                    {new Date(selectedResource.updatedAt || selectedResource.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">By {selectedResource.updatedByName || 'Unknown'}</p>
              </div>
              {selectedResource.history && selectedResource.history.length > 0 ? (
                <div className="space-y-4">
                  {[...selectedResource.history].reverse().map((version: ContentVersion, index: number) => (
                    <div key={`history-v${version.version}-${index}`} className="border rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-gray-700">Version {version.version}</span>
                        <span className="text-sm text-gray-500">{new Date(version.modifiedAt).toLocaleString()}</span>
                      </div>
                      <p className="text-sm text-gray-600">By {version.modifiedByName || 'Unknown'}</p>
                      {version.changeNote && (
                        <p className="text-sm text-gray-500 mt-1 italic">"{version.changeNote}"</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <HistoryIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No previous versions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* DELETE CONFIRMATION */}
      {/* ============================================================================ */}
      {showDeleteConfirm && selectedResource && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrashIcon className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Resource?</h2>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete "{selectedResource.title}"? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >Cancel</button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicalResources;
