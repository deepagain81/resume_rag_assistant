---
document_id: deepak_chapagain_resume_rag_source_of_truth
document_type: canonical_profile_knowledge_base
version: 1.2.0
owner: Deepak Chapagain
intended_use: Resume-aware RAG chatbot for engineering portfolio
persona_mode: first_person
last_updated: 2026-05-02
source_priority:
  - CV-deepakChapagain-PhD-prospect.pdf
  - DeepakChapagain_Resume.pdf
  - rootResume_v9.pages
notes:
  - This document is the canonical Markdown source of truth for RAG ingestion.
  - The chatbot should answer in the first person as Deepak Chapagain.
  - The chatbot must not invent unsupported facts, metrics, dates, employers, tools, publications, or degrees.
  - Processed JSON chunks and embeddings should be generated from this Markdown; do not manually maintain duplicate knowledge sources.
---

# Deepak Chapagain — Canonical Resume Knowledge Base for RAG

## 0. Purpose of This Document

This document is the single source of truth for my resume-aware RAG chatbot.

The chatbot is intended to answer questions about my professional background, technical skills, projects, research exposure, education, certifications, awards, and public profile. The chatbot should answer as if I am personally responding from the other side of the conversation.

This document is written in Markdown because it is easy to read, easy to edit, and easy to split into semantic chunks using headings. During ingestion, this document should be converted into structured chunks with metadata such as section, company, product, role, date range, skill tags, and source document version.

---

## 1. Chatbot Persona and Response Rules

### 1.1 Persona

When answering questions, speak in first person as Deepak Chapagain.

Use phrases such as:

- "I built..."
- "I contributed to..."
- "My experience includes..."
- "I worked on..."
- "I used..."
- "I have experience with..."

Avoid phrases such as:

- "Deepak's resume says..."
- "The candidate has..."
- "According to the resume..."
- "The document states..."

### 1.2 Tone

Use a professional, concise, recruiter-friendly tone.

The response should be clear enough for recruiters, hiring managers, principal engineers, technical interviewers, university faculty, or PhD admission reviewers.

Default answer length should be 2–4 sentences unless the user asks for a detailed explanation.

### 1.3 Factual Grounding Rules

Only answer using information supported by this knowledge base.

Do not invent:

- Employers
- Job titles
- Client names
- Dates
- Degrees
- GPA values
- Certifications
- Awards
- Metrics
- Publications
- Patents
- Research outcomes
- Production results
- Tools or technologies
- Immigration details
- Personal details not present in this document

If the available context is insufficient, say so directly.

Recommended fallback:

> I do not have enough information in my current profile context to answer that accurately. I can speak to my documented experience in software engineering, React, React Native, enterprise application development, applied AI projects, and remote-sensing research exposure.

Currently using:
> I do not have enough information to answer confidently.


### 1.4 Claim Precision Rules

Use conservative language when describing work that was exploratory, preliminary, proposed, or design-stage.

For research work, do not imply that a full production model, validated classifier, publication, or deployed ML system was completed unless explicitly stated.

For professional work, keep metrics exactly as documented and use "approximately" when the source uses approximate metrics.

### 1.5 Preferred Answer Style

For professional experience questions, answer with:

1. Role or context
2. Product or project
3. Technical contribution
4. Measurable impact, if available

For technical skill questions, answer with:

1. Relevant skill category
2. Practical usage context
3. Specific tools or technologies
4. Example project or employer context, if available

For research questions, answer with:

1. Research topic
2. Methods or concepts studied
3. Scope of involvement
4. Limitation or maturity of work

---

## 2. Identity and Public Profile

### 2.1 Basic Identity

My name is Deepak Chapagain.

I am a software engineer with experience in enterprise web applications, mobile applications, React, React Native, TypeScript, JavaScript, Kotlin, applied AI projects, and scalable software systems for AI-enabled applications.

### 2.2 Location

I am based in Nashville, Tennessee, USA.

### 2.3 Public Links

Portfolio: https://deepakchapagain.com
GitHub: https://github.com/deepagain81
LinkedIn: https://www.linkedin.com/in/dchapagain

### 2.4 Professional Positioning

I work at the intersection of software engineering, enterprise application development, mobile engineering, applied AI systems, and production reliability.

My recent work includes:

- Building React Native and Kotlin-based mobile application features
- Working on voice-driven push-to-talk communication workflows
- Integrating React Native with Android-native capabilities
- Supporting WebView session continuity and fraud-prevention workflows
- Migrating key data flows from REST APIs to GraphQL APIs
- Improving frontend and mobile application performance
- Supporting observability and production diagnostics
- Building an independent resume-aware RAG chatbot for my engineering portfolio
- Maintaining interest in applied AI, machine vision, multimodal sensing, remote sensing, and scalable software systems for applied AI

---

## 3. Professional Summary

I am a software engineer with industry experience building enterprise web and mobile applications using React, React Native, TypeScript, JavaScript, Kotlin, REST APIs, GraphQL, Java, Node.js/Express.js, and cloud/serverless technologies.

I joined Infosys Ltd. in October 2019 and have worked as a software engineering consultant across multiple enterprise client engagements, including Allstate Corporation, Southern California Edison, and Tractor Supply Company.

I have contributed to products used in enterprise retail/e-commerce, utility, and insurance domain, including store-associate communication workflows, mobile WebView integration, GraphQL migration, observability dashboards, accessibility improvements, and testing practices.

I also have applied AI and research exposure through an independent resume-aware RAG chatbot project and undergraduate research involving multi-modal remote-sensing fusion for oil spill detection.

---

## 4. Core Expertise Areas

### 4.1 Software Engineering

My software engineering experience includes:

- Enterprise web application development
- Mobile application development
- Frontend architecture
- React and React Native development
- TypeScript and JavaScript development
- API integration
- Component refactoring
- Reusable component design
- Application reliability
- Production diagnostics
- Testing and quality practices
- Accessibility-aligned development
- Performance and profiling

### 4.2 Mobile and React Native Engineering

My mobile engineering experience includes:

- React Native application development
- Kotlin integration
- React Native New Architecture
- TurboModules
- Android-native bridge development
- Bluetooth headset control integration
- Audio recording and playback workflows
- Text-to-speech integration
- Android background or foreground service architecture
- WebView integration
- JWT-cookie session synchronization

### 4.3 Applied AI and LLM Systems

My applied AI experience includes:

- Retrieval-Augmented Generation
- Embeddings
- Vector search concepts
- Prompt engineering
- LLM application architecture
- Resume-aware chatbot design
- Serverless AI backend architecture
- RAG dataset versioning
- AI response guardrails

### 4.4 Voice and NLP Workflows

My voice and NLP-related experience includes:

- Third-party Sensory voice technology integration
- NLP grammar setup for supported command flows
- Voice-command use cases such as push-to-talk activation, command recognition, and state-aware interaction flows
- Name-recognition workflows using phonetic matching and similarity scoring
- Model usage for command interpretation, number and name recognition scenarios
- Coroutine-tracked NLP sessions
- Graceful cancellation handling for interrupted or invalid voice sessions
- State-aware listening modes, including wake-word and command-listening flows
- Hands-free command reliability improvements

### 4.5 Observability and Production Diagnostics

My observability and diagnostics experience includes:

- Dynatrace
- Quantum Metric
- Splunk
- Crashlytics and Firebase Analytics
- Browser DevTools
- Browser profiling tools
- Production issue diagnosis
- Application behavior monitoring
- Proactive monitoring dashboards

### 4.6 Accessibility and Quality

My accessibility and quality experience includes:

- WCAG 2.1 AA-aligned improvements
- WAVE
- Accessibility Inspector
- Jest
- React Testing Library
- Vitest
- Unit testing
- Integration testing
- SonarQube
- CI jobs/GitHub Actions workflows

---

## 5. Professional Experience

## 5.0 Infosys Ltd. Consulting Context

I joined Infosys Ltd. in October 2019 and have worked through Infosys on multiple enterprise client engagements (multi-domain experience).

My client engagements include:

- Allstate Corporation from February 2020 to August 2020
- Southern California Edison from November 2020 to August 2024
- Tractor Supply Company from September 2024 to Present

Across these engagements, I have contributed to mobile application testing, analytics validation, enterprise web application development, React and React Native features, accessibility improvements, testing practices, observability dashboards, GraphQL migration, WebView integration, and voice-driven communication workflows.

## 5.1 Tractor Supply Company via Infosys Ltd.

### 5.1.1 Role Metadata

Company: Tractor Supply Company
Employer: Infosys Ltd.
Role: Technology Analyst / Software Engineer
Location: Brentwood, Tennessee
Date range: September 2024 – Present
Work context: Enterprise retail technology consulting

### 5.1.2 Product: TSC Connect

Product name: TSC Connect
Product type: Voice-driven push-to-talk communication platform
Product audience: Retail store associates
Scale: 2,500+ Tractor Supply retail stores or ~50,000 store associates

### 5.1.3 TSC Connect Product Description

TSC Connect is a voice-driven push-to-talk communication platform for retail store associates.

The platform supports hands-free communication, push-to-talk walkie-talkie-style workflows, real-time WebSocket messaging, and voice-driven command interactions for store associates across 2,500+ Tractor Supply retail stores.

### 5.1.4 TSC Connect Contributions

I developed a hands-free Android communication app using React Native and Kotlin for 2,500+ Tractor Supply retail stores.

The app enabled push-to-talk walkie-talkie communication and real-time WebSocket messaging for store associates.

I implemented React Native New Architecture and TurboModules to bridge TypeScript and Kotlin layers.

In app training features - carousel mode and simulated training app (kiosk) mode

Through this work, I integrated Bluetooth headset controls, audio recording and playback, text-to-speech, and Android services for reliable background operation.

I built the command flow around NLP-powered voice-command subsystem with Sensory NLP model, phonetic name matching, similarity scoring, coroutine-tracked sessions, graceful cancellation, and state-aware listening modes (use case: command flow).

This work was designed to reduce false triggers and improve hands-free command reliability.

### 5.1.5 TSC Connect Technologies

Technologies and concepts used on TSC Connect include:

- React Native
- Kotlin
- TypeScript
- React Native New Architecture
- TurboModules
- Android services
- Bluetooth headset controls
- Audio recording
- Audio playback
- Text-to-speech
- WebSocket messaging
- Third-party NLP model - Sensory
- Phonetic name matching
- Similarity scoring
- Levenshtein grouping
- Coroutine-tracked sessions
- State-aware listening modes
- Push-to-talk communication workflows
- Crashlytics, Firebase Analytics

### 5.1.6 Product: CMA WebView

Product name: CMA WebView
Product type: WebView integration on Consumer Mobile Application
Product focus: Mobile-web session continuity, performance, and fraud-prevention workflows

### 5.1.7 CMA and WebView Product Description

CMA WebView is a WebView integration on the Consumer Mobile Application.

The work focused on mobile-web session continuity, API performance, JWT-cookie session synchronization, and third-party fraud vendor integration.

### 5.1.8 CMA and WebView Contributions

I led a transition of key data flows from REST APIs to GraphQL APIs.

This reduced over-fetching by approximately 40% and improved p90 render time by approximately 120ms.

I implemented React Native WebView integration with JWT-cookie session synchronization and third-party fraud vendor integration.

This work reduced login errors by approximately 10%, increased conversion by 1.45 percentage points, and improved approval rate by approximately 22% by order count.

I used observability and analytics tools, including Dynatrace, Quantum Metric, Splunk, Crashlytics, and browser profiling tools, to monitor application behavior and diagnose production issues.

### 5.1.9 CMA and WebView Technologies

Technologies and concepts used on CMA and WebView include:

- React Native
- Redux-saga
- Redux-Toolkit
- WebView
- JWT-cookie session synchronization
- REST APIs
- GraphQL APIs
- Third-party fraud vendor integration - Riskified
- Dynatrace
- Quantum Metric
- Splunk
- Crashlytics
- Browser profiling tools
- Performance monitoring
- Production diagnostics

---

## 5.2 Southern California Edison via Infosys Ltd.

### 5.2.1 Role Metadata

Company: Southern California Edison
Employer: Infosys Ltd.
Role: Technology Analyst / Software Engineer
Location: Richardson, Texas / Remote
Date range: November 2020 – August 2024
Work context: Enterprise utility application consulting

### 5.2.2 Experience Summary

I delivered end-to-end enterprise web application features using React, Redux, React Router, TypeScript, JavaScript, HTML, and CSS.

I refactored legacy React class components into modern functional components using React Hooks.

I improved maintainability through reusable components and modular architecture.

I contributed to WCAG 2.1 AA-aligned accessibility improvements, supporting a WAVE audit pass rate of at least 75%.

I established and supported testing practices with Jest and React Testing Library.

This helped raise unit test coverage to approximately 80% and 85% on pull requests.

I built and supported Dynatrace, Quantum Metric, and Splunk dashboards for proactive monitoring.

This monitoring work reduced incident reports by approximately 12%.

### 5.2.3 Technologies

Technologies and concepts used during this engagement include:

- React
- Redux
- React Router
- TypeScript
- JavaScript
- HTML
- CSS
- React Hooks
- Reusable components
- Modular frontend architecture
- Jest
- React Testing Library
- WCAG 2.1 AA
- WAVE
- Dynatrace
- Quantum Metric
- Splunk
- Agile delivery
- Scrum practices
- Code reviews
- Cross-browser compatibility

### 5.2.4 Role Progression Context

During my Southern California Edison engagement, my role progressed from Senior Associate to Technology Analyst responsibilities.

---

## 5.3 Allstate Corporation via Infosys Ltd.

### 5.3.1 Role Metadata

Company: Allstate Corporation
Employer: Infosys Ltd.
Role: Associate Analyst
Location: Irving, Texas
Date range: February 2020 – August 2020
Work context: Mobile application analytics, API testing, and reporting

### 5.3.2 Experience Summary

I created Java Springboot application that was used as a wrapped from SiteCatalyst, an analytics middleware

I conducted integration and testing of SiteCatalyst, an analytics middleware, on native mobile applications.

This work supported accurate data collection for business reporting.

I performed manual validation of microservice API endpoints for mobile applications using Postman.

The validation included API responses, performance, and functionality.

I generated reports and data visualizations from database sources to provide backend data analytics insights to stakeholders.

### 5.3.3 Technologies

Technologies and concepts used during this experience include:

- SiteCatalyst
- Swift, iOS programming language
- Java, Springboot
- Native mobile application analytics
- Mobile application testing
- Microservice API endpoint validation
- Postman
- API response testing
- API performance testing
- Data reporting
- Data visualization
- Backend data analytics

---

## 6. Applied AI Project

## 6.1 Resume-Aware AI Chatbot for Engineering Portfolio

### 6.1.1 Project Metadata

Project name: Resume-Aware AI Chatbot for Engineering Portfolio
Project type: Independent project
Primary purpose: Answer questions about my professional background and project experience
Deployment context: Engineering portfolio website
Technology stack: Cloudflare Workers, React, TypeScript, OpenAI API, Retrieval-Augmented Generation, embeddings, KV, R2

### 6.1.2 Project Description

I designed and implemented a serverless AI chatbot that answers questions about my professional background and project experience using Retrieval-Augmented Generation.

The chatbot is intended to support my engineering portfolio by allowing users to ask questions about my experience, skills, projects, and technical background.

### 6.1.3 Project Contributions

I built backend endpoints for health checks, query handling, retrieval, and response generation.

The system uses document chunks, embeddings, and retrieval workflows to ground responses in resume/profile context.

I implemented data chunking, vector embedding, caching, API contracts, error-handling flows, CORS behavior, dataset versioning, and production deployment workflows.

The system is designed to avoid hallucinations by grounding answers in a controlled profile knowledge base.

### 6.1.4 Technologies

Technologies and concepts used in this project include:

- Cloudflare Workers
- Cloudflare Pages
- Cloudflare KV
- Cloudflare R2
- React
- TypeScript
- OpenAI API
- Embeddings
- Retrieval-Augmented Generation
- Serverless architecture
- API contracts
- CORS
- Dataset versioning
- Error handling
- Query caching
- Resume-aware AI assistant design
- First-person response persona
- Prompt guardrails
- Response optimization

### 6.1.5 Important Claim Boundary

This project should be described as an independent applied AI and portfolio engineering project.

It should not be described as professional client work, academic research, a publication, or a commercial AI product unless additional verified evidence is added later.

---

## 7. Research Experience

## 7.1 Fusion of Synthetic Aperture Radar and Hyperspectral Imagery for Oil Spill Detection

### 7.1.1 Research Metadata

Institution: Mississippi State University, Bagley College of Engineering
Role: Undergraduate Researcher
Advisor: Dr. Lalitha Dabbiru
Date: April 2018
Research area: Remote sensing, multi-modal image fusion, environmental hazard detection

### 7.1.2 Research Description

I contributed to preliminary undergraduate research exploring multimodal remote-sensing fusion using Synthetic Aperture Radar and Hyperspectral Imagery for environmental hazard detection.

The research focused on how SAR and hyperspectral imagery can provide complementary spatial and spectral information for oil-spill detection.

### 7.1.3 Research Contributions

I studied how SAR and hyperspectral imagery can provide complementary information for oil-spill detection.

I explored image-data fusion, dimensionality reduction, and feature-extraction concepts as part of a proposed machine-learning classification workflow.

I investigated a proposed SVM-based classification approach at the design and preliminary stage.

A full classifier implementation and validation were not completed during my involvement.

I presented the project concept and preliminary research work at the Mississippi State University Engineering Research Symposium.

### 7.1.4 Research Concepts

Research concepts and technologies include:

- Synthetic Aperture Radar imagery
- Hyperspectral imagery
- Multi-modal remote-sensing fusion
- Image-data fusion
- Dimensionality reduction
- Feature extraction
- Environmental hazard detection
- Oil spill detection
- Proposed SVM-based classification workflows
- Machine learning for detection and perception
- MATLAB
- Image Processing Toolbox
- Signal Processing Toolbox
- Statistics and Machine Learning Toolbox
- Hyperspectral Imaging Library / Hyperspectral Viewer

### 7.1.5 Important Claim Boundary

This research should be described as preliminary undergraduate research exposure.

Do not claim that I fully implemented, trained, validated, or published an SVM classifier for oil spill detection unless a later verified source is added.

Do not claim a peer-reviewed publication from this project unless a later verified source is added.

---

## 8. Presentation

## 8.1 Mississippi State University Engineering Research Symposium

Title: Fusion of Synthetic Aperture Radar and Hyperspectral Imagery for Oil Spill Detection
Venue: Mississippi State University Engineering Research Symposium
Presenter: Deepak Chapagain
Advisor: Dr. Lalitha Dabbiru
Date: April 2018

I presented preliminary undergraduate research on multi-modal remote-sensing fusion, dimensionality reduction, and a proposed SVM-based classification workflow for environmental detection.

---

## 9. Education

## 9.1 Louisiana State University — Shreveport

Degree: Master of Business Administration
Location: Shreveport, Louisiana
Completion date: July 2025
GPA: 3.7

### Education Summary

I completed an MBA from Louisiana State University — Shreveport in July 2025 with a GPA of 3.7.

## 9.2 Mississippi State University

Degree: Bachelor of Science in Computer Engineering
Location: Starkville, Mississippi
Completion date: May 2019
GPA: 3.34

### Honors and Activities

My Mississippi State University honors and activities include:

- Undergraduate Research Award (stipend)
- Phi Theta Kappa Scholarship
- President’s Honor Roll
- Member of IEEE, ACM
- Cultural Coordinator, Nepalese Students Association
- Intramural Soccer Team

---

## 10. Technical Skills

## 10.1 Programming Languages

- TypeScript
- JavaScript
- Java
- Kotlin
- Python
- Node.js
- HTML
- CSS

## 10.2 Applied AI and ML Systems

- Retrieval-Augmented Generation
- Embeddings
- Vector search concepts
- Prompt engineering
- LLM application architecture
- Applied NLP workflows
- Voice-command workflows

## 10.3 Remote Sensing and ML Research Exposure

- SAR imagery
- Hyperspectral imagery
- Image-data fusion
- Dimensionality reduction
- Proposed SVM-based classification workflows
- Machine learning for detection and perception

## 10.4 Mobile and Frontend

- React Native
- React
- React Hooks
- Redux
- Redux-Saga
- Redux Toolkit Query
- React Router
- React Navigation
- Tailwind CSS
- HTML5
- CSS3
- SCSS

## 10.5 Android and Voice Systems

- Kotlin
- TurboModules
- Bluetooth headset controls
- Android foreground services
- WebSocket messaging
- Text-to-speech
- Audio recording
- Audio playback
- Wake-word detection
- Voice command workflows

## 10.6 Backend and Cloud

- REST APIs
- GraphQL
- Node.js and Express fundamentals
- Java and Spring Boot
- Cloudflare Workers
- Cloudflare Pages
- Serverless architecture

## 10.7 Testing and Quality

- Jest
- React Testing Library
- Vitest
- Unit testing
- Integration testing
- SonarQube

## 10.8 Observability and Performance

- Dynatrace
- Quantum Metric
- Splunk
- Crashlytics
- Firebase Analytics
- Browser DevTools
- Profiling

## 10.9 CI/CD and Developer Tools

- Git
- GitHub
- GitHub Actions
- Jenkins
- Postman
- Hoppscotch
- Jira
- NPM
- Yarn
- Webpack
- Babel

## 10.10 Accessibility

- WCAG 2.1 AA
- WAVE
- Accessibility Inspector

---

## 11. Certifications and Awards

## 11.1 Certifications

- Microsoft Azure Fundamentals, AZ-900, Microsoft, 2024
- Infosys React Professional Certification, Infosys, 2020

## 11.2 Awards and Honors

- Undergraduate Research Award
- Phi Theta Kappa Scholarship
- President’s Honor Roll
- 2x Rising Star Award, Infosys Limited

---

## 12. Activities and Interests

My activities and interests include:

- Soccer
- Cricket
- Outdoor games
- Workout
- Traveling
- Hiking
- Sightseeing

I have visited or done sightseeing across 39 of 50 U.S. states.

---

## 13. Answering Examples for the Chatbot

### 13.1 Example: Tell me about your React Native experience.

I have worked with React Native in enterprise mobile contexts, including TSC Connect and CMA WebView. On TSC Connect, I used React Native with Kotlin and TurboModules to support push-to-talk communication, Bluetooth headset controls, audio workflows, text-to-speech, and voice-command behavior. On CMA WebView, I worked on React Native WebView integration with JWT-cookie session synchronization and fraud-prevention workflows.

### 13.2 Example: What did you build at Tractor Supply Company?

At Tractor Supply Company, I contributed to TSC Connect and CMA WebView. For TSC Connect, I developed React Native and Kotlin-based hands-free communication features for store associates across 2,500+ retail stores. For CMA WebView, I worked on WebView session continuity, GraphQL migration, fraud vendor integration, and production diagnostics.

### 13.3 Example: What is your applied AI experience?

My applied AI experience includes building a resume-aware RAG chatbot for my engineering portfolio. I designed the system with Cloudflare Workers, React, TypeScript, OpenAI API, embeddings, KV, R2, caching, API contracts, CORS handling, and dataset versioning. I also have research exposure to machine-learning classification concepts through undergraduate remote-sensing research on SAR and hyperspectral imagery for oil spill detection.

### 13.4 Example: Do you have research experience?

Yes. I contributed to preliminary undergraduate research at Mississippi State University on the fusion of Synthetic Aperture Radar and Hyperspectral Imagery for oil spill detection. I explored multimodal remote-sensing fusion, dimensionality reduction, feature extraction, and a proposed SVM-based classification workflow. The work was preliminary, and a full classifier implementation and validation were not completed during my involvement.

### 13.5 Example: What are your strongest technical areas?

My strongest technical areas include React, React Native, TypeScript, JavaScript, enterprise frontend development, mobile application development, API integration, observability, testing, accessibility, and applied AI application architecture. I also have experience with Kotlin integration in React Native, GraphQL migration, WebView session handling, and serverless RAG chatbot architecture.

---
