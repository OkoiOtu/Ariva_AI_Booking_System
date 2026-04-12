FROM alpine:latest
RUN apk add --no-cache wget unzip ca-certificates
WORKDIR /pb
RUN wget https://github.com/pocketbase/pocketbase/releases/download/v0.22.20/pocketbase_0.22.20_linux_amd64.zip \
    && unzip pocketbase_0.22.20_linux_amd64.zip \
    && rm pocketbase_0.22.20_linux_amd64.zip \
    && chmod +x pocketbase
EXPOSE 8090
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]