"""
run_local_redis.py - Lightweight local Redis TCP server for development and testing.
Uses fakeredis.TcpFakeServer to provide a full in-memory Redis instance on port 6379
without requiring external Redis binary or Docker.
"""
import sys
import fakeredis

def main():
    host = "127.0.0.1"
    port = 6379
    print(f"[REDIS] Starting local Redis TCP server on {host}:{port}...", flush=True)
    server = fakeredis.TcpFakeServer((host, port))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("[REDIS] Shutting down Redis server.", flush=True)
        server.server_close()

if __name__ == "__main__":
    main()
