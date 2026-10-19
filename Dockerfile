FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node . .
RUN node scripts/build.mjs
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=8080
USER node
EXPOSE 8080
CMD ["node", "server.mjs"]
