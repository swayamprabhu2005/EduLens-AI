import os
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
load_dotenv(dotenv_path=dotenv_path)

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "engagement_tracker")

client = None
db = None

try:
    import motor.motor_asyncio
    client = motor.motor_asyncio.AsyncIOMotorClient(MONGODB_URL)
    db = client[DATABASE_NAME]
except ImportError:
    print("Notice: 'motor' is not yet installed. Please run: pip install -r requirements.txt")

def get_database():
    if db is None:
        raise RuntimeError("MongoDB driver 'motor' is not installed. Please run: pip install -r requirements.txt")
    return db

async def close_mongo_connection():
    if client:
        client.close()
