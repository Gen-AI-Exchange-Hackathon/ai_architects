from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .router import router
import uvicorn

app = FastAPI(title="My API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include router
app.include_router(router, prefix="/genaiexchange", tags=["api"])

def configure_logging():
    # Configure default logging format with timestamp
    LOGGING_CONFIG["formatters"]["default"]["fmt"] = "%(asctime)s [%(name)s] %(levelprefix)s %(message)s"
    LOGGING_CONFIG["formatters"]["default"]["datefmt"] = "%Y-%m-%d %H:%M:%S"
    
    # Configure access log format with timestamp
    LOGGING_CONFIG["formatters"]["access"]["fmt"] = '%(asctime)s %(levelprefix)s %(client_addr)s - "%(request_line)s" %(status_code)s'
    LOGGING_CONFIG["formatters"]["access"]["datefmt"] = "%Y-%m-%d %H:%M:%S"

if __name__ == "__main__":
    configure_logging()
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
# http://34.58.89.27:8000/docs
# uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# netstat -tulpn | grep :8000
# kill -9 xxx
# conda activate fastapi_env