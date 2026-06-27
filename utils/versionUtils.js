// utils/versionUtils.js

/**
 * Increment version based on update type
 * @param {string} currentVersion - Current version string
 * @param {string} updateType - Type of update (MAJOR, MINOR, PATCH)
 * @returns {string} - New version string
 */
exports.incrementVersion = (currentVersion, updateType = 'PATCH') => {
  const [major, minor, patch = 0] = currentVersion.split('.').map(Number);
  
  switch (updateType.toUpperCase()) {
    case 'MAJOR':
      return `${major + 1}.0.0`;
    case 'MINOR':
      return `${major}.${minor + 1}.0`;
    case 'PATCH':
    default:
      return `${major}.${minor}.${Number(patch) + 1}`;
  }
};

/**
 * Validate version string format
 * @param {string} version - Version string to validate
 * @returns {boolean} - True if valid
 */
exports.validateVersionFormat = (version) => {
  return /^\d+\.\d+(\.\d+)?$/.test(version);
};

/**
 * Compare two version strings
 * @param {string} v1 - First version
 * @param {string} v2 - Second version
 * @returns {number} - -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
exports.compareVersions = (v1, v2) => {
  const v1Parts = v1.split('.').map(Number);
  const v2Parts = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
    const part1 = v1Parts[i] || 0;
    const part2 = v2Parts[i] || 0;
    
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }
  
  return 0;
};