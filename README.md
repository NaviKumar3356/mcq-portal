# MCQ Test Portal

A web-based school assessment platform for creating, conducting, reviewing, and managing online tests for students, teachers, and administrators.

## Overview

MCQ Test Portal supports objective assessments and practical/manual-assessment workflows such as HTML/CSS, Python, MS Word, Excel, image-editing tasks, and file-submission activities.

### Roles

- **Students:** take assigned tests, submit answers/files, and view results.
- **Teachers:** create papers, manage questions, review submissions, manually grade practical work, and publish results.
- **Administrators:** manage students, teachers, classes, sections, subjects, branding, and portal configuration.

## Key Features

### Student
- Student login and assessment access
- Opening/closing test windows
- MCQ/objective questions
- Practical/manual-answer questions
- HTML/CSS code submission
- Python code submission
- Image/resource-based questions
- Download/edit/upload workflows for practical files
- Result and question-wise review
- Single-session protection for student accounts

### Teacher
- Create and edit question papers
- Professional assessment scheduling
- Question bank management
- MCQ answer keys
- Manual-marking questions
- HTML/CSS and Python practical questions
- Reference/model answers
- Reference files and images
- Word/Excel/PPT/PDF/image/ZIP resources
- Student file review
- Individual practical marks
- Reusable teacher feedback/reference answers
- Result publishing

### Administrator
- Admin dashboard
- Teacher and student management
- Dynamic classes, sections, and subjects
- Default student section handling
- School branding and logo management
- Student avatar configuration
- Administrative statistics
- Secure administration configuration

## Practical Assessment Workflows

### HTML/CSS
Teachers can provide a problem statement, starter code, reference image/resource, and correct/reference code. Students submit their solution and teachers manually award marks.

### Python
Students submit Python solutions while teachers retain manual control over marking. Unrestricted execution of student code on the application server is intentionally avoided unless a dedicated sandbox is implemented.

### Image / Photo Editing
1. Teacher uploads the source file.
2. Student downloads it.
3. Student edits it using the required software.
4. Student uploads the completed file.
5. Teacher reviews and awards marks.

### Microsoft Word / Excel
Recommended workflow:

**Download → Edit → Upload → Teacher Review**

This avoids requiring every student to authenticate with Google Workspace and provides the school with the actual submitted file.

## Academic Configuration

Classes, sections, and subjects are configurable from the administration area using an easy **Add → Configure → Save** workflow.

Example:

```text
Classes
I
II
III
...
XII
```

```text
Sections
A
B
C
```

```text
Subjects
English
Hindi
Mathematics
Science
Computer
...
```

## Assessment Scheduling

Tests support opening and closing windows with:

- Date selection
- Time selection
- Start/opening time
- End/closing time
- Assessment-window summary
- Quick date/time actions
- Invalid time-range validation

Server-side time controls are used for assessment enforcement rather than trusting the student's device clock.

## Security

The project includes security-oriented controls such as:

- Supabase authentication and data access
- Row Level Security where configured
- Server-side authorization
- Protected administrative functions
- Controlled student assessment access
- Protected resource/file access
- File type and upload-size restrictions
- Server-side student session validation
- Security-related HTTP headers
- Content Security Policy configuration
- Referrer-Policy
- X-Content-Type-Options
- Frame restrictions
- Permissions-Policy
- HTTPS/HSTS support in production

### Student single-session protection

A student account is intended to have one active session at a time.

```text
Student A
   |
   +-- Computer 1 --> ACTIVE
   |
   +-- Computer 2 --> BLOCKED
```

The session lock is maintained server-side rather than relying only on browser local storage.

## Performance

Performance-oriented features include:

- Lazy-loaded application routes
- Reduced repeated configuration requests
- Lightweight dashboard statistics
- Database indexes for common assessment queries
- Controlled storage uploads
- Client-side request reuse/caching where appropriate

## Technology Stack

- React
- Vite
- JavaScript / JSX
- Supabase
- Netlify Functions
- Netlify
- CSS
- Git / GitHub

## Project Structure

```text
mcq-portal/
├── public/
├── src/
├── netlify/
│   └── functions/
├── supabase/
├── scripts/
├── index.html
├── package.json
├── package-lock.json
├── netlify.toml
├── vite.config.js
└── README.md
```

## Local Development

### Requirements

- Node.js
- npm
- Netlify CLI for local Netlify Functions testing

### Install

```bash
npm install
```

### Verify

```bash
npm run verify
```

### Production build

```bash
npm run build
```

### Run with Netlify Dev

```bash
netlify dev
```

Open the local Netlify URL shown by the CLI, normally:

```text
http://localhost:8888
```

## Environment Variables

Create a local `.env` file from `.env.example`.

```env
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_ADMIN_LOGIN_PATH=/your-private-admin-login-path
```

Server-side secrets must be configured through Netlify environment variables and must never be committed to GitHub.

Never commit:

```text
.env
```

or service-role/private credentials.

## Supabase Setup

Database migrations are located in:

```text
supabase/
```

Run the required migrations in the intended order for the deployed version.

Migrations cover areas such as:

- Academic catalogue
- Student section defaults
- Practical question/reference data
- Question resources
- Student session management
- Supporting indexes/functions

Back up production data before applying schema changes.

## Deployment

The project is configured for Netlify deployment.

```bash
git add .
git commit -m "feat: improve practical assessments, UI, scheduling and security"
git push origin main
```

Netlify can then build the `main` branch using the repository configuration.

## Deployment Checklist

- [ ] `npm install` completes
- [ ] `npm run verify` passes
- [ ] `npm run build` passes
- [ ] `.env` is not committed
- [ ] Supabase production variables are configured
- [ ] Required migrations are applied
- [ ] Student login tested
- [ ] Teacher login tested
- [ ] Admin login tested
- [ ] Test creation tested
- [ ] Scheduling tested
- [ ] MCQ submission tested
- [ ] Practical submission tested
- [ ] File upload/download tested
- [ ] Manual grading tested
- [ ] PDF/result generation tested
- [ ] Student single-session protection tested

## Git Commit Convention

Use short, descriptive commit messages.

```text
feat: add practical assessment workflows
fix: resolve student session locking
fix: correct PDF practical feedback rendering
style: improve teacher and admin form controls
perf: optimize dashboard statistics loading
```

### Recommended commit for the current update

```text
feat: enhance portal UI, practical grading, scheduling and session security
```

## Maintenance

1. Make changes in a feature branch where practical.
2. Run `npm run verify`.
3. Run `npm run build`.
4. Test the affected workflow locally.
5. Review database migrations before production deployment.
6. Commit with a clear message.
7. Push and verify the Netlify deployment.

## License

Add the applicable project license here if the repository is intended to be distributed publicly.

## Project Status

Actively developed for school assessment and examination workflows. Features and database migrations may change as the platform evolves.
