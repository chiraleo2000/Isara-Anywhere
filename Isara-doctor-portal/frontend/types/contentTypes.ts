/**
 * Content Types for Medical Content and Clinical Resources
 * 
 * Medical Content: Shared between Doctor and Patient portals
 * - Doctors: Full CRUD (create, edit, delete, publish)
 * - Patients: Read-only access to published content
 * 
 * Clinical Resources: Doctor portal only
 * - Doctors: Full CRUD with approval workflow
 * - Admin: Approve/Reject only (no edit/delete)
 * 
 * Both support:
 * - Versioning with history tracking
 * - Comments (internal for editors/admins)
 * - Categories (fixed) and Tags (doctor-created)
 */

// ============================================================================
// FIXED CATEGORIES (Standard Health Education Categories)
// ============================================================================

export const MEDICAL_CONTENT_CATEGORIES = [
  { id: 'general-health', name: 'General Health', nameTh: 'สุขภาพทั่วไป', icon: 'Heart' },
  { id: 'chronic-disease', name: 'Chronic Diseases', nameTh: 'โรคเรื้อรัง', icon: 'Activity' },
  { id: 'mental-health', name: 'Mental Health', nameTh: 'สุขภาพจิต', icon: 'Brain' },
  { id: 'nutrition', name: 'Nutrition', nameTh: 'โภชนาการ', icon: 'Apple' },
  { id: 'exercise', name: 'Exercise & Fitness', nameTh: 'การออกกำลังกาย', icon: 'Dumbbell' },
  { id: 'preventive-care', name: 'Preventive Care', nameTh: 'การดูแลเชิงป้องกัน', icon: 'Shield' },
  { id: 'womens-health', name: "Women's Health", nameTh: 'สุขภาพผู้หญิง', icon: 'Heart' },
  { id: 'mens-health', name: "Men's Health", nameTh: 'สุขภาพผู้ชาย', icon: 'Heart' },
  { id: 'pediatrics', name: 'Pediatrics', nameTh: 'กุมารเวชศาสตร์', icon: 'Baby' },
  { id: 'elderly-care', name: 'Elderly Care', nameTh: 'การดูแลผู้สูงอายุ', icon: 'Users' },
  { id: 'first-aid', name: 'First Aid', nameTh: 'การปฐมพยาบาล', icon: 'Cross' },
  { id: 'medications', name: 'Medications', nameTh: 'ยาและการใช้ยา', icon: 'Pill' },
] as const;

export const CLINICAL_RESOURCES_CATEGORIES = [
  { id: 'diagnosis', name: 'Diagnosis Guidelines', nameTh: 'แนวทางการวินิจฉัย', icon: 'Stethoscope' },
  { id: 'treatment', name: 'Treatment Protocols', nameTh: 'แนวทางการรักษา', icon: 'FileText' },
  { id: 'pharmacology', name: 'Pharmacology', nameTh: 'เภสัชวิทยา', icon: 'Pill' },
  { id: 'radiology', name: 'Radiology', nameTh: 'รังสีวิทยา', icon: 'Image' },
  { id: 'laboratory', name: 'Laboratory', nameTh: 'ห้องปฏิบัติการ', icon: 'TestTube' },
  { id: 'pathology', name: 'Pathology', nameTh: 'พยาธิวิทยา', icon: 'Microscope' },
  { id: 'emergency', name: 'Emergency Medicine', nameTh: 'เวชศาสตร์ฉุกเฉิน', icon: 'Siren' },
  { id: 'nursing', name: 'Nursing Guidelines', nameTh: 'แนวทางการพยาบาล', icon: 'Heart' },
  { id: 'research', name: 'Research Papers', nameTh: 'งานวิจัย', icon: 'BookOpen' },
  { id: 'case-studies', name: 'Case Studies', nameTh: 'กรณีศึกษา', icon: 'FileCase' },
] as const;

export type MedicalContentCategoryId = typeof MEDICAL_CONTENT_CATEGORIES[number]['id'];
export type ClinicalResourcesCategoryId = typeof CLINICAL_RESOURCES_CATEGORIES[number]['id'];

// ============================================================================
// STATUS TYPES
// ============================================================================

export type ContentStatus = 
  | 'draft'           // Saved but not submitted
  | 'pending'         // Awaiting approval (Clinical Resources only)
  | 'published'       // Live and visible
  | 'rejected'        // Rejected by admin (Clinical Resources only)
  | 'archived';       // Hidden but preserved

// ============================================================================
// VERSION HISTORY
// ============================================================================

export interface ContentVersion {
  version: number;
  title: string;
  content: string;
  summary: string;
  modifiedBy: string;
  modifiedByName: string;
  modifiedAt: string;
  changeNote?: string;
}

// ============================================================================
// COMMENTS (Internal for editors/admins)
// ============================================================================

export interface ContentComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: 'doctor' | 'admin';
  content: string;
  createdAt: string;
  isAdminFeedback?: boolean; // True if this is approval/rejection feedback
}

// ============================================================================
// TAGS (Doctor-created, dynamic)
// ============================================================================

export interface ContentTag {
  id: string;
  name: string;
  nameTh?: string;
  createdBy: string;
  createdAt: string;
  usageCount: number;
}

// ============================================================================
// MEDICAL CONTENT (Shared between Doctor and Patient portals)
// ============================================================================

export interface MedicalContentArticle {
  id: string;
  
  // Core content
  title: string;
  titleTh?: string;
  summary: string;
  summaryTh?: string;
  content: string; // Markdown or rich text
  contentTh?: string;
  
  // Classification
  category: MedicalContentCategoryId;
  tags: string[]; // Tag IDs
  type: 'article' | 'video' | 'guide' | 'infographic';
  
  // Media
  thumbnail?: string;
  videoUrl?: string;
  attachments?: string[];
  
  // Metadata
  status: ContentStatus;
  isFeatured: boolean;
  readTimeMinutes: number;
  
  // Analytics
  views: number;
  likes: number;
  shares: number;
  
  // Versioning
  version: number;
  history: ContentVersion[];
  
  // Comments
  comments: ContentComment[];
  
  // Authorship
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedBy: string;
  updatedByName: string;
  updatedAt: string;
  publishedAt?: string;
}

// ============================================================================
// CLINICAL RESOURCES (Doctor portal only, requires admin approval)
// ============================================================================

export interface ClinicalResourceItem {
  id: string;
  
  // Core content
  title: string;
  titleTh?: string;
  description: string;
  descriptionTh?: string;
  content: string; // Markdown
  contentTh?: string; // Thai version of content
  
  // Classification
  category: ClinicalResourcesCategoryId;
  tags: string[]; // Tag IDs
  specialty?: string; // Medical specialty relevance
  resourceType: 'guideline' | 'protocol' | 'reference' | 'template' | 'research';
  
  // References
  source?: string;
  references?: string[];
  attachments?: string[];
  
  // Status & Approval
  status: ContentStatus;
  
  // Approval workflow
  submittedAt?: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  rejectionReason?: string;
  requiresAdminApproval: boolean;
  
  // Versioning
  version: number;
  history: ContentVersion[];
  
  // Comments
  comments: ContentComment[];
  
  // Authorship
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedBy: string;
  updatedByName: string;
  updatedAt: string;
  publishedAt?: string;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

// Create/Update Medical Content
export interface CreateMedicalContentRequest {
  title: string;
  titleTh?: string;
  summary: string;
  summaryTh?: string;
  content: string;
  contentTh?: string;
  category: MedicalContentCategoryId;
  tags: string[];
  type: 'article' | 'video' | 'guide' | 'infographic';
  thumbnail?: string;
  videoUrl?: string;
  isFeatured?: boolean;
  status?: 'draft' | 'published';
}

export interface UpdateMedicalContentRequest extends Partial<CreateMedicalContentRequest> {
  changeNote?: string;
}

// Create/Update Clinical Resource
export interface CreateClinicalResourceRequest {
  title: string;
  titleTh?: string;
  description: string;
  descriptionTh?: string;
  content: string;
  category: ClinicalResourcesCategoryId;
  tags: string[];
  specialty?: string;
  source?: string;
  references?: string[];
  status?: 'draft' | 'pending'; // Pending = submit for approval
}

export interface UpdateClinicalResourceRequest extends Partial<CreateClinicalResourceRequest> {
  changeNote?: string;
}

// Admin approval
export interface ApprovalRequest {
  action: 'approve' | 'reject';
  comment?: string;
  rejectionReason?: string;
}

// Comment
export interface AddCommentRequest {
  content: string;
  isAdminFeedback?: boolean;
}

// Tag management
export interface CreateTagRequest {
  name: string;
  nameTh?: string;
}

// ============================================================================
// GCS STORAGE STRUCTURE
// ============================================================================

/**
 * GCS Bucket: izara-meta-data
 * 
 * medical-content/
 * ├── articles.json              # Array of all MedicalContentArticle
 * ├── tags.json                  # Array of ContentTag
 * └── categories.json            # Fixed categories (for reference)
 * 
 * clinical-resources/
 * ├── resources.json             # Array of all ClinicalResourceItem
 * ├── pending-approvals.json     # IDs awaiting admin approval
 * ├── tags.json                  # Array of ContentTag
 * └── categories.json            # Fixed categories (for reference)
 */

export interface MedicalContentStorage {
  articles: MedicalContentArticle[];
  lastUpdated: string;
}

export interface ClinicalResourcesStorage {
  resources: ClinicalResourceItem[];
  pendingApprovalIds: string[];
  lastUpdated: string;
}

export interface TagsStorage {
  tags: ContentTag[];
  lastUpdated: string;
}
