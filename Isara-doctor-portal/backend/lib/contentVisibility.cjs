/**
 * Role-based medical content visibility rules.
 * Patient/anonymous: published only.
 * Doctor author: own draft/pending/rejected + all published.
 * Admin: all statuses.
 */

const NON_PUBLIC_STATUSES = ['draft', 'pending', 'rejected'];

/**
 * @param {{ status?: string, author_id?: string }} article
 * @param {{ userId?: string, role?: string }} viewer
 */
function canViewMedicalContent(article, viewer = {}) {
  if (!article) return false;
  const status = article.status || 'draft';
  if (status === 'published') return true;
  const role = (viewer.role || '').toLowerCase();
  if (role === 'admin' || viewer.isAdmin) return true;
  if (viewer.userId && article.author_id === viewer.userId) return true;
  return false;
}

/**
 * @param {{ userId?: string, role?: string, status?: string, mine?: boolean }} opts
 * @returns {{ whereClause: string, params: unknown[] }}
 */
function buildMedicalContentVisibilityQuery(opts = {}) {
  const role = (opts.role || '').toLowerCase();
  const params = [];
  let paramIdx = 1;

  if (opts.mine && opts.userId) {
    params.push(opts.userId);
    let clause = `mc.author_id = $${paramIdx++}`;
    if (opts.status) {
      params.push(opts.status);
      clause += ` AND mc.status = $${paramIdx++}`;
    } else {
      clause += ` AND mc.status IN ('draft', 'pending', 'rejected', 'published')`;
    }
    return { whereClause: clause, params };
  }

  if (role === 'admin' || opts.isAdmin) {
    if (opts.status) {
      params.push(opts.status);
      return { whereClause: `mc.status = $${paramIdx++}`, params };
    }
    return { whereClause: '1=1', params };
  }

  if (opts.userId && (role === 'doctor' || !role)) {
    params.push(opts.userId);
    const authorParam = `$${paramIdx++}`;
    if (opts.status === 'published') {
      return { whereClause: `mc.status = 'published'`, params };
    }
    if (opts.status && NON_PUBLIC_STATUSES.includes(opts.status)) {
      params.push(opts.status);
      return {
        whereClause: `mc.author_id = ${authorParam} AND mc.status = $${paramIdx++}`,
        params,
      };
    }
    params.push(...NON_PUBLIC_STATUSES);
    const statusList = NON_PUBLIC_STATUSES.map((_, i) => `$${paramIdx + i}`).join(', ');
    paramIdx += NON_PUBLIC_STATUSES.length;
    return {
      whereClause: `(mc.status = 'published' OR (mc.author_id = ${authorParam} AND mc.status IN (${statusList})))`,
      params,
    };
  }

  // Anonymous / patient — published only
  return { whereClause: `mc.status = 'published'`, params };
}

/**
 * @param {{ userId?: string, role?: string, status?: string }} opts
 */
function buildClinicalResourceVisibilityQuery(opts = {}) {
  const role = (opts.role || '').toLowerCase();
  const params = [];
  let paramIdx = 1;

  if (role === 'admin' || opts.isAdmin) {
    if (opts.status) {
      params.push(opts.status);
      return { whereClause: `cr.status = $${paramIdx++}`, params };
    }
    return { whereClause: '1=1', params };
  }

  if (opts.userId && role === 'doctor') {
    params.push(opts.userId);
    const authorParam = `$${paramIdx++}`;
    if (opts.status === 'published' || opts.status === 'approved') {
      return { whereClause: `cr.status IN ('published', 'approved')`, params };
    }
    params.push('draft', 'pending', 'rejected');
    return {
      whereClause: `(cr.status IN ('published', 'approved') OR (cr.author_id = ${authorParam} AND cr.status IN ($${paramIdx++}, $${paramIdx++}, $${paramIdx++})))`,
      params,
    };
  }

  return { whereClause: `cr.status IN ('published', 'approved')`, params };
}

module.exports = {
  canViewMedicalContent,
  buildMedicalContentVisibilityQuery,
  buildClinicalResourceVisibilityQuery,
  NON_PUBLIC_STATUSES,
};
