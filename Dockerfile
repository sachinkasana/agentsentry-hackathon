FROM python:3.13-slim

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip

COPY pyproject.toml README.md LICENSE ./
COPY src ./src

RUN pip install --no-cache-dir .

ENV PORT=8080
EXPOSE 8080

CMD ["uvicorn", "agentsentry.main:app", "--host", "0.0.0.0", "--port", "8080"]
