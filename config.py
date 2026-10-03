import os

from dotenv import load_dotenv


load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY", "review-analyzer-local-demo")

DB_HOST = os.getenv("DB_HOST", "127.0.0.1")
DB_PORT = int(os.getenv("DB_PORT", "3306"))
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_NAME = os.getenv("DB_NAME", "review_analyzer_db")

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
DEBUG = os.getenv("DEBUG", "true").lower() == "true"
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"
