FROM ghcr.io/muchobien/pocketbase:latest

COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 8090

ENTRYPOINT ["/start.sh"]
