# ✦ Smart Memos: AI-Powered Notes App with WYSIWYG Editor

## ⚡ Features

- **WYSIWYG Editor**: Rich text editing experience for note creation.
- **Auth**: OAuth (Google, Microsoft), Email Password, Guest User
- **Notes**:
  - CRUD Notes
  - When saving notes create a background job: it create embeddings of summary of whole notes + metadata + what notes is storing embeddings store that then delete the old outdated embeddings

## 🧩 Packages

- Express
- Dotenv
- CORS
- Helmet
- Express Rate Limit
- Mongoose
- MongoDB
- Jose
- Bcrypt
- @upstash/redis
- Pino
- Pino-pretty
- Pino-http
- Cookie Parser
- Cross Env
- zod
- ms
- NanoId
- Nodemailer
- tsc-alias, tsx, typescript

# notes

\_id
icon
title
content
user_id
last_modified
summary
tags: [{key, value}]
about

# Vector DB

id
user_id
note_id
summary_embeddings
about_embeddings
metadata_embeddings
last_modified_at

- Guest user have session limited to this device only, cant amange profile or anything, cant login in new device to access resources, if any bug happpen for session your data may be lost cant access ai feature, to get all those feature and you like the app then upgrade your account. also if you dont access your account for 7 days your data may be permanently deleted.

- cron job for guest account if they have not logged in for 7 days then delete their account and all their data.
- In Cron Job: Delte all expired tokens, and for isGuest users check if there is an active refresh token if not we can safely dlete that guest user all data.
