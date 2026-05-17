FROM node:20-slim
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml ./
COPY packages/database/package.json ./packages/database/
COPY packages/database/prisma ./packages/database/prisma/
COPY apps/api/package.json ./apps/api/

RUN pnpm install

COPY packages/database ./packages/database
COPY apps/api ./apps/api

RUN pnpm db:generate

WORKDIR /app
EXPOSE 8000

CMD ["sh", "-c", "pnpm db:migrate:deploy && pnpm --filter @stamped/api dev"]
