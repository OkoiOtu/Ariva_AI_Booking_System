#!/bin/sh
# Railway assigns a dynamic PORT — pass it to PocketBase
exec /usr/local/bin/pocketbase serve --http="0.0.0.0:${PORT:-8090}" --dir="/pb/pb_data"
