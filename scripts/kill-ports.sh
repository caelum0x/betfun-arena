#!/bin/bash

# Kill processes on ports 3000, 3001, 3002
echo "Killing processes on ports 3000, 3001, 3002..."

for port in 3000 3001 3002; do
  pid=$(lsof -ti :$port 2>/dev/null)
  if [ ! -z "$pid" ]; then
    echo "Killing process $pid on port $port"
    kill -9 $pid 2>/dev/null
  else
    echo "Port $port is free"
  fi
done

echo "Done!"

