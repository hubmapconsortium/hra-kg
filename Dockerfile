FROM eclipse-temurin:8-jre-jammy

# Install Node 22
RUN apt-get update && apt-get install curl gpg -y && mkdir -p /etc/apt/keyrings; \
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg; \
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list; \
  apt-get update && apt-get install -y nodejs

# Install redocly cli (for building the openapi spec) and PM2 runtime
RUN npm install @redocly/cli pm2 -g

# Blazegraph docker setup adapted from https://github.com/phenoscape/blazegraph-docker/tree/master
RUN mkdir /blazegraph \
  && cd /blazegraph \
  && curl -L -O 'https://github.com/blazegraph/database/releases/download/BLAZEGRAPH_RELEASE_2_1_5/blazegraph.jar' \
  && curl -L -O 'https://repo1.maven.org/maven2/org/eclipse/jetty/jetty-servlets/9.2.3.v20140905/jetty-servlets-9.2.3.v20140905.jar'

# use --env on the docker run command line to override
ENV BLAZEGRAPH_MEMORY=12G
ENV BLAZEGRAPH_TIMEOUT=360000
ENV BLAZEGRAPH_READONLY=false
ENV PORT=8080

###### Add blazegraph-runner #####
# Code snippet from https://github.com/INCATools/ubergraph/blob/master/Dockerfile#L18C1-L23C53
ENV BR=1.7
ENV PATH="/tools/blazegraph-runner/bin:$PATH"
RUN wget -nv https://github.com/balhoff/blazegraph-runner/releases/download/v$BR/blazegraph-runner-$BR.tgz \
&& tar -zxvf blazegraph-runner-$BR.tgz \
&& mkdir -p /tools && mv blazegraph-runner-$BR /tools/blazegraph-runner

# The URL of the blazegraph journal to use
ENV DB_URL=http://cdn-humanatlas-io.s3-website.us-east-2.amazonaws.com/digital-objects/blazegraph.jnl

RUN apt-get update && apt-get -y install cron bzip2

RUN mkdir -p /data

COPY ./context/blazegraph.properties /data/blazegraph.properties
COPY ./context/sync.cron /etc/cron.d/sync.cron

ADD ./context/readonly_cors.xml /blazegraph/readonly_cors.tmp.xml
ADD ./context/entrypoint.sh /blazegraph/entrypoint.sh
ADD ./context/startup.sh /blazegraph/startup.sh

RUN crontab /etc/cron.d/sync.cron

COPY ./context/startup.sh ./context/sync.sh /

ENTRYPOINT [ "/startup.sh" ]
