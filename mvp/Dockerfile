FROM node:24-alpine
RUN apk add --no-cache su-exec
WORKDIR /app
COPY --chown=node:node package.json server.mjs platform.mjs backup.mjs ./
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node public ./public
COPY --chmod=755 docker-entrypoint.sh /usr/local/bin/ulim-entrypoint
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8766 DATA_DIR=/data/ulim
EXPOSE 8766
ENTRYPOINT ["ulim-entrypoint"]
CMD ["node", "server.mjs"]
