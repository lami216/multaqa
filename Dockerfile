FROM node:22-alpine AS frontend
WORKDIR /build
RUN npm install --global pnpm@10.34.6
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=5000
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --chown=node:node server/src ./server/src
COPY --from=frontend --chown=node:node /build/dist ./dist
USER node
EXPOSE 5000
CMD ["node", "server/src/server.js"]
