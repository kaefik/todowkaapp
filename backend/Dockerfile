FROM python:3.12-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN pip install --no-cache-dir setuptools wheel

COPY pyproject.toml ./

RUN pip install --no-cache-dir -e .

COPY . .

RUN chmod +x docker-entrypoint.sh

RUN mkdir -p data

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
