SwipeX — Milestone 2 API Contracts (Backend & Identity / Intern 2)
Drafted Day 1. Frozen by Day 2 so Intern 1 (Frontend) and Intern 4 (Matching
Engine) can build against these shapes without waiting on the real
implementations to land.
All routes below sit behind the API Gateway (`backend_mansi`). "Auth"
column: Public = optional token (richer results if logged in),
Required = must be logged in, Recruiter = must be logged in as
a Recruiter, Job Seeker = must be logged in as a Job Seeker.
Job Service (owner: Intern 2, backed by Intern 3's data)
Method	Path	Auth	Notes
GET	`/api/v1/jobs`	Public	Paginated list. Query: `page`, `page_size`, `type`, `location`, `remote`, `salary_min`, `salary_max`, `skills`
GET	`/api/v1/jobs/{job_id}`	Public	Full job detail incl. company, freshness, competition-level
GET	`/api/v1/jobs/search`	Public	Dedicated keyword search — Day 3. Query: `q` (keyword), `location`, `job_type`, `salary_min`, `salary_max`, `experience_level`, `skills`
POST	`/api/v1/jobs`	Recruiter	Create a job posting — Day 4 stub. Body: `{ title, description, location, salary_min, salary_max, skills[], ... }`
PUT	`/api/v1/jobs/{job_id}`	Recruiter	Update a job posting — Day 4 stub
Freshness & competition fields (computed by Intern 3, exposed here — Day 4):
`posted_time` (ISO datetime), `applicant_count` (int), `competition_level` (`low`/`medium`/`high`)
Swipe Service (owner: Intern 2)
Method	Path	Auth	Notes
POST	`/api/v1/swipes`	Job Seeker	Body: `{ job_id, direction: "right"
GET	`/api/v1/swipes/history`	Required	Returns the logged-in user's past swipes
Company & Startup Listings (owner: Intern 2, backed by Intern 3's data — Day 3)
Method	Path	Auth	Notes
GET	`/api/v1/companies`	Public	Paginated list of companies/startups
GET	`/api/v1/companies/{company_id}`	Public	Company detail + its open job listings
Matching Engine / AI Recommendations (owner: Intern 4, registered here Day 4-5)
Method	Path	Auth	Notes
GET	`/api/v1/recommendations`	Required	Personalized job feed ranked by profile fit + swipe history (heuristic v0 — real NLP/ML model is Milestone 3)
Until Intern 4's service is running, this returns `503 Upstream service unreachable` — expected, same pattern as the Resume service in Milestone 1.
Still to confirm with Intern 3 (data_hanith) before Day 2
[ ] Exact field names for freshness/competition (does their schema already
have `applicant_count`? Milestone 1's job-service reference schema did,
but confirm data_hanith's actual columns match)
[ ] Whether `/jobs/search` is a NEW endpoint on their side, or whether
Gateway should just forward extra query params to the existing
`/jobs` endpoint (their current filtering already supports
`location`, `remote`, `salary_min/max`, `skills` — may not need a
separate path at all)
[ ] Company/Startup endpoint — does data_hanith's `companies` table
already support a public listing endpoint, or does one need to be added?