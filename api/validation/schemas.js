const GITHUB_USERNAME_REGEX = /^[\w.-]+$/;
const GITHUB_REPO_NAME_REGEX = /^[\w.-]+$/;
const GITHUB_REF_REGEX = /^[\w.\/-]+$/;

function validateGitHubUsername(username) {
  if (!username || typeof username !== 'string') {
    return { error: 'Username is required and must be a string' };
  }
  if (username.length > 39) {
    return { error: 'Username must be 39 characters or less' };
  }
  if (!GITHUB_USERNAME_REGEX.test(username)) {
    return { error: 'Invalid GitHub username format' };
  }
  return { valid: true, value: username.trim() };
}

function validateGitHubRepoName(repo) {
  if (!repo || typeof repo !== 'string') {
    return { error: 'Repository name is required and must be a string' };
  }
  if (repo.length > 100) {
    return { error: 'Repository name must be 100 characters or less' };
  }
  if (!GITHUB_REPO_NAME_REGEX.test(repo)) {
    return { error: 'Invalid repository name format' };
  }
  return { valid: true, value: repo.trim() };
}

function validateGitHubRef(ref) {
  if (!ref || typeof ref !== 'string') {
    return { error: 'Reference is required and must be a string' };
  }
  if (ref.length > 255) {
    return { error: 'Reference must be 255 characters or less' };
  }
  if (!GITHUB_REF_REGEX.test(ref)) {
    return { error: 'Invalid reference format' };
  }
  return { valid: true, value: ref.trim() };
}

function validatePaginationParams(params) {
  const validated = {};
  
  if (params.per_page !== undefined) {
    const perPage = parseInt(params.per_page, 10);
    if (isNaN(perPage) || perPage < 1 || perPage > 100) {
      return { error: 'per_page must be between 1 and 100' };
    }
    validated.per_page = perPage;
  }
  
  if (params.page !== undefined) {
    const page = parseInt(params.page, 10);
    if (isNaN(page) || page < 1) {
      return { error: 'page must be a positive integer' };
    }
    validated.page = page;
  }
  
  return { valid: true, value: validated };
}

const endpointValidators = {
  'repos.listTags': (params) => {
    const ownerValidation = validateGitHubUsername(params.owner);
    if (ownerValidation.error) return ownerValidation;
    
    const repoValidation = validateGitHubRepoName(params.repo);
    if (repoValidation.error) return repoValidation;
    
    const paginationValidation = validatePaginationParams(params);
    if (paginationValidation.error) return paginationValidation;
    
    return {
      valid: true,
      value: {
        owner: ownerValidation.value,
        repo: repoValidation.value,
        ...paginationValidation.value
      }
    };
  },
  
  'repos.compareCommits': (params) => {
    const ownerValidation = validateGitHubUsername(params.owner);
    if (ownerValidation.error) return ownerValidation;
    
    const repoValidation = validateGitHubRepoName(params.repo);
    if (repoValidation.error) return repoValidation;
    
    const baseValidation = validateGitHubRef(params.base);
    if (baseValidation.error) return { error: `Base ${baseValidation.error}` };
    
    const headValidation = validateGitHubRef(params.head);
    if (headValidation.error) return { error: `Head ${headValidation.error}` };
    
    return {
      valid: true,
      value: {
        owner: ownerValidation.value,
        repo: repoValidation.value,
        base: baseValidation.value,
        head: headValidation.value
      }
    };
  },
  
  'repos.listForAuthenticatedUser': (params) => {
    const validated = {};
    
    if (params.visibility) {
      const validVisibilities = ['all', 'public', 'private'];
      if (!validVisibilities.includes(params.visibility)) {
        return { error: 'visibility must be one of: all, public, private' };
      }
      validated.visibility = params.visibility;
    }
    
    if (params.affiliation) {
      const validAffiliations = ['owner', 'collaborator', 'organization_member'];
      const affiliations = params.affiliation.split(',').map(a => a.trim());
      if (!affiliations.every(a => validAffiliations.includes(a))) {
        return { error: 'Invalid affiliation value' };
      }
      validated.affiliation = params.affiliation;
    }
    
    if (params.type) {
      const validTypes = ['all', 'owner', 'public', 'private', 'member'];
      if (!validTypes.includes(params.type)) {
        return { error: 'Invalid type value' };
      }
      validated.type = params.type;
    }
    
    if (params.sort) {
      const validSorts = ['created', 'updated', 'pushed', 'full_name'];
      if (!validSorts.includes(params.sort)) {
        return { error: 'Invalid sort value' };
      }
      validated.sort = params.sort;
    }
    
    if (params.direction) {
      const validDirections = ['asc', 'desc'];
      if (!validDirections.includes(params.direction)) {
        return { error: 'direction must be asc or desc' };
      }
      validated.direction = params.direction;
    }
    
    const paginationValidation = validatePaginationParams(params);
    if (paginationValidation.error) return paginationValidation;
    
    return {
      valid: true,
      value: {
        ...validated,
        ...paginationValidation.value
      }
    };
  },
  
  'repos.get': (params) => {
    const ownerValidation = validateGitHubUsername(params.owner);
    if (ownerValidation.error) return ownerValidation;
    
    const repoValidation = validateGitHubRepoName(params.repo);
    if (repoValidation.error) return repoValidation;
    
    return {
      valid: true,
      value: {
        owner: ownerValidation.value,
        repo: repoValidation.value
      }
    };
  }
};

function validateGitHubEndpoint(endpoint, params) {
  const validator = endpointValidators[endpoint];
  if (!validator) {
    return { error: 'Unsupported endpoint' };
  }
  
  return validator(params || {});
}

function sanitizeMarkdown(markdown) {
  if (!markdown || typeof markdown !== 'string') {
    return '';
  }
  
  // Basic sanitization - remove script tags and dangerous HTML
  return markdown
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, 10000); // Enforce max length
}

module.exports = {
  validateGitHubEndpoint,
  sanitizeMarkdown
};