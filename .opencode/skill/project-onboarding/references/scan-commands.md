# Scan Commands by Platform

## Node.js / TypeScript

```bash
# Stack detection
cat package.json | python3 -m json.tool 2>/dev/null | grep -E '"name"|"version"|"main"|"type"'
cat tsconfig.json 2>/dev/null | head -30

# Dependencies summary
cat package.json | python3 -c "
import json,sys
p=json.load(sys.stdin)
deps={**p.get('dependencies',{}),**p.get('devDependencies',{})}
for k,v in sorted(deps.items()): print(f'{k}: {v}')
" 2>/dev/null

# Schema files (Prisma / Drizzle / TypeORM)
find . -name "*.prisma" -not -path "*/node_modules/*" | xargs cat 2>/dev/null
find . -name "schema.ts" -not -path "*/node_modules/*" | xargs cat 2>/dev/null
find . -path "*/migrations/*.sql" -not -path "*/node_modules/*" | sort | head -5

# Route files
find . -name "*.router.*" -o -name "*.routes.*" -o -name "*.controller.*" \
  | grep -v node_modules | head -20

# Test coverage
cat coverage/coverage-summary.json 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin).get('total',{})
for k in ['lines','branches','functions','statements']:
  print(f'{k}: {d.get(k,{}).get(\"pct\",\"?\")!r}%')
" 2>/dev/null
```

## Python / Django / FastAPI

```bash
# Stack detection
cat requirements.txt 2>/dev/null || cat pyproject.toml 2>/dev/null | head -40
python3 --version 2>/dev/null

# Django models
find . -name "models.py" | grep -v venv | xargs grep "class.*Model" 2>/dev/null

# FastAPI routes
find . -name "*.py" | grep -v venv | xargs grep "@router\.\|@app\." 2>/dev/null | head -30

# Migrations
find . -name "*.py" -path "*/migrations/*" | grep -v venv | wc -l

# Tests
find . -name "test_*.py" -o -name "*_test.py" | grep -v venv | wc -l
coverage report 2>/dev/null | tail -5
```

## Go

```bash
# Stack detection
cat go.mod | head -20
go version 2>/dev/null

# Package structure
find . -name "*.go" -not -path "*/vendor/*" | \
  awk -F/ '{print NF-1, $0}' | sort -n | head -30

# Struct definitions (data models)
grep -r "type.*struct" --include="*.go" . | grep -v vendor | head -30

# HTTP handlers
grep -r "func.*Handler\|http\.Handle\|r\.Get\|r\.Post" \
  --include="*.go" . | grep -v vendor | head -20

# Test coverage
go test ./... -coverprofile=coverage.out 2>/dev/null && \
  go tool cover -func=coverage.out | tail -3
```

## Rust

```bash
# Stack detection
cat Cargo.toml | head -30

# Module structure
find src -name "*.rs" | sort | head -30

# Struct and enum definitions
grep -r "^pub struct\|^pub enum" src/ | head -30

# Route handlers (Actix/Axum)
grep -r "web::get\|web::post\|\.route\|get(\|post(" src/ | head -20
```

## Java / Spring Boot

```bash
# Stack detection
cat pom.xml 2>/dev/null | grep -E "<artifactId>|<version>" | head -20
cat build.gradle 2>/dev/null | head -30

# Entity classes
find . -name "*.java" | xargs grep "@Entity" | head -20

# Controller endpoints
find . -name "*.java" | xargs grep "@RequestMapping\|@GetMapping\|@PostMapping" | head -30

# Test files
find . -name "*Test.java" | wc -l
```

---

## Universal Checks (all platforms)

```bash
# Git activity
git log --oneline -20 2>/dev/null
git log --format="%ae" | sort | uniq -c | sort -rn | head -10  # contributors

# TODO / debt markers
grep -r "TODO\|FIXME\|HACK\|XXX\|DEPRECATED" \
  --include="*.ts" --include="*.js" --include="*.py" \
  --include="*.go" --include="*.rs" --include="*.java" \
  -l 2>/dev/null | head -20
grep -r "TODO\|FIXME\|HACK" \
  --include="*.ts" --include="*.js" --include="*.py" \
  2>/dev/null | wc -l

# Environment variables (expected)
cat .env.example 2>/dev/null || cat .env.sample 2>/dev/null || \
  grep -r "process\.env\.\|os\.environ\.\|env\." \
  --include="*.ts" --include="*.js" --include="*.py" \
  2>/dev/null | grep -oP '\.\w+' | sort -u | head -20

# Docker / deployment
cat docker-compose.yml 2>/dev/null | head -30
cat Dockerfile 2>/dev/null | head -20
cat .github/workflows/*.yml 2>/dev/null | head -30

# API documentation
find . -name "openapi*.yml" -o -name "swagger*.yml" -o -name "*.openapi.json" \
  | grep -v node_modules | head -5
```
