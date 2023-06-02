FROM phenoscape/blazegraph:latest

# The URL of the blazegraph journal to use
ENV DB_URL=http://cdn-humanatlas-io.s3-website.us-east-2.amazonaws.com/digital-objects/blazegraph.jnl

RUN apt-get update && apt-get -y install cron

COPY ./context/blazegraph.properties .
COPY ./context/sync.cron /etc/cron.d/sync.cron
RUN crontab /etc/cron.d/sync.cron

COPY ./context/startup.sh ./context/sync.sh /

ENTRYPOINT [ "/startup.sh" ]
