// helpers.ts - CodeGuardian Pro Utility Functions

/**
 * फ़ाइल साइज़ को फॉर्मेट करने का फंक्शन
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * यूनिक आईडी जेनरेट करने का फंक्शन
 */
export const generateId = (): string => {
  return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * डिबाउंस फंक्शन - बार-बार कॉल होने वाले फंक्शन को कंट्रोल करता है
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(null, args), wait);
  };
};

/**
 * क्लिपबोर्ड में कॉपी करने का फंक्शन
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    // पुराने ब्राउज़र के लिए फॉलबैक
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      return true;
    } catch (fallbackError) {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
};

/**
 * ईमेल वैलिडेशन फंक्शन
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * फ़ाइल नेम सैनिटाइज़ करने का फंक्शन
 */
export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * फ़ाइल एक्सटेंशन निकालने का फंक्शन
 */
export const getFileExtension = (filename: string): string => {
  return filename.toLowerCase().split('.').pop() || '';
};

/**
 * चेक करता है कि फ़ाइल कोड फ़ाइल है या नहीं
 */
export const isCodeFile = (filename: string): boolean => {
  const codeExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'cpp', 'c', 'h',
    'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala',
    'html', 'css', 'scss', 'less', 'json', 'xml', 'yaml', 'yml',
    'md', 'txt', 'sh', 'bash', 'ps1', 'sql', 'graphql', 'gql',
    'vue', 'svelte', 'elm'
  ];
  const extension = getFileExtension(filename);
  return codeExtensions.includes(extension);
};

/**
 * प्रोग्रेस परसेंटेज कैलकुलेट करने का फंक्शन
 */
export const calculateProgress = (loaded: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((loaded / total) * 100);
};

/**
 * डेटे फॉर्मेट करने का फंक्शन
 */
export const formatDate = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

/**
 * टाइम फॉर्मेट करने का फंक्शन
 */
export const formatTime = (date: Date | string): string => {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * रिलेटिव टाइम दिखाने का फंक्शन (जैसे "2 minutes ago")
 */
export const getRelativeTime = (date: Date | string): string => {
  const d = new Date(date);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffInSeconds < 60) return 'अभी अभी';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} मिनट पहले`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} घंटे पहले`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} दिन पहले`;
  
  return formatDate(d);
};

/**
 * टेक्स्ट को ट्रंकेट करने का फंक्शन
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * रैंडम कलर जेनरेट करने का फंक्शन
 */
export const generateColor = (): string => {
  const colors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * चेक करता है कि डिवाइस मोबाइल है या नहीं
 */
export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < 768;
};

/**
 * नई टैब में यूआरएल ओपन करने का फंक्शन
 */
export const openInNewTab = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * फ़ाइल डाउनलोड करने का फंक्शन
 */
export const downloadFile = (content: string, filename: string, type: string = 'text/plain'): void => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * JSON स्ट्रिंग को पार्स करने का सेफ फंक्शन
 */
export const safeJsonParse = <T>(jsonString: string, fallback: T): T => {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return fallback;
  }
};

/**
 * ऑब्जेक्ट को JSON स्ट्रिंग में कन्वर्ट करने का सेफ फंक्शन
 */
export const safeJsonStringify = (obj: any, fallback: string = '{}'): string => {
  try {
    return JSON.stringify(obj);
  } catch {
    return fallback;
  }
};

/**
 * ऐरे को चंक्स में डिवाइड करने का फंक्शन
 */
export const chunkArray = <T>(array: T[], chunkSize: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
};

/**
 * ऐरे से डुप्लीकेट रिमूव करने का फंक्शन
 */
export const removeDuplicates = <T>(array: T[], key?: keyof T): T[] => {
  if (key) {
    const seen = new Set();
    return array.filter(item => {
      const value = item[key];
      return seen.has(value) ? false : seen.add(value);
    });
  }
  return [...new Set(array)];
};

/**
 * ऑब्जेक्ट की डीप कॉपी बनाने का फंक्शन
 */
export const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * केब केस को कैमल केस में कन्वर्ट करने का फंक्शन
 */
export const kebabToCamel = (str: string): string => {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};

/**
 * कैमल केस को केब केस में कन्वर्ट करने का फंक्शन
 */
export const camelToKebab = (str: string): string => {
  return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
};

/**
 * स्ट्रिंग को टाइटल केस में कन्वर्ट करने का फंक्शन
 */
export const toTitleCase = (str: string): string => {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
  });
};

/**
 * नंबर को कॉमा सीपरेटेड फॉर्मेट में कन्वर्ट करने का फंक्शन
 */
export const formatNumber = (num: number): string => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
};

/**
 * पासवर्ड स्ट्रेंथ चेक करने का फंक्शन
 */
export const checkPasswordStrength = (password: string): {
  score: number;
  strength: 'weak' | 'medium' | 'strong';
  feedback: string[];
} => {
  const feedback: string[] = [];
  let score = 0;

  // लेंथ चेक
  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('पासवर्ड कम से कम 8 करैक्टर का होना चाहिए');
  }

  // लोअरकेस चेक
  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('पासवर्ड में कम से कम एक लोअरकेस लेटर होना चाहिए');
  }

  // अपरकेस चेक
  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('पासवर्ड में कम से कम एक अपरकेस लेटर होना चाहिए');
  }

  // नंबर चेक
  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('पासवर्ड में कम से कम एक नंबर होना चाहिए');
  }

  // स्पेशल करैक्टर चेक
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('पासवर्ड में कम से कम एक स्पेशल करैक्टर होना चाहिए');
  }

  let strength: 'weak' | 'medium' | 'strong';
  if (score <= 2) {
    strength = 'weak';
  } else if (score <= 4) {
    strength = 'medium';
  } else {
    strength = 'strong';
    feedback.length = 0; // स्ट्रांग पासवर्ड के लिए फीडबैक क्लियर करें
    feedback.push('पासवर्ड मजबूत है');
  }

  return { score, strength, feedback };
};

/**
 * यूआरएल वैलिडेशन फंक्शन
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * बेस64 एनकोडिंग फंक्शन
 */
export const base64Encode = (str: string): string => {
  return Buffer.from(str).toString('base64');
};

/**
 * बेस64 डिकोडिंग फंक्शन
 */
export const base64Decode = (str: string): string => {
  return Buffer.from(str, 'base64').toString('utf-8');
};

/**
 * स्लीप फंक्शन (प्रॉमिस बेस्ड)
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * ऑब्जेक्ट के कीज को सॉर्ट करने का फंक्शन
 */
export const sortObjectKeys = <T extends Record<string, any>>(obj: T): T => {
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj = {} as T;
  
  sortedKeys.forEach(key => {
    sortedObj[key as keyof T] = obj[key];
  });
  
  return sortedObj;
};

/**
 * फ़ाइल टाइप आइकन रिटर्न करने का फंक्शन
 */
export const getFileIcon = (filename: string): string => {
  const extension = getFileExtension(filename);
  
  const iconMap: Record<string, string> = {
    'js': '📄',
    'jsx': '⚛️',
    'ts': '📘',
    'tsx': '⚛️',
    'py': '🐍',
    'java': '☕',
    'cpp': '⚙️',
    'c': '⚙️',
    'html': '🌐',
    'css': '🎨',
    'scss': '🎨',
    'less': '🎨',
    'json': '📋',
    'xml': '📋',
    'yaml': '📋',
    'yml': '📋',
    'md': '📝',
    'txt': '📝',
    'sql': '🗃️',
    'gitignore': '🔧',
    'dockerfile': '🐳',
    'zip': '🗜️',
    'pdf': '📕',
    'doc': '📘',
    'docx': '📘'
  };

  return iconMap[extension] || '📄';
};

/**
 * प्रोग्रामिंग लैंग्वेज डिटेक्ट करने का फंक्शन
 */
export const detectProgrammingLanguage = (filename: string): string => {
  const extension = getFileExtension(filename);
  
  const languageMap: Record<string, string> = {
    'js': 'JavaScript',
    'jsx': 'JavaScript',
    'ts': 'TypeScript',
    'tsx': 'TypeScript',
    'py': 'Python',
    'java': 'Java',
    'cpp': 'C++',
    'c': 'C',
    'cs': 'C#',
    'php': 'PHP',
    'rb': 'Ruby',
    'go': 'Go',
    'rs': 'Rust',
    'swift': 'Swift',
    'kt': 'Kotlin',
    'scala': 'Scala',
    'html': 'HTML',
    'css': 'CSS',
    'scss': 'SCSS',
    'less': 'Less',
    'json': 'JSON',
    'xml': 'XML',
    'yaml': 'YAML',
    'yml': 'YAML',
    'md': 'Markdown',
    'sh': 'Bash',
    'bash': 'Bash',
    'ps1': 'PowerShell',
    'sql': 'SQL',
    'graphql': 'GraphQL',
    'gql': 'GraphQL',
    'vue': 'Vue',
    'svelte': 'Svelte'
  };

  return languageMap[extension] || 'Text';
};

/**
 * एरर मैसेज को यूजर फ्रेंडली फॉर्मेट में कन्वर्ट करने का फंक्शन
 */
export const formatErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.toString) return error.toString();
  return 'An unknown error occurred';
};

/**
 * लोकल स्टोरेज से डेटा रीड करने का फंक्शन
 */
export const getLocalStorage = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

/**
 * लोकल स्टोरेज में डेटा सेव करने का फंक्शन
 */
export const setLocalStorage = <T>(key: string, value: T): void => {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

/**
 * लोकल स्टोरेज से डेटा रिमूव करने का फंक्शन
 */
export const removeLocalStorage = (key: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
};

// डिफॉल्ट एक्सपोर्ट ऑब्जेक्ट
const helpers = {
  formatFileSize,
  generateId,
  debounce,
  copyToClipboard,
  validateEmail,
  sanitizeFilename,
  getFileExtension,
  isCodeFile,
  calculateProgress,
  formatDate,
  formatTime,
  getRelativeTime,
  truncateText,
  generateColor,
  isMobile,
  openInNewTab,
  downloadFile,
  safeJsonParse,
  safeJsonStringify,
  chunkArray,
  removeDuplicates,
  deepClone,
  kebabToCamel,
  camelToKebab,
  toTitleCase,
  formatNumber,
  checkPasswordStrength,
  isValidUrl,
  base64Encode,
  base64Decode,
  sleep,
  sortObjectKeys,
  getFileIcon,
  detectProgrammingLanguage,
  formatErrorMessage,
  getLocalStorage,
  setLocalStorage,
  removeLocalStorage
};

export default helpers;