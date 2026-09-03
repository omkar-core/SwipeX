

```markdown
# Handover Notes - Milestone 1

## Project

Resume Service and Job Recommendation System

## Backend Technology

- Python
- FastAPI
- Pandas
- Pytest

## Main Features

### Resume Upload

Endpoint:

POST /api/v1/resume/upload

The service accepts a resume file and extracts known skills.

### Resume Retrieval

Endpoint:

GET /api/v1/resume/{resume_id}

Returns stored resume information.

### ATS Score

Endpoint:

GET /api/v1/resume/{resume_id}/ats-score?job_id={job_id}

Calculates the match percentage between resume skills and job-required skills.

### Job Recommendations

Endpoint:

GET /api/v1/recommendations?user_id={user_id}

Returns jobs ranked using simple skill matching.

### Health Check

Endpoint:

GET /health

Used to verify that the service is running.

## Important Technical Note

The current system uses heuristic-based logic only.

It does not use a trained AI or Machine Learning model.

## Running the Application

Install dependencies:

```bash
python -m pip install -r requirements.txt



---

# 4. Add an explicit API description

Your API already returns:

```python
"generated_by": "heuristic-v0"