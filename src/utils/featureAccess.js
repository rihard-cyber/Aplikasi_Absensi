const FEATURE_DIVISION_MAP = {
  patrol: {
    ids: ['patrol-scan', 'patrol-lapor', 'patrol-mutasi', 'patrol-handover', 'incident-report'],
    divisions: ['security', 'satpam', 'pengamanan']
  },
  cleaning: {
    ids: ['cleaning-task'],
    divisions: ['cleaning', 'clean', 'housekeeping', 'kebersihan']
  },
  engineering: {
    ids: ['teknisi-task'],
    divisions: ['teknik', 'technical', 'engineering', 'maintenance', 'teknisi']
  },
  driver: {
    ids: ['driver-trip'],
    divisions: ['driver', 'supir', 'sopir', 'driver']
  },
  office: {
    ids: ['office-ga'],
    divisions: ['office', 'it', 'staff', 'admin', 'hr', 'management', 'developer', 'general']
  },
  it: {
    ids: ['it-equipment'],
    divisions: ['it', 'developer', 'tech', 'technology']
  },
  legal: {
    ids: ['legal-view'],
    divisions: ['legal', 'hukum', 'law', 'compliance']
  },
  wfh: {
    ids: ['home-address', 'task-plan'],
    divisions: ['office', 'it', 'staff', 'admin', 'hr', 'management', 'developer', 'general']
  },
  booking: {
    ids: ['booking'],
    divisions: ['office', 'it', 'staff', 'admin', 'hr', 'management', 'developer', 'general']
  }
};

const DIVISION_ALIASES = {
  'security': ['security', 'satpam', 'pengamanan', 'keamanan', 'loss prevention', 'guard', 'patroli'],
  'office': ['office', 'it', 'staff', 'admin', 'hr', 'management', 'developer', 'general', 'accounting', 'finance', 'sekretariat'],
  'cleaning': ['cleaning', 'clean', 'housekeeping', 'kebersihan', 'janitor', 'service'],
  'teknik': ['teknik', 'technical', 'engineering', 'maintenance', 'teknisi', 'mepro'],
  'driver': ['driver', 'supir', 'sopir', 'pengemudi', 'logistik'],
  'legal': ['legal', 'hukum', 'law', 'compliance', 'perizinan']
};

export function getDivisionCategory(divisionName) {
  const name = (divisionName || '').toLowerCase().trim();
  if (!name) return 'office';
  for (const [category, aliases] of Object.entries(DIVISION_ALIASES)) {
    if (aliases.some(a => name.includes(a))) return category;
  }
  return 'office';
}

export function isFeatureAllowed(featureId, divisionName) {
  for (const [, rule] of Object.entries(FEATURE_DIVISION_MAP)) {
    if (rule.ids.includes(featureId)) {
      const category = getDivisionCategory(divisionName);
      const allowed = rule.divisions.some(d => {
        const aliases = DIVISION_ALIASES[d] || [d];
        return aliases.some(a => (divisionName || '').toLowerCase().includes(a));
      });
      return allowed;
    }
  }
  return true;
}

export function filterFeaturesByDivision(features, divisionName, modules) {
  return features.filter(act => {
    if (act.module && modules && !modules[act.module]) return false;
    return isFeatureAllowed(act.id, divisionName);
  });
}

export function getUserRoleCategory(profile, divisionName) {
  if (!profile) return 'KARYAWAN';
  const role = (profile.role || 'EMPLOYEE').toUpperCase();
  if (role === 'SUPER_ADMIN' || role === 'TENANT_ADMIN' || role === 'SUB_ADMIN') {
    return 'ADMIN';
  }
  
  const position = (profile.position || '').toLowerCase().trim();
  const division = (divisionName || profile.division || '').toLowerCase().trim();
  
  if (position.includes('director') || position.includes('direktur') || position.includes('dirut') || position.includes('dir')) {
    return 'DIREKTUR';
  }
  if (position.includes('hrd') || position.includes('hr') || division.includes('hrd') || division.includes('hr')) {
    return 'HRD';
  }
  if (position.includes('manager') || position.includes('manajemen') || position.includes('management') || position.includes('supervisor') || position.includes('lead') || position.includes('kabag') || position.includes('head') || position.includes('kordinator') || position.includes('coordinator')) {
    return 'MANAJEMEN';
  }
  
  return 'KARYAWAN';
}

export function filterFeaturesByRole(features, profile, divisionName, modules, rolePermissions) {
  const roleCategory = getUserRoleCategory(profile, divisionName);
  const allowed = rolePermissions?.[roleCategory];
  
  return features.filter(act => {
    if (act.module && modules && !modules[act.module]) return false;
    if (!isFeatureAllowed(act.id, divisionName)) return false;
    if (allowed && Array.isArray(allowed)) {
      return allowed.includes(act.id);
    }
    return true;
  });
}

export function isSecurityDivision(divisionName) {
  return getDivisionCategory(divisionName) === 'security';
}

/**
 * Automates feature & module access based on position/division keywords.
 * Used during bulk import to set 'operational_access' and 'role'.
 * @param {string} position 
 * @param {string} division 
 * @param {Array} customMappings - Optional custom mappings from DB
 */
export function autoMapEmployeeFeatures(position, division, customMappings = []) {
  const pos = (position || '').toLowerCase();
  const div = (division || '').toLowerCase();
  
  const category = getDivisionCategory(div);
  
  // 1. Determine if they need operational module access (Security, Cleaning, etc.)
  const needsOperational = category !== 'office';
  
  // 2. Determine default role category
  let roleCategory = 'KARYAWAN';

  if (customMappings && customMappings.length > 0) {
    for (const m of customMappings) {
      const triggers = m.keyword_triggers || [];
      if (triggers.some(k => pos.includes(k.toLowerCase()) || div.includes(k.toLowerCase()))) {
        roleCategory = m.role_name;
        break;
      }
    }
  } else {
    // Fallback to hardcoded logic if no custom mappings provided
    const managementKeywords = ['manager', 'supervisor', 'lead', 'kabag', 'head', 'kordinator', 'coordinator', 'spv'];
    if (managementKeywords.some(k => pos.includes(k))) {
      roleCategory = 'MANAJEMEN';
    }
  }

  return {
    needsOperational,
    roleCategory,
    category
  };
}

export default FEATURE_DIVISION_MAP;
