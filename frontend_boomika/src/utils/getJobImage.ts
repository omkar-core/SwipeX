/**
 * getJobImage - returns a curated Unsplash image URL matched to the job category.
 *
 * Categories (checked in order, first match wins):
 *  1. Data Science / ML / AI
 *  2. Frontend / UX / Design
 *  3. Backend / DevOps / Engineering
 *  4. Marketing / Sales / Growth
 *  5. Product Management / Strategy
 *  6. Default fallback
 */

type ImageCategory = 'data-science' | 'design' | 'engineering' | 'marketing' | 'product' | 'default';

const CATEGORY_IMAGES: Record<ImageCategory, string[]> = {
  'data-science': [
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=1200&auto=format&fit=crop&q=80',
  ],
  'design': [
    'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1558655146-d09347e92766?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1509343256512-d77a5cb3791b?w=1200&auto=format&fit=crop&q=80',
  ],
  'engineering': [
    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1629654297299-c8506221ca97?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80',
  ],
  'marketing': [
    'https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&auto=format&fit=crop&q=80',
  ],
  'product': [
    'https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1572021335469-31706a17aaef?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80',
  ],
  'default': [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1200&auto=format&fit=crop&q=80',
  ],
};

// Keyword → category, checked in order (first match wins)
const KEYWORD_MAP: { keywords: string[]; category: ImageCategory }[] = [
  {
    keywords: [
      'data science', 'data scientist', 'machine learning', 'ml engineer', ' ml ',
      'deep learning', ' ai ', 'artificial intelligence', 'nlp', 'llm',
      'python', 'pytorch', 'tensorflow', 'scikit', 'scikit-learn',
      'kaggle', 'analytics', 'data analyst', 'big data', 'spark', 'hadoop',
      'computer vision', 'neural', 'bert', 'gpt', 'xgboost', 'pandas',
    ],
    category: 'data-science',
  },
  {
    keywords: [
      'frontend', 'front-end', 'front end', ' ui ', ' ux ', 'user experience',
      'user interface', 'product designer', 'ux researcher', 'designer',
      'figma', 'sketch', 'adobe xd', 'storybook', 'vue', 'angular',
      'tailwind', 'webflow', 'animation', 'motion design', 'interaction',
    ],
    category: 'design',
  },
  {
    keywords: [
      'backend', 'back-end', 'back end', 'devops', 'dev ops', 'infrastructure',
      'platform engineer', 'sre', 'site reliability', 'cloud', 'kubernetes',
      'docker', 'aws', 'azure', 'gcp', 'golang', 'rust', 'java', 'scala',
      'postgresql', 'mysql', 'redis', 'kafka', 'rabbitmq', 'terraform',
      'ci/cd', 'jenkins', 'microservices', 'distributed systems',
      'software engineer', 'software developer', 'full stack', 'fullstack',
      'react', 'next.js', 'typescript',
    ],
    category: 'engineering',
  },
  {
    keywords: [
      'marketing', 'growth', 'seo', 'sem', 'content', 'brand', 'social media',
      'campaign', 'copywriting', 'email marketing', 'paid acquisition',
      'sales', 'account executive', 'sales executive', 'business development',
      'b2b', 'crm', 'salesforce', 'hubspot', 'demand generation',
    ],
    category: 'marketing',
  },
  {
    keywords: [
      'product manager', 'product management', 'product owner', 'product lead',
      'roadmap', 'stakeholder', 'agile', 'scrum', 'sprint', 'okr',
      'go-to-market', 'gtm', 'strategy',
    ],
    category: 'product',
  },
];

/** Deterministic pool index based on title text (same job → same image always) */
function pickIndex(title: string, poolLength: number): number {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash * 31 + title.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % poolLength;
}

/**
 * Returns the best-matching category image URL for a given job.
 *
 * @param jobTitle - The job title (e.g. "ML Engineer")
 * @param skills   - Optional skills / tags array (e.g. ["Python", "TensorFlow"])
 */
export function getJobImage(jobTitle: string, skills?: string[]): string {
  const haystack = (' ' + [jobTitle, ...(skills ?? [])].join(' ') + ' ').toLowerCase();

  for (const { keywords, category } of KEYWORD_MAP) {
    if (keywords.some(kw => haystack.includes(kw))) {
      const pool = CATEGORY_IMAGES[category];
      return pool[pickIndex(jobTitle, pool.length)];
    }
  }

  const pool = CATEGORY_IMAGES['default'];
  return pool[pickIndex(jobTitle, pool.length)];
}
