# AI/ML Career Intelligence Service

## 1. AI/ML Career Intelligence Service

The AI/ML Career Intelligence Service** is the Matching Engine domain in SwipeX responsible for resume-based analysis, job matching, personalized recommendations, ATS scoring, and user interaction-based personalization.

## 2. Purpose / Responsibility

This service is responsible for:

- Processing and extracting skills from user resumes.
- Calculating ATS scores based on job requirements.
- Matching user skills with available job opportunities.
- Considering job location during matching.
- Generating personalized job recommendations.
- Using user swipe history (`LIKE` / `SKIP`) for basic personalization.
- Generating human-readable recommendation reasons.
- Providing APIs for resume, ATS, matching, and recommendations.
- Preparing the system for advanced AI/ML recommendation in Milestone 3.

##3. Project Structure

AI-Career-intelligence/
└── backend/
    ├── app/
    │   ├── app.py
    │   ├── ats.py
    │   ├── eda.py
    │   ├── job_data.py
    │   ├── job_skills.py
    │   ├── main.py
    │   ├── matching_engine.py
    │   ├── matching.py
    │   ├── recommendations.py
    │   └── swipes.py
    │
    ├── data/
    │   └── job_market_india.csv
    │
    ├── gateway/
    │
    ├── matching_engine/
    │   └── docs/
    │       └── feature_spec_v0.md
    │
    └── tests/
        ├── test_ats.py
        └── test_recommendation.py
    
4. Technologies Used
Python
FastAPI
Uvicorn
Pandas
REST APIs
CSV Dataset
Pydantic
Swagger UI

5. Milestone 1 – Backend Foundation
Milestone 1 focused on building the basic backend and data processing pipeline.

Completed Work
FastAPI backend setup.
Job market dataset integration.
Resume upload and parsing.
Resume skill extraction.
Basic ATS score calculation.
Job data APIs.
Resume APIs.
Swagger API documentation.
Initial Matching Engine structure.

6. Milestone 2 – Matching & Personalization
Milestone 2 focused on developing and integrating the Matching Engine.

Completed Work
Skill-based job matching.
Location-based matching.
Weighted match score calculation.
Swipe history integration.
LIKE / SKIP based personalization.
Personalized job recommendations.
Human-readable reason_tags.
Matching Engine API integration.
Unit testing and regression testing.
Milestone 3 handoff planning.

7. Matching Workflow
User Resume / Skills
        ↓
Resume Processing
        ↓
Skill Matching
        ↓
Location Matching
        ↓
Swipe History
        ↓
Weighted Match Score
        ↓
Reason Tags
        ↓
Personalized Recommendations

8. Main API Endpoints
Health
GET /health
Resume Upload
POST /api/v1/resume/upload
Get Resume
GET /api/v1/resume/{resume_id}
ATS Score
GET /api/v1/resume/{resume_id}/ats-score
Recommendations
GET /api/v1/recommendations
Jobs
GET /gateway/jobs
Job Market
GET /gateway/job-market

9. Dataset
The service currently uses:
job_market_india.csv
Important fields include:
job_id
Job Title
Location
Salary
Monthly Salary
Skills

10. Matching Approach
The current Milestone 2 Matching Engine uses a rule-based / heuristic scoring approach.
The score considers factors such as:
Skill overlap
Location match
User swipe interactions

Example:

Skill Score
     +
Location Score
     +
Swipe Signals
     ↓
Match Score
     ↓
Recommendation
11. ATS Scoring
The ATS component compares resume skills with required job skills and generates an ATS score.
The current ATS implementation is heuristic/rule-based and does not use a trained machine learning model.

12. Milestone 3 – Future AI/ML Scope
The current system provides the foundation for advanced AI/ML capabilities.
Planned improvements include:
ML-based job recommendation.
Resume-job semantic matching.
AI-based ranking.
ATS-aware recommendation ranking.
Behaviour-based personalization.
Advanced recommendation models.

13. Running the Service
From the backend directory:
uvicorn app.main:app --reload --port 8003
Swagger documentation:
http://127.0.0.1:8003/docs

14. Conclusion
The AI/ML Career Intelligence Service establishes the backend foundation for SwipeX career recommendations. Milestone 1 implemented the core resume, ATS, and job-data services, while Milestone 2 added skill/location matching, weighted scoring, swipe-based personalization, recommendations, and reason tags.
The architecture is prepared for advanced AI/ML-based recommendation and ATS-aware ranking in Milestone 3.

### Important point for your project
I have used this **Rule-based / Heuristic Matching + Personalization** ✅
and
**Advanced trained AI/ML recommendation → Milestone 3**
This will make your README consistent with your SRS and also easy to explain
