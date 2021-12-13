FROM node:14.18-buster-slim
RUN apt-get update && apt-get install -y make g++ gcc build-essential --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /opt/yandex2mqtt
WORKDIR /opt/yandex2mqtt
COPY ./yandex2mqtt/package* /opt/yandex2mqtt/
RUN npm ci --production --no-audit
COPY ./yandex2mqtt /opt/yandex2mqtt
RUN ln -s /dev/stderr /opt/yandex2mqtt/log/error.log

CMD npm start -- --log-info --log-error
