FROM golang:alpine

WORKDIR /app

COPY main.go .

RUN go mod init backend && \
    go get github.com/lib/pq && \
    go get golang.org/x/crypto/bcrypt && \
    go get github.com/segmentio/kafka-go && \
    go get github.com/google/uuid && \
    go mod tidy && \
    go build -o backend main.go

EXPOSE 8082

CMD ["./backend"]
