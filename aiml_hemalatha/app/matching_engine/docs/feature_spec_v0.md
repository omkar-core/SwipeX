# Matching Engine - Feature Specification v0

## 1. Objective

The Matching Engine ranks jobs based on how well they match a user's profile.

## 2. User Input Fields

- user_id
- skills
- location
- experience


## 3. Job Input Fields

> Note: The job input fields will be finalized after reviewing Intern 3's schema draft.

- job_id
- job_title
- required_skills
- location
- min_experience
- max_experience

## 4. Matching Features

### 4.1 Skills Overlap

This feature compares the user's skills with the skills required by the job.

Formula:

Skills Score = (Matched Skills / Required Skills) × 100

Weight: 50%

### 4.2 Location Match

This feature checks whether the user's location matches the job location.

If the locations match:

Location Score = 100

If the locations do not match:

Location Score = 0

Weight: 20%

### 4.3 Experience Fit

This feature checks whether the user's experience falls within the required experience range of the job.

If the experience is within the required range:

Experience Score = 100

Otherwise:

Experience Score = 0

Weight: 20%

### 4.4 Swipe History

This feature uses the user's previous like and skip actions to personalize job recommendations.

Weight: 10%

## 5. Weighted Scoring Formula

Final Match Score =

(0.50 × Skills Score)
+
(0.20 × Location Score)
+
(0.20 × Experience Score)
+
(0.10 × Swipe History Score)

The final score is calculated on a scale of 0 to 100.

## 6. Example

User:

Skills = Python, SQL, Git
Location = Bangalore
Experience = 1 year

Job:

Required Skills = Python, SQL, Git, API
Location = Bangalore
Experience = 0-2 years

Skills Score = 75
Location Score = 100
Experience Score = 100
Swipe History Score = 0

Final Match Score = 77.5

## 7. Day 2 Usage

This specification will be used to implement the Matching Engine FastAPI recommendation endpoint.