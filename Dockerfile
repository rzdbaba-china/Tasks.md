FROM node:18.20.4-alpine3.20 AS build-stage

# Optional npm registry override for slow networks, e.g.:
#   docker build --build-arg NPM_REGISTRY=https://registry.npmmirror.com -t tasks-md-zh .
ARG NPM_REGISTRY=https://registry.npmjs.org

RUN apk add git
RUN set -eux \
    && mkdir -p /app \
    && mkdir -p /api

COPY frontend/ /app
COPY entrypoint.sh /api/entrypoint.sh

WORKDIR /app
RUN npm config set registry ${NPM_REGISTRY}
RUN rm -r src/components/Stacks-Editor
RUN git clone https://github.com/BaldissaraMatheus/Stacks-Editor src/components/Stacks-Editor
RUN cd src/components/Stacks-Editor && npm ci --no-audit
RUN set -eux && npm ci --no-audit --omit=dev

COPY backend/ /api/

WORKDIR /api
RUN set -eux && npm ci --no-audit

FROM alpine:3.20 AS final
USER root
# Default UI language. The frontend is built by entrypoint.sh at container
# startup, so this can be overridden at runtime, e.g. `-e VITE_APP_LOCALE=zh-TW`.
# Supported values: zh-CN (default), zh-TW, en, es.
ENV VITE_APP_LOCALE=zh-CN
RUN set -eux && apk add --no-cache nodejs npm
RUN mkdir /stylesheets

COPY --from=build-stage /app /app
COPY --from=build-stage /api/ /api/

VOLUME /tasks
VOLUME /config
WORKDIR /api
EXPOSE 8080

ENTRYPOINT sh entrypoint.sh
