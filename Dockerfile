FROM denoland/deno:latest AS builder

WORKDIR /app
COPY . .

RUN deno install --allow-scripts --allow-import
RUN deno task build

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/output/QueryWife /usr/local/bin/QueryWife
COPY ./LICENSE /usr/local/bin/QueryWife_LICENSE

EXPOSE 8080
CMD ["QueryWife"]
