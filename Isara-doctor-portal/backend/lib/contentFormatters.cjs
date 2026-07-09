/**
 * Shared formatters for medical content and clinical resources API responses.
 */

function parseJsonField(value, fallback = []) {
  if (value == null) return fallback;
  if (Array.isArray(value)) return value;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value || '[]');
  } catch {
    return fallback;
  }
}

function normalizeStatus(status) {
  if (status === 'approved') return 'published';
  return status;
}

function formatMedicalArticle(a) {
  if (!a) return null;
  const summaryThai = a.summary_thai || (a.content_thai ? a.content_thai.substring(0, 200) : '');
  const summaryEnglish = a.summary_english || (a.content_english ? a.content_english.substring(0, 200) : '');
  return {
    id: a.id,
    title: a.title_thai || a.title || a.title_english || '',
    titleTh: a.title_thai || a.title || '',
    titleThai: a.title_thai || a.title || '',
    titleEnglish: a.title_english || '',
    content: a.content_thai || a.content || a.content_english || '',
    contentTh: a.content_thai || a.content || '',
    contentThai: a.content_thai || a.content || '',
    contentEnglish: a.content_english || '',
    summary: summaryThai || summaryEnglish,
    summaryTh: summaryThai,
    summaryEnglish,
    category: a.category,
    type: a.content_type || 'article',
    tags: parseJsonField(a.tags, []),
    author: { id: a.author_id, name: a.author_name || 'Unknown' },
    authorName: a.author_name || 'Unknown',
    createdBy: a.author_id,
    createdByName: a.author_name || 'Unknown',
    status: normalizeStatus(a.status),
    viewCount: a.view_count || 0,
    likeCount: a.like_count || 0,
    isFeatured: Boolean(a.is_featured),
    videoUrl: a.video_url || null,
    imageUrl: a.image_url || null,
    thumbnail: a.image_url || null,
    version: a.version || 1,
    history: parseJsonField(a.history, []),
    comments: parseJsonField(a.comments, []),
    rejectionReason: a.rejection_reason || null,
    submittedAt: a.submitted_at,
    approvedBy: a.approved_by,
    approvedAt: a.approved_at,
    createdAt: a.created_at,
    updatedAt: a.updated_at,
    publishedAt: a.published_at,
  };
}

function formatClinicalResource(r) {
  if (!r) return null;
  const descriptionThai = r.description_thai || (r.content_thai ? r.content_thai.substring(0, 200) : '');
  const descriptionEnglish = r.description_english || (r.content_english ? r.content_english.substring(0, 200) : '');
  return {
    id: r.id,
    title: r.title_english || r.title_thai || '',
    titleTh: r.title_thai || '',
    titleThai: r.title_thai,
    titleEnglish: r.title_english,
    description: descriptionEnglish || descriptionThai,
    descriptionTh: descriptionThai,
    descriptionThai: descriptionThai,
    descriptionEnglish,
    content: r.content_english || r.content_thai || '',
    contentTh: r.content_thai || '',
    contentThai: r.content_thai,
    contentEnglish: r.content_english,
    category: r.category,
    specialty: r.specialty,
    guidelineYear: r.guideline_year,
    source: r.source,
    resourceType: r.resource_type || 'guideline',
    references: parseJsonField(r.references_list, []),
    tags: parseJsonField(r.tags, []),
    createdBy: r.author_id,
    createdByName: r.author_name || r.source || 'Clinical Team',
    author: {
      id: r.author_id || r.approved_by,
      name: r.author_name || r.source || 'Clinical Team',
    },
    status: normalizeStatus(r.status),
    viewCount: r.view_count || 0,
    downloadCount: 0,
    imageUrl: r.image_url || null,
    version: r.version || 1,
    history: parseJsonField(r.history, []),
    comments: parseJsonField(r.comments, []),
    rejectionReason: r.rejection_reason || null,
    submittedAt: r.submitted_at,
    publishedAt: r.published_at || r.approved_at,
    reviewedBy: r.approved_by,
    reviewedAt: r.approved_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

module.exports = {
  parseJsonField,
  normalizeStatus,
  formatMedicalArticle,
  formatClinicalResource,
};
