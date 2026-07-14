 give me command line syntax to build and run this application step wise

Here's the full step-by-step command sequence, matching what's actually
verified to work in t

1. Clone & install

git clone https://gittform.git
cd dexo-platform
npm install

2. Environment

cp .env.example .env
# edit .env: DATABASE_URL, REDIS_URL, JWT_SECRET, DEV_TENANT, etc.

3. Start infra (Docker)

docker-compose up -d
docker ps --filter "ns, redis, minio,mailhog are Up

4. Database — generate client + sync schema

npx prisma generate
npx prisma db push   out checked-inmigrations

5. Seed demo data (idempotent — safe to rerun)

npm run db:seed:v5

6. Run the apps

Option A — everything at once:
./run.sh          # Ltomatically, thenstarts all 7 apps
run.bat           # W

Option B — one app ato logs/<app>/):
bash scripts/start-app.sh api              # :4000
bash scripts/start-ap
bash scripts/start-app.sh platform-admin   # :3002
bash scripts/start-ap
bash scripts/start-app.sh tenant-admin     # :4006
bash scripts/start-ap
bash scripts/start-app.sh mobile           # :8081

Option C — turbo (all apps in parallel via npm):
npm run dev

7. Verify it's up

curl -s http://localh

8. Stop everything

./stop.sh          # , frees ports; Dockerstays up
docker stop dexo-postxo-mailhog   #optional, also stops infra                                             
Rebuild after a git pull (what I just ran): repeat steps 1, 4, 5, then stop.sh + Option B/C