# SwipeX Milestone 3 — Intern 4 (AI/ML & Matching Engine) Data Handoff Contract

**Domain Provider:** Job & Data Intelligence (Intern 3)  
**Domain Consumer:** Matching Engine / Recommendation & ATS Systems (Intern 4)  
**Target Milestone:** Milestone 3 (Matching Engine & Recommendation Integration)  
**Status:** DAY 3 ENRICHED HANDOFF SPECIFICATION  

---

## 1. Domain Boundary & Data Source Distinctions

To ensure clear technical understanding and avoid invalid domain assumptions during model training and feature extraction, all consumed job dataset features are explicitly classified into three categories:

### 1.1 Source-Derived Dataset Features (Ground Truth)
* **Job Core Information:** `job_id` (`UUID`), `title` (`str`), `job_description` (`str`), `location` (`str`).
* **Company Data:** `company_id` (`UUID`), `company_name` (`str`), `industry` (`str`), `size` (`str`).
* **Experience Bounds:** `min_experience` (`float`), `max_experience` (`float`), `raw_experience_str` (`str`).
* **Salary Bounds:** `min_salary` (`float`), `max_salary` (`float`), `currency` (`str` - `'INR'` / `'USD'`).
* **Canonical Skills Graph:** `skills` table containing 44,078 unique skills mapped to jobs via `job_skills`.

### 1.2 M3 Documented Default Fallbacks
* **Required Skills (`job_skills.is_required = TRUE`):**  
  * *Policy:* Dataset 1 tags and skills do not provide explicit mandatory vs optional flags. All existing mapped skills are assigned `is_required = TRUE` as a documented M3 fallback default. No fake optional skills (`is_required = FALSE`) are fabricated.
* **Skill Importance Weight (`job_skills.weight = 1.00`):**  
  * *Policy:* All existing mapped skills are assigned `weight = 1.00` as the neutral default weighting.
* **Keyword Weight (`job_keywords.weight = 1.00`):**  
  * *Policy:* All extracted keywords are assigned neutral default weight `1.00`.

### 1.3 Unavailable Values (Represented as `NULL`)
* **Skill Experience (`job_skills.min_years = NULL`):**  
  * *Policy:* Dataset 1 provides job-level experience bounds (`jobs.min_experience`), but does NOT provide skill-specific experience thresholds. `min_years` remains `NULL` for all skills. Intern 4 algorithms must treat `NULL` as "no skill-specific experience threshold enforced".
* **Undisclosed Salary (`min_salary = NULL`, `max_salary = NULL`):**  
  * *Policy:* 64,076 job postings do not disclose salary bounds. Undisclosed salary is represented strictly as `NULL` (not zero).
* **Work Mode & Job Type (`work_mode = NULL`, `job_type = NULL`):**  
  * *Policy:* Unavailable across Dataset 1; represented as `NULL`.

---

## 2. Job Keyword Taxonomy Structure

Extracted job keywords are stored in the `job_keywords` table referencing `jobs.id` and categorized into 6 canonical types:

| Keyword Type | Description & Purpose | Sample Values |
| :--- | :--- | :--- |
| **`DOMAIN`** | Industry verticals, tech domains, and specialization fields | `'Fintech & Banking'`, `'E-Commerce'`, `'Healthcare'`, `'Cloud & SaaS'`, `'AI & Machine Learning'` |
| **`TOOL`** | Developer tools, databases, platforms, and utilities | `'Docker'`, `'Kubernetes'`, `'Git'`, `'AWS'`, `'PostgreSQL'`, `'Redis'`, `'Linux'` |
| **`FRAMEWORK`** | Libraries, web frameworks, and machine learning models | `'React'`, `'FastAPI'`, `'Django'`, `'PyTorch'`, `'TensorFlow'`, `'Spring Boot'`, `'Node.js'` |
| **`CERTIFICATION`** | Professional certifications and industry accreditations | `'AWS Certified'`, `'PMP'`, `'CISSP'`, `'CKA'`, `'Scrum Master'` |
| **`RESPONSIBILITY`** | Role duties, engineering practices, and lifecycle activities | `'Architecture & Design'`, `'Software Development'`, `'Testing & QA'`, `'Maintenance & Operations'` |
| **`SOFT_SKILL`** | Interpersonal, communication, and process methodologies | `'Communication'`, `'Problem Solving'`, `'Leadership'`, `'Collaboration'`, `'Agile & Scrum'` |

> [!NOTE]  
> Keywords are extracted only where supported by job title and description text. Not every job posting is forced to contain all 6 categories. Overlaps (such as `Leadership` or `Agile`) reflect actual text occurrences across the taxonomy.

---

## 3. Data Query & Retrieval Contract for Intern 4

Intern 4 matching engine components can consume job features using `JobRepository` helper methods or direct SQL queries:

### 3.1 Retrieve Required Skills for a Job
```python
from db.repositories.job_repository import JobRepository

repo = JobRepository(conn, db_type="postgres")
required_skills = repo.get_job_required_skills(job_id="7a8b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d")
# Returns: [{"skill_id": "...", "name": "Python", "category": None, "is_required": True, "weight": 1.00, "min_years": None}, ...]
```

### 3.2 Retrieve Job Keywords by Category
```python
keywords = repo.get_job_keywords_by_type(job_id="7a8b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d", keyword_type="FRAMEWORK")
# Returns: [{"id": "...", "keyword": "FastAPI", "keyword_type": "FRAMEWORK", "weight": 1.00}, ...]
```

### 3.3 Retrieve Complete Feature Vector for Semantic Embeddings
```python
features = repo.get_job_matching_features(job_id="7a8b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d")
embedding_text = features["embedding_input_text"]
# Returns standardized embedding string:
# "Title: Senior Backend Developer | Location: Bengaluru | Required Skills: Python, SQL, FastAPI | Experience: 3 - 6 yrs | Salary: 12-18 Lacs PA (Monthly: 125000.0) | Description: ..."
```

---

## 4. SQL Data Access Examples for Vector / Batch Inference

```sql
-- Query 1: Fetch all required skills for a job posting
SELECT s.id AS skill_id, s.name AS skill_name, js.is_required, js.weight, js.min_years
FROM job_skills js
JOIN skills s ON js.skill_id = s.id
WHERE js.job_id = :target_job_id AND js.is_required = TRUE;

-- Query 2: Fetch structured keywords for vector embedding enrichment
SELECT keyword, keyword_type, weight
FROM job_keywords
WHERE job_id = :target_job_id
ORDER BY keyword_type, keyword;

-- Query 3: Batch fetch job features for recommendation feed candidate generation
```sql
-- Query 3: Batch fetch job features for recommendation feed candidate generation
SELECT 
    j.id AS job_id,
    j.title,
    j.location,
    j.min_experience,
    j.max_experience,
    j.min_salary,
    j.max_salary,
    j.currency,
    STRING_AGG(DISTINCT s.name, ', ') AS required_skills,
    STRING_AGG(DISTINCT jk.keyword, ', ') AS keywords
FROM jobs j
LEFT JOIN job_skills js ON j.id = js.job_id AND js.is_required = TRUE
LEFT JOIN skills s ON js.skill_id = s.id
LEFT JOIN job_keywords jk ON j.id = jk.job_id
WHERE j.id = :target_job_id
GROUP BY j.id;
```

---

## 5. Day 4 Repository & Query Contracts

### 5.1 Resume Active Version & Ownership Helpers

```python
from db.repositories.resume_repository import ResumeRepository

resume_repo = ResumeRepository(conn, db_type="postgres")

# 1. Get Active Resume Version
active_v = resume_repo.get_active_resume_version(resume_id="...")

# 2. Get Active Resume Version with User Ownership Verification
active_user_v = resume_repo.get_active_resume_version_by_user(user_id="...", resume_id="...")
# Returns None if resume_id does not belong to user_id (prevents unauthorized access).

# 3. List All Versions (Ordered by version_number DESC)
versions = resume_repo.list_resume_versions(resume_id="...")

# 4. Activate Resume Version (Transactional switch)
activated = resume_repo.activate_resume_version(resume_id="...", version_id="...")

# 5. Get Latest Resume Version (Authoritative ordering by version_number DESC)
latest_v = resume_repo.get_latest_resume_version(resume_id="...")
```

### 5.2 Resume Skill Extraction & Canonical Skill Mapping

```python
mapping_res = resume_repo.map_resume_skills_detailed(parsed_json={"skills": ["Python", "FastAPI", "UnknownSkill"]})
# Returns:
# {
#   "matched_skills": [{"id": "...", "name": "Python", "category": "..."}, ...],
#   "unmatched_skills": ["UnknownSkill"]
# }
```

### 5.3 Deterministic Resume-Job Skill Overlap Comparison

```python
comp = resume_repo.compare_resume_and_job_skills(
    resume_version_id="c39a282f-8a49-411a-8c88-51307b22d10a",
    job_id="7a8b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
    job_repo=job_repo
)
# Returns:
# {
#   "resume_version_id": "c39a282f-8a49-411a-8c88-51307b22d10a",
#   "job_id": "7a8b9c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
#   "resume_skill_names": ["FastAPI", "Python", "UnknownSkill"],
#   "matched_skill_names": ["FastAPI", "Python"],
#   "missing_job_skill_names": ["Docker", "PostgreSQL"],
#   "matched_count": 2,
#   "required_skill_count": 4,
#   "skill_match_percentage": 50.00
# }
```

### 5.4 Responsibility Division (Intern 3 vs Intern 4)

| Feature / Task | Layer Ownership | Description & Semantics |
| :--- | :--- | :--- |
| **Skill Overlap Feature** | **Intern 3 (Data Layer)** | Deterministic keyword/canonical skill count matching (`skill_match_percentage = matched / total_required * 100`). |
| **Zero Required Skills** | **Intern 3 (Data Layer)** | Handled safely by returning `100.0` percentage (0 required skills missing). |
| **Canonical Skill Lookup** | **Intern 3 (Data Layer)** | Case-insensitive lookup against `skills` table without mutating/fabricating records for unknown skills. |
| **ATS Scoring Algorithm** | **Intern 4 (AI/ML Layer)** | Multi-factor weighted match score combining skill overlap, experience, title semantics, and weights. |
| **Vector Embeddings** | **Intern 4 (AI/ML Layer)** | Generating dense embeddings from `embedding_input_text` string provided by `get_job_matching_features()`. |
| **Recommendation Feed** | **Intern 4 (AI/ML Layer)** | Candidate ranking feed based on swipe history, preference vectors, and computed ATS scores. |

