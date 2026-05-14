FROM ubuntu:24.04

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libcap-dev libsystemd-dev asciidoc libseccomp-dev pkg-config git \
    openjdk-17-jdk golang curl jq \
    && rm -rf /var/lib/apt/lists/*

# Build isolate sandbox
RUN git clone --depth 1 https://github.com/ioi/isolate.git /tmp/isolate && \
    cd /tmp/isolate && \
    make isolate && \
    make install && \
    rm -rf /tmp/isolate

RUN mkdir -p /var/local/lib/isolate && useradd -u 1001 -m judge

WORKDIR /app

COPY server.go .
COPY init.sh .

# Build the kafka judge worker binary using the system golang
# Pin kafka-go to v0.4.47 which works with Go 1.22 (no go1.23 toolchain needed)
RUN GOTOOLCHAIN=local go mod init judge-worker && \
    GOTOOLCHAIN=local go get github.com/segmentio/kafka-go@v0.4.47 && \
    GOTOOLCHAIN=local go mod tidy && \
    GOTOOLCHAIN=local go build -o worker server.go

RUN chmod +x init.sh

CMD ["./init.sh"]
