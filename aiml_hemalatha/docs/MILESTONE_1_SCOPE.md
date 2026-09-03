# Milestone 1 - Scope Documentation

## Project

Resume Service and Job Recommendation System

## Milestone 1 Approach

Milestone 1 uses a simple rule-based and heuristic-based approach.

The system does not use a trained Artificial Intelligence or Machine Learning model.

## ATS Scoring

The ATS score is calculated using skill matching.

The process is:

1. Extract skills from the uploaded resume.
2. Identify the required skills for a job.
3. Compare resume skills with required job skills.
4. Calculate the percentage of matched skills.

Example:

Required Skills:

- Python
- SQL
- Git
- FastAPI

Resume Skills:

- Python
- SQL

Matched Skills:

- Python
- SQL

ATS Score:

50%

## Job Recommendations

Job recommendations are generated using simple skill matching.

Each job receives a match score based on:

- Skills present in the resume
- Skills required by the job

Jobs with higher match scores are ranked first.

## Important Limitation

This milestone does not use:

- A trained AI model
- Machine learning predictions
- Deep learning
- Natural language understanding models
- Personalized AI ranking

The current implementation is heuristic-only.

## Future Scope

Future versions may include:

- Machine learning-based job ranking
- AI-based resume understanding
- Semantic skill matching
- Personalized recommendations
- Learning from user interactions

## Milestone Status

Milestone 1 successfully demonstrates:

- Resume upload
- Resume parsing
- Skill extraction
- ATS scoring
- Job recommendation
- Job market data APIs

All current scoring and recommendation features are based on deterministic rules.