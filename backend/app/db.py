import pg8000
import sqlalchemy
from google.cloud.sql.connector import Connector, IPTypes
from .config import (
    INSTANCE_CONNECTION_NAME, DB_USER, DB_PASS, DB_NAME, USE_PRIVATE_IP
)

_connector = Connector(refresh_strategy="LAZY")

def _getconn() -> pg8000.dbapi.Connection:
    return _connector.connect(
        INSTANCE_CONNECTION_NAME,
        "pg8000",
        user=DB_USER,
        password=DB_PASS,
        db=DB_NAME,
        ip_type=IPTypes.PRIVATE if USE_PRIVATE_IP else IPTypes.PUBLIC,
    )

engine = sqlalchemy.create_engine(
    "postgresql+pg8000://",
    creator=_getconn,
    pool_size=5,
    max_overflow=2,
    pool_timeout=30,
    pool_recycle=1800,
    future=True,
)
