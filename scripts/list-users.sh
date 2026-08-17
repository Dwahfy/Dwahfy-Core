#!/bin/bash
docker cp ~/Dwahfy/Dwahfy-Core/scripts/list-users.js dwahfy-core-1:/app/list-users.js
docker exec -it dwahfy-core-1 node list-users.js
docker exec dwahfy-core-1 rm /app/list-users.js
