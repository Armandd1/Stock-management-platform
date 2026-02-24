# Stock Management Platform

A simple but extensible stock management platform built with React, NestJS, Fastify, and PostgreSQL.

## Features
- Manage Products, Warehouses, and Stock Movements.
- Secure Role-Based Access Control (Admin, Manager, Viewer).
- Data consistency with atomic updates and zero-negative stock checks.

## Tech Stack
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Shadcn UI
- **Backend**: Node.js, NestJS, Fastify, Prisma ORM
- **Database**: PostgreSQL
- **Infrastructure**: Docker & Docker Compose

## Quick Start
1. Ensure Docker and Docker Compose are installed.
2. Clone the repository.
3. Start the application:
   ```bash
   docker compose up --build
   ```
4. Access the Frontend at `http://localhost:5173`
5. Access the Backend API at `http://localhost:3000`

See `docker-compose.yml` and `.env.example` for environment configurations.
