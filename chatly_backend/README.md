# Chatly Backend (NestJS + GraphQL)

## Setup

1. Copy environment variables:
   cp .env.example .env

2. Start Postgres + Redis:
   docker compose up -d

3. Install dependencies:
   npm install

4. Run Prisma migration:
   npm run prisma:migrate

5. Start the dev server:
   npm run start:dev

GraphQL Playground available at http://localhost:4000/graphql
