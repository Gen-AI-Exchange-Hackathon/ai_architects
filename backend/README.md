# Gen AI Exchange Hackathon - FastAPI Backend

This repository contains the backend service for the Gen AI Exchange Hackathon project, built with FastAPI. It leverages Google Gemini Generative AI and integrates multi-source data grounding for comprehensive startup evaluation and analysis.

## Features

- AI-powered startup document analysis and financial data grounding
- Risk assessment using Scorecard and other methods
- Peer company comparison and benchmarking
- Integration with Google Cloud services (Storage, BigQuery, AI Platform)
- PostgreSQL database support via SQLAlchemy and pg8000
- Dockerized for easy deployment on Kubernetes or cloud environments

## Technology Stack

- FastAPI for REST API backend
- Google Generative AI SDK (`google-genai`)
- PostgreSQL with SQLAlchemy ORM and pg8000 driver
- Google Cloud Storage and other GCP services
- Gunicorn + Uvicorn for ASGI deployment
- Python 3.9.23

## Getting Started

### Prerequisites

- Python 3.9+
- Google Cloud account with necessary APIs enabled
- PostgreSQL database (local or cloud)
- Docker (optional, for containerization)

### Installation

1. Clone the repository:
```
git clone https://github.com/Gen-AI-Exchange-Hackathon/fastapi-backend.git
cd fastapi-backend
```


2. Install dependencies:
```
pip install -r requirements.txt
```


3. Configure environment variables for Google Cloud authentication, database connections, etc.

4. Run the app locally:
```
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```